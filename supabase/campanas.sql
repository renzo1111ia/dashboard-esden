-- ─── CAMPAIGN TABLE ───────────────────────────────────────────────────────────
-- SQL to create the campaigns table in Suapbase

CREATE TABLE IF NOT EXISTS campanas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    estado TEXT DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'PAUSADA', 'FINALIZADA')),
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: Enable RLS and add policies if needed
ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to authenticated users" 
ON campanas FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
