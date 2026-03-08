import { Suspense } from "react";
import { getKpiTotals, getAreaHistorico, getDynamicKpis } from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { CAMPANAS_KPIS, CAMPANAS_CHARTS } from "@/lib/constants/kpi-defaults";
import { KpiConfig, ChartConfig } from "@/types/tenant";

export const dynamic = "force-dynamic";

async function CampanasSummary({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
    const kpi = await getKpiTotals(from, to);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    const currentConfigKpis = (tenantConfig.config as any)?.kpis_campanas as KpiConfig[] || [];

    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = CAMPANAS_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey));

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={kpi}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
            configKey="kpis_campanas"
            title={
                <h1 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Total <span className="text-blue-600">Leads Campañas</span></h1>
            }
        />
    );
}

async function CampanasCharts({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
    const [areaHistorico, tenantConfig] = await Promise.all([
        getAreaHistorico(from, to),
        getActiveTenantConfig()
    ]);

    if (!tenantConfig) return null;

    const currentCharts = (tenantConfig.config as any)?.charts_campanas as ChartConfig[] || [];
    let mergedCharts = currentCharts;
    if (currentCharts.length === 0) {
        mergedCharts = CAMPANAS_CHARTS;
    }

    const chartDataMap = {
        areaHistorico
    };

    return (
        <ChartManager
            tenant={tenantConfig}
            initialCharts={mergedCharts}
            data={chartDataMap}
            isAdmin={isAdmin}
            configKey="charts_campanas"
            title="Desempeño de Campañas"
        />
    );
}

export default async function CampanasPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const range = (params.range as string) || "30d";
    const isAdmin = await getAdminStatus();

    const now = new Date();
    let fromDate = new Date();
    if (range === "7d") fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "90d") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const from = fromDate.toISOString();
    const to = now.toISOString();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {isAdmin && <TenantSetupBanner />}

            <Suspense
                fallback={
                    <div className="mb-8">
                        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-4"></div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 9 }).map((_, i) => <KpiSkeleton key={i} />)}
                        </div>
                    </div>
                }
            >
                <CampanasSummary from={from} to={to} isAdmin={isAdmin} />
            </Suspense>

            <Suspense
                fallback={
                    <div className="grid grid-cols-1 gap-6">
                        <ChartSkeleton />
                    </div>
                }
            >
                <CampanasCharts from={from} to={to} isAdmin={isAdmin} />
            </Suspense>
        </div>
    );
}
