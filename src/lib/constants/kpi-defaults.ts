import { KpiConfig, ChartConfig } from "@/types/tenant";

/**
 * Default KPIs mapped to the new normalized schema.
 * staticKey values correspond to fields in KpiGenerales interface from analytics.ts
 * 
 * Predeterminados (always shown):
 *  - duracion_ai          → duracion_media_segundos
 *  - total_mins           → total_minutos
 *  - fecha_con_asesor     → total_agendados
 *  - motivo_anulacion     → por_motivo_anulacion (chart)
 * 
 * Configurables por cliente:
 *  - estado_llamada, razon_termino, tipo_lead, cualificacion, tiempo_respuesta, etc.
 */

// ─── GENERAL KPIs ─────────────────────────────────────────────────────────────

export const DEFAULT_SUMMARY_KPIS: KpiConfig[] = [
    // Predeterminados (locked defaults)
    {
        id: 'def-1',
        label: 'Total Llamadas',
        icon: 'Phone',
        color: 'bg-blue-600',
        size: '3',
        staticKey: 'total_llamadas',
        isVisible: true,
    },
    {
        id: 'def-2',
        label: 'Total Leads',
        icon: 'Users',
        color: 'bg-indigo-600',
        size: '3',
        staticKey: 'total_leads',
        isVisible: true,
    },
    {
        id: 'def-3',
        label: 'Contactados',
        icon: 'PhoneCall',
        color: 'bg-emerald-600',
        size: '3',
        staticKey: 'total_contactados',
        isVisible: true,
    },
    {
        id: 'def-4',
        label: 'Tasa de Contacto',
        icon: 'TrendingUp',
        color: 'bg-teal-600',
        size: '3',
        staticKey: 'tasa_contacto',
        isVisible: true,
        suffix: '%',
    },
    // ── Predeterminados de negocio ─────────────────────────────────────────
    {
        id: 'def-5',
        label: 'Total Minutos IA',            // "total_mins" predeterminado
        icon: 'Clock',
        color: 'bg-purple-600',
        size: '3',
        staticKey: 'total_minutos',
        isVisible: true,
        suffix: ' min',
    },
    {
        id: 'def-6',
        label: 'Duración Media IA',           // "duracion_ai" predeterminado
        icon: 'Timer',
        color: 'bg-cyan-600',
        size: '3',
        staticKey: 'duracion_media_segundos',
        isVisible: true,
        suffix: ' seg',
    },
    {
        id: 'def-7',
        label: 'Citas Agendadas',             // "fecha_con_asesor" predeterminado
        icon: 'Calendar',
        color: 'bg-orange-600',
        size: '3',
        staticKey: 'total_agendados',
        isVisible: true,
    },
    {
        id: 'def-8',
        label: 'Leads Cualificados',          // predeterminado
        icon: 'Star',
        color: 'bg-yellow-500',
        size: '3',
        staticKey: 'total_cualificados',
        isVisible: true,
    },
    {
        id: 'def-9',
        label: 'No Cualificados',
        icon: 'UserMinus',
        color: 'bg-rose-600',
        size: '4',
        staticKey: 'total_no_cualificados',
        isVisible: true,
    },
    {
        id: 'def-10',
        label: 'Sin Contacto',
        icon: 'PhoneMissed',
        color: 'bg-slate-500',
        size: '4',
        staticKey: 'total_no_contacto',
        isVisible: true,
    },
    {
        id: 'def-11',
        label: 'T. Respuesta Promedio',       // "tiempo_respuesta" predeterminado
        icon: 'Zap',
        color: 'bg-amber-600',
        size: '4',
        staticKey: 'tiempo_respuesta_promedio_minutos',
        isVisible: true,
        suffix: ' min',
    },
];

// ─── DEFAULT CHARTS ───────────────────────────────────────────────────────────

export const DEFAULT_CHARTS: ChartConfig[] = [
    // Predeterminado: Motivo de anulación
    {
        id: 'ch-1',
        type: 'donut',
        title: 'Motivo de Anulación',           // "motivo_anulacion" predeterminado
        dataKey: 'porMotivoAnulacion',
        size: '6',
        isVisible: true,
        isDonut: true,
        centerLabel: 'total',
    },
    // Predeterminado: Agendados por fecha (ver por fechas la cantidad)
    {
        id: 'ch-2',
        type: 'area',
        title: 'Citas Agendadas por Fecha',     // "fecha_con_asesor" chart predeterminado
        dataKey: 'agendadosPorFecha',
        size: '6',
        isVisible: true,
    },
    // Estado de la llamada
    {
        id: 'ch-3',
        type: 'vertical-bar',
        title: 'Estado de Llamadas',
        dataKey: 'porEstadoLlamada',
        size: '6',
        isVisible: true,
    },
    // Razón de término
    {
        id: 'ch-4',
        type: 'vertical-bar',
        title: 'Razón de Término',
        dataKey: 'porRazonTermino',
        size: '6',
        isVisible: true,
    },
    // Tipo de lead (ilocalizable / nuevo / localizable)
    {
        id: 'ch-5',
        type: 'donut',
        title: 'Tipo de Lead',
        dataKey: 'porTipoLead',
        size: '6',
        isVisible: true,
        isDonut: false,
    },
    // Origen (configurable por cliente)
    {
        id: 'ch-6',
        type: 'vertical-bar',
        title: 'Leads por Origen',
        dataKey: 'porOrigen',
        size: '6',
        isVisible: true,
    },
    // Cualificación
    {
        id: 'ch-7',
        type: 'donut',
        title: 'Cualificación de Leads',
        dataKey: 'porCualificacion',
        size: '6',
        isVisible: true,
        isDonut: false,
    },
    // Fecha del primer contacto (predeterminado)
    {
        id: 'ch-8',
        type: 'area',
        title: 'Primer Contacto por Fecha',    // "fecha_primer_contacto" predeterminado
        dataKey: 'primerContactoPorFecha',
        size: '6',
        isVisible: true,
    },
];

// ─── LLAMADAS KPIs ────────────────────────────────────────────────────────────

export const LLAMADAS_KPIS: KpiConfig[] = [
    { id: 'll-1', label: 'Total Llamadas', icon: 'Phone', color: 'bg-blue-600', size: '4', staticKey: 'total_llamadas', isVisible: true },
    { id: 'll-2', label: 'Contactados', icon: 'PhoneCall', color: 'bg-emerald-600', size: '4', staticKey: 'total_contactados', isVisible: true },
    { id: 'll-3', label: 'Sin Contacto', icon: 'PhoneMissed', color: 'bg-red-600', size: '4', staticKey: 'total_no_contacto', isVisible: true },
    { id: 'll-4', label: 'Total Minutos IA', icon: 'Clock', color: 'bg-purple-600', size: '4', staticKey: 'total_minutos', isVisible: true, suffix: ' min' },
    { id: 'll-5', label: 'Duración Media', icon: 'Timer', color: 'bg-cyan-600', size: '4', staticKey: 'duracion_media_segundos', isVisible: true, suffix: ' seg' },
    { id: 'll-6', label: 'Tasa Contacto', icon: 'TrendingUp', color: 'bg-teal-600', size: '4', staticKey: 'tasa_contacto', isVisible: true, suffix: '%' },
];

// ─── WHATSAPP KPIs ────────────────────────────────────────────────────────────

export const WHATSAPP_KPIS: KpiConfig[] = [
    { id: 'ws-1', label: 'Leads con WhatsApp', icon: 'MessageCircle', color: 'bg-blue-600', size: '6', staticKey: 'total_leads', isVisible: true },
    { id: 'ws-2', label: 'Cualificados vía WP', icon: 'Star', color: 'bg-yellow-600', size: '6', staticKey: 'total_cualificados', isVisible: true },
];

// ─── CAMPAÑAS KPIs ────────────────────────────────────────────────────────────

export const CAMPANAS_KPIS: KpiConfig[] = [
    { id: 'cp-1', label: 'Total Leads', icon: 'Users', color: 'bg-blue-600', size: '4', staticKey: 'total_leads', isVisible: true },
    { id: 'cp-2', label: 'Contactados', icon: 'PhoneCall', color: 'bg-emerald-600', size: '4', staticKey: 'total_contactados', isVisible: true },
    { id: 'cp-3', label: 'Cualificados', icon: 'Star', color: 'bg-yellow-600', size: '4', staticKey: 'total_cualificados', isVisible: true },
    { id: 'cp-4', label: 'Agendados', icon: 'Calendar', color: 'bg-teal-600', size: '4', staticKey: 'total_agendados', isVisible: true },
    { id: 'cp-5', label: 'No Cualificados', icon: 'UserMinus', color: 'bg-rose-600', size: '4', staticKey: 'total_no_cualificados', isVisible: true },
    { id: 'cp-6', label: 'T. Respuesta', icon: 'Zap', color: 'bg-amber-600', size: '4', staticKey: 'tiempo_respuesta_promedio_minutos', isVisible: true, suffix: ' min' },
];

export const CAMPANAS_CHARTS: ChartConfig[] = [
    { id: 'cp-ch-1', type: 'area', title: 'Primer Contacto por Fecha', dataKey: 'primerContactoPorFecha', size: '12', isVisible: true },
];
