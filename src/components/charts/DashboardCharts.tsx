"use client";

import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, CartesianGrid
} from "recharts";
import type { ChartRow } from "@/lib/actions/analytics";
import { cn } from "@/lib/utils";

// Premium color palette
const PALETTE = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
    "#f59e0b", "#ef4444", "#ec4899", "#84cc16",
];

import type { TooltipProps } from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipBar = ({ active, payload, label }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-[#0d1220] px-3 py-2 shadow-xl text-xs">
            <p className="font-medium text-white/80 mb-1">{label}</p>
            <p className="text-indigo-400 font-bold">{payload[0].value?.toLocaleString()} llamadas</p>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipPie = ({ active, payload }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-[#0d1220] px-3 py-2 shadow-xl text-xs">
            <p className="font-medium text-white/80">{payload[0].name}</p>
            <p className="text-indigo-400 font-bold">
                {payload[0].value?.toLocaleString()} ({payload[0].payload?.pct}%)
            </p>
        </div>
    );
};

function withPct(data: ChartRow[]) {
    const total = data.reduce((s, r) => s + r.value, 0);
    return data.map((r) => ({ ...r, name: r.label, pct: total > 0 ? Math.round((r.value / total) * 100) : 0 }));
}

/* ── KPI Card ──────────────────────────────── */
interface KpiCardProps { label: string; value: string | number; sub?: string; color?: string }

export function KpiCard({ label, value, sub, color = "text-white" }: KpiCardProps) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">{label}</p>
            <p className={cn("mt-2 text-3xl font-bold", color)}>{value}</p>
            {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
        </div>
    );
}

/* ── Dark Score Card (Total Leads Campañas) ───────────────── */
interface DarkScoreCardProps {
    label: string;
    value: string | number;
    valueColor?: string;
}

export function DarkScoreCard({ label, value, valueColor = "text-white" }: DarkScoreCardProps) {
    return (
        <div className="flex flex-col justify-center rounded-xl border border-white/[0.05] bg-[#0d1017] p-5 shadow-sm min-h-[105px]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-2">{label}</div>
            <div className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
        </div>
    );
}

/* ── Summary Card ──────────────────────────── */
interface SummaryCardProps {
    label: React.ReactNode;
    value: React.ReactNode;
    sub?: React.ReactNode;
    icon?: React.ReactNode;
    bgColor?: string;
}

export function SummaryCard({ label, value, sub, icon, bgColor = "bg-blue-600" }: SummaryCardProps) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.05] bg-[#121626] p-5 shadow-sm overflow-hidden relative group">
            <div className="flex items-start justify-between z-10">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white/70">{label}</p>
                    <div className="text-3xl font-bold text-white tracking-tight leading-none mt-2 mb-3">{value}</div>
                </div>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", bgColor)}>
                    {icon}
                </div>
            </div>
            <div className="mt-auto pt-2 z-10 w-full relative">
                <p className="text-sm text-white/50">{sub}</p>
            </div>
            {/* Background glowing effect similar to screenshot */}
            <div className={cn("absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-30", bgColor.replace('/10', ''))} />
        </div>
    );
}

/* ── Horizontal Bar ────────────────────────── */
export function HorizontalBarChart({ title, data }: { title: string; data: ChartRow[] }) {
    return (
        <ChartCard title={title}>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <defs>
                        <linearGradient id="barGradientHoriz" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                        </linearGradient>
                    </defs>
                    <XAxis type="number" tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#ffffff60", fontSize: 10 }} width={160} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40} fill="url(#barGradientHoriz)" />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Vertical Bar ──────────────────────────── */
export function VerticalBarChart({ title, data }: { title: string; data: ChartRow[] }) {
    return (
        <ChartCard title={title}>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 10, right: 8, bottom: 40, left: 0 }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: "#ffffff60", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    {/* Barras más gruesas como en la imagen */}
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={110} fill="url(#barGradient)" />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Pie / Donut ───────────────────────────── */
export function DonutChart({ title, data, centerLabel, isDonut = true }: { title: string; data: ChartRow[]; centerLabel?: string; isDonut?: boolean }) {
    const pie = withPct(data);
    const total = data.reduce((s, r) => s + r.value, 0);

    return (
        <ChartCard title={title}>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <defs>
                        {/* Brillo moderno y sutil para la versión "simple pero moderna" */}
                        <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
                        </filter>
                    </defs>

                    <Pie
                        data={pie}
                        cx="50%"
                        cy="50%"
                        innerRadius={isDonut ? 75 : 0}
                        outerRadius={100}
                        paddingAngle={isDonut ? 2 : 0}
                        dataKey="value"
                        nameKey="name"
                        stroke="#0d1220" /* Separaciones finas en color oscuro */
                        strokeWidth={2}
                        style={{ filter: "url(#soft-glow)" }}
                    >
                        {pie.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                    </Pie>

                    <Tooltip content={<CustomTooltipPie />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={10}
                        formatter={(val) => <span className="text-xs text-white/60 font-medium ml-1">{val}</span>}
                    />
                    {isDonut && centerLabel && (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white font-bold" fontSize={20}>
                            {centerLabel === "total" ? total.toLocaleString() : centerLabel}
                        </text>
                    )}
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Area Chart ────────────────────────────── */
export function AreaChartComponent({ title, data }: { title: string; data: any[] }) {
    return (
        <ChartCard title={title}>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFacturados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis dataKey="date" tick={{ fill: "#ffffff60", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#ffffff60", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}m`} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, fill: "transparent" }} />
                    <Legend iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs text-white/60 font-medium ml-1">{val}</span>} />
                    <Area type="monotone" dataKey="totales" name="Minutos Totales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotales)" />
                    <Area type="monotone" dataKey="facturados" name="Minutos Facturados" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFacturados)" />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Chart Card wrapper ────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-sm font-semibold text-white/70">{title}</h3>
            {children}
        </div>
    );
}

/* ── Skeleton ──────────────────────────────── */
export function ChartSkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 animate-pulse">
            <div className="mb-4 h-4 w-40 rounded bg-white/[0.06]" />
            <div className="h-[220px] rounded bg-white/[0.04]" />
        </div>
    );
}

export function KpiSkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 animate-pulse">
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
            <div className="mt-3 h-8 w-20 rounded bg-white/[0.06]" />
            <div className="mt-2 h-2.5 w-32 rounded bg-white/[0.04]" />
        </div>
    );
}
