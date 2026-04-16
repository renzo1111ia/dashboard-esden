import { NextResponse } from 'next/server';
import { rds } from '@/lib/rds/client';

/**
 * API DE CONFIGURACIÓN INICIAL RDS
 * Esta ruta crea las tablas necesarias en Amazon RDS para Automatiza Formación.
 * Solo debe ejecutarse una vez al inicio.
 */

export async function GET() {
    try {
        console.log('[RDS SETUP] Iniciando creación de tablas en AWS...');

        if (!process.env.AWS_RDS_URL) {
            return NextResponse.json({ 
                success: false, 
                error: "Falta la variable de entorno AWS_RDS_URL en Dokploy. Por favor, asegúrate de configurarla con el formato postgresql://..." 
            }, { status: 400 });
        }

        // 1. Tabla de Leads (Espejo de Supabase para datos sensibles)
        await rds`
            CREATE TABLE IF NOT EXISTS leads (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                nombre TEXT,
                apellido TEXT,
                telefono TEXT,
                email TEXT,
                pais TEXT,
                tipo_lead TEXT,
                origen TEXT,
                fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 2. Tabla de Llamadas (Transcripciones y grabaciones pesadas)
        await rds`
            CREATE TABLE IF NOT EXISTS llamadas (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                id_lead UUID REFERENCES leads(id),
                estado_llamada TEXT,
                duracion_segundos INTEGER,
                url_grabacion TEXT,
                transcripcion TEXT,
                resumen TEXT,
                fecha_inicio TIMESTAMP WITH TIME ZONE,
                fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 3. Tabla de Mensajes (Chat de WhatsApp IA)
        await rds`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL,
                lead_id UUID REFERENCES leads(id),
                direction TEXT,
                message_type TEXT DEFAULT 'TEXT',
                content TEXT,
                sent_by TEXT,
                status TEXT,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        console.log('[RDS SETUP] Tablas creadas con éxito.');

        return NextResponse.json({ 
            success: true, 
            message: "¡Bravo! Tu base de datos Aurora en AWS ha sido inicializada correctamente para Automatiza Formación." 
        });

    } catch (error: any) {
        console.error('[RDS SETUP] Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
