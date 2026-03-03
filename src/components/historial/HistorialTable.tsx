"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { fetchCalls, type FetchCallsResult } from "@/lib/actions/calls";
import { NewFieldDialog } from "@/components/historial/NewFieldDialog";
import { DuplicateLeadDialog } from "@/components/historial/DuplicateLeadDialog";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import type { PostCallAnalisis } from "@/types/database";
import { ChevronDown } from "lucide-react";

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

export function HistorialTable({ initialData, fromDate, toDate }: Props) {
    const [result, setResult] = useState<FetchCallsResult>(initialData);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [dynamicKeys, setDynamicKeys] = useState<string[]>(() => {
        const keys = new Set<string>();
        initialData.data.forEach((r) => Object.keys(r.extra_data).forEach((k) => keys.add(k)));
        return Array.from(keys);
    });
    const [visibleDynamic, setVisibleDynamic] = useState<string[]>([]);
    const [isNewFieldDialogOpen, setIsNewFieldDialogOpen] = useState(false);
    const [dupPhone, setDupPhone] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [popoverText, setPopoverText] = useState<string | null>(null);

    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
    const [isNewHeaderOpen, setIsNewHeaderOpen] = useState(false);
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
                <div className="relative flex-1 min-w-48">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar por Lead ID o número..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500 focus:outline-none"
                    />
                </div>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => handleStatus(e.target.value)}
                    className="rounded-lg border border-white/[0.08] bg-[#070b14] px-3 py-2 text-sm text-white/70 focus:border-indigo-500 focus:outline-none"
                >
                    <option value="ALL" className="bg-[#070b14]">Todos los estados</option>
                    {ALL_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-[#070b14]">{s}</option>
                    ))}
                </select>

                {/* Dynamic columns toggle */}
                {dynamicKeys.length > 0 && (
                    <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1">
                        <span className="text-xs text-white/40 mr-1">Campos:</span>
                        {dynamicKeys.map((k) => (
                            <button
                                key={k}
                                onClick={() => toggleDynamicKey(k)}
                                className={cn(
                                    "rounded px-2 py-0.5 text-xs transition",
                                    visibleDynamic.includes(k)
                                        ? "bg-indigo-600 text-white"
                                        : "text-white/30 hover:text-white/60"
                                )}
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                )}

                {/* Count */}
                <span className="ml-auto text-xs text-white/30">
                    {isPending ? "Cargando..." : `${result.count.toLocaleString()} registros`}
                </span>
            </div>

            {/* Text popover */}
            {popoverText && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setPopoverText(null)}
                >
                    <div
                        className="max-w-lg w-full mx-4 rounded-xl border border-white/10 bg-[#0d1220] p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-white/40">Contenido</span>
                            <button onClick={() => setPopoverText(null)} className="text-white/30 hover:text-white/70 transition text-lg leading-none">✕</button>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{popoverText}</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                            {apiCols.map((k) => (
                                <th key={k} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white/40 whitespace-nowrap">
                                    {COL_DICT[k] || k.replace(/_/g, ' ')}
                                </th>
                            ))}
                            {visibleDynamic.map((k) => (
                                <th key={k} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-indigo-400/70 whitespace-nowrap">
                                    ⚡ {k}
                                </th>
                            ))}
                            <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-white/40 whitespace-nowrap overflow-visible">
                                <div className="relative inline-block text-left w-full" ref={headerMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                        className="flex items-center justify-end gap-1 w-full hover:text-white transition-colors text-indigo-400"
                                    >
                                        AGREGAR ACCIÓN
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                    {isHeaderMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-md bg-[#0d1220] border border-white/10 shadow-lg z-10 py-1">
                                            <button
                                                onClick={() => {
                                                    setIsHeaderMenuOpen(false);
                                                    setIsNewFieldDialogOpen(true);
                                                }}
                                                className="block w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                                            >
                                                Agregar cabezal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-white/[0.04] transition-opacity", isPending && "opacity-50")}>
                        {result.data.length === 0 ? (
                            <tr>
                                <td colSpan={apiCols.length + visibleDynamic.length + 1} className="py-16 text-center text-sm text-white/25">
                                    No se encontraron registros
                                </td>
                            </tr>
                        ) : (
                            result.data.map((row) => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                                    {apiCols.map((k) => {
                                        const val = row[k as keyof PostCallAnalisis];
                                        if (k === 'created_at') return <td key={k} className="px-3 py-1.5 text-white/50 whitespace-nowrap text-xs">{formatDate(val as string)}</td>;
                                        if (k === 'lead_id') return (
                                            <td key={k}
                                                className="px-3 py-1.5 font-mono text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer hover:underline underline-offset-2 transition-colors"
                                                onClick={() => { if (row.phone_number) setDupPhone(row.phone_number); }}
                                            >
                                                {val as string ?? "—"}
                                            </td>
                                        );
                                        if (k === 'phone_number') return (
                                            <td key={k}
                                                className="px-3 py-1.5 font-mono text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap cursor-pointer hover:underline underline-offset-2 transition-colors"
                                                onClick={() => { if (row.phone_number) setDupPhone(row.phone_number); }}
                                            >
                                                {val as string ?? "—"}
                                            </td>
                                        );
                                        if (k === 'call_status') return (
                                            <td key={k} className="px-3 py-1.5 whitespace-nowrap">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                                                    STATUS_COLORS[val as string] ?? "bg-white/5 text-white/40 border-white/10"
                                                )}>
                                                    {val as string}
                                                </span>
                                            </td>
                                        );
                                        if (k === 'duration_seconds') return <td key={k} className="px-3 py-1.5 text-white/50 whitespace-nowrap text-xs">{val !== null ? formatDuration(val as number) : "—"}</td>;
                                        if (k === 'is_qualified') return (
                                            <td key={k} className="px-3 py-1.5">
                                                <span className={cn(
                                                    "inline-block h-2 w-2 rounded-full",
                                                    val ? "bg-emerald-400" : "bg-white/20"
                                                )} />
                                            </td>
                                        );
                                        // Extract URL with regex (handles formats like "file.wav (https://...)")
                                        const strVal = val !== null ? String(val) : null;
                                        const urlMatch = strVal ? strVal.match(/https?:\/\/[^\s)]+/) : null;
                                        const extractedUrl = urlMatch ? urlMatch[0] : null;
                                        // Audio recording → player
                                        if (extractedUrl && (extractedUrl.includes('.wav') || extractedUrl.includes('.mp3') || extractedUrl.includes('.ogg') || extractedUrl.includes('record') || extractedUrl.includes('audio'))) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <audio controls src={extractedUrl} className="h-7 max-w-[180px] rounded" preload="none" />
                                                </td>
                                            );
                                        }
                                        // Long text → truncate + click to expand
                                        if (strVal && strVal.length > 40) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <button
                                                        onClick={() => setPopoverText(strVal)}
                                                        className="max-w-[160px] truncate text-left text-xs text-white/50 hover:text-indigo-400 hover:underline transition block"
                                                        title="Clic para ver completo"
                                                    >
                                                        {strVal}
                                                    </button>
                                                </td>
                                            );
                                        }
                                        return <td key={k} className="px-3 py-1.5 text-white/50 text-xs whitespace-nowrap">{strVal ?? "—"}</td>;
                                    })}

                                    {visibleDynamic.map((k) => {
                                        const dynVal = String(row.extra_data?.[k] ?? "—");
                                        // Extract URL with regex (handles 'file.wav (https://...)')
                                        const dynUrlMatch = dynVal !== "—" ? dynVal.match(/https?:\/\/[^\s)]+/) : null;
                                        const dynExtractedUrl = dynUrlMatch ? dynUrlMatch[0] : null;
                                        // Audio recording in dynamic column → player
                                        if (dynExtractedUrl && (dynExtractedUrl.includes('.wav') || dynExtractedUrl.includes('.mp3') || dynExtractedUrl.includes('.ogg') || dynExtractedUrl.includes('record') || dynExtractedUrl.includes('audio'))) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <audio controls src={dynExtractedUrl} className="h-7 max-w-[180px] rounded" preload="none" />
                                                </td>
                                            );
                                        }
                                        if (dynVal.length > 40) {
                                            return (
                                                <td key={k} className="px-3 py-1.5">
                                                    <button
                                                        onClick={() => setPopoverText(dynVal)}
                                                        className="max-w-[160px] truncate text-left text-xs text-indigo-300/80 hover:text-indigo-400 hover:underline transition block"
                                                    >
                                                        {dynVal}
                                                    </button>
                                                </td>
                                            );
                                        }
                                        return <td key={k} className="px-3 py-1.5 text-xs text-indigo-300/80 whitespace-nowrap">{dynVal}</td>;
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
                <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>Página {page} de {result.totalPages}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePage(Math.max(1, page - 1))}
                            disabled={page === 1 || isPending}
                            className="rounded-lg px-3 py-1.5 hover:bg-white/[0.06] disabled:opacity-30 transition"
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
                                        "rounded-lg px-3 py-1.5 transition",
                                        p === page ? "bg-indigo-600 text-white" : "hover:bg-white/[0.06]"
                                    )}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => handlePage(Math.min(result.totalPages, page + 1))}
                            disabled={page === result.totalPages || isPending}
                            className="rounded-lg px-3 py-1.5 hover:bg-white/[0.06] disabled:opacity-30 transition"
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
