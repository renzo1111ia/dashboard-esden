import { Suspense } from "react";
import {
    getKpiTotals,
    getMejoresHoras,
    getMotivoNoContacto,
    getTipologiaLlamadas,
    getAgendadosVsNoAgendados,
    getOptInWhatsapp,
    getMasterInteres,
    getLeadsNoCualificados,
    getAreaHistorico,
    getDynamicKpis,
    AnalyticsFilters
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import {
    ChartSkeleton,
    KpiSkeleton,
} from "@/components/charts/DashboardCharts";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { ChartManager } from "@/components/dashboard/ChartManager";
import { DEFAULT_SUMMARY_KPIS, DEFAULT_CHARTS } from "@/lib/constants/kpi-defaults";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";

async function SummarySection({ from, to, isAdmin, filters }: { from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters }) {
    const kpi = await getKpiTotals(from, to, filters);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    const currentConfigKpis = (tenantConfig.config as any)?.kpis as KpiConfig[] || [];

    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = DEFAULT_SUMMARY_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey), filters);

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={kpi}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
        />
    );
}

async function ChartsSection({ from, to, isAdmin, filters }: { from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters }) {
    const [
        mejoresHoras,
        motivoNoContacto,
        tipologia,
        agendados,
        optIn,
        masterInteres,
        leadsAnulados,
        areaHistorico
    ] = await Promise.all([
        getMejoresHoras(from, to, filters),
        getMotivoNoContacto(from, to, filters),
        getTipologiaLlamadas(from, to, filters),
        getAgendadosVsNoAgendados(from, to, filters),
        getOptInWhatsapp(from, to, filters),
        getMasterInteres(from, to, filters),
        getLeadsNoCualificados(from, to, filters),
        getAreaHistorico(from, to, filters)
    ]);

    const tenantConfig = await getActiveTenantConfig();
    if (!tenantConfig) return null;

    const currentCharts = (tenantConfig.config as any)?.charts as ChartConfig[] || [];
    let mergedCharts = currentCharts;
    if (currentCharts.length === 0) {
        mergedCharts = DEFAULT_CHARTS;
    }

    const chartDataMap = {
        mejoresHoras,
        motivoNoContacto,
        tipologia,
        agendados,
        optIn,
        masterInteres,
        leadsAnulados,
        areaHistorico
    };

    return (
        <ChartManager
            tenant={tenantConfig}
            initialCharts={mergedCharts}
            data={chartDataMap}
            isAdmin={isAdmin}
        />
    );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const isAdmin = await getAdminStatus();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {isAdmin && <TenantSetupBanner />}

            <FilterBar />

            <Suspense
                key={`summary-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <SummarySection from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>

            <Suspense
                key={`charts-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <ChartsSection from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>
        </div>
    );
}
