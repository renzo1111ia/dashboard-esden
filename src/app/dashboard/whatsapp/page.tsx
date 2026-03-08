import { Suspense } from "react";
import { getKpiTotals, getDynamicKpis } from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { WHATSAPP_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";

export const dynamic = "force-dynamic";

async function WhatsAppModule({ from, to, isAdmin }: { from: string; to: string; isAdmin: boolean }) {
    const kpi = await getKpiTotals(from, to);
    const tenantConfig = await getActiveTenantConfig();

    if (!tenantConfig) return null;

    const currentConfigKpis = (tenantConfig.config as any)?.kpis_whatsapp as KpiConfig[] || [];

    let mergedKpis = currentConfigKpis;
    if (currentConfigKpis.length === 0) {
        mergedKpis = WHATSAPP_KPIS;
    }

    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey));

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={kpi}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
            configKey="kpis_whatsapp"
            title={
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Total Leads <span className="text-blue-600">WhatsApp</span></h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Resumen de leads gestionados por WhatsApp</p>
                </div>
            }
        />
    );
}

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<any> }) {
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
                        <div className="h-10 w-80 bg-slate-200 rounded animate-pulse mb-6"></div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                        </div>
                    </div>
                }
            >
                <WhatsAppModule from={from} to={to} isAdmin={isAdmin} />
            </Suspense>
        </div>
    );
}
