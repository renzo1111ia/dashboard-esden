"use client";

import { useState } from "react";
import { KpiConfig, Tenant } from "@/types/tenant";
import { KpiTotals } from "@/lib/actions/analytics";
import { SummaryCard } from "@/components/charts/DashboardCharts";
import {
    Phone, PhoneCall, PhoneMissed, Users, UserX, PhoneOff, Voicemail,
    UserMinus, ThumbsDown, Star, Calendar, Clock, TrendingUp, Activity,
    GripVertical, Maximize2, Edit3, Save, X, ChevronUp, ChevronDown, EyeOff, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTenant } from "@/lib/actions/tenant";
import { useRouter } from "next/navigation";

const ICON_MAP: Record<string, React.ReactNode> = {
    "Phone": <Phone className="h-6 w-6 text-white" />,
    "PhoneCall": <PhoneCall className="h-6 w-6 text-white" />,
    "PhoneMissed": <PhoneMissed className="h-6 w-6 text-white" />,
    "Users": <Users className="h-6 w-6 text-white" />,
    "UserX": <UserX className="h-6 w-6 text-white" />,
    "PhoneOff": <PhoneOff className="h-6 w-6 text-white" />,
    "Voicemail": <Voicemail className="h-6 w-6 text-white" />,
    "UserMinus": <UserMinus className="h-6 w-6 text-white" />,
    "ThumbsDown": <ThumbsDown className="h-6 w-6 text-white" />,
    "Star": <Star className="h-6 w-6 text-white" />,
    "Calendar": <Calendar className="h-6 w-6 text-white" />,
    "Clock": <Clock className="h-6 w-6 text-white" />,
    "TrendingUp": <TrendingUp className="h-6 w-6 text-white" />,
    "Activity": <Activity className="h-6 w-6 text-white" />,
};

interface Props {
    tenant: Tenant;
    initialKpis: KpiConfig[];
    values: KpiTotals;
    dynamicValues: Record<string, number>;
    isAdmin: boolean;
}

export function SummaryManager({ tenant, initialKpis, values, dynamicValues, isAdmin }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [kpis, setKpis] = useState<KpiConfig[]>(initialKpis);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function handleSave() {
        setSaving(true);
        try {
            const newConfig = {
                ...(tenant.config as any),
                kpis: kpis
            };
            const res = await updateTenant(tenant.id, { config: newConfig });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert("Error al guardar: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error inesperado al guardar");
        } finally {
            setSaving(false);
        }
    }

    function move(index: number, direction: 'up' | 'down') {
        const newKpis = [...kpis];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newKpis.length) return;

        const temp = newKpis[index];
        newKpis[index] = newKpis[targetIndex];
        newKpis[targetIndex] = temp;
        setKpis(newKpis);
    }

    function updateKpi(id: string, updates: Partial<KpiConfig>) {
        setKpis(kpis.map(k => k.id === id ? { ...k, ...updates } : k));
    }

    function cycleSize(id: string, current: string) {
        const sizes: KpiConfig["size"][] = ["3", "4", "6", "12"];
        const currentIndex = sizes.indexOf(current as any);
        const nextSize = sizes[(currentIndex + 1) % sizes.length];
        updateKpi(id, { size: nextSize });
    }

    return (
        <div className="mb-10 relative">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Panel <span className="text-blue-600">General</span>
                </h1>

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => { setKpis(initialKpis); setIsEditing(false); }}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    <X className="h-4 w-4" /> Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
                            >
                                <Edit3 className="h-4 w-4" /> Personalizar Tablero
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 text-left transition-all duration-500">
                {kpis.filter(k => isEditing || k.isVisible !== false).map((k, idx) => {
                    const colSpanClass = `md:col-span-${k.size || "4"}`;

                    // Determine value
                    let val: any = 0;
                    if (k.staticKey) {
                        val = (values as any)[k.staticKey] || 0;
                    } else {
                        val = dynamicValues[k.id] || 0;
                    }

                    if (k.calcType === "avg" || k.isPercentage) {
                        val = Number(val || 0).toFixed(2);
                    }
                    if (k.isPercentage) val = val + "%";

                    return (
                        <div
                            key={k.id}
                            className={cn(
                                colSpanClass,
                                "relative group transition-all duration-300",
                                isEditing && "ring-2 ring-blue-400 ring-offset-4 rounded-3xl z-10 scale-[1.02] bg-white shadow-2xl",
                                isEditing && k.isVisible === false && "opacity-40 grayscale"
                            )}
                        >
                            <SummaryCard
                                label={k.label as string}
                                value={typeof val === 'number' ? val.toLocaleString('es-ES') : val}
                                icon={ICON_MAP[k.icon] || <Activity className="h-6 w-6 text-white" />}
                                bgColor={k.color || "bg-slate-600"}
                            />

                            {/* Edit Overlays */}
                            {isEditing && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
                                        <button
                                            title="Mover Arriba"
                                            onClick={() => move(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                                        >
                                            <ChevronUp className="h-5 w-5" />
                                        </button>
                                        <button
                                            title="Mover Abajo"
                                            onClick={() => move(idx, 'down')}
                                            disabled={idx === kpis.length - 1}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30"
                                        >
                                            <ChevronDown className="h-5 w-5" />
                                        </button>
                                        <div className="w-px h-6 bg-slate-100 mx-1" />
                                        <button
                                            title="Cambiar Tamaño"
                                            onClick={() => cycleSize(k.id, k.size)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Maximize2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            title={k.isVisible === false ? "Mostrar" : "Ocultar"}
                                            onClick={() => updateKpi(k.id, { isVisible: k.isVisible === false })}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                k.isVisible === false ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            )}
                                        >
                                            {k.isVisible === false ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
                                        <Edit3 className="h-4 w-4 text-slate-400 ml-2" />
                                        <input
                                            type="text"
                                            value={k.label as string}
                                            onChange={(e) => updateKpi(k.id, { label: e.target.value })}
                                            className="text-xs font-black uppercase tracking-widest text-slate-700 bg-transparent outline-none w-40"
                                            placeholder="Nombre del KPI"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
