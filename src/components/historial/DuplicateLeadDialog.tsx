"use client";

import { useEffect, useState } from "react";
import { X, Phone, Clock, Calendar, PhoneCall, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getCallsByPhone, fetchIntentosByPhone } from "@/lib/actions/calls";
import type { HistorialRow, IntentoLlamada } from "@/types/database";
import { formatDuration, formatDate, cn } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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

// ─── CALL CARD ────────────────────────────────────────────────────────────────

function CallCard({ call }: { call: HistorialRow }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors" />

            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-3 pl-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                    <PhoneCall className="h-3 w-3" /> Llamada
                </span>
                {call.estado_llamada && (
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        STATUS_COLORS[call.estado_llamada] ?? "bg-white/5 text-white/40 border-white/10")}>
                        {call.estado_llamada}
                    </span>
                )}
                {call.duracion_segundos != null && (
                    <span className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duracion_segundos)}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                    <Calendar className="h-3 w-3" />
                    {formatDate(call.fecha_inicio ?? null)}
                </span>
            </div>

            {/* Main fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                {call.razon_termino && (
                    <div>
                        <span className="text-white/35 block">Razón término</span>
                        <span className="text-white/75">{call.razon_termino}</span>
                    </div>
                )}
                {call.cualificacion && (
                    <div>
                        <span className="text-white/35 block">Cualificación</span>
                        <span className={call.cualificacion === "SI" || call.cualificacion === "CUALIFICADO"
                            ? "text-emerald-400" : "text-white/60"}>
                            {call.cualificacion}
                        </span>
                    </div>
                )}
                {call.motivo_anulacion && (
                    <div className="col-span-2">
                        <span className="text-white/35 block">Motivo anulación</span>
                        <span className="text-white/75">{call.motivo_anulacion}</span>
                    </div>
                )}
                {call.fecha_agendada_cliente && (
                    <div>
                        <span className="text-white/35 block">Cita agendada</span>
                        <span className="text-teal-300">{formatDate(call.fecha_agendada_cliente)}</span>
                    </div>
                )}
                {call.tipo_agente && (
                    <div>
                        <span className="text-white/35 block">Tipo agente</span>
                        <span className="text-white/60">{call.tipo_agente}</span>
                    </div>
                )}
            </div>

            {/* Expand: resumen + audio */}
            {(call.resumen || call.url_grabacion) && (
                <>
                    <button onClick={() => setExpanded((v) => !v)}
                        className="mt-3 pl-2 flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition">
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? "Ocultar detalle" : "Ver resumen / audio"}
                    </button>
                    {expanded && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] pl-2 space-y-3">
                            {call.resumen && (
                                <div>
                                    <span className="text-white/35 text-xs block mb-1">Resumen</span>
                                    <p className="text-xs text-white/55 leading-relaxed whitespace-pre-wrap">{call.resumen}</p>
                                </div>
                            )}
                            {call.url_grabacion && <AudioPlayer src={call.url_grabacion} />}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── INTENTO CARD ─────────────────────────────────────────────────────────────

function IntentoCard({ intento }: { intento: IntentoLlamada }) {
    const [expanded, setExpanded] = useState(false);

    const fields: [string, string | number | null | undefined][] = [
        ["Tipo intento", intento.tipo_intento],
        ["Nº intento", intento.numero_intento],
        ["Estado", intento.estado],
        ["Fecha reintento", formatDate(intento.fecha_reintento ?? null)],
        ["Fecha ejecución", formatDate(intento.fecha_ejecucion ?? null)],
    ];

    return (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover:bg-indigo-500/60 transition-colors" />

            <div className="flex flex-wrap items-center gap-2 mb-3 pl-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5">
                    <RefreshCw className="h-3 w-3" /> Intento
                </span>
                {intento.tipo_intento && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 text-white/50 border-white/10">
                        {intento.tipo_intento}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                    <Calendar className="h-3 w-3" />
                    {formatDate(intento.fecha_creacion ?? null)}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                {fields.map(([label, val]) =>
                    val != null && val !== "" && val !== "—" ? (
                        <div key={label}>
                            <span className="text-white/35 block">{label}</span>
                            <span className="text-white/75">{String(val)}</span>
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );
}

// ─── DIALOG ───────────────────────────────────────────────────────────────────

interface Props {
    phone: string;
    onClose: () => void;
}

export function DuplicateLeadDialog({ phone, onClose }: Props) {
    const [calls, setCalls] = useState<HistorialRow[]>([]);
    const [intentos, setIntentos] = useState<IntentoLlamada[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        Promise.all([
            getCallsByPhone(phone).catch(() => [] as HistorialRow[]),
            fetchIntentosByPhone(phone).catch(() => [] as IntentoLlamada[]),
        ]).then(([callsData, intentosData]) => {
            if (mounted) {
                setCalls(callsData);
                setIntentos(intentosData);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, [phone]);

    // Unified timeline sorted by date desc
    type TimelineItem =
        | { kind: "call"; date: string; data: HistorialRow }
        | { kind: "intento"; date: string; data: IntentoLlamada };

    // Flattern calls from leads (consolidated objects)
    const flatCalls: TimelineItem[] = [];
    calls.forEach(lead => {
        lead.llamadas.forEach(ll => {
            flatCalls.push({
                kind: "call",
                date: ll.fecha_inicio ?? "",
                data: { ...lead, ...ll, llamadas: lead.llamadas } as HistorialRow
            });
        });
    });

    const timeline: TimelineItem[] = [
        ...flatCalls,
        ...intentos.map((i) => ({ kind: "intento" as const, date: i.fecha_creacion ?? "", data: i })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm sm:p-4">
            <div className="relative flex h-full w-full max-w-3xl flex-col bg-[#070b14] sm:min-h-0 sm:rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-right overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Historial del número</h2>
                            <p className="text-xs text-indigo-300 font-mono mt-0.5">{phone}</p>
                        </div>
                    </div>
                    <button onClick={onClose} title="Cerrar" aria-label="Cerrar"
                        className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Summary badges */}
                {!loading && timeline.length > 0 && (
                    <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center gap-3 text-xs flex-wrap">
                        <span className="text-white/40">{timeline.length} interacciones encontradas</span>
                        {calls.length > 0 && (
                            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                                <PhoneCall className="h-3 w-3" /> {calls.length} llamada{calls.length !== 1 && "s"}
                            </span>
                        )}
                        {intentos.length > 0 && (
                            <span className="flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5">
                                <RefreshCw className="h-3 w-3" /> {intentos.length} intento{intentos.length !== 1 && "s"}
                            </span>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : timeline.length === 0 ? (
                        <div className="text-center text-white/40 py-20">
                            No se encontraron registros para este número.
                        </div>
                    ) : (
                        timeline.map((item, idx) =>
                            item.kind === "call"
                                ? <CallCard key={`call-${item.data.id}`} call={item.data} />
                                : <IntentoCard key={`intento-${item.data.id ?? idx}`} intento={item.data} />
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
