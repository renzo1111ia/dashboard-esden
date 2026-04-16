import type { NextApiRequest, NextApiResponse } from 'next';
import { rds } from '@/lib/rds/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        console.log('[RDS SETUP] Iniciando creación de tablas en AWS (Pages API)...');

        await rds`
            CREATE TABLE IF NOT EXISTS leads (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                nombre TEXT, apellido TEXT, telefono TEXT, email TEXT,
                pais TEXT, tipo_lead TEXT, origen TEXT,
                fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await rds`
            CREATE TABLE IF NOT EXISTS llamadas (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                id_lead UUID REFERENCES leads(id),
                estado_llamada TEXT, duracion_segundos INTEGER, url_grabacion TEXT,
                transcripcion TEXT, resumen TEXT, fecha_inicio TIMESTAMP WITH TIME ZONE,
                fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await rds`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                lead_id UUID REFERENCES leads(id),
                direction TEXT, message_type TEXT DEFAULT 'TEXT',
                content TEXT, sent_by TEXT, status TEXT, metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        res.status(200).json({ 
            success: true, 
            message: "¡Bravo! Tu base de datos Aurora en AWS ha sido inicializada (via Pages API)." 
        });

    } catch (error: any) {
        console.error('[RDS SETUP] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
