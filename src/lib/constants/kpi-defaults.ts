import { KpiConfig, ChartConfig } from "@/types/tenant";

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
