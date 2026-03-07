"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { fetchCalls, type FetchCallsResult } from "@/lib/actions/calls";
import { useTenantStore } from "@/store/tenant";
import { NewFieldDialog } from "@/components/historial/NewFieldDialog";
import { DuplicateLeadDialog } from "@/components/historial/DuplicateLeadDialog";
import { AudioPlayer } from "@/components/historial/AudioPlayer";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import type { PostCallAnalisis } from "@/types/database";
import { ChevronDown } from "lucide-react";

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

export function HistorialTable({ initialData, fromDate, toDate }: Props) {
    const [result, setResult] = useState<FetchCallsResult>(initialData);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
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
        (p: number, q: string, status: string) => {
            startTransition(async () => {
                const res = await fetchCalls({
                    page: p,
                    pageSize: PAGE_SIZE,
                    search: q,
                    callStatus: status,
                    fromDate,
                    toDate,
                });
                setResult(res);
                // Collect dynamic keys from new results
                const keys = new Set<string>(dynamicKeys);
                res.data.forEach((r) => Object.keys(r.extra_data).forEach((k) => keys.add(k)));
                setDynamicKeys(Array.from(keys));
            });
        },
        [fromDate, toDate, dynamicKeys]
    );

    function handleSearch(val: string) {
        setSearch(val);
        setPage(1);
        load(1, val, statusFilter);
    }

    function handleStatus(val: string) {
        setStatusFilter(val);
        setPage(1);
        load(1, search, val);
    }

    function handlePage(p: number) {
        setPage(p);
        load(p, search, statusFilter);
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
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[320px]">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        title="Buscar"
                        aria-label="Buscar por Lead ID o número"
                        placeholder="Buscar por Lead ID o número..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                    />
                </div>

                {/* Status filter */}
                <select
                    title="Filtrar por estado"
                    aria-label="Filtrar por estado"
                    value={statusFilter}
                    onChange={(e) => handleStatus(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                >
                    <option value="ALL">Todos los estados</option>
                    {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* Dynamic columns toggle */}
                {dynamicKeys.length > 0 && (
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 border-r border-slate-100 pr-2">Campos:</span>
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

                {/* Count */}
                <span className="ml-auto text-xs text-slate-400">
                    {isPending ? "Cargando..." : `${result.count.toLocaleString()} registros`}
                </span>
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
                    onSaved={() => load(page, search, statusFilter)}
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
