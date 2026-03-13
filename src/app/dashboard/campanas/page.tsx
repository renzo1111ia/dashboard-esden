import { Suspense } from "react";
import {
    getKpiCampanas, getDynamicKpis,
    type KpiCampanas, type AnalyticsFilters,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { TenantSetupBanner } from "@/components/layout/TenantSetupBanner";
import { CAMPANAS_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";
import { CampanasCharts } from "@/components/dashboard/CampanasCharts";

export const dynamic = "force-dynamic";

// ─── HERO STAT ────────────────────────────────────────────────────────────────

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className={`text-3xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
        </div>
    );
}

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function CampanasKpis({
    from, to, isAdmin, filters,
}: {
    from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters;
}) {
    const [kpi, tenantConfig] = await Promise.all([
        getKpiCampanas(from, to, filters),
        getActiveTenantConfig(),
    ]);
    if (!tenantConfig) return null;

    const currentKpis  = (tenantConfig.config as any)?.kpis_campanas as KpiConfig[] || [];
    const mergedKpis   = currentKpis.length > 0 ? currentKpis : CAMPANAS_KPIS;
    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey), filters);

    // Pad to KpiGenerales shape (SummaryManager is agnostic via staticKey)
    const values = {
        total_leads:       kpi.total_leads,
        total_llamadas:    kpi.total_llamadas,
        total_contactados: kpi.total_contactados,
        total_agendados:   kpi.total_agendados,
        total_cualificados: kpi.total_cualificados,
        total_minutos:     kpi.total_minutos,
        // unused fields
        total_no_contacto: 0, tasa_contacto: 0,
        duracion_media_segundos: 0, tiempo_respuesta_promedio_minutos: null,
        total_no_cualificados: 0, por_estado_llamada: [], por_razon_termino: [],
        por_origen: [], por_tipo_lead: [], por_cualificacion: [],
        por_motivo_anulacion: [], agendados_por_fecha: [], primer_contacto_por_fecha: [],
    } as any;

    return (
        <SummaryManager
            tenant={tenantConfig}
            initialKpis={mergedKpis}
            values={values}
            dynamicValues={dynamicValues}
            isAdmin={isAdmin}
            configKey="kpis_campanas"
            title={
                <div className="mb-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        Campañas <span className="text-blue-600">IA</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Rendimiento y conversión por campaña en el período seleccionado
                    </p>

                    {/* Hero metrics */}
                    <div className="mt-6 flex flex-wrap gap-8">
                        <HeroStat label="Total Leads"      value={kpi.total_leads.toLocaleString("es-ES")}        color="text-slate-900" />
                        <HeroStat label="Llamadas"         value={kpi.total_llamadas.toLocaleString("es-ES")}      color="text-blue-600" />
                        <HeroStat label="Contactados"      value={kpi.total_contactados.toLocaleString("es-ES")}   color="text-emerald-600" />
                        <HeroStat label="Agendados"        value={kpi.total_agendados.toLocaleString("es-ES")}     color="text-teal-600" />
                        <HeroStat label="Cualificados"     value={kpi.total_cualificados.toLocaleString("es-ES")}  color="text-violet-600" />
                        <HeroStat label="Minutos IA"       value={`${kpi.total_minutos.toLocaleString("es-ES")} min`} color="text-amber-600" />
                        <HeroStat label="Campañas"         value={kpi.campanas.length.toString()}                   color="text-slate-500" />
                    </div>
                </div>
            }
        />
    );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function CampanasChartsSection({
    from, to, filters,
}: {
    from: string; to: string; filters: AnalyticsFilters;
}) {
    const kpi = await getKpiCampanas(from, to, filters);
    return <CampanasCharts data={kpi} />;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function CampanasPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const isAdmin = await getAdminStatus();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {isAdmin && <TenantSetupBanner />}

            <FilterBar />

            {/* KPI Cards */}
            <Suspense
                key={`camp-kpis-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-6 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <CampanasKpis from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>

            {/* Charts */}
            <Suspense
                key={`camp-charts-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <CampanasChartsSection from={from} to={to} filters={filters} />
            </Suspense>
        </div>
    );
}
