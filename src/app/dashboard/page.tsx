import { Suspense } from "react";
import {
    getKpiGenerales,
    getDynamicKpis,
    AnalyticsFilters,
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

// ─── KPI SUMMARY SECTION ──────────────────────────────────────────────────────

async function SummarySection({
    from,
    to,
    isAdmin,
    filters,
}: {
    from: string;
    to: string;
    isAdmin: boolean;
    filters: AnalyticsFilters;
}) {
    const [kpi, tenantConfig] = await Promise.all([
        getKpiGenerales(from, to, filters),
        getActiveTenantConfig(),
    ]);

    if (!tenantConfig) return null;

    // Use per-client KPIs from config, fallback to defaults
    const currentConfigKpis = (tenantConfig.config as any)?.kpis as KpiConfig[] || [];
    const mergedKpis = currentConfigKpis.length > 0 ? currentConfigKpis : DEFAULT_SUMMARY_KPIS;

    // Dynamic (custom) KPIs that aren't in the static KpiGenerales
    const dynamicValues = await getDynamicKpis(
        from,
        to,
        mergedKpis.filter(k => !k.staticKey),
        filters
    );

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={kpi as any}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
        />
    );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function ChartsSection({
    from,
    to,
    isAdmin,
    filters,
}: {
    from: string;
    to: string;
    isAdmin: boolean;
    filters: AnalyticsFilters;
}) {
    const [kpi, tenantConfig] = await Promise.all([
        getKpiGenerales(from, to, filters),
        getActiveTenantConfig(),
    ]);

    if (!tenantConfig) return null;

    const currentCharts = (tenantConfig.config as any)?.charts as ChartConfig[] || [];
    const mergedCharts = currentCharts.length > 0 ? currentCharts : DEFAULT_CHARTS;

    // Map all chart data from the single KpiGenerales call
    // dataKey in ChartConfig matches these keys
    const chartDataMap = {
        porEstadoLlamada: kpi.por_estado_llamada,
        porRazonTermino: kpi.por_razon_termino,
        porOrigen: kpi.por_origen,
        porTipoLead: kpi.por_tipo_lead,
        porCualificacion: kpi.por_cualificacion,
        porMotivoAnulacion: kpi.por_motivo_anulacion,
        agendadosPorFecha: kpi.agendados_por_fecha,
        primerContactoPorFecha: kpi.primer_contacto_por_fecha,
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

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<any>;
}) {
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
