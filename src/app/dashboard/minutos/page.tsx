import { Suspense } from "react";
import { getKpiTotals } from "@/lib/actions/analytics";
import { KpiCard, KpiSkeleton } from "@/components/charts/DashboardCharts";

export const dynamic = "force-dynamic";

async function MinutosModule({ from, to }: { from: string; to: string }) {
    const kpi = await getKpiTotals(from, to);
    return (
        <div className="mb-8">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Total Mins Mes</h2>
                <p className="text-xs text-white/40">Contabilizar los minutos usados en mes actual, calendario</p>
                <p className="text-4xl font-bold mt-1 text-white">{kpi.total_mins_mes}</p>
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

export default async function MinutosPage() {
    const now = () => Date.now();
    const to = new Date().toISOString();
    const from = new Date(now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return (
        <div className="space-y-6">
            <Suspense
                fallback={
                    <div className="mb-8">
                        <div className="h-10 w-48 bg-white/5 rounded animate-pulse mb-8"></div>
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
