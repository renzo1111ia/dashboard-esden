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
    getAreaHistorico
} from "@/lib/actions/analytics";
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
import {
    Phone, PhoneCall, PhoneMissed, Users, UserX, PhoneOff, Voicemail,
    UserMinus, ThumbsDown, Star, Calendar, Clock, TrendingUp
} from "lucide-react";

async function SummarySection({ from, to }: { from: string; to: string }) {
    const kpi = await getKpiTotals(from, to);
    return (
        <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-6">Panel <span className="text-indigo-400">General</span></h1>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 text-left">
                {/* Fila 1 */}
                <div className="md:col-span-4">
                    <SummaryCard label="Total de llamados" value={kpi.total_llamados?.toLocaleString('es-ES') || "0"} icon={<Phone className="h-6 w-6 text-white" />} bgColor="bg-blue-600" />
                </div>
                <div className="md:col-span-4">
                    <SummaryCard label="Llamadas atendidas" value={kpi.llamadas_atendidas_gen?.toLocaleString('es-ES') || "0"} icon={<PhoneCall className="h-6 w-6 text-white" />} bgColor="bg-emerald-600" />
                </div>
                <div className="md:col-span-4">
                    <SummaryCard label="Fallidas" value={kpi.fallidas_gen?.toLocaleString('es-ES') || "0"} icon={<PhoneMissed className="h-6 w-6 text-white" />} bgColor="bg-red-600" />
                </div>

                {/* Fila 2 */}
                <div className="md:col-span-3">
                    <SummaryCard label={<>Leads totales<br />Alcanzados</>} value={kpi.leads_totales_alcanzados_gen?.toLocaleString('es-ES') + "..."} icon={<Users className="h-6 w-6 text-white" />} bgColor="bg-indigo-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>Leads totales<br />ilocalizables</>} value={kpi.leads_totales_ilocalizables?.toLocaleString('es-ES') || "0"} icon={<UserX className="h-6 w-6 text-white" />} bgColor="bg-orange-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>Ilocalizables<br />Teléfono erroneo</>} value={kpi.ilocalizables_telefono?.toLocaleString('es-ES') || "0"} icon={<PhoneOff className="h-6 w-6 text-white" />} bgColor="bg-rose-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label={<>Ilocalizables<br />por Buzón de Voz</>} value={kpi.ilocalizables_buzon?.toLocaleString('es-ES') || "0"} icon={<Voicemail className="h-6 w-6 text-white" />} bgColor="bg-amber-600" />
                </div>

                {/* Fila 3 */}
                <div className="md:col-span-3">
                    <SummaryCard label={<>No cumplen<br />requisitos</>} value={kpi.no_cumplen_requisitos?.toLocaleString('es-ES') || "0"} icon={<UserMinus className="h-6 w-6 text-white" />} bgColor="bg-pink-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label="No interesados" value={kpi.no_interesados_gen?.toLocaleString('es-ES') || "0"} icon={<ThumbsDown className="h-6 w-6 text-white" />} bgColor="bg-slate-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label="Leads cualificados" value={kpi.leads_cualificados_gen?.toLocaleString('es-ES') || "0"} icon={<Star className="h-6 w-6 text-white" />} bgColor="bg-yellow-600" />
                </div>
                <div className="md:col-span-3">
                    <SummaryCard label="Total de agendas" value={kpi.total_agendas_gen?.toLocaleString('es-ES') || "0"} icon={<Calendar className="h-6 w-6 text-white" />} bgColor="bg-teal-600" />
                </div>

                {/* Fila 4 */}
                <div className="md:col-span-6">
                    <SummaryCard label="Duracion media de llamada" value={kpi.duracion_media || "0.00"} icon={<Clock className="h-6 w-6 text-white" />} bgColor="bg-cyan-600" />
                </div>
                <div className="md:col-span-6">
                    <SummaryCard label="Total minutos" value={kpi.total_minutos_gen || "0"} icon={<TrendingUp className="h-6 w-6 text-white" />} bgColor="bg-purple-600" />
                </div>
            </div>
        </div>
    );
}

async function ChartsSection({ from, to }: { from: string; to: string }) {
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

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
            <div className="lg:col-span-2">
                <AreaChartComponent title="Evolución de Minutos (Totales vs Facturados)" data={areaHistorico} />
            </div>
            <div className="lg:col-span-2">
                <VerticalBarChart title="Mejores horas de contacto" data={mejoresHoras} />
            </div>
            <DonutChart title="Motivo de No contacto" data={motivoNoContacto} isDonut={false} />
            <VerticalBarChart title="Tipología de llamadas" data={tipologia} />
            <VerticalBarChart title="Leads cualificados agendados vs no agendados" data={agendados} />
            <VerticalBarChart title="Opt-in Whatsapp" data={optIn} />
            <DonutChart title="Master de interés" data={masterInteres} isDonut={false} />
            <DonutChart title="Leads no cualificados (Motivos de anulación)" data={leadsAnulados} isDonut={true} centerLabel="total" />
        </div>
    );
}

export default async function DashboardPage() {
    const now = () => Date.now();
    const to = new Date().toISOString();
    const from = new Date(now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return (
        <div className="space-y-6">
            <Suspense
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <SummarySection from={from} to={to} />
            </Suspense>

            <Suspense
                fallback={
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <ChartsSection from={from} to={to} />
            </Suspense>
        </div>
    );
}
