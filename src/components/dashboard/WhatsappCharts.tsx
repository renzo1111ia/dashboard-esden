"use client";

import type { KpiWhatsapp } from "@/lib/actions/analytics";
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend,
} from "recharts";

// ─── PALETTE ──────────────────────────────────────────────────────────────────

const PALETTE = [
    "#25d366", "#128c7e", "#075e54", "#34b7f1",
    "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
];

// ─── TOOLTIPS ─────────────────────────────────────────────────────────────────

function TooltipConv({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            <p className="font-black text-green-600">{payload[0].value?.toLocaleString("es-ES")} conversaciones</p>
        </div>
    );
}

function TooltipBar({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            <p className="font-black text-emerald-600">{payload[0].value?.toLocaleString("es-ES")}</p>
        </div>
    );
}

function TooltipPie({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
            <p className="font-bold text-slate-700">{payload[0].name}</p>
            <p className="font-black text-emerald-600">{payload[0].value?.toLocaleString("es-ES")}</p>
        </div>
    );
}

// ─── CHART CARD ───────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-400">{title}</h3>
            {children}
        </div>
    );
}

function Empty() {
    return (
        <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-300">
            Sin datos para el período seleccionado
        </div>
    );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface Props { data: KpiWhatsapp }

export function WhatsappCharts({ data }: Props) {
    const {
        tasa_opt_in,
        con_opt_in,
        sin_opt_in,
        conversaciones_por_dia,
        por_estado_conversacion,
        por_tipo_lead,
        por_origen,
        opt_in_por_campana,
    } = data;

    // Opt-in donut data
    const optInDonut = [
        { name: "Con Opt-in",  value: con_opt_in  },
        { name: "Sin Opt-in",  value: sin_opt_in  },
    ].filter(d => d.value > 0);

    // Format X-axis dates
    const diasFmt = conversaciones_por_dia.map((r) => ({
        ...r,
        label: r.label.slice(5).replace("-", "/"),
    }));

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* 1. Conversaciones por día – Área full width */}
            <div className="lg:col-span-2">
                <ChartCard title="Conversaciones WhatsApp por Día">
                    {diasFmt.length === 0 ? <Empty /> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={diasFmt} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="wpGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#25d366" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#25d366" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<TooltipConv />} />
                                <Area type="monotone" dataKey="value" name="Conversaciones"
                                    stroke="#25d366" strokeWidth={3} fillOpacity={1} fill="url(#wpGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* 2. Opt-in donut */}
            <ChartCard title={`Opt-in WhatsApp — ${tasa_opt_in}%`}>
                {optInDonut.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={optInDonut}
                                cx="50%" cy="50%"
                                innerRadius={75} outerRadius={110}
                                paddingAngle={4}
                                dataKey="value" nameKey="name"
                                stroke="#ffffff" strokeWidth={3}
                            >
                                <Cell fill="#25d366" />
                                <Cell fill="#e2e8f0" />
                            </Pie>
                            <Tooltip content={<TooltipPie />} />
                            <Legend
                                layout="vertical" align="right" verticalAlign="middle"
                                iconType="circle" iconSize={8}
                                formatter={(val) => <span className="text-xs text-slate-600 font-bold ml-1">{val}</span>}
                            />
                            {/* Center: % */}
                            <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fontSize={26} fontWeight={900} fill="#16a34a">
                                {tasa_opt_in}%
                            </text>
                            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#94a3b8">
                                OPT-IN
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* 3. Opt-in por campaña – barras horizontales */}
            <ChartCard title="Opt-in por Campaña">
                {opt_in_por_campana.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={opt_in_por_campana} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <defs>
                                <linearGradient id="optGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%"   stopColor="#25d366" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#128c7e" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: "#1e293b", fontSize: 10, fontWeight: 600 }} width={110} axisLine={false} tickLine={false} />
                            <Tooltip content={<TooltipBar />} cursor={{ fill: "rgba(37,211,102,0.04)", radius: 8 }} />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#optGrad)" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* 4. Estado de conversación – barras verticales */}
            <ChartCard title="Estado de Conversación">
                {por_estado_conversacion.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={por_estado_conversacion} margin={{ top: 10, right: 8, bottom: 50, left: 0 }}>
                            <defs>
                                <linearGradient id="estConvGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor="#128c7e" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#128c7e" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                            <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<TooltipBar />} cursor={{ fill: "rgba(18,140,126,0.04)", radius: 8 }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80} fill="url(#estConvGrad)" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* 5. Tipo Lead – donut */}
            <ChartCard title="Tipo de Lead (WhatsApp)">
                {por_tipo_lead.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={por_tipo_lead.map(r => ({ ...r, name: r.label }))}
                                cx="50%" cy="50%"
                                innerRadius={0} outerRadius={110}
                                paddingAngle={2}
                                dataKey="value" nameKey="name"
                                stroke="#ffffff" strokeWidth={3}
                            >
                                {por_tipo_lead.map((_, i) => (
                                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<TooltipPie />} />
                            <Legend
                                layout="vertical" align="right" verticalAlign="middle"
                                iconType="circle" iconSize={8}
                                formatter={(val) => <span className="text-xs text-slate-600 font-bold ml-1">{val}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

            {/* 6. Por origen – barras horizontales */}
            <ChartCard title="Leads por Origen (WhatsApp)">
                {por_origen.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={por_origen} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <defs>
                                <linearGradient id="origenWp" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: "#1e293b", fontSize: 10, fontWeight: 600 }} width={110} axisLine={false} tickLine={false} />
                            <Tooltip content={<TooltipBar />} cursor={{ fill: "rgba(99,102,241,0.04)", radius: 8 }} />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="url(#origenWp)" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>

        </div>
    );
}
