"use client";

import { useState, useCallback, useTransition, useEffect, useRef, useMemo } from "react";
import { fetchCalls, type FetchCallsResult } from "@/lib/actions/calls";
import { DuplicateLeadDialog } from "@/components/historial/DuplicateLeadDialog";
import { AudioPlayer } from "@/components/historial/AudioPlayer";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import type { HistorialRow } from "@/types/database";
import {
    Search, RotateCcw, Calendar, Phone, User,
    Clock, MapPin, Target, CheckCircle, AlertCircle,
    Megaphone, MessageSquare, Plus
} from "lucide-react";
import { CreateLeadDialog } from "@/components/historial/CreateLeadDialog";

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
    CONTACTED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    NO_CONTACT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    VOICEMAIL: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    TRANSFERRED_TO_HUMAN: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
    ANNULLED: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    LATENCY_DROP: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
    USER_INTERRUPTED: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    BUSY: "bg-muted text-muted-foreground border-border",
    INVALID_NUMBER: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const TIPO_LEAD_COLORS: Record<string, string> = {
    nuevo: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    localizable: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    ilocalizable: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
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
    columns?: { key: string; label: string }[];
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function HistorialTable({ initialData, fromDate, toDate, columns }: Props) {
    const [result, setResult] = useState<FetchCallsResult>(initialData);
    const [page, setPage] = useState(1);
    
    // Use provided columns or fallback to dynamic detection from keys
    const activeColumns = useMemo(() => {
        if (columns && columns.length > 0) return columns;
        
        // If no columns configured, use keys from first data row
        if (result.data.length > 0) {
            const firstRow = result.data[0];
            const ignoredKeys = ["id", "id_lead", "llamadas", "total_llamadas", "url_grabacion", "transcripcion", "resumen"];
            return Object.keys(firstRow)
                .filter(key => !ignoredKeys.includes(key))
                .map(key => ({
                    key,
                    label: key.replace(/_/g, " ").toUpperCase()
                }));
        }
        
        return [];
    }, [columns, result.data]);

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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    
    // ── Dual Scroll Sync ──────────────────────────────────────────────────────
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    const onScrollTable = useCallback(() => {
        if (!isScrolling.current && tableContainerRef.current && topScrollRef.current) {
            isScrolling.current = true;
            topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
            setTimeout(() => { isScrolling.current = false; }, 0);
        }
    }, []);

    const onScrollTop = useCallback(() => {
        if (!isScrolling.current && tableContainerRef.current && topScrollRef.current) {
            isScrolling.current = true;
            tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
            setTimeout(() => { isScrolling.current = false; }, 0);
        }
    }, []);

    const [isPending, startTransition] = useTransition();

    const [tableScrollWidth, setTableScrollWidth] = useState(0);

    useEffect(() => {
        if (tableContainerRef.current) {
            setTableScrollWidth(tableContainerRef.current.scrollWidth);
            
            // Re-calculate if data changes
            const observer = new ResizeObserver(() => {
                if (tableContainerRef.current) {
                    setTableScrollWidth(tableContainerRef.current.scrollWidth);
                }
            });
            observer.observe(tableContainerRef.current);
            return () => observer.disconnect();
        }
    }, [result.data]);

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
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">

                {/* Row 1: date presets + custom range */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
                        {DATE_PRESETS.map((pr) => (
                            <button key={pr.value} onClick={() => setDraftPreset(pr.value)}
                                className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                                    draftPreset === pr.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-card-foreground"
                                )}>
                                {pr.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {(["from", "to"] as const).map((which) => (
                            <div key={which} className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input type="date" title={which === "from" ? "Fecha inicio" : "Fecha fin"}
                                    value={which === "from" ? draftFrom : draftTo}
                                    onChange={(e) => { which === "from" ? setDraftFrom(e.target.value) : setDraftTo(e.target.value); setDraftPreset("custom"); }}
                                    className="w-[140px] rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs font-bold text-card-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 2: search + filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* search */}
                    <div className="relative col-span-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Buscar por teléfono, nombre..."
                            value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                            className="w-full rounded-xl border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm font-medium text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                        />
                    </div>

                    {/* estado llamada */}
                    <select title="Estado de llamada" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-bold text-card-foreground outline-none focus:border-primary focus:bg-card">
                        <option value="ALL">Todos los estados</option>
                        {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* tipo lead */}
                    <select title="Tipo lead" value={draftTipoLead} onChange={(e) => setDraftTipoLead(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-bold text-card-foreground outline-none focus:border-primary focus:bg-card">
                        <option value="">Tipo de lead</option>
                        <option value="nuevo">Nuevo</option>
                        <option value="localizable">Localizable</option>
                        <option value="ilocalizable">Ilocalizable</option>
                    </select>

                    <input type="text" placeholder="País..." value={draftPais} onChange={(e) => setDraftPais(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 py-2.5 px-4 text-sm font-medium outline-none focus:border-primary focus:bg-card placeholder:text-muted-foreground" />

                    <input type="text" placeholder="Origen..." value={draftOrigen} onChange={(e) => setDraftOrigen(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 py-2.5 px-4 text-sm font-medium outline-none focus:border-primary focus:bg-card placeholder:text-muted-foreground" />

                    <input type="text" placeholder="Campaña..." value={draftCampana} onChange={(e) => setDraftCampana(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 py-2.5 px-4 text-sm font-medium outline-none focus:border-primary focus:bg-card placeholder:text-muted-foreground" />

                    <input type="text" placeholder="Cualificación..." value={draftCual} onChange={(e) => setDraftCual(e.target.value)}
                        className="rounded-xl border border-border bg-muted/30 py-2.5 px-4 text-sm font-medium outline-none focus:border-primary focus:bg-card placeholder:text-muted-foreground" />
                </div>

                {/* Row 3: stats + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        {result.count.toLocaleString()} resultados
                    </span>
                    <div className="flex gap-3">
                        <button onClick={() => setIsCreateDialogOpen(true)}
                            className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-5 py-2 text-sm font-bold text-blue-600 hover:bg-blue-500/20 transition-all">
                            <Plus className="h-4 w-4" /> Nuevo Lead
                        </button>
                        <div className="w-px h-8 bg-border/50 mx-1 hidden md:block" />
                        <button onClick={resetFilters} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-card-foreground transition-colors">
                            <RotateCcw className="h-4 w-4" /> Limpiar
                        </button>
                        <button onClick={applyFilters} disabled={isPending}
                            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50">
                            {isPending ? "..." : "Aplicar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Popover: Ver detalle */}
            {popoverRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md px-4 py-10"
                    onClick={() => setPopoverRow(null)}>
                    <div className="max-w-4xl w-full max-h-full overflow-hidden flex flex-col rounded-[2.5rem] border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-8 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
                                    <User className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-card-foreground leading-tight">
                                        {popoverRow.nombre} {popoverRow.apellido}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="font-mono text-sm font-bold text-primary tracking-tight">{popoverRow.telefono}</span>
                                        <span className="h-1 w-1 rounded-full bg-border" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{popoverRow.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setPopoverRow(null)}
                                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-card border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all font-bold shadow-sm">
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                            
                            {/* 1. Lead & Programa */}
                            <section className="bg-slate-50 dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                                    <User className="h-3 w-3" /> Información del Lead
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                    <DetailItem label="Nombre" value={`${popoverRow.nombre} ${popoverRow.apellido}`} />
                                    <DetailItem label="Teléfono" value={popoverRow.telefono} />
                                    <DetailItem label="País" value={popoverRow.pais} icon={<MapPin className="h-3.5 w-3.5" />} />
                                    <DetailItem label="Programa" value={popoverRow.programa_nombre} icon={<Target className="h-3.5 w-3.5" />} />
                                </div>
                            </section>

                            {/* 2. Cualificación y Agendamiento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <section className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                        <Target className="h-3 w-3" /> Cualificación
                                    </h4>
                                    <div className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] rounded-[2rem] p-6 border border-emerald-500/10 space-y-5">
                                        <DetailItem label="Resultado" value={popoverRow.cualificacion} />
                                        <DetailItem label="Motivo Anulación" value={popoverRow.motivo_anulacion} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Exp. Laboral" value={popoverRow.anios_experiencia} />
                                            <DetailItem label="Estudios" value={popoverRow.nivel_estudios} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                        <Calendar className="h-3 w-3" /> Cita con Asesor
                                    </h4>
                                    <div className="bg-teal-500/[0.03] dark:bg-teal-500/[0.01] rounded-[2rem] p-6 border border-teal-500/10 space-y-5">
                                        <DetailItem label="Fecha Agendada" value={popoverRow.fecha_agendada_cliente ? formatDate(popoverRow.fecha_agendada_cliente) : "Sin cita"} icon={<Calendar className="h-3.5 w-3.5" />} />
                                        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/50">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Confirmado</span>
                                            {popoverRow.confirmado ? (
                                                <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-500/20">SÍ</span>
                                            ) : (
                                                <span className="bg-rose-500/10 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black border border-rose-500/20">NO</span>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* 3. Módulos Externos (WhatsApp, Notif, Intentos) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                                <section className="bg-muted/30 rounded-3xl p-6 border border-border">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <RotateCcw className="h-2.5 w-2.5" /> Historial Intentos
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl font-black text-card-foreground">{popoverRow.intentos_count}</div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-tight">Total de reintentos <br/>realizados</p>
                                    </div>
                                </section>

                                <section className="bg-muted/30 rounded-3xl p-6 border border-border">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-2.5 w-2.5" /> WhatsApp
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-muted-foreground">Opt-in:</span>
                                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md", popoverRow.opt_in_whatsapp ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                                {popoverRow.opt_in_whatsapp ? "SÍ" : "NO"}
                                            </span>
                                        </div>
                                        <DetailItem label="Estado" value={popoverRow.whatsapp_status} />
                                    </div>
                                </section>

                                <section className="bg-muted/30 rounded-3xl p-6 border border-border">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Megaphone className="h-2.5 w-2.5" /> Notificaciones
                                    </h4>
                                    <DetailItem label="Último Envío" value={popoverRow.notificaciones_status} />
                                </section>
                            </div>

                            {/* 4. Timeline de Llamadas (Mantenemos el formato anterior por ser muy útil) */}
                            <div className="pt-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2">
                                     <Phone className="h-3 w-3" /> Historial de Reintentos (Detalle)
                                </h4>
                                <div className="space-y-4">
                                    {popoverRow.llamadas.map((llamada, idx) => (
                                        <div key={llamada.id} className={cn(
                                            "relative pl-8 pb-4 border-l-2 last:border-0 last:pb-0",
                                            idx === 0 ? "border-blue-500" : "border-slate-100"
                                        )}>
                                            {/* Bullet */}
                                            <div className={cn(
                                                "absolute -left-[11px] top-0 h-5 w-5 rounded-full border-4 border-card shadow-sm flex items-center justify-center",
                                                idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
                                            )} />

                                            <div className={cn(
                                                "rounded-[1.5rem] border p-5 transition-all",
                                                idx === 0 ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border bg-card"
                                            )}>
                                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase tracking-widest">
                                                                Intento {popoverRow.total_llamadas - idx}
                                                            </span>
                                                            <span className="text-xs font-black text-card-foreground">
                                                                {formatDate(llamada.fecha_inicio ?? null)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                                                                STATUS_COLORS[llamada.estado_llamada ?? ""] ?? "bg-muted text-muted-foreground border-border")}>
                                                                {llamada.estado_llamada}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
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
                                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                            <AlertCircle className="h-3 w-3" /> Resumen IA
                                                        </p>
                                                        <p className="text-xs text-card-foreground leading-relaxed italic line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
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

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-border bg-muted/30 flex justify-end">
                            <button onClick={() => setPopoverRow(null)}
                                className="px-8 py-3 rounded-2xl bg-card border border-border text-sm font-black text-muted-foreground hover:bg-muted hover:text-card-foreground transition-all shadow-sm">
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TOP SCROLLBAR (Dummy Div) ─────────────────────────────────── */}
            <div 
                ref={topScrollRef}
                onScroll={onScrollTop}
                className="overflow-x-auto h-5 mb-2 sticky top-[100px] z-[20] custom-scrollbar scrollbar-thin"
                style={{ scrollbarWidth: "thin" }}
            >
                <div style={{ width: tableScrollWidth || "100%", height: "1px" }} />
            </div>

            {/* ── TABLE ───────────────────────────────────────────────────── */}
            <div 
                ref={tableContainerRef}
                onScroll={onScrollTable}
                className="overflow-x-auto rounded-[2.5rem] border border-border bg-card shadow-xl shadow-black/5"
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            {activeColumns.map((col: { key: string; label: string }) => (
                                <th key={col.key} className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-border transition-opacity", isPending && "opacity-50")}>
                        {result.data.length === 0 ? (
                            <tr>
                                <td colSpan={activeColumns.length} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/30">
                                            <Search className="h-8 w-8" />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground/60">No se encontraron registros para los filtros aplicados</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            result.data.map((row) => (
                                <tr key={row.id} className="group hover:bg-primary/5 transition-all cursor-pointer"
                                    onClick={() => setPopoverRow(row)}>
                                    {activeColumns.map((col: { key: string; label: string }) => (
                                        <td key={col.key} className="px-6 py-5 whitespace-nowrap">
                                            {renderCell(row, col.key, setDupPhone)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── PAGINATION ───────────────────────────────────────────────── */}
            {result.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="uppercase tracking-widest bg-muted px-3 py-1 rounded-lg border border-border">
                        Pág. {page} de {result.totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => handlePage(Math.max(1, page - 1))} disabled={page === 1 || isPending}
                            className="rounded-xl px-4 py-2 border border-border bg-card hover:bg-muted disabled:opacity-30 transition-all shadow-sm">
                            ← Anterior
                        </button>
                        {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                            const p = page <= 3 ? i + 1 : page - 2 + i;
                            if (p > result.totalPages) return null;
                            return (
                                <button key={p} onClick={() => handlePage(p)} disabled={isPending}
                                    className={cn("h-9 w-9 flex items-center justify-center rounded-xl font-black transition-all shadow-sm",
                                        p === page ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                                    )}>
                                    {p}
                                </button>
                            );
                        })}
                        <button onClick={() => handlePage(Math.min(result.totalPages, page + 1))} disabled={page === result.totalPages || isPending}
                            className="rounded-xl px-4 py-2 border border-border bg-card hover:bg-muted disabled:opacity-30 transition-all shadow-sm">
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}

            {/* Duplicate lead dialog */}
            {dupPhone && <DuplicateLeadDialog phone={dupPhone} onClose={() => setDupPhone(null)} />}

            {/* Create lead dialog */}
            {isCreateDialogOpen && (
                <CreateLeadDialog 
                    onClose={() => setIsCreateDialogOpen(false)} 
                    onSuccess={() => {
                        applyFilters(); // Refresh data
                    }} 
                />
            )}
        </>
    );
}

// ─── COLUMN DEFINITION ────────────────────────────────────────────────────────

// No default columns anymore, requested to be empty/dynamic from Supabase
const DEFAULT_COLUMNS: { key: string; label: string }[] = [];

function renderCell(row: HistorialRow, key: string, setDupPhone: (p: string) => void) {
    switch (key) {
        case "fecha_ingreso_crm":
            return (
                <span className="text-xs font-bold text-muted-foreground">
                    {formatDate(row.fecha_ingreso_crm ?? null)}
                </span>
            );

        case "lead":
            return (
                <div className="flex flex-col"
                    onClick={(e) => { e.stopPropagation(); if (row.telefono) setDupPhone(row.telefono); }}>
                    <span className="font-black text-card-foreground text-sm tracking-tight group-hover:text-primary transition-colors">
                        {row.nombre} {row.apellido}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-primary hover:underline">
                            {row.telefono ?? "—"}
                        </span>
                        {row.pais && (
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                · {row.pais}
                            </span>
                        )}
                    </div>
                </div>
            );

        case "programa_nombre":
            return (
                <span className="text-xs font-black text-muted-foreground uppercase tracking-tight">
                    {row.programa_nombre ?? "—"}
                </span>
            );

        case "cualificacion":
            return row.cualificacion ? (
                <div className="flex flex-col gap-1">
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest w-fit",
                        row.cualificacion === "SI" || row.cualificacion === "CUALIFICADO"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}>
                        {row.cualificacion}
                    </span>
                    {row.motivo_anulacion && (
                        <span className="text-[9px] text-muted-foreground italic truncate max-w-[120px]" title={row.motivo_anulacion}>
                            {row.motivo_anulacion}
                        </span>
                    )}
                </div>
            ) : <span className="text-muted-foreground/30 text-xs">—</span>;

        case "fecha_agendada_cliente":
            return row.fecha_agendada_cliente ? (
                <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {formatDate(row.fecha_agendada_cliente)}
                    {row.confirmado && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                </span>
            ) : <span className="text-muted-foreground/30 text-xs">—</span>;

        case "intentos_count":
            return (
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted font-black text-xs text-muted-foreground border border-border mx-auto">
                    {row.intentos_count}
                </span>
            );

        case "estado_llamada":
            return (
                <div className="flex items-center gap-3">
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                        STATUS_COLORS[row.estado_llamada ?? ""] ?? "bg-slate-50 text-slate-400 border-slate-100")}>
                        {row.estado_llamada ?? "—"}
                    </span>
                    {row.url_grabacion && (
                        <div onClick={(e) => e.stopPropagation()} className="w-32">
                            <AudioPlayer src={row.url_grabacion} />
                        </div>
                    )}
                </div>
            );

        case "whatsapp_status":
            return row.opt_in_whatsapp !== null ? (
                <div className="flex flex-col gap-1 text-xs">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter w-fit border",
                        row.opt_in_whatsapp ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                    )}>
                        {row.opt_in_whatsapp ? "OPT-IN" : "NO OPT-IN"}
                    </span>
                    {row.whatsapp_status && (
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            {row.whatsapp_status}
                        </span>
                    )}
                </div>
            ) : <span className="text-muted-foreground/30 text-xs">—</span>;

        case "notificaciones_status":
            return row.notificaciones_status ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 text-[9px] font-black uppercase tracking-widest">
                    <Megaphone className="h-2.5 w-2.5" />
                    {row.notificaciones_status}
                </span>
            ) : <span className="text-muted-foreground/30 text-xs">—</span>;

        default:
            // Dynamic/Raw fields
            const val = row[key];
            if (val === null || val === undefined) return <span className="text-muted-foreground/30">—</span>;
            if (typeof val === "boolean") return val ? "Sí" : "No";
            if (typeof val === "string" && val.includes("T") && !isNaN(Date.parse(val))) return formatDate(val);
            return <span className="text-xs font-medium text-card-foreground">{String(val)}</span>;
    }
}

// ─── DETAIL ITEM ─────────────────────────────────────────────────────────────

function DetailItem({
    icon, label, value, badge, statusColor
}: {
    icon?: React.ReactNode;
    label: string;
    value: string | number | null | undefined;
    badge?: boolean;
    statusColor?: string;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {icon} {label}
            </span>
            {badge && value ? (
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest w-fit", statusColor)}>
                    {value}
                </span>
            ) : (
                <span className={cn("text-xs font-semibold", value != null ? "text-card-foreground" : "text-muted-foreground/30")}>
                    {value ?? "—"}
                </span>
            )}
        </div>
    );
}
