import { Suspense } from "react";
import { getKpiTotals, getAreaHistorico } from "@/lib/actions/analytics";
import { SummaryCard, AreaChartComponent, KpiSkeleton } from "@/components/charts/DashboardCharts";
import {
    Phone, PhoneCall, PhoneMissed, Users, UserX, UserMinus,
    ThumbsDown, Star, Calendar
} from "lucide-react";

export const dynamic = "force-dynamic";

async function CampanasModule({ from, to }: { from: string; to: string }) {
    const kpi = await getKpiTotals(from, to);

    // Obtenemos los mock data del gráfico
    const areaHistorico = await getAreaHistorico(from, to);

    return (
        <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-6">Total <span className="text-indigo-400">Leads Campañas</span></h1>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                {/* Row 1 */}
                <div className="md:col-span-4">
                    <SummaryCard label="Leads Contactados" value={kpi.leads_contactados?.toLocaleString('es-ES') || "0"} icon={<Phone className="h-6 w-6 text-white" />} bgColor="bg-blue-600" />
                </div>
                <div className="md:col-span-4">
                    <SummaryCard label="Llamadas Atendidas" value={kpi.llamadas_atendidas_camp?.toLocaleString('es-ES') || "0"} icon={<PhoneCall className="h-6 w-6 text-white" />} bgColor="bg-emerald-600" />
                </div>
                <div className="md:col-span-4">
                    <SummaryCard label="Fallidas" value={kpi.fallidas?.toLocaleString('es-ES') || "0"} icon={<PhoneMissed className="h-6 w-6 text-white" />} bgColor="bg-red-600" />
                </div>

                {/* Row 2 */}
                <div className="md:col-span-3">
                    <SummaryCard label={<>Leads totales<br />Alcanzados</>} value={kpi.leads_totales_alcanzados?.toLocaleString('es-ES') || "0"} icon={<Users className="h-6 w-6 text-white" />} bgColor="bg-indigo-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>Leads<br />Ilocalizables</>} value={kpi.leads_ilocalizables?.toLocaleString('es-ES') || "0"} icon={<UserX className="h-6 w-6 text-white" />} bgColor="bg-orange-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>Lead no<br />Cualificado</>} value={kpi.lead_no_cualificado?.toLocaleString('es-ES') || "0"} icon={<UserMinus className="h-6 w-6 text-white" />} bgColor="bg-rose-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>No<br />Interesados</>} value={kpi.no_interesados?.toLocaleString('es-ES') || "0"} icon={<ThumbsDown className="h-6 w-6 text-white" />} bgColor="bg-slate-600" />
                </div>

                {/* Row 3 */}
                <div className="md:col-span-6">
                    <SummaryCard label="Leads Cualificados" value={kpi.leads_cualificados_camp?.toLocaleString('es-ES') || "0"} icon={<Star className="h-6 w-6 text-white" />} bgColor="bg-yellow-600" />
                </div>
                <div className="md:col-span-6">
                    <SummaryCard label="Total Agendas" value={kpi.total_agendas_camp?.toLocaleString('es-ES') || "0"} icon={<Calendar className="h-6 w-6 text-white" />} bgColor="bg-teal-600" />
                </div>
            </div>

            {/* Gráfico adicional solicitado por el cliente para el dashboard de campañas */}
            <div className="grid grid-cols-1 mb-8">
                <AreaChartComponent title="Desempeño Diario de Campañas" data={areaHistorico} />
            </div>

        </div>
    );
}

export default async function CampanasPage() {
    const now = () => Date.now();
    const to = new Date().toISOString();
    const from = new Date(now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return (
        <div className="space-y-6">
            <Suspense
                fallback={
                    <div className="mb-8">
                        <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-4"></div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 9 }).map((_, i) => <KpiSkeleton key={i} />)}
                        </div>
                    </div>
                }
            >
                <CampanasModule from={from} to={to} />
            </Suspense>
        </div>
    );
}
