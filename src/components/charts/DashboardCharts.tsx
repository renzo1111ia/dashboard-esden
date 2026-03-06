"use client";

import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, CartesianGrid
} from "recharts";
import type { ChartRow } from "@/lib/actions/analytics";
import { cn } from "@/lib/utils";

// Premium color palette (Blue & Indigo focused)
const PALETTE = [
    "#3b82f6", "#6366f1", "#0ea5e9", "#8b5cf6",
    "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

import type { TooltipProps } from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipBar = ({ active, payload, label }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/50 text-xs">
            <p className="font-bold text-slate-800 mb-1">{label}</p>
            <p className="text-blue-600 font-black">{payload[0].value?.toLocaleString()} llamadas</p>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipPie = ({ active, payload }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/50 text-xs">
            <p className="font-bold text-slate-800">{payload[0].name}</p>
            <p className="text-blue-600 font-black">
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

export function KpiCard({ label, value, sub, color = "text-slate-900" }: KpiCardProps) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p>
            <p className={cn("mt-2 text-3xl font-black tracking-tight", color)}>{value}</p>
            {sub && <p className="mt-1.5 text-xs font-semibold text-slate-400">{sub}</p>}
        </div>
    );
}

/* ── Dark Score Card (Total Leads Campañas) ───────────────── */
interface DarkScoreCardProps {
    label: string;
    value: string | number;
    valueColor?: string;
}

export function DarkScoreCard({ label, value, valueColor = "text-slate-900" }: DarkScoreCardProps) {
    return (
        <div className="flex flex-col justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100 min-h-[105px]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">{label}</div>
            <div className={`text-2xl font-black tracking-tighter ${valueColor}`}>{value}</div>
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
        <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 overflow-hidden relative group">
            <div className="flex items-start justify-between z-10">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                    <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mt-2 mb-3">{value}</div>
                </div>
                <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg", bgColor)}>
                    {icon}
                </div>
            </div>
            <div className="mt-auto pt-3 z-10 w-full relative">
                <p className="text-sm font-semibold text-slate-400">{sub}</p>
            </div>
            {/* Background glowing effect */}
            <div className={cn("absolute -right-12 -bottom-12 h-32 w-32 rounded-full blur-3xl opacity-5 pointer-events-none transition-opacity group-hover:opacity-10", bgColor.replace('/10', ''))} />
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
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fill: "#1e293b", fontSize: 11, fontWeight: 600 }} width={140} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(59, 130, 246, 0.04)", radius: 8 }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={32} fill="url(#barGradientHoriz)" />
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
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(59, 130, 246, 0.04)", radius: 8 }} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={100} fill="url(#barGradient)" />
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
                    <Pie
                        data={pie}
                        cx="50%"
                        cy="50%"
                        innerRadius={isDonut ? 75 : 0}
                        outerRadius={100}
                        paddingAngle={isDonut ? 4 : 0}
                        dataKey="value"
                        nameKey="name"
                        stroke="#ffffff"
                        strokeWidth={3}
                    >
                        {pie.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={PALETTE[i % PALETTE.length]} radius={4} />
                        ))}
                    </Pie>

                    <Tooltip content={<CustomTooltipPie />} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={8}
                        formatter={(val) => <span className="text-xs text-slate-600 font-bold ml-1">{val}</span>}
                    />
                    {isDonut && centerLabel && (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 font-black" fontSize={24}>
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
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFacturados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}m`} />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Legend iconType="circle" iconSize={8} formatter={(val) => <span className="text-xs text-slate-600 font-bold ml-1">{val}</span>} />
                    <Area type="monotone" dataKey="totales" name="Minutos Totales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotales)" />
                    <Area type="monotone" dataKey="facturados" name="Minutos Facturados" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorFacturados)" />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Chart Card wrapper ────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm shadow-slate-100">
            <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-400">{title}</h3>
            {children}
        </div>
    );
}

/* ── Skeleton ──────────────────────────────── */
export function ChartSkeleton() {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm animate-pulse">
            <div className="mb-6 h-4 w-40 rounded bg-slate-100" />
            <div className="h-[220px] rounded bg-slate-50" />
        </div>
    );
}

export function KpiSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="mt-4 h-10 w-20 rounded bg-slate-100" />
            <div className="mt-3 h-3 w-32 rounded bg-slate-50" />
        </div>
    );
}
