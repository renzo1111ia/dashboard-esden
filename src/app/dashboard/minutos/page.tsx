import { Suspense } from "react";
import { getKpiMinutos, getDynamicKpis, type KpiMinutos, type AnalyticsFilters } from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { LLAMADAS_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";
import { MinutosCharts } from "@/components/dashboard/MinutosCharts";

export const dynamic = "force-dynamic";

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function MinutosKpis({
    from, to, isAdmin, filters,
}: {
    from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters;
}) {
    const [kpi, tenantConfig] = await Promise.all([
        getKpiMinutos(from, to, filters),
        getActiveTenantConfig(),
    ]);
    if (!tenantConfig) return null;

    const currentKpis = (tenantConfig.config as any)?.kpis_llamadas as KpiConfig[] || [];
    const mergedKpis = currentKpis.length > 0 ? currentKpis : LLAMADAS_KPIS;
    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey), filters);

    // Build values compatible with KpiGenerales staticKey names
    const values = {
        total_llamadas:          kpi.total_llamadas,
        total_contactados:       kpi.total_contactadas,
        total_minutos:           kpi.total_minutos,
        duracion_media_segundos: kpi.duracion_media_segundos,
        // pad unused fields so SummaryManager doesn't break
        total_leads: 0, total_no_contacto: 0, tasa_contacto: 0,
        total_agendados: 0, tiempo_respuesta_promedio_minutos: null,
        total_cualificados: 0, total_no_cualificados: 0,
        por_estado_llamada: [], por_razon_termino: [], por_origen: [],
        por_tipo_lead: [], por_cualificacion: [], por_motivo_anulacion: [],
        agendados_por_fecha: [], primer_contacto_por_fecha: [],
    } as any;

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={values}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
            configKey="kpis_llamadas"
            title={
                <div className="mb-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        Minutos <span className="text-blue-600">IA</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Consumo y distribución de minutos del período seleccionado
                    </p>

                    {/* Hero metric */}
                    <div className="mt-6 flex items-end gap-6 flex-wrap">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total minutos</p>
                            <p className="text-7xl font-black text-slate-900 tracking-tighter leading-none">
                                {kpi.total_minutos.toLocaleString("es-ES")}
                                <span className="text-2xl font-bold text-slate-400 ml-2">min</span>
                            </p>
                        </div>
                        <div className="flex gap-6 pb-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Duración media</p>
                                <p className="text-2xl font-black text-blue-600">
                                    {kpi.duracion_media_segundos}
                                    <span className="text-sm font-bold text-slate-400 ml-1">seg</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Llamadas</p>
                                <p className="text-2xl font-black text-slate-700">
                                    {kpi.total_llamadas.toLocaleString("es-ES")}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contactadas</p>
                                <p className="text-2xl font-black text-emerald-600">
                                    {kpi.total_contactadas.toLocaleString("es-ES")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            }
        />
    );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function MinutosChartsSection({
    from, to, filters,
}: {
    from: string; to: string; filters: AnalyticsFilters;
}) {
    const kpi = await getKpiMinutos(from, to, filters);
    return <MinutosCharts data={kpi} />;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function MinutosPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const isAdmin = await getAdminStatus();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <FilterBar />

            {/* KPI Cards */}
            <Suspense
                key={`min-kpis-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-6 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <MinutosKpis from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>

            {/* Charts */}
            <Suspense
                key={`min-charts-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <MinutosChartsSection from={from} to={to} filters={filters} />
            </Suspense>
        </div>
    );
}
