"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { fetchCalls, type FetchCallsResult } from "@/lib/actions/calls";
import { useTenantStore } from "@/store/tenant";
import { NewFieldDialog } from "@/components/historial/NewFieldDialog";
import { DuplicateLeadDialog } from "@/components/historial/DuplicateLeadDialog";
import { AudioPlayer } from "@/components/historial/AudioPlayer";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import type { PostCallAnalisis } from "@/types/database";
import { ChevronDown, Search, RotateCcw, Calendar } from "lucide-react";

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.m4a', '.aac', '.flac'];

/** Returns extracted URL if the text looks like an audio file reference */
function extractAudioUrl(text: string | null): string | null {
    if (!text) return null;
    // Check if the full text (e.g. filename) contains an audio extension
    const hasAudioExt = AUDIO_EXTENSIONS.some((ext) => text.toLowerCase().includes(ext));
    if (!hasAudioExt) return null;
    // Extract URL via regex
    const match = text.match(/https?:\/\/[^\s)]+/);
    return match ? match[0] : null;
}

const STATUS_COLORS: Record<string, string> = {
    CONTACTED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    NO_CONTACT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    VOICEMAIL: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    TRANSFERRED_TO_HUMAN: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    ANNULLED: "bg-red-500/15 text-red-400 border-red-500/20",
    LATENCY_DROP: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    USER_INTERRUPTED: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    BUSY: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    INVALID_NUMBER: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

const ALL_STATUSES = Object.keys(STATUS_COLORS);
const PAGE_SIZE = 50;

interface Props {
    initialData: FetchCallsResult;
    fromDate: string;
    toDate: string;
}

/** Group rows by phone_number, keeping the most-recent as the representative row */
function deduplicateByPhone(data: PostCallAnalisis[]): { row: PostCallAnalisis; count: number }[] {
    const map = new Map<string, { row: PostCallAnalisis; count: number }>();
    for (const item of data) {
        const key = item.phone_number ?? `__no_phone_${item.id}`;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, { row: item, count: 1 });
        } else {
            existing.count++;
            // Keep the most-recent row as representative
            if (item.created_at > existing.row.created_at) {
                existing.row = item;
            }
        }
    }
    return Array.from(map.values());
}

const DATE_PRESETS = [
    { label: "Hoy", value: "today" },
    { label: "Ayer", value: "yesterday" },
    { label: "Últimos 7 días", value: "7d" },
    { label: "Últimos 30 días", value: "30d" },
    { label: "Este mes", value: "this_month" },
    { label: "Este año", value: "this_year" },
    { label: "Todos", value: "all" },
];

export function HistorialTable({ initialData, fromDate, toDate }: Props) {
    const [result, setResult] = useState<FetchCallsResult>(initialData);
    const [page, setPage] = useState(1);

    // Filter Draft States (only applied when "Aplicar Filtros" is clicked)
    const [draftSearch, setDraftSearch] = useState("");
    const [draftStatus, setDraftStatus] = useState("ALL");
    const [draftPreset, setDraftPreset] = useState("all");
    const [draftFrom, setDraftFrom] = useState(fromDate.slice(0, 10)); // YYYY-MM-DD
    const [draftTo, setDraftTo] = useState(toDate.slice(0, 10));
    const [draftCurso, setDraftCurso] = useState("");
    const [draftPais, setDraftPais] = useState("");
    const [draftOrigen, setDraftOrigen] = useState("");
    const [draftCampana, setDraftCampana] = useState("");

    // Active Filters
    const [activeSearch, setActiveSearch] = useState("");
    const [activeStatus, setActiveStatus] = useState("ALL");
    const [activeFrom, setActiveFrom] = useState(fromDate);
    const [activeTo, setActiveTo] = useState(toDate);
    const [activeCurso, setActiveCurso] = useState("");
    const [activePais, setActivePais] = useState("");
    const [activeOrigen, setActiveOrigen] = useState("");
    const [activeCampana, setActiveCampana] = useState("");

    const tenantConfig = useTenantStore((s) => s.config);
    const [dynamicKeys, setDynamicKeys] = useState<string[]>(() => {
        const keys = new Set<string>();
        // Add keys from config if present
        if (tenantConfig?.headers && Array.isArray(tenantConfig.headers)) {
            tenantConfig.headers.forEach((k: string) => keys.add(k));
        }
        initialData.data.forEach((r) => Object.keys(r.extra_data).forEach((k) => keys.add(k)));
        return Array.from(keys);
    });
    const [visibleDynamic, setVisibleDynamic] = useState<string[]>(() => {
        // Default visible are those from config
        if (tenantConfig?.headers && Array.isArray(tenantConfig.headers)) {
            return tenantConfig.headers;
        }
        return [];
    });
    const [isNewFieldDialogOpen, setIsNewFieldDialogOpen] = useState(false);
    const [dupPhone, setDupPhone] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [popoverText, setPopoverText] = useState<string | null>(null);

    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
    const headerMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
                setIsHeaderMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const load = useCallback(
        (p: number, q: string, status: string, fDate: string, tDate: string, curso?: string, pais?: string, origen?: string, campana?: string) => {
            startTransition(async () => {
                const res = await fetchCalls({
                    page: p,
                    pageSize: PAGE_SIZE,
                    search: q,
                    callStatus: status,
                    fromDate: fDate,
                    toDate: tDate,
                    curso,
                    pais,
                    origen,
                    campana,
                });
                setResult(res);
                const keys = new Set<string>(dynamicKeys);
                res.data.forEach((r) => Object.keys(r.extra_data).forEach((k) => keys.add(k)));
                setDynamicKeys(Array.from(keys));
            });
        },
        [dynamicKeys]
    );

    function applyFilters() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let fDate: string;
        let tDate: string;

        if (draftPreset === "today") {
            fDate = startOfToday.toISOString();
            tDate = now.toISOString();
        } else if (draftPreset === "yesterday") {
            const yesterdayStart = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayEnd = startOfToday;
            fDate = yesterdayStart.toISOString();
            tDate = yesterdayEnd.toISOString();
        } else if (draftPreset === "7d") {
            fDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            tDate = now.toISOString();
        } else if (draftPreset === "30d") {
            fDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            tDate = now.toISOString();
        } else if (draftPreset === "this_month") {
            fDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            tDate = now.toISOString();
        } else if (draftPreset === "this_year") {
            fDate = new Date(now.getFullYear(), 0, 1).toISOString();
            tDate = now.toISOString();
        } else if (draftPreset === "all") {
            fDate = new Date(2000, 0, 1).toISOString();
            tDate = now.toISOString();
        } else {
            // "custom" or other
            fDate = draftFrom ? new Date(draftFrom).toISOString() : new Date(2000, 0, 1).toISOString();
            // End of today for the 'toDate'
            tDate = draftTo ? new Date(draftTo + "T23:59:59.999Z").toISOString() : now.toISOString();
        }

        // Sync inputs UI if they were preset-driven
        if (draftPreset !== "custom" && draftPreset !== "all") {
            setDraftFrom(fDate.slice(0, 10));
            setDraftTo(tDate.slice(0, 10));
        }

        setActiveSearch(draftSearch);
        setActiveStatus(draftStatus);
        setActiveFrom(fDate);
        setActiveTo(tDate);
        setActiveCurso(draftCurso);
        setActivePais(draftPais);
        setActiveOrigen(draftOrigen);
        setActiveCampana(draftCampana);

        setPage(1);
        load(1, draftSearch, draftStatus, fDate, tDate, draftCurso, draftPais, draftOrigen, draftCampana);
    }

    function resetFilters() {
        setDraftSearch("");
        setDraftStatus("ALL");
        setDraftPreset("all");
        setDraftFrom("");
        setDraftTo("");
        setActiveSearch("");
        setActiveStatus("ALL");

        const now = new Date().toISOString();
        const past = new Date(2000, 0, 1).toISOString();
        setActiveFrom(past);
        setActiveTo(now);
        setPage(1);
        load(1, "", "ALL", past, now);
    }

    function handlePage(p: number) {
        setPage(p);
        load(p, activeSearch, activeStatus, activeFrom, activeTo, activeCurso, activePais, activeOrigen, activeCampana);
    }

    function toggleDynamicKey(key: string) {
        setVisibleDynamic((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    }

    const apiCols = result.data.length > 0
        ? Object.keys(result.data[0]).filter(k => k !== 'id' && k !== 'extra_data')
        : ["created_at", "lead_id", "phone_number", "call_status", "duration_seconds", "tipologia_llamada", "is_qualified", "agendado_con_asesor", "opt_in_whatsapp"];

    const COL_DICT: Record<string, string> = {
        created_at: "Fecha",
        lead_id: "Lead ID",
        phone_number: "Teléfono",
        call_status: "Estado",
        duration_seconds: "Duración",
        motivo_anulacion: "Motivo Anulación",
        motivo_no_contacto: "Motivo No Contacto",
        tipologia_llamada: "Tipología",
        master_interes: "Master Interés",
        is_qualified: "Cualificado",
        agendado_con_asesor: "Agendado",
        opt_in_whatsapp: "Opt-in WA",
    };

    return (
        <>
            {/* Filter Toolbar aligned to user request */}
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

                {/* Row 1: Date Presets & Custom Dates */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 custom-scrollbar">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => setDraftPreset(preset.value)}
                                className={cn(
                                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                                    draftPreset === preset.value
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                title="Fecha inicio"
                                aria-label="Fecha inicio"
                                value={draftFrom}
                                onChange={(e) => { setDraftFrom(e.target.value); setDraftPreset("custom"); }}
                                className="w-[140px] rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                        <span className="text-sm font-medium text-slate-400">a</span>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                title="Fecha fin"
                                aria-label="Fecha fin"
                                value={draftTo}
                                onChange={(e) => { setDraftTo(e.target.value); setDraftPreset("custom"); }}
                                className="w-[140px] rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                            />
                        </div>
                    </div>
                </div>

                {/* Row 2: Advanced filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Teléfono..."
                            value={draftSearch}
                            onChange={(e) => setDraftSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        />
                    </div>

                    <input
                        type="text"
                        placeholder="Curso..."
                        value={draftCurso}
                        onChange={(e) => setDraftCurso(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                    />

                    <input
                        type="text"
                        placeholder="País..."
                        value={draftPais}
                        onChange={(e) => setDraftPais(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                    />

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Origen..."
                            value={draftOrigen}
                            onChange={(e) => setDraftOrigen(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                        />
                        <button
                            onClick={applyFilters}
                            disabled={isPending}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow disabled:opacity-50"
                        >
                            {isPending ? "..." : "Aplicar"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Campaña..."
                        value={draftCampana}
                        onChange={(e) => setDraftCampana(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                    />
                </div>

                {/* Row 3: Status, Dynamics & Stats */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-1 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            title="Filtrar por estado"
                            aria-label="Filtrar por estado"
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        >
                            <option value="ALL">Todos los estados</option>
                            {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        {/* Dynamic columns toggle */}
                        {dynamicKeys.length > 0 && (
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm h-[38px]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mx-2 border-r border-slate-100 pr-3">Campos</span>
                                {dynamicKeys.map((k) => (
                                    <button
                                        key={k}
                                        onClick={() => toggleDynamicKey(k)}
                                        className={cn(
                                            "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                                            visibleDynamic.includes(k)
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                        )}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-5">
                        <span className="text-sm font-black text-blue-600 tracking-tight bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                            {result.count.toLocaleString()} resultados
                        </span>
                        <button
                            onClick={resetFilters}
                            title="Limpiar filtros"
                            className="flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-700"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* Text popover */}
            {popoverText && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
                    onClick={() => setPopoverText(null)}
                >
                    <div
                        className="max-w-lg w-full mx-4 rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contenido Detallado</span>
                            <button onClick={() => setPopoverText(null)} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all leading-none font-bold">✕</button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{popoverText}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            {apiCols.map((k) => (
                                <th key={k} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                                    {COL_DICT[k] || k.replace(/_/g, ' ')}
                                </th>
                            ))}
                            {visibleDynamic.map((k) => (
                                <th key={k} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-blue-600 border-l border-slate-100 bg-blue-50/50 whitespace-nowrap">
                                    {k}
                                </th>
                            ))}
                            <th className="px-5 py-4 text-right overflow-visible">
                                <div className="relative inline-block text-left w-full" ref={headerMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                        className="flex items-center justify-end gap-1.5 w-full text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        AGREGAR ACCIÓN
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                    {isHeaderMenuOpen && (
                                        <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => {
                                                    setIsHeaderMenuOpen(false);
                                                    setIsNewFieldDialogOpen(true);
                                                }}
                                                className="flex w-full items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
                                            >
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                                    <ChevronDown className="h-4 w-4" />
                                                </div>
                                                Agregar cabezal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-slate-100 transition-opacity", isPending && "opacity-50")}>
                        {result.data.length === 0 ? (
                            <tr>
                                <td colSpan={apiCols.length + visibleDynamic.length + 1} className="py-20 text-center text-sm font-bold text-slate-400">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : (
                            deduplicateByPhone(result.data).map(({ row, count }) => (
                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {apiCols.map((k) => {
                                        const val = row[k as keyof PostCallAnalisis];
                                        if (k === 'created_at') return <td key={k} className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs font-semibold">{formatDate(val as string)}</td>;
                                        if (k === 'lead_id') return (
                                            <td key={k}
                                                className="px-5 py-4 font-mono text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline underline-offset-4 transition-colors"
                                                onClick={() => { if (row.phone_number) setDupPhone(row.phone_number); }}
                                            >
                                                {val as string ?? "—"}
                                            </td>
                                        );
                                        if (k === 'phone_number') return (
                                            <td key={k}
                                                className="px-5 py-4 whitespace-nowrap cursor-pointer"
                                                onClick={() => { if (row.phone_number) setDupPhone(row.phone_number); }}
                                            >
                                                <span className="font-mono text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 transition-colors">
                                                    {val as string ?? "—"}
                                                </span>
                                                {count > 1 && (
                                                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                                        +{count - 1} más
                                                    </span>
                                                )}
                                            </td>
                                        );
                                        if (k === 'call_status') return (
                                            <td key={k} className="px-5 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                                    STATUS_COLORS[val as string] ?? "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    {val as string}
                                                </span>
                                            </td>
                                        );
                                        if (k === 'duration_seconds') return <td key={k} className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs font-bold">{val !== null ? formatDuration(val as number) : "—"}</td>;
                                        if (k === 'is_qualified') return (
                                            <td key={k} className="px-5 py-4">
                                                <span className={cn(
                                                    "inline-block h-2 w-2 rounded-full",
                                                    val ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-200"
                                                )} />
                                            </td>
                                        );
                                        // Extract URL with regex (handles formats like "file.wav (https://...)")
                                        const strVal = val !== null ? String(val) : null;
                                        const audioUrl = extractAudioUrl(strVal);
                                        // Audio recording → custom player
                                        if (audioUrl) {
                                            return (
                                                <td key={k} className="px-3 py-1">
                                                    <AudioPlayer src={audioUrl} />
                                                </td>
                                            );
                                        }
                                        // Long text → truncate + click to expand
                                        if (strVal && strVal.length > 40) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <button
                                                        onClick={() => setPopoverText(strVal)}
                                                        className="max-w-[160px] truncate text-left text-xs text-slate-500 hover:text-blue-600 hover:underline transition block"
                                                        title="Clic para ver completo"
                                                    >
                                                        {strVal}
                                                    </button>
                                                </td>
                                            );
                                        }
                                        return <td key={k} className="px-3 py-1.5 text-slate-500 text-xs whitespace-nowrap">{strVal ?? "—"}</td>;
                                    })}

                                    {visibleDynamic.map((k) => {
                                        const dynVal = String(row.extra_data?.[k] ?? "—");
                                        // Extract audio URL (detects by extension in full text)
                                        const dynAudioUrl = extractAudioUrl(dynVal !== "—" ? dynVal : null);
                                        if (dynAudioUrl) {
                                            return (
                                                <td key={k} className="px-3 py-1">
                                                    <AudioPlayer src={dynAudioUrl} />
                                                </td>
                                            );
                                        }
                                        if (dynVal.length > 40) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <button
                                                        onClick={() => setPopoverText(dynVal)}
                                                        className="max-w-[160px] truncate text-left text-xs text-slate-500 hover:text-blue-600 hover:underline transition block"
                                                    >
                                                        {dynVal}
                                                    </button>
                                                </td>
                                            );
                                        }
                                        return <td key={k} className="px-3 py-1.5 text-xs text-slate-500 whitespace-nowrap">{dynVal}</td>;
                                    })}
                                    <td className="px-3 py-1.5 text-right">
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">Página {page} de {result.totalPages}</span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handlePage(Math.max(1, page - 1))}
                            disabled={page === 1 || isPending}
                            className="rounded-xl px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            ← Anterior
                        </button>
                        {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                            const p = page <= 3 ? i + 1 : page - 2 + i;
                            if (p > result.totalPages) return null;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    disabled={isPending}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded-xl font-black transition-all shadow-sm",
                                        p === page
                                            ? "bg-blue-600 text-white shadow-blue-200"
                                            : "bg-white border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600"
                                    )}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => handlePage(Math.min(result.totalPages, page + 1))}
                            disabled={page === result.totalPages || isPending}
                            className="rounded-xl px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {/* Dynamic field dialog */}
            {isNewFieldDialogOpen && (
                <NewFieldDialog
                    onClose={() => setIsNewFieldDialogOpen(false)}
                    onSaved={() => load(page, activeSearch, activeStatus, activeFrom, activeTo)}
                />
            )}

            {/* Duplicate lead dialog */}
            {dupPhone && (
                <DuplicateLeadDialog
                    phone={dupPhone}
                    onClose={() => setDupPhone(null)}
                />
            )}
        </>
    );
}
