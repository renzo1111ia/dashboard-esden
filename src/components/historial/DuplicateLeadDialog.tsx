"use client";

import { useEffect, useState } from "react";
import { X, Phone, Clock, Calendar, PhoneCall, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getCallsByPhone, fetchReintentosByPhone } from "@/lib/actions/calls";
import type { PostCallAnalisis, Reintento } from "@/types/database";
import { formatDuration, formatDate, cn } from "@/lib/utils";

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

/** A unified timeline item */
type TimelineItem =
    | { kind: "call"; date: string; data: PostCallAnalisis }
    | { kind: "reintento"; date: string; data: Reintento };

function getItemDate(item: TimelineItem): string {
    if (item.kind === "call") return item.data.created_at;
    const r = item.data;
    return r.fecha_y_hora ?? r.created_at ?? "";
}

/** Small collapsible section for showing all fields of a reintento */
function ReintentoCard({ reintento }: { reintento: Reintento }) {
    const [expanded, setExpanded] = useState(false);

    const mainFields: [string, string | number | null | undefined][] = [
        ["Estado lead", reintento.estado_del_lead],
        ["Motivo estado", reintento.motivo_de_estado_de_lead],
        ["Nº intento llamada", reintento.numero_de_intento],
        ["Nº intento WhatsApp", reintento.numero_de_intento_whatsapp],
        ["Agendado", reintento.agendado],
        ["Razón desconexión", reintento.razon_de_desconexion],
        ["Duración", reintento.duracion_llamada != null ? formatDuration(reintento.duracion_llamada) : null],
        ["Opt-in WhatsApp", reintento.opt_in_whatsapp],
    ];

    const extraFields: [string, string | number | null | undefined][] = [
        ["Lead ID", reintento.lead_id],
        ["Nombre", reintento.nombre_del_lead],
        ["Apellido", reintento.apellido_del_lead],
        ["País", reintento.pais_del_lead],
        ["Call ID", reintento.call_id],
        ["Reintento llamada", reintento.reintento_de_llamada],
        ["Reintento WhatsApp", reintento.reintento_de_whatsapp],
        ["Estado reintento", reintento.estado_de_reintento],
        ["Llamada asesor", reintento.llamada_de_asesor],
        ["Origen", reintento.origen],
        ["Confirmar cita", reintento.confirmacion_cita_enviada],
        ["Recordatorio 24h", reintento.recordatorio_24hs],
        ["Recordatorio 1h", reintento.recordatorio_1_h],
        ["Aviso WA intento", reintento.aviso_whatsapp_de_intento_llamada],
        ["Seguimiento AgIA", reintento.tiene_seguimiento_agente_ia],
        ["Post WA análisis", reintento.post_whatsapp_analisis_realizado],
        ["Campaña", reintento.campana],
        ["Tipo lead", reintento.tipo_lead],
        ["Master interés", reintento.master_de_interes],
        ["1ª llamada", reintento.momento_de_primera_llamada],
        ["Último envío WA", reintento.ultimo_envio_whatsapp],
        ["Conversation Chatwoot", reintento.conversartion_id_chatwoot],
        ["Teléfono", reintento.telefono ?? reintento.phone_number],
        ["Nº formato erróneo", reintento.numero_formato_erroneo],
        ["Recording", reintento.recording],
    ];

    return (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/30 group-hover:bg-indigo-500/60 transition-colors" />

            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-3 pl-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5">
                    <RefreshCw className="h-3 w-3" /> Reintento
                </span>
                {reintento.estado_de_reintento && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 text-white/50 border-white/10">
                        {reintento.estado_de_reintento}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                    <Calendar className="h-3 w-3" />
                    {formatDate(reintento.fecha_y_hora ?? reintento.created_at ?? "")}
                </span>
            </div>

            {/* Main fields grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                {mainFields.map(([label, val]) =>
                    val != null && val !== "" ? (
                        <div key={label}>
                            <span className="text-white/35 block">{label}</span>
                            <span className="text-white/75">{String(val)}</span>
                        </div>
                    ) : null
                )}
            </div>

            {/* Expand toggle */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 pl-2 flex items-center gap-1 text-xs text-indigo-400/60 hover:text-indigo-400 transition"
            >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Ocultar detalle" : "Ver todos los campos"}
            </button>

            {expanded && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                    {extraFields.map(([label, val]) =>
                        val != null && val !== "" ? (
                            <div key={label}>
                                <span className="text-white/35 block">{label}</span>
                                <span className="text-white/60 break-all">{String(val)}</span>
                            </div>
                        ) : null
                    )}
                </div>
            )}
        </div>
    );
}

/** Card for a post_call_analisis record */
function CallCard({ call }: { call: PostCallAnalisis }) {
    const [expanded, setExpanded] = useState(false);
    const extraKeys = Object.keys(call.extra_data ?? {}).filter(
        (k) => call.extra_data[k] != null && call.extra_data[k] !== ""
    );

    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors" />

            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-3 pl-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                    <PhoneCall className="h-3 w-3" /> Llamada
                </span>
                <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    STATUS_COLORS[call.call_status] ?? "bg-white/5 text-white/40 border-white/10"
                )}>
                    {call.call_status}
                </span>
                {call.duration_seconds != null && (
                    <span className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration_seconds)}
                    </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                    <Calendar className="h-3 w-3" />
                    {formatDate(call.created_at)}
                </span>
            </div>

            {/* Main fields grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                {call.lead_id && (
                    <div>
                        <span className="text-white/35 block">Lead ID</span>
                        <span className="text-white/75 font-mono">{call.lead_id}</span>
                    </div>
                )}
                {call.tipologia_llamada && (
                    <div>
                        <span className="text-white/35 block">Tipología</span>
                        <span className="text-white/75">{call.tipologia_llamada}</span>
                    </div>
                )}
                {call.master_interes && (
                    <div>
                        <span className="text-white/35 block">Master interés</span>
                        <span className="text-white/75">{call.master_interes}</span>
                    </div>
                )}
                <div>
                    <span className="text-white/35 block">Cualificado</span>
                    <span className={call.is_qualified ? "text-emerald-400" : "text-white/50"}>
                        {call.is_qualified ? "Sí" : "No"}
                    </span>
                </div>
                {call.agendado_con_asesor && (
                    <div>
                        <span className="text-white/35 block">Agendado con</span>
                        <span className="text-white/75">{call.agendado_con_asesor}</span>
                    </div>
                )}
                {(call.motivo_anulacion || call.motivo_no_contacto) && (
                    <div className="col-span-2">
                        <span className="text-white/35 block">Motivo</span>
                        <span className="text-white/75">{call.motivo_anulacion ?? call.motivo_no_contacto}</span>
                    </div>
                )}
                {call.opt_in_whatsapp && (
                    <div>
                        <span className="text-white/35 block">Opt-in WA</span>
                        <span className="text-white/75">{call.opt_in_whatsapp}</span>
                    </div>
                )}
            </div>

            {/* Extra data */}
            {extraKeys.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-3 pl-2 flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition"
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? "Ocultar campos extra" : `Ver ${extraKeys.length} campos adicionales`}
                    </button>
                    {expanded && (
                        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-x-4 gap-y-2 text-xs pl-2">
                            {extraKeys.map((k) => (
                                <div key={k}>
                                    <span className="text-indigo-400/50 block">⚡ {k}</span>
                                    <span className="text-indigo-300/70 break-all">{String(call.extra_data[k])}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

interface Props {
    phone: string;
    onClose: () => void;
}

export function DuplicateLeadDialog({ phone, onClose }: Props) {
    const [calls, setCalls] = useState<PostCallAnalisis[]>([]);
    const [reintentos, setReintentos] = useState<Reintento[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        Promise.all([
            getCallsByPhone(phone).catch(() => [] as PostCallAnalisis[]),
            fetchReintentosByPhone(phone).catch(() => [] as Reintento[]),
        ]).then(([callsData, reintentosData]) => {
            if (mounted) {
                setCalls(callsData);
                setReintentos(reintentosData);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, [phone]);

    // Build unified, sorted timeline
    const timeline: TimelineItem[] = [
        ...calls.map((c) => ({ kind: "call" as const, date: c.created_at, data: c })),
        ...reintentos.map((r) => ({
            kind: "reintento" as const,
            date: r.fecha_y_hora ?? r.created_at ?? "",
            data: r,
        })),
    ].sort((a, b) => {
        const da = getItemDate(a);
        const db = getItemDate(b);
        return db.localeCompare(da); // most recent first
    });

    const totalItems = timeline.length;

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
                    <button
                        onClick={onClose}
                        title="Cerrar"
                        aria-label="Cerrar"
                        className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Summary badges */}
                {!loading && totalItems > 0 && (
                    <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center gap-3 text-xs flex-wrap">
                        <span className="text-white/40">
                            {totalItems} {totalItems === 1 ? "interacción" : "interacciones"} encontradas
                        </span>
                        {calls.length > 0 && (
                            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                                <PhoneCall className="h-3 w-3" />
                                {calls.length} {calls.length === 1 ? "llamada" : "llamadas"}
                            </span>
                        )}
                        {reintentos.length > 0 && (
                            <span className="flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-0.5">
                                <RefreshCw className="h-3 w-3" />
                                {reintentos.length} {reintentos.length === 1 ? "reintento" : "reintentos"}
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
                    ) : totalItems === 0 ? (
                        <div className="text-center text-white/40 py-20">
                            No se encontraron registros para este número.
                        </div>
                    ) : (
                        timeline.map((item, idx) =>
                            item.kind === "call" ? (
                                <CallCard key={`call-${item.data.id}`} call={item.data} />
                            ) : (
                                <ReintentoCard key={`reintento-${item.data.id ?? idx}`} reintento={item.data} />
                            )
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
