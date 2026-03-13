import { Suspense } from "react";
import {
    getKpiWhatsapp, getDynamicKpis,
    type KpiWhatsapp, type AnalyticsFilters,
} from "@/lib/actions/analytics";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { KpiSkeleton, ChartSkeleton } from "@/components/charts/DashboardCharts";
import { SummaryManager } from "@/components/dashboard/SummaryManager";
import { WHATSAPP_KPIS } from "@/lib/constants/kpi-defaults";
import { KpiConfig } from "@/types/tenant";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { parseFilters } from "@/lib/utils/date-filters";
import { WhatsappCharts } from "@/components/dashboard/WhatsappCharts";

export const dynamic = "force-dynamic";

// ─── KPIs SECTION ─────────────────────────────────────────────────────────────

async function WhatsappKpis({
    from, to, isAdmin, filters,
}: {
    from: string; to: string; isAdmin: boolean; filters: AnalyticsFilters;
}) {
    const [kpi, tenantConfig] = await Promise.all([
        getKpiWhatsapp(from, to, filters),
        getActiveTenantConfig(),
    ]);
    if (!tenantConfig) return null;

    const currentKpis = (tenantConfig.config as any)?.kpis_whatsapp as KpiConfig[] || [];
    const mergedKpis  = currentKpis.length > 0 ? currentKpis : WHATSAPP_KPIS;
    const dynamicValues = await getDynamicKpis(from, to, mergedKpis.filter(k => !k.staticKey), filters);

    // Build compatible values object (staticKey names from kpi-defaults)
    const values = {
        total_leads:          kpi.total_leads_unicos,
        total_cualificados:   0,      // no aplica aquí directamente
        // pad remaining fields for SummaryManager
        total_llamadas: 0, total_contactados: 0, total_no_contacto: 0,
        tasa_contacto: 0, total_minutos: 0, duracion_media_segundos: 0,
        total_agendados: 0, tiempo_respuesta_promedio_minutos: null,
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
            configKey="kpis_whatsapp"
            title={
                <div className="mb-2">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-1">
                        {/* WhatsApp green icon */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#25d366]">
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.12 1.528 5.853L0 24l6.327-1.496C8.047 23.457 9.985 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.637-.51-5.14-1.397l-.368-.218-3.754.887.929-3.654-.24-.376C2.51 15.612 2 13.862 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                WhatsApp <span className="text-green-600">Leads</span>
                            </h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Gestión y conversiones vía WhatsApp
                            </p>
                        </div>
                    </div>

                    {/* Hero metrics */}
                    <div className="mt-6 flex flex-wrap gap-8">
                        <HeroStat label="Conversaciones" value={kpi.total_conversaciones.toLocaleString("es-ES")} color="text-slate-900" />
                        <HeroStat label="Leads únicos" value={kpi.total_leads_unicos.toLocaleString("es-ES")} color="text-slate-700" />
                        <HeroStat label="Con Opt-in" value={kpi.con_opt_in.toLocaleString("es-ES")} color="text-green-600" />
                        <HeroStat label="Tasa Opt-in" value={`${kpi.tasa_opt_in}%`} color="text-emerald-600" />
                        <HeroStat label="Sin Opt-in" value={kpi.sin_opt_in.toLocaleString("es-ES")} color="text-slate-400" />
                    </div>
                </div>
            }
        />
    );
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className={`text-3xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
        </div>
    );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────

async function WhatsappChartsSection({
    from, to, filters,
}: {
    from: string; to: string; filters: AnalyticsFilters;
}) {
    const kpi = await getKpiWhatsapp(from, to, filters);
    return <WhatsappCharts data={kpi} />;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const isAdmin = await getAdminStatus();

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <FilterBar />

            {/* KPI Cards */}
            <Suspense
                key={`wp-kpis-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                        {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
                    </div>
                }
            >
                <WhatsappKpis from={from} to={to} isAdmin={isAdmin} filters={filters} />
            </Suspense>

            {/* Charts */}
            <Suspense
                key={`wp-charts-${from}-${to}-${JSON.stringify(filters)}`}
                fallback={
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => <ChartSkeleton key={i} />)}
                    </div>
                }
            >
                <WhatsappChartsSection from={from} to={to} filters={filters} />
            </Suspense>
        </div>
    );
}
