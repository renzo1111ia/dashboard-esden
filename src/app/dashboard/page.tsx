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
    getDynamicKpis
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiConfig, ChartConfig } from "@/types/tenant";
import {
    SummaryCard,
    DarkScoreCard,
    HorizontalBarChart,
    VerticalBarChart,
    DonutChart,
    AreaChartComponent,
    ChartSkeleton,
    KpiSkeleton,
} from "@/components/charts/DashboardCharts";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import {
    Phone, PhoneCall, PhoneMissed, Users, UserX, PhoneOff, Voicemail,
    UserMinus, ThumbsDown, Star, Calendar, Clock, TrendingUp, Activity
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
    "Phone": <Phone className="h-6 w-6 text-white" />,
    "PhoneCall": <PhoneCall className="h-6 w-6 text-white" />,
    "Activity": <Activity className="h-6 w-6 text-white" />,
    "Users": <Users className="h-6 w-6 text-white" />,
    "Star": <Star className="h-6 w-6 text-white" />,
    "Calendar": <Calendar className="h-6 w-6 text-white" />,
    "TrendingUp": <TrendingUp className="h-6 w-6 text-white" />,
};

import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { DEFAULT_SUMMARY_KPIS } from "@/lib/constants/kpi-defaults";

async function SummarySection({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
    const kpi = await getKpiTotals(from, to);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    // Get KPIs from config or use defaults
    const currentConfigKpis = (tenantConfig.config as any)?.kpis as KpiConfig[] || [];

    // If config is empty or doesn't have the static ones, we might want to merge them or start with defaults
    // For a transition, if the config has custom ones, we use the config as is.
    // If we want EVERYTHING to be editable, we should merge.
    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = DEFAULT_SUMMARY_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey));

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

import { ChartManager } from "@/components/dashboard/ChartManager";
import { DEFAULT_CHARTS } from "@/lib/constants/kpi-defaults";

async function ChartsSection({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
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
        getMejoresHoras(from, to),
        getMotivoNoContacto(from, to),
        getTipologiaLlamadas(from, to),
        getAgendadosVsNoAgendados(from, to),
        getOptInWhatsapp(from, to),
        getMasterInteres(from, to),
        getLeadsNoCualificados(from, to),
        getAreaHistorico(from, to)
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

type PageProps = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const range = (params.range as string) || "7d";
    const isAdmin = await getAdminStatus();

    const now = new Date();
    let fromDate = new Date();
    if (range === "30d") fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (range === "90d") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const from = fromDate.toISOString();
    const to = now.toISOString();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {isAdmin && <TenantSetupBanner />}

            <Suspense
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <SummarySection from={from} to={to} isAdmin={isAdmin} />
            </Suspense>

            <Suspense
                fallback={
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <ChartsSection from={from} to={to} isAdmin={isAdmin} />
            </Suspense>
        </div>
    );
}
