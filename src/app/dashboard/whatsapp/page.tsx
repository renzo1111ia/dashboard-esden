import { Suspense } from "react";
import { getKpiTotals } from "@/lib/actions/analytics";
import { KpiCard, KpiSkeleton } from "@/components/charts/DashboardCharts";

export const dynamic = "force-dynamic";

async function WhatsAppModule({ from, to }: { from: string; to: string }) {
    const kpi = await getKpiTotals(from, to);
    return (
        <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Total Leads <span className="text-blue-600">WhatsApp</span></h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Resumen de leads gestionados por WhatsApp</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
                <KpiCard label="Total Efectivos WhatsApp (Cualificados o anulados)" value={kpi.efectivos_whatsapp?.toLocaleString() || 0} />
                <KpiCard label="Whatsapp ilocalizables" value={kpi.whatsapp_ilocalizables?.toLocaleString() || 0} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
                <KpiCard label="Leads cualificados" value={kpi.leads_cualificados_wsp?.toLocaleString() || 0} color="text-blue-500" />
                <KpiCard label="Lead no cualificado" value={kpi.lead_no_cualificado_wsp?.toLocaleString() || 0} color="text-blue-500" />
                <KpiCard label="No interesados" value={kpi.no_interesados_wsp?.toLocaleString() || 0} color="text-blue-500" />
            </div>
            <div className="grid grid-cols-1 gap-4">
                <KpiCard label="Total Agendas" value={kpi.total_agendas_wsp?.toLocaleString() || 0} />
            </div>
        </div>
    );
}

export default async function WhatsappPage() {
    const now = () => Date.now();
    const to = new Date().toISOString();
    const from = new Date(now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return (
        <div className="space-y-6">
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
                <WhatsAppModule from={from} to={to} />
            </Suspense>
        </div>
    );
}
