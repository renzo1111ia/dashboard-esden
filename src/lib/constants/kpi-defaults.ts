import { KpiConfig, ChartConfig } from "@/types/tenant";

// --- GENERAL ---
export const DEFAULT_SUMMARY_KPIS: KpiConfig[] = [
    { id: 'def-1', label: 'Total de llamados', icon: 'Phone', color: 'bg-blue-600', size: '4', staticKey: 'total_llamados', isVisible: true },
    { id: 'def-2', label: 'Llamadas atendidas', icon: 'PhoneCall', color: 'bg-emerald-600', size: '4', staticKey: 'llamadas_atendidas_gen', isVisible: true },
    { id: 'def-3', label: 'Fallidas', icon: 'PhoneMissed', color: 'bg-red-600', size: '4', staticKey: 'fallidas_gen', isVisible: true },
    { id: 'def-4', label: 'Leads totales Alcanzados', icon: 'Users', color: 'bg-indigo-600', size: '3', staticKey: 'leads_totales_alcanzados_gen', isVisible: true },
    { id: 'def-5', label: 'Leads totales ilocalizables', icon: 'UserX', color: 'bg-orange-600', size: '3', staticKey: 'leads_totales_ilocalizables', isVisible: true },
    { id: 'def-6', label: 'Ilocalizables Teléfono erroneo', icon: 'PhoneOff', color: 'bg-rose-600', size: '3', staticKey: 'ilocalizables_telefono', isVisible: true },
    { id: 'def-7', label: 'Ilocalizables por Buzón de Voz', icon: 'Voicemail', color: 'bg-amber-600', size: '3', staticKey: 'ilocalizables_buzon', isVisible: true },
    { id: 'def-8', label: 'No cumplen requisitos', icon: 'UserMinus', color: 'bg-pink-600', size: '3', staticKey: 'no_cumplen_requisitos', isVisible: true },
    { id: 'def-9', label: 'No interesados', icon: 'ThumbsDown', color: 'bg-slate-600', size: '3', staticKey: 'no_interesados_gen', isVisible: true },
    { id: 'def-10', label: 'Leads cualificados', icon: 'Star', color: 'bg-yellow-600', size: '3', staticKey: 'leads_cualificados_gen', isVisible: true },
    { id: 'def-11', label: 'Total de agendas', icon: 'Calendar', color: 'bg-teal-600', size: '3', staticKey: 'total_agendas_gen', isVisible: true },
    { id: 'def-12', label: 'Duracion media de llamada', icon: 'Clock', color: 'bg-cyan-600', size: '6', staticKey: 'duracion_media', isVisible: true },
    { id: 'def-13', label: 'Total minutos', icon: 'TrendingUp', color: 'bg-purple-600', size: '6', staticKey: 'total_minutos_gen', isVisible: true },
];

export const DEFAULT_CHARTS: ChartConfig[] = [
    { id: 'ch-1', type: 'area', title: 'Evolución de Minutos (Totales vs Facturados)', dataKey: 'areaHistorico', size: '12', isVisible: true },
    { id: 'ch-2', type: 'vertical-bar', title: 'Mejores horas de contacto', dataKey: 'mejoresHoras', size: '12', isVisible: true },
    { id: 'ch-3', type: 'donut', title: 'Motivo de No contacto', dataKey: 'motivoNoContacto', size: '6', isVisible: true, isDonut: false },
    { id: 'ch-4', type: 'vertical-bar', title: 'Tipología de llamadas', dataKey: 'tipologia', size: '6', isVisible: true },
    { id: 'ch-5', type: 'vertical-bar', title: 'Leads cualificados agendados vs no agendados', dataKey: 'agendados', size: '6', isVisible: true },
    { id: 'ch-6', type: 'vertical-bar', title: 'Opt-in Whatsapp', dataKey: 'optIn', size: '6', isVisible: true },
    { id: 'ch-7', type: 'donut', title: 'Master de interés', dataKey: 'masterInteres', size: '6', isVisible: true, isDonut: false },
    { id: 'ch-8', type: 'donut', title: 'Leads no cualificados (Motivos de anulación)', dataKey: 'leadsAnulados', size: '6', isVisible: true, isDonut: true, centerLabel: 'total' },
];

// --- LLAMADAS ---
export const LLAMADAS_KPIS: KpiConfig[] = [
    { id: 'll-1', label: 'Total de llamados', icon: 'Phone', color: 'bg-blue-600', size: '4', staticKey: 'total_llamados', isVisible: true },
    { id: 'll-2', label: 'Llamadas atendidas', icon: 'PhoneCall', color: 'bg-emerald-600', size: '4', staticKey: 'llamadas_atendidas_gen', isVisible: true },
    { id: 'll-3', label: 'Fallidas', icon: 'PhoneMissed', color: 'bg-red-600', size: '4', staticKey: 'fallidas_gen', isVisible: true },
    { id: 'll-4', label: 'Leads totales alcanzados', icon: 'Users', color: 'bg-indigo-600', size: '4', staticKey: 'leads_totales_alcanzados_gen', isVisible: true },
    { id: 'll-5', label: 'Leads totales ilocalizables', icon: 'UserX', color: 'bg-orange-600', size: '4', staticKey: 'leads_totales_ilocalizables', isVisible: true },
    { id: 'll-6', label: 'Ilocalizables teléfono erróneo', icon: 'PhoneOff', color: 'bg-rose-600', size: '4', staticKey: 'ilocalizables_telefono', isVisible: true },
    { id: 'll-7', label: 'Ilocalizables por buzón de voz', icon: 'Voicemail', color: 'bg-amber-600', size: '4', staticKey: 'ilocalizables_buzon', isVisible: true },
    { id: 'll-8', label: 'No cumplen requisitos', icon: 'UserMinus', color: 'bg-pink-600', size: '4', staticKey: 'no_cumplen_requisitos', isVisible: true },
    { id: 'll-9', label: 'No interesados', icon: 'ThumbsDown', color: 'bg-slate-600', size: '4', staticKey: 'no_interesados_gen', isVisible: true },
    { id: 'll-10', label: 'Leads cualificados', icon: 'Star', color: 'bg-yellow-600', size: '4', staticKey: 'leads_cualificados_gen', isVisible: true },
    { id: 'll-11', label: 'Total de agendas', icon: 'Calendar', color: 'bg-teal-600', size: '4', staticKey: 'total_agendas_gen', isVisible: true },
    { id: 'll-12', label: 'Duración media de llamada', icon: 'Clock', color: 'bg-cyan-600', size: '6', staticKey: 'duracion_media', isVisible: true },
    { id: 'll-13', label: 'Total minutos', icon: 'TrendingUp', color: 'bg-purple-600', size: '6', staticKey: 'total_minutos_gen', isVisible: true },
];

// --- WHATSAPP ---
export const WHATSAPP_KPIS: KpiConfig[] = [
    { id: 'ws-1', label: 'Total Efectivos WhatsApp', icon: 'MessageCircle', color: 'bg-blue-600', size: '6', staticKey: 'efectivos_whatsapp', isVisible: true },
    { id: 'ws-2', label: 'Whatsapp ilocalizables', icon: 'UserX', color: 'bg-orange-600', size: '6', staticKey: 'whatsapp_ilocalizables', isVisible: true },
    { id: 'ws-3', label: 'Leads cualificados', icon: 'Star', color: 'bg-yellow-600', size: '4', staticKey: 'leads_cualificados_wsp', isVisible: true },
    { id: 'ws-4', label: 'Lead no cualificado', icon: 'UserMinus', color: 'bg-rose-600', size: '4', staticKey: 'lead_no_cualificado_wsp', isVisible: true },
    { id: 'ws-5', label: 'No interesados', icon: 'ThumbsDown', color: 'bg-slate-600', size: '4', staticKey: 'no_interesados_wsp', isVisible: true },
    { id: 'ws-6', label: 'Total Agendas', icon: 'Calendar', color: 'bg-teal-600', size: '12', staticKey: 'total_agendas_wsp', isVisible: true },
];

// --- CAMPAÑAS ---
export const CAMPANAS_KPIS: KpiConfig[] = [
    { id: 'cp-1', label: 'Leads Contactados', icon: 'Phone', color: 'bg-blue-600', size: '4', staticKey: 'leads_contactados', isVisible: true },
    { id: 'cp-2', label: 'Llamadas Atendidas', icon: 'PhoneCall', color: 'bg-emerald-600', size: '4', staticKey: 'llamadas_atendidas_camp', isVisible: true },
    { id: 'cp-3', label: 'Fallidas', icon: 'PhoneMissed', color: 'bg-red-600', size: '4', staticKey: 'fallidas', isVisible: true },
    { id: 'cp-4', label: 'Leads totales Alcanzados', icon: 'Users', color: 'bg-indigo-600', size: '3', staticKey: 'leads_totales_alcanzados', isVisible: true },
    { id: 'cp-5', label: 'Leads Ilocalizables', icon: 'UserX', color: 'bg-orange-600', size: '3', staticKey: 'leads_ilocalizables', isVisible: true },
    { id: 'cp-6', label: 'Lead no Cualificado', icon: 'UserMinus', color: 'bg-rose-600', size: '3', staticKey: 'lead_no_cualificado', isVisible: true },
    { id: 'cp-7', label: 'No Interesados', icon: 'ThumbsDown', color: 'bg-slate-600', size: '3', staticKey: 'no_interesados', isVisible: true },
    { id: 'cp-8', label: 'Leads Cualificados', icon: 'Star', color: 'bg-yellow-600', size: '6', staticKey: 'leads_cualificados_camp', isVisible: true },
    { id: 'cp-9', label: 'Total Agendas', icon: 'Calendar', color: 'bg-teal-600', size: '6', staticKey: 'total_agendas_camp', isVisible: true },
];

export const CAMPANAS_CHARTS: ChartConfig[] = [
    { id: 'cp-ch-1', type: 'area', title: 'Desempeño Diario de Campañas', dataKey: 'areaHistorico', size: '12', isVisible: true },
];
