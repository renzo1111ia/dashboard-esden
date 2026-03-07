"use client";

import { useState } from "react";
import { ChartConfig, Tenant } from "@/types/tenant";
import {
    AreaChartComponent,
    VerticalBarChart,
    DonutChart
} from "@/components/charts/DashboardCharts";
import {
    Maximize2, Edit3, Save, X, ChevronUp, ChevronDown, EyeOff, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTenant } from "@/lib/actions/tenant";
import { useRouter } from "next/navigation";

interface Props {
    tenant: Tenant;
    initialCharts: ChartConfig[];
    data: Record<string, any>;
    isAdmin: boolean;
}

export function ChartManager({ tenant, initialCharts, data, isAdmin }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [charts, setCharts] = useState<ChartConfig[]>(initialCharts);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function handleSave() {
        setSaving(true);
        try {
            const newConfig = {
                ...(tenant.config as any),
                charts: charts
            };
            const res = await updateTenant(tenant.id, { config: newConfig });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert("Error al guardar graficos: " + res.error);
            }
        } finally {
            setSaving(false);
        }
    }

    function move(index: number, direction: 'up' | 'down') {
        const newCharts = [...charts];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCharts.length) return;
        const temp = newCharts[index];
        newCharts[index] = newCharts[targetIndex];
        newCharts[targetIndex] = temp;
        setCharts(newCharts);
    }

    function updateChart(id: string, updates: Partial<ChartConfig>) {
        setCharts(charts.map(c => c.id === id ? { ...c, ...updates } : c));
    }

    function cycleSize(id: string, current: string) {
        const nextSize = current === "6" ? "12" : "6";
        updateChart(id, { size: nextSize as any });
    }

    return (
        <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="w-8 h-1 bg-blue-600 rounded-full" />
                    Métricas Detalladas
                </h2>
                {isAdmin && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                        <Edit3 className="h-3.5 w-3.5" /> Reordenar Gráficos
                    </button>
                )}
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            title="Descartar Cambios"
                            aria-label="Descartar Cambios"
                            onClick={() => { setCharts(initialCharts); setIsEditing(false); }}
                            className="p-2 text-slate-400 hover:text-red-500"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            title="Guardar Cambios"
                            aria-label="Guardar Cambios"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                            <Save className="h-3.5 w-3.5" /> {saving ? "..." : "Guardar"}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {charts.filter(c => isEditing || c.isVisible !== false).map((c, idx) => {
                    const colSpanClass = c.size === "12" ? "lg:col-span-12" : "lg:col-span-6";
                    const chartData = data[c.dataKey] || [];

                    return (
                        <div key={c.id} className={cn(colSpanClass, "relative group transition-all duration-300", isEditing && "ring-2 ring-blue-400 ring-offset-4 rounded-3xl z-10 scale-[1.01] bg-white shadow-xl")}>
                            {c.type === 'area' && <AreaChartComponent title={c.title} data={chartData} />}
                            {c.type === 'vertical-bar' && <VerticalBarChart title={c.title} data={chartData} />}
                            {c.type === 'donut' && <DonutChart title={c.title} data={chartData} isDonut={c.isDonut} centerLabel={c.centerLabel} />}

                            {isEditing && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-[2px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
                                        <button
                                            type="button"
                                            title="Subir"
                                            aria-label="Subir"
                                            onClick={() => move(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                                        >
                                            <ChevronUp className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Bajar"
                                            aria-label="Bajar"
                                            onClick={() => move(idx, 'down')}
                                            disabled={idx === charts.length - 1}
                                            className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                                        >
                                            <ChevronDown className="h-5 w-5" />
                                        </button>
                                        <div className="w-px h-6 bg-slate-100 mx-1" />
                                        <button
                                            type="button"
                                            title="Cambiar Ancho"
                                            aria-label="Cambiar Ancho"
                                            onClick={() => cycleSize(c.id, c.size)}
                                            className="p-2 text-slate-400 hover:text-blue-600"
                                        >
                                            <Maximize2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            title={c.isVisible === false ? "Mostrar" : "Ocultar"}
                                            aria-label={c.isVisible === false ? "Mostrar" : "Ocultar"}
                                            onClick={() => updateChart(c.id, { isVisible: c.isVisible === false })}
                                            className="p-2 text-slate-400 hover:text-blue-600"
                                        >
                                            {c.isVisible === false ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        title="Título del Gráfico"
                                        aria-label="Título del Gráfico"
                                        value={c.title}
                                        onChange={(e) => updateChart(c.id, { title: e.target.value })}
                                        className="bg-white px-4 py-2 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 w-64 text-center shadow-lg"
                                        placeholder="Título del Gráfico"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
