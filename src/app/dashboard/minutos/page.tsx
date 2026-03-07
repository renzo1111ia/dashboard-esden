import { Suspense } from "react";
import { getKpiTotals } from "@/lib/actions/analytics";
import { KpiCard, KpiSkeleton } from "@/components/charts/DashboardCharts";

export const dynamic = "force-dynamic";

async function MinutosModule({ from, to }: { from: string; to: string }) {
    const kpi = await getKpiTotals(from, to);
    return (
        <div className="mb-8">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Total Mins Mes</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Contabilizar los minutos usados en mes actual, calendario</p>
                <p className="text-5xl font-black mt-3 text-blue-600 tracking-tighter">{kpi.total_mins_mes}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
                <KpiCard label="Total de llamados" value={kpi.total_llamados?.toLocaleString() || 0} />
                <KpiCard label="Llamadas atendidas" value={kpi.llamadas_atendidas_gen?.toLocaleString() || 0} />
                <KpiCard label="Fallidas" value={kpi.fallidas_gen?.toLocaleString() || 0} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 mb-4">
                <KpiCard label="Leads totales alcanzados" value={kpi.leads_totales_alcanzados_gen?.toLocaleString() || 0} color="text-blue-500" />
                <KpiCard label="Leads totales ilocalizables" value={kpi.leads_totales_ilocalizables?.toLocaleString() || 0} color="text-blue-500" />
                <KpiCard label="Ilocalizables teléfono erróneo" value={kpi.ilocalizables_telefono?.toLocaleString() || 0} />
                <KpiCard label="Ilocalizables por buzón de voz" value={kpi.ilocalizables_buzon?.toLocaleString() || 0} />
                <KpiCard label="No cumplen requisitos" value={kpi.no_cumplen_requisitos?.toLocaleString() || 0} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                <KpiCard label="No interesados" value={kpi.no_interesados_gen?.toLocaleString() || 0} />
                <KpiCard label="Leads cualificados" value={kpi.leads_cualificados_gen?.toLocaleString() || 0} />
                <KpiCard label="Total de agendas" value={kpi.total_agendas_gen?.toLocaleString() || 0} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <KpiCard label="Duración media de llamada" value={kpi.duracion_media || "0"} />
                <KpiCard label="Total minutos" value={kpi.total_minutos_gen || "0"} />
            </div>
        </div>
    );
}

export default async function MinutosPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const range = (params.range as string) || "30d";

    const now = new Date();
    let fromDate = new Date();
    if (range === "7d") fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "90d") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const from = fromDate.toISOString();
    const to = now.toISOString();

    return (
        <div className="space-y-6">
            <Suspense
                fallback={
                    <div className="mb-8">
                        <div className="h-10 w-48 bg-slate-200 rounded animate-pulse mb-8"></div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                            {Array.from({ length: 13 }).map((_, i) => <KpiSkeleton key={i} />)}
                        </div>
                    </div>
                }
            >
                <MinutosModule from={from} to={to} />
            </Suspense>
        </div>
    );
}
