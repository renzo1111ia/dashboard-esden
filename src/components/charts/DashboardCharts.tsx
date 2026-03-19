"use client";

import { ReactNode } from "react";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area, CartesianGrid
} from "recharts";
import type { ChartRow } from "@/lib/actions/analytics";
import { cn } from "@/lib/utils";

// Premium color palette (Blue & Indigo focused)
const PALETTE = [
    "#2563eb", "#f97316", "#10b981", "#8b5cf6",
    "#51a2b1", "#3b82f6", "#ef4444", "#ec4899",
];

import type { TooltipProps } from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipBar = ({ active, payload, label }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl text-xs">
            <p className="font-bold text-card-foreground mb-1">{label}</p>
            <p className="text-blue-600 dark:text-blue-400 font-black">{payload[0].value?.toLocaleString()} llamadas</p>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltipPie = ({ active, payload }: TooltipProps<number, string> | any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xl text-xs">
            <p className="font-bold text-card-foreground">{payload[0].name}</p>
            <p className="text-blue-600 dark:text-blue-400 font-black">
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

export function KpiCard({ label, value, sub, color = "text-card-foreground" }: KpiCardProps) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
            <p className={cn("mt-2 text-3xl font-black tracking-tight", color)}>{value}</p>
            {sub && <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{sub}</p>}
        </div>
    );
}

/* ── Dark Score Card (Total Leads Campañas) ───────────────── */
interface DarkScoreCardProps {
    label: string;
    value: string | number;
    valueColor?: string;
}

export function DarkScoreCard({ label, value, valueColor = "text-card-foreground" }: DarkScoreCardProps) {
    return (
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6 shadow-sm min-h-[105px]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">{label}</div>
            <div className={`text-2xl font-black tracking-tighter ${valueColor}`}>{value}</div>
        </div>
    );
}

/* ── Summary Card ──────────────────────────── */
interface SummaryCardProps {
    label: ReactNode;
    value: ReactNode;
    sub?: ReactNode;
    icon?: ReactNode;
    bgColor?: string;
}

export function SummaryCard({ label, value, sub, icon, bgColor = "bg-blue-600" }: SummaryCardProps) {
    return (
        <div className="flex items-center gap-5 rounded-[28px] border border-slate-100/60 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group h-full">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 group-hover:bg-blue-100/50 dark:group-hover:bg-blue-900/30 transition-colors">
                {/* Clone the icon to ensure it has the right color and size */}
                {typeof icon === 'object' && icon !== null ? (
                    <div className="text-blue-600 dark:text-blue-400">
                        {Object.assign({}, icon as any, {
                            props: { ...((icon as any).props), className: cn((icon as any).props?.className, "h-7 w-7") }
                        })}
                    </div>
                ) : icon}
            </div>
            <div className="flex flex-col min-w-0">
                <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 leading-tight mb-1 truncate">{label}</p>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</div>
                {sub && <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{sub}</p>}
            </div>
        </div>
    );
}

/* ── Horizontal Bar ────────────────────────── */
export function HorizontalBarChart({ title, data }: { title: string; data: ChartRow[] }) {
    return (
        <ChartCard title={title}>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} layout="vertical" margin={{ left: -10, right: 20 }}>
                    <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#f1f5f9" />
                    <XAxis 
                        type="number" 
                        tick={{ fill: "#94a3b8", fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <YAxis 
                        type="category" 
                        dataKey="label" 
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }} 
                        width={120} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(59, 130, 246, 0.04)", radius: 4 }} />
                    <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]} 
                        barSize={16} 
                        fill="#6366f1" 
                    />
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
                <BarChart data={data} margin={{ top: 10, right: 8, bottom: 40, left: -20 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="label" 
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(81, 162, 177, 0.05)", radius: 4 }} />
                    <Bar 
                        dataKey="value" 
                        radius={[4, 4, 0, 0]} 
                        barSize={12}
                        fill="#51a2b1" 
                    />
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
                        paddingAngle={isDonut ? 3 : 0}
                        dataKey="value"
                        nameKey="name"
                        stroke={isDonut ? "transparent" : "#ffffff"}
                        strokeWidth={2}
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
                        formatter={(val) => <span className="text-xs text-muted-foreground font-bold ml-1">{val}</span>}
                    />
                    {isDonut && centerLabel && (
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-card-foreground font-black" fontSize={24}>
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
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.08} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFacturados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.08} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="date" 
                        tick={{ fill: "#94a3b8", fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        yAxisId="left"
                        tick={{ fill: "#94a3b8", fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => v === 0 ? "0" : v}
                    />
                    <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: "#94a3b8", fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => v === 0 ? "0" : v}
                    />
                    <Tooltip 
                        content={<CustomTooltipBar />}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                        verticalAlign="top" 
                        align="center"
                        iconType="circle" 
                        iconSize={10} 
                        height={40}
                        formatter={(val) => <span className="text-xs text-slate-500 font-medium ml-1">{val}</span>} 
                    />
                    <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="totales" 
                        name="Total" 
                        stroke="#2563eb" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorTotales)" 
                        dot={{ r: 4, fill: "white", stroke: "#2563eb", strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="facturados" 
                        name="Min facturados" 
                        stroke="#f97316" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorFacturados)" 
                        dot={{ r: 4, fill: "white", stroke: "#f97316", strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/* ── Chart Card wrapper ────────────────────── */
function ChartCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
            <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}

/* ── Skeleton ──────────────────────────────── */
export function ChartSkeleton() {
    return (
        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm animate-pulse">
            <div className="mb-6 h-4 w-40 rounded bg-muted" />
            <div className="h-[220px] rounded bg-muted/50" />
        </div>
    );
}

export function KpiSkeleton() {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-pulse">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-4 h-10 w-20 rounded bg-muted" />
            <div className="mt-3 h-3 w-32 rounded bg-muted/50" />
        </div>
    );
}
