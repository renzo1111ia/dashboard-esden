-- ============================================================
-- ESDEN Analytics Dashboard — SCHEMA RESTORE SCRIPT
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Lead Table
CREATE TABLE IF NOT EXISTS public.lead (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead_externo TEXT UNIQUE,
    nombre TEXT,
    apellido TEXT,
    telefono TEXT,
    email TEXT,
    pais TEXT,
    tipo_lead TEXT, -- "nuevo", "ilocalizable", "localizable"
    origen TEXT,
    campana TEXT,
    fecha_ingreso_crm TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- 3. Llamadas Table
CREATE TABLE IF NOT EXISTS public.llamadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada_retell TEXT,
    tipo_agente TEXT,
    nombre_agente TEXT,
    estado_llamada TEXT,
    razon_termino TEXT,
    fecha_inicio TIMESTAMPTZ,
    duracion_segundos INTEGER,
    url_grabacion TEXT,
    transcripcion TEXT,
    resumen TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 4. Intentos Llamadas Table
CREATE TABLE IF NOT EXISTS public.intentos_llamadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada UUID REFERENCES public.llamadas(id) ON DELETE SET NULL,
    tipo_intento TEXT, -- "LLAMADA", "WHATSAPP"
    numero_intento INTEGER,
    fecha_reintento TIMESTAMPTZ,
    estado TEXT,
    fecha_ejecucion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 5. Conversaciones Whatsapp Table
CREATE TABLE IF NOT EXISTS public.conversaciones_whatsapp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_conversacion_chatwoot TEXT,
    opt_in_whatsapp BOOLEAN DEFAULT false,
    estado TEXT,
    fecha_ultimo_mensaje TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 6. Agendamientos Table
CREATE TABLE IF NOT EXISTS public.agendamientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    fecha_agendada_cliente TIMESTAMPTZ,
    fecha_agendada_lead TIMESTAMPTZ,
    confirmado BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 7. Lead Cualificacion Table
CREATE TABLE IF NOT EXISTS public.lead_cualificacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_llamada UUID REFERENCES public.llamadas(id) ON DELETE SET NULL,
    motivo_anulacion TEXT,
    cualificacion TEXT, -- "CUALIFICADO", "NO_CUALIFICADO", "NO"
    anios_experiencia INTEGER,
    nivel_estudios TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 8. Programas Table
CREATE TABLE IF NOT EXISTS public.programas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    id_producto TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 9. Lead Programas Table
CREATE TABLE IF NOT EXISTS public.lead_programas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    id_programa UUID NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 10. Notificaciones Table
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_lead UUID NOT NULL REFERENCES public.lead(id) ON DELETE CASCADE,
    tipo TEXT,
    fecha_envio TIMESTAMPTZ,
    metadatos JSONB,
    fecha_creacion TIMESTAMPTZ DEFAULT now()
);

-- 11. Tenants Table (if missing)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    client_email TEXT,
    auth_user_id UUID,
    config JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- RLS (Basic - update as needed)
ALTER TABLE public.lead ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON public.lead FOR SELECT TO anon, authenticated USING (true);

-- Repeat RLS for others as per your security needs
