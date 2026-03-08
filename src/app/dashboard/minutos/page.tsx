import { Suspense } from "react";
import { getKpiTotals, getDynamicKpis, AnalyticsFilters } from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { LLAMADAS_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";

export const dynamic = "force-dynamic";

async function LlamadasModule({ from, to, isAdmin, filters }: { from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters }) {
    const kpi = await getKpiTotals(from, to, filters);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    const currentConfigKpis = (tenantConfig.config as any)?.kpis_llamadas as KpiConfig[] || [];

    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = LLAMADAS_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey), filters);

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={kpi}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
            configKey="kpis_llamadas"
            title={
                <div className="mb-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Total <span className="text-blue-600">Minutos del Mes</span></h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contabilización de minutos consumidos en el periodo actual</p>
                    <div className="mt-4">
                        <p className="text-6xl font-black text-slate-900 tracking-tighter">{kpi.total_mins_mes}</p>
                    </div>
                </div>
            }
        />
    );
}

export default async function MinutosPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const isAdmin = await getAdminStatus();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <FilterBar />

            <Suspense
                key={`${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="mb-8">
                        <div className="h-10 w-48 bg-slate-200 rounded animate-pulse mb-8"></div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                            {Array.from({ length: 13 }).map((_, i) => <KpiSkeleton key={i} />)}
                        </div>
                    </div>
                }
            >
                <LlamadasModule from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>
        </div>
    );
}
