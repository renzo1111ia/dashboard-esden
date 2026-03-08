import { Suspense } from "react";
import { getKpiTotals, getDynamicKpis } from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { LLAMADAS_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";

export const dynamic = "force-dynamic";

async function LlamadasModule({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
    const kpi = await getKpiTotals(from, to);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    const currentConfigKpis = (tenantConfig.config as any)?.kpis_llamadas as KpiConfig[] || [];

    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = LLAMADAS_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey));

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
                <LlamadasModule from={from} to={to} isAdmin={isAdmin} />
            </Suspense>
        </div>
    );
}
