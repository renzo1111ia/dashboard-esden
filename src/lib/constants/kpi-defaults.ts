import { KpiConfig, ChartConfig } from "@/types/tenant";

/**
 * Default KPIs mapped to the new normalized schema.
 * staticKey values correspond to fields in KpiGenerales interface from analytics.ts
 */

// ─── GENERAL KPIs ─────────────────────────────────────────────────────────────

export const DEFAULT_SUMMARY_KPIS: KpiConfig[] = [
    // ── GRUPO 1: VOLUMEN Y CONTACTO ─────────────────────────────────────────
    {
        id: 'def-1',
        label: 'Llamadas realizadas',
        icon: 'PhoneCall',
        color: 'bg-blue-600',
        size: '3',
        staticKey: 'total_llamadas',
        isVisible: true,
        group: 'Métricas Generales',
    },
    {
        id: 'def-2',
        label: 'Llamadas conectadas',
        icon: 'Phone',
        color: 'bg-indigo-600',
        size: '3',
        staticKey: 'total_leads',
        isVisible: true,
        group: 'Métricas Generales',
    },
    {
        id: 'def-3',
        label: 'Llamadas fallidas',
        icon: 'PhoneOff',
        color: 'bg-emerald-600',
        size: '3',
        staticKey: 'total_contactados',
        isVisible: true,
        group: 'Métricas Generales',
    },
    {
        id: 'def-4',
        label: 'Tasa de contacto',
        icon: 'Percent',
        color: 'bg-teal-600',
        size: '3',
        staticKey: 'tasa_contacto',
        isVisible: true,
        suffix: '%',
        group: 'Métricas Generales',
    },

    // ── GRUPO 2: PERFORMANCE Y CONVERSIÓN ────────────────────────────────────
    {
        id: 'def-7',
        label: 'Citas Agendadas',
        icon: 'Calendar',
        color: 'bg-orange-600',
        size: '3',
        staticKey: 'total_agendados',
        isVisible: true,
        group: 'PERFORMANCE Y CONVERSIÓN',
    },
    {
        id: 'def-12',
        label: 'Tasa de agenda',
        icon: 'TrendingUp',
        color: 'bg-orange-500',
        size: '3',
        staticKey: 'tasa_agendamiento',
        isVisible: true,
        suffix: '%',
        group: 'PERFORMANCE Y CONVERSIÓN',
    },
    {
        id: 'def-8',
        label: 'Leads Cualificados',
        icon: 'Star',
        color: 'bg-yellow-500',
        size: '3',
        staticKey: 'total_cualificados',
        isVisible: true,
        group: 'PERFORMANCE Y CONVERSIÓN',
    },
    {
        id: 'def-13',
        label: 'Tasa de conversión',
        icon: 'Target',
        color: 'bg-yellow-600',
        size: '3',
        staticKey: 'tasa_conversion',
        isVisible: true,
        suffix: '%',
        group: 'PERFORMANCE Y CONVERSIÓN',
    },

    // ── GRUPO 3: PRODUCTIVIDAD IA ──────────────────────────────────────────
    {
        id: 'def-5',
        label: 'Total Minutos IA',
        icon: 'Clock',
        color: 'bg-purple-600',
        size: '4',
        staticKey: 'total_minutos',
        isVisible: true,
        suffix: ' min',
        group: 'PRODUCTIVIDAD IA',
    },
    {
        id: 'def-6',
        label: 'Duración media',
        icon: 'Clock',
        color: 'bg-cyan-600',
        size: '4',
        staticKey: 'duracion_media_segundos',
        isVisible: true,
        suffix: ' seg',
        group: 'PRODUCTIVIDAD IA',
    },
    {
        id: 'def-11',
        label: 'T. Respuesta Promedio',
        icon: 'Zap',
        color: 'bg-amber-600',
        size: '4',
        staticKey: 'tiempo_respuesta_promedio_minutos',
        isVisible: true,
        suffix: ' min',
        group: 'PRODUCTIVIDAD IA',
    },

    // ── GRUPO 4: AHORRO Y EFICIENCIA ───────────────────────────────────────
    {
        id: 'def-16',
        label: 'Horas Ahorradas',
        icon: 'Clock',
        color: 'bg-blue-500',
        size: '12',
        staticKey: 'tiempo_ahorrado_formateado',
        isVisible: true,
        group: 'AHORRO Y EFICIENCIA',
    },

    // ── GRUPO 5: FILTROS Y NEGATIVOS ───────────────────────────────────────
    {
        id: 'def-9',
        label: 'No Cualificados',
        icon: 'UserMinus',
        color: 'bg-rose-600',
        size: '4',
        staticKey: 'total_no_cualificados',
        isVisible: true,
        group: 'FILTROS Y NEGATIVOS',
    },
    {
        id: 'def-10',
        label: 'Sin Contacto',
        icon: 'PhoneMissed',
        color: 'bg-slate-500',
        size: '4',
        staticKey: 'total_no_contacto',
        isVisible: true,
        group: 'FILTROS Y NEGATIVOS',
    },
    {
        id: 'def-14',
        label: '% Ilocalizables',
        icon: 'UserX',
        color: 'bg-gray-600',
        size: '4',
        staticKey: 'tasa_ilocalizables',
        isVisible: true,
        suffix: '%',
        group: 'FILTROS Y NEGATIVOS',
    },
];

// ─── DEFAULT CHARTS ───────────────────────────────────────────────────────────

export const DEFAULT_CHARTS: ChartConfig[] = [
    {
        id: 'ch-1',
        type: 'donut',
        title: 'Motivo de Anulación',
        dataKey: 'porMotivoAnulacion',
        size: '6',
        isVisible: true,
        isDonut: true,
        centerLabel: 'total',
    },
    {
        id: 'ch-2',
        type: 'area',
        title: 'Citas Agendadas por Fecha',
        dataKey: 'agendadosPorFecha',
        size: '6',
        isVisible: true,
    },
    {
        id: 'ch-3',
        type: 'vertical-bar',
        title: 'Estado de Llamadas',
        dataKey: 'porEstadoLlamada',
        size: '6',
        isVisible: true,
    },
    {
        id: 'ch-4',
        type: 'vertical-bar',
        title: 'Razón de Término',
        dataKey: 'porRazonTermino',
        size: '6',
        isVisible: true,
    },
    {
        id: 'ch-5',
        type: 'donut',
        title: 'Tipo de Lead',
        dataKey: 'porTipoLead',
        size: '6',
        isVisible: true,
        isDonut: false,
    },
    {
        id: 'ch-6',
        type: 'vertical-bar',
        title: 'Leads por Origen',
        dataKey: 'porOrigen',
        size: '6',
        isVisible: true,
    },
    {
        id: 'ch-7',
        type: 'donut',
        title: 'Cualificación de Leads',
        dataKey: 'porCualificacion',
        size: '6',
        isVisible: true,
        isDonut: false,
    },
    {
        id: 'ch-8',
        type: 'area',
        title: 'Primer Contacto por Fecha',
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
    { id: 'll-7', label: '% Agenda', icon: 'Calendar', color: 'bg-orange-600', size: '4', staticKey: 'tasa_agendamiento', isVisible: true, suffix: '%' },
    { id: 'll-8', label: '% Conversión', icon: 'Target', color: 'bg-yellow-600', size: '4', staticKey: 'tasa_conversion', isVisible: true, suffix: '%' },
];

// ─── WHATSAPP KPIs ────────────────────────────────────────────────────────────

export const WHATSAPP_KPIS: KpiConfig[] = [
    { id: 'ws-1', label: 'Leads con WhatsApp', icon: 'MessageCircle', color: 'bg-blue-600', size: '4', staticKey: 'total_leads_unicos', isVisible: true },
    { id: 'ws-3', label: 'Agendados', icon: 'Calendar', color: 'bg-orange-600', size: '4', staticKey: 'total_agendados', isVisible: true },
    { id: 'ws-4', label: '% Agenda', icon: 'PieChart', color: 'bg-orange-500', size: '4', staticKey: 'tasa_agendamiento', isVisible: true, suffix: '%' },
    { id: 'ws-2', label: 'Cualificados', icon: 'Star', color: 'bg-yellow-600', size: '4', staticKey: 'total_cualificados', isVisible: true },
    { id: 'ws-5', label: '% Conversión', icon: 'Target', color: 'bg-yellow-700', size: '4', staticKey: 'tasa_conversion', isVisible: true, suffix: '%' },
    { id: 'ws-6', label: '% Ilocalizables', icon: 'UserX', color: 'bg-gray-600', size: '4', staticKey: 'tasa_ilocalizables', isVisible: true, suffix: '%' },
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
