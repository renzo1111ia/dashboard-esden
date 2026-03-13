"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { fetchCalls, type FetchCallsResult } from "@/lib/actions/calls";
import { DuplicateLeadDialog } from "@/components/historial/DuplicateLeadDialog";
import { AudioPlayer } from "@/components/historial/AudioPlayer";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import type { HistorialRow } from "@/types/database";
import {
    ChevronDown, Search, RotateCcw, Calendar, Phone, User,
    Clock, MapPin, Target, CheckCircle, XCircle, AlertCircle, Timer
} from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".m4a", ".aac", ".flac"];

function extractAudioUrl(text: string | null): string | null {
    if (!text) return null;
    const hasAudioExt = AUDIO_EXTENSIONS.some((ext) => text.toLowerCase().includes(ext));
    if (!hasAudioExt) return null;
    const match = text.match(/https?:\/\/[^\s)]+/);
    return match ? match[0] : null;
}

const STATUS_COLORS: Record<string, string> = {
    CONTACTED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
    NO_CONTACT: "bg-amber-500/15 text-amber-600 border-amber-500/20",
    VOICEMAIL: "bg-blue-500/15 text-blue-600 border-blue-500/20",
    TRANSFERRED_TO_HUMAN: "bg-violet-500/15 text-violet-600 border-violet-500/20",
    ANNULLED: "bg-red-500/15 text-red-600 border-red-500/20",
    LATENCY_DROP: "bg-orange-500/15 text-orange-600 border-orange-500/20",
    USER_INTERRUPTED: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
    BUSY: "bg-slate-500/15 text-slate-500 border-slate-200",
    INVALID_NUMBER: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};

const TIPO_LEAD_COLORS: Record<string, string> = {
    nuevo: "bg-blue-50 text-blue-600 border-blue-100",
    localizable: "bg-emerald-50 text-emerald-600 border-emerald-100",
    ilocalizable: "bg-rose-50 text-rose-600 border-rose-100",
};

const DATE_PRESETS = [
    { label: "Hoy", value: "today" },
    { label: "Ayer", value: "yesterday" },
    { label: "Últ. 7 días", value: "7d" },
    { label: "Últ. 30 días", value: "30d" },
    { label: "Este mes", value: "this_month" },
    { label: "Todos", value: "all" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Group rows by phone, keeping the most-recent as representative */
function deduplicateByPhone(data: HistorialRow[]): { row: HistorialRow; count: number }[] {
    const map = new Map<string, { row: HistorialRow; count: number }>();
    for (const item of data) {
        const key = item.telefono ?? `__no_phone_${item.id}`;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, { row: item, count: 1 });
        } else {
            existing.count++;
            if ((item.fecha_inicio ?? "") > (existing.row.fecha_inicio ?? "")) {
                existing.row = item;
            }
        }
    }
    return Array.from(map.values());
}

function formatTiempoRespuesta(minutos: number | null | undefined): string {
    if (minutos == null) return "—";
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
    initialData: FetchCallsResult;
    fromDate: string;
    toDate: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function HistorialTable({ initialData, fromDate, toDate }: Props) {
    const [result, setResult] = useState<FetchCallsResult>(initialData);
    const [page, setPage] = useState(1);

    // Filters – draft (unsent) and active (applied)
    const [draftSearch, setDraftSearch] = useState("");
    const [draftStatus, setDraftStatus] = useState("ALL");
    const [draftPreset, setDraftPreset] = useState("all");
    const [draftFrom, setDraftFrom] = useState(fromDate.slice(0, 10));
    const [draftTo, setDraftTo] = useState(toDate.slice(0, 10));
    const [draftPais, setDraftPais] = useState("");
    const [draftOrigen, setDraftOrigen] = useState("");
    const [draftCampana, setDraftCampana] = useState("");
    const [draftTipoLead, setDraftTipoLead] = useState("");
    const [draftCual, setDraftCual] = useState("");

    const [activeSearch, setActiveSearch] = useState("");
    const [activeStatus, setActiveStatus] = useState("ALL");
    const [activeFrom, setActiveFrom] = useState(fromDate);
    const [activeTo, setActiveTo] = useState(toDate);
    const [activePais, setActivePais] = useState("");
    const [activeOrigen, setActiveOrigen] = useState("");
    const [activeCampana, setActiveCampana] = useState("");
    const [activeTipoLead, setActiveTipoLead] = useState("");
    const [activeCual, setActiveCual] = useState("");

    const [dupPhone, setDupPhone] = useState<string | null>(null);
    const [popoverRow, setPopoverRow] = useState<HistorialRow | null>(null);
    const [isPending, startTransition] = useTransition();

    // ── Load data ─────────────────────────────────────────────────────────────

    const load = useCallback((
        p: number, search: string, status: string,
        fDate: string, tDate: string,
        pais?: string, origen?: string, campana?: string,
        tipoLead?: string, cualificacion?: string,
    ) => {
        startTransition(async () => {
            const res = await fetchCalls({
                page: p, pageSize: PAGE_SIZE,
                search, estadoLlamada: status,
                fromDate: fDate, toDate: tDate,
                pais, origen, campana, tipoLead, cualificacion,
            });
            setResult(res);
        });
    }, []);

    // ── Apply / reset filters ─────────────────────────────────────────────────

    function applyFilters() {
        const now = new Date();
        const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let fDate: string, tDate: string;

        if (draftPreset === "today") { fDate = sod.toISOString(); tDate = now.toISOString(); }
        else if (draftPreset === "yesterday") { const y = new Date(sod.getTime() - 864e5); fDate = y.toISOString(); tDate = sod.toISOString(); }
        else if (draftPreset === "7d") { fDate = new Date(now.getTime() - 7 * 864e5).toISOString(); tDate = now.toISOString(); }
        else if (draftPreset === "30d") { fDate = new Date(now.getTime() - 30 * 864e5).toISOString(); tDate = now.toISOString(); }
        else if (draftPreset === "this_month") { fDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); tDate = now.toISOString(); }
        else if (draftPreset === "all") { fDate = new Date(2000, 0, 1).toISOString(); tDate = now.toISOString(); }
        else {
            fDate = draftFrom ? new Date(draftFrom).toISOString() : new Date(2000, 0, 1).toISOString();
            tDate = draftTo ? new Date(draftTo + "T23:59:59.999Z").toISOString() : now.toISOString();
        }

        setActiveSearch(draftSearch); setActiveStatus(draftStatus);
        setActiveFrom(fDate); setActiveTo(tDate);
        setActivePais(draftPais); setActiveOrigen(draftOrigen);
        setActiveCampana(draftCampana); setActiveTipoLead(draftTipoLead);
        setActiveCual(draftCual);
        setPage(1);
        load(1, draftSearch, draftStatus, fDate, tDate, draftPais, draftOrigen, draftCampana, draftTipoLead, draftCual);
    }

    function resetFilters() {
        setDraftSearch(""); setDraftStatus("ALL"); setDraftPreset("all");
        setDraftFrom(""); setDraftTo(""); setDraftPais("");
        setDraftOrigen(""); setDraftCampana(""); setDraftTipoLead(""); setDraftCual("");
        setActiveSearch(""); setActiveStatus("ALL");
        setActivePais(""); setActiveOrigen(""); setActiveCampana("");
        setActiveTipoLead(""); setActiveCual("");
        const now = new Date().toISOString();
        const past = new Date(2000, 0, 1).toISOString();
        setActiveFrom(past); setActiveTo(now);
        setPage(1);
        load(1, "", "ALL", past, now);
    }

    function handlePage(p: number) {
        setPage(p);
        load(p, activeSearch, activeStatus, activeFrom, activeTo, activePais, activeOrigen, activeCampana, activeTipoLead, activeCual);
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* ── FILTER TOOLBAR ───────────────────────────────────────────── */}
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

                {/* Row 1: date presets + custom range */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {DATE_PRESETS.map((pr) => (
                            <button key={pr.value} onClick={() => setDraftPreset(pr.value)}
                                className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                                    draftPreset === pr.value ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700"
                                )}>
                                {pr.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {(["from", "to"] as const).map((which) => (
                            <div key={which} className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="date" title={which === "from" ? "Fecha inicio" : "Fecha fin"}
                                    value={which === "from" ? draftFrom : draftTo}
                                    onChange={(e) => { which === "from" ? setDraftFrom(e.target.value) : setDraftTo(e.target.value); setDraftPreset("custom"); }}
                                    className="w-[140px] rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 2: search + filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* search */}
                    <div className="relative col-span-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Buscar por teléfono, nombre..."
                            value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        />
                    </div>

                    {/* estado llamada */}
                    <select title="Estado de llamada" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
                        <option value="ALL">Todos los estados</option>
                        {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* tipo lead */}
                    <select title="Tipo lead" value={draftTipoLead} onChange={(e) => setDraftTipoLead(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white">
                        <option value="">Tipo de lead</option>
                        <option value="nuevo">Nuevo</option>
                        <option value="localizable">Localizable</option>
                        <option value="ilocalizable">Ilocalizable</option>
                    </select>

                    <input type="text" placeholder="País..." value={draftPais} onChange={(e) => setDraftPais(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400" />

                    <input type="text" placeholder="Origen..." value={draftOrigen} onChange={(e) => setDraftOrigen(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400" />

                    <input type="text" placeholder="Campaña..." value={draftCampana} onChange={(e) => setDraftCampana(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400" />

                    <input type="text" placeholder="Cualificación..." value={draftCual} onChange={(e) => setDraftCual(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400" />
                </div>

                {/* Row 3: stats + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        {result.count.toLocaleString()} resultados
                    </span>
                    <div className="flex gap-3">
                        <button onClick={resetFilters} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors">
                            <RotateCcw className="h-4 w-4" /> Limpiar
                        </button>
                        <button onClick={applyFilters} disabled={isPending}
                            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50">
                            {isPending ? "..." : "Aplicar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Popover: Ver detalle */}
            {popoverRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 py-10"
                    onClick={() => setPopoverRow(null)}>
                    <div className="max-w-4xl w-full max-h-full overflow-hidden flex flex-col rounded-[2.5rem] border border-white/20 bg-white shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                                    <User className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                                        {popoverRow.nombre} {popoverRow.apellido}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="font-mono text-sm font-bold text-blue-600 tracking-tight">{popoverRow.telefono}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{popoverRow.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setPopoverRow(null)}
                                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all font-bold shadow-sm">
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                
                                {/* ── LEFT COLUMN: LEAD INFO ────────────────── */}
                                <div className="lg:col-span-1 space-y-8">
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <Target className="h-3 w-3" /> Datos del Prospecto
                                        </h4>
                                        <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/30 p-5">
                                            <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="País" value={popoverRow.pais} />
                                            <DetailItem icon={<Target className="h-3.5 w-3.5" />} label="Origen" value={popoverRow.origen} />
                                            <DetailItem icon={<User className="h-3.5 w-3.5" />} label="Tipo Lead" value={popoverRow.tipo_lead} />
                                            <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Ingreso CRM" value={formatDate(popoverRow.fecha_ingreso_crm ?? null)} />
                                            <DetailItem icon={<Timer className="h-3.5 w-3.5" />} label="T. Respuesta" value={formatTiempoRespuesta(popoverRow.tiempo_respuesta_minutos)} />
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <CheckCircle className="h-3 w-3" /> Cualificación y Cita
                                        </h4>
                                        <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/30 p-5">
                                            <DetailItem icon={<CheckCircle className="h-3.5 w-3.5" />} label="Cualificación" value={popoverRow.cualificacion} />
                                            <DetailItem icon={<XCircle className="h-3.5 w-3.5" />} label="Motivo Anulación" value={popoverRow.motivo_anulacion} />
                                            <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Cita Agendada" value={popoverRow.fecha_agendada_cliente ? formatDate(popoverRow.fecha_agendada_cliente) : null} />
                                        </div>
                                    </div>
                                </div>

                                {/* ── RIGHT COLUMN: TIMELINE (REINTENTOS) ────── */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                             <RotateCcw className="h-3 w-3" /> Historial de Reintentos
                                        </h4>
                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                            {popoverRow.total_llamadas} Intentos
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {popoverRow.llamadas.map((llamada, idx) => (
                                            <div key={llamada.id} className={cn(
                                                "relative pl-8 pb-4 border-l-2 last:border-0 last:pb-0",
                                                idx === 0 ? "border-blue-500" : "border-slate-100"
                                            )}>
                                                {/* Bullet */}
                                                <div className={cn(
                                                    "absolute -left-[11px] top-0 h-5 w-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center",
                                                    idx === 0 ? "bg-blue-600" : "bg-slate-300"
                                                )} />

                                                <div className={cn(
                                                    "rounded-[1.5rem] border p-5 transition-all",
                                                    idx === 0 ? "border-blue-100 bg-blue-50/30 shadow-sm" : "border-slate-100 bg-white"
                                                )}>
                                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                                                    Intento {popoverRow.total_llamadas - idx}
                                                                </span>
                                                                <span className="text-xs font-black text-slate-700">
                                                                    {formatDate(llamada.fecha_inicio ?? null)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                                                    STATUS_COLORS[llamada.estado_llamada ?? ""] ?? "bg-slate-50 text-slate-400 border-slate-100")}>
                                                                    {llamada.estado_llamada}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {formatDuration(llamada.duracion_segundos ?? 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {llamada.url_grabacion && (
                                                            <div className="w-full sm:w-auto min-w-[200px]" onClick={e => e.stopPropagation()}>
                                                                <AudioPlayer src={llamada.url_grabacion} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {llamada.resumen && (
                                                        <div className="p-4 rounded-2xl bg-white/50 border border-black/[0.03]">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                                <AlertCircle className="h-3 w-3" /> Resumen IA
                                                            </p>
                                                            <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                                                "{llamada.resumen}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button onClick={() => setPopoverRow(null)}
                                className="px-8 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TABLE ───────────────────────────────────────────────────── */}
            <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                            {COLUMNS.map((col) => (
                                <th key={col.key} className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-slate-100 transition-opacity", isPending && "opacity-50")}>
                        {result.data.length === 0 ? (
                            <tr>
                                <td colSpan={COLUMNS.length} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200">
                                            <Search className="h-8 w-8" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No se encontraron registros para los filtros aplicados</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            result.data.map((row) => (
                                <tr key={row.id} className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                                    onClick={() => setPopoverRow(row)}>
                                    {/* Fecha ingreso */}
                                    <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-slate-500">
                                        {formatDate(row.fecha_ingreso_crm ?? null)}
                                    </td>

                                    {/* Lead (nombre + teléfono) */}
                                    <td className="px-6 py-5 whitespace-nowrap"
                                        onClick={(e) => { e.stopPropagation(); if (row.telefono) setDupPhone(row.telefono); }}>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                                                {row.nombre} {row.apellido}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="font-mono text-[11px] font-bold text-blue-600 hover:underline">
                                                    {row.telefono ?? "—"}
                                                </span>
                                                {row.total_llamadas > 1 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                                                        <RotateCcw className="h-2 w-2" /> {row.total_llamadas}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Origen */}
                                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                                        {row.origen ?? "—"}
                                    </td>

                                    {/* Estado llamada */}
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                            STATUS_COLORS[row.estado_llamada ?? ""] ?? "bg-slate-50 text-slate-400 border-slate-100")}>
                                            {row.estado_llamada ?? "—"}
                                        </span>
                                    </td>

                                    {/* Razón término */}
                                    <td className="px-5 py-4 text-xs text-slate-500 max-w-[140px] truncate"
                                        title={row.razon_termino ?? ""}>
                                        {row.razon_termino ?? "—"}
                                    </td>

                                    {/* Duración IA */}
                                    <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                        {row.duracion_segundos != null ? formatDuration(row.duracion_segundos) : "—"}
                                    </td>

                                    {/* T. Respuesta */}
                                    <td className="px-5 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                        {formatTiempoRespuesta(row.tiempo_respuesta_minutos)}
                                    </td>

                                    {/* Cualificación */}
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {row.cualificacion ? (
                                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                                row.cualificacion === "SI" || row.cualificacion === "CUALIFICADO"
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                            )}>
                                                {row.cualificacion}
                                            </span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>

                                    {/* Tipo Lead */}
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {row.tipo_lead ? (
                                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                                TIPO_LEAD_COLORS[row.tipo_lead.toLowerCase()] ?? "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                {row.tipo_lead}
                                            </span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>

                                    {/* Motivo anulación */}
                                    <td className="px-5 py-4 text-xs text-slate-500 max-w-[140px] truncate"
                                        title={row.motivo_anulacion ?? ""}>
                                        {row.motivo_anulacion ?? "—"}
                                    </td>

                                    {/* Cita agendada */}
                                    <td className="px-5 py-4 text-xs whitespace-nowrap">
                                        {row.fecha_agendada_cliente ? (
                                            <span className="font-bold text-teal-600">
                                                {formatDate(row.fecha_agendada_cliente)}
                                                {row.confirmado && <span className="ml-1 text-emerald-500">✓</span>}
                                            </span>
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>

                                    {/* Primer contacto */}
                                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                                        {formatDate(row.fecha_primer_contacto ?? null)}
                                    </td>

                                    {/* Audio */}
                                    <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                                        {row.url_grabacion
                                            ? <AudioPlayer src={row.url_grabacion} />
                                            : <span className="text-slate-200 text-xs">—</span>
                                        }
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── PAGINATION ───────────────────────────────────────────────── */}
            {result.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">
                        Pág. {page} de {result.totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => handlePage(Math.max(1, page - 1))} disabled={page === 1 || isPending}
                            className="rounded-xl px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            ← Anterior
                        </button>
                        {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                            const p = page <= 3 ? i + 1 : page - 2 + i;
                            if (p > result.totalPages) return null;
                            return (
                                <button key={p} onClick={() => handlePage(p)} disabled={isPending}
                                    className={cn("h-9 w-9 flex items-center justify-center rounded-xl font-black transition-all shadow-sm",
                                        p === page ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600"
                                    )}>
                                    {p}
                                </button>
                            );
                        })}
                        <button onClick={() => handlePage(Math.min(result.totalPages, page + 1))} disabled={page === result.totalPages || isPending}
                            className="rounded-xl px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {/* Duplicate lead dialog */}
            {dupPhone && <DuplicateLeadDialog phone={dupPhone} onClose={() => setDupPhone(null)} />}
        </>
    );
}

// ─── COLUMN DEFINITION ────────────────────────────────────────────────────────

const COLUMNS: { key: string; label: string }[] = [
    { key: "fecha_ingreso_crm", label: "Fecha Ingreso" },
    { key: "lead", label: "Lead" },
    { key: "origen", label: "Origen" },
    { key: "estado_llamada", label: "Estado Llamada" },
    { key: "razon_termino", label: "Razón Término" },
    { key: "duracion_segundos", label: "Duración IA" },
    { key: "tiempo_respuesta", label: "T. Respuesta" },
    { key: "cualificacion", label: "Cualificación" },
    { key: "tipo_lead", label: "Tipo Lead" },
    { key: "motivo_anulacion", label: "Motivo Anulación" },
    { key: "fecha_agendada_cliente", label: "Cita Asesor" },
    { key: "fecha_primer_contacto", label: "Primer Contacto" },
    { key: "url_grabacion", label: "Audio" },
];

// ─── DETAIL ITEM ─────────────────────────────────────────────────────────────

function DetailItem({
    icon, label, value, badge, statusColor
}: {
    icon: React.ReactNode;
    label: string;
    value: string | null | undefined;
    badge?: boolean;
    statusColor?: string;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {icon} {label}
            </span>
            {badge && value ? (
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest w-fit", statusColor)}>
                    {value}
                </span>
            ) : (
                <span className={cn("text-xs font-semibold", value ? "text-slate-700" : "text-slate-300")}>
                    {value ?? "—"}
                </span>
            )}
        </div>
    );
}
