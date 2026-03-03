"use client";

import { useEffect, useState } from "react";
import { X, Phone, Clock, FileText, Calendar } from "lucide-react";
import { getCallsByPhone } from "@/lib/actions/calls";
import type { PostCallAnalisis } from "@/types/database";
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

interface Props {
    phone: string;
    onClose: () => void;
}

export function DuplicateLeadDialog({ phone, onClose }: Props) {
    const [calls, setCalls] = useState<PostCallAnalisis[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getCallsByPhone(phone)
            .then(data => {
                if (mounted) {
                    setCalls(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [phone]);

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
                            <h2 className="text-lg font-semibold text-white">Registros del usuario</h2>
                            <p className="text-xs text-indigo-300 font-mono mt-0.5">{phone}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="text-center text-white/40 py-20">
                            No se encontraron registros para este número.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-white/60 mb-2">
                                Se encontraron {calls.length} {calls.length === 1 ? 'registro' : 'registros'}
                            </div>

                            {calls.map((call, index) => (
                                <div key={call.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>

                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-medium text-sm">Lead ID:</span>
                                                <span className="text-white/70 font-mono text-sm bg-white/5 px-2 py-0.5 rounded">{call.lead_id || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(call.created_at)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                                STATUS_COLORS[call.call_status] ?? "bg-white/5 text-white/40 border-white/10"
                                            )}>
                                                {call.call_status}
                                            </span>
                                            {call.duration_seconds !== null && (
                                                <span className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatDuration(call.duration_seconds)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-4 border-t border-white/[0.06]">
                                        <div>
                                            <span className="text-white/40 block mb-1">Tipología:</span>
                                            <span className="text-white/80">{call.tipologia_llamada || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-white/40 block mb-1">Motivo de anulación/no contacto:</span>
                                            <span className="text-white/80">{call.motivo_anulacion || call.motivo_no_contacto || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-white/40 block mb-1">Cualificado:</span>
                                            <span className="text-white/80">{call.is_qualified ? "Sí" : "No"}</span>
                                        </div>
                                        <div>
                                            <span className="text-white/40 block mb-1">Agendado con:</span>
                                            <span className="text-white/80">{call.agendado_con_asesor || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
