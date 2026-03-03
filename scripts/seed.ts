/**
 * ESDEN Analytics Dashboard — Seed Script
 * ========================================
 * Inserts 500 realistic AI voice agent call records into `post_call_analisis`.
 *
 * Usage:
 *   1. Fill in your .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   2. Run: npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Data Pools ──────────────────────────────────────────────────────────────

const CALL_STATUSES = [
    "CONTACTED", "CONTACTED", "CONTACTED",
    "NO_CONTACT", "NO_CONTACT",
    "VOICEMAIL", "VOICEMAIL",
    "TRANSFERRED_TO_HUMAN",
    "ANNULLED",
    "LATENCY_DROP",
    "USER_INTERRUPTED",
    "BUSY",
    "INVALID_NUMBER",
];

const MOTIVOS_NO_CONTACTO = [
    "Buzón de voz detectado por el bot",
    "No contesta — timeout de 30s",
    "Número ocupado",
    "Número inválido o fuera de servicio",
    "Corte de telefonía durante marcación",
    "Latencia excesiva (>3s) — sesión abortada",
    "Silencio prolongado — bot no detectó voz",
    "Operadora bloqueó la llamada (SPAM filter)",
    "Tono de fax detectado",
    "Rechazada por el destinatario",
];

const MOTIVOS_ANULACION = [
    "Número en lista negra (DNC)",
    "Horario de llamada no permitido",
    "Máximo de reintentos alcanzado (3/3)",
    "Solicitud de exclusión del contacto",
    "Error en IVR — bucle infinito",
    "Fallo de integración CRM — datos incompletos",
    "Lead ya convertido por otro canal",
    "Campaña pausada por administrador",
    "Saldo de minutos agotado",
];

const TIPOLOGIAS = [
    "Outbound - Cold", "Outbound - Cold",
    "Outbound - Retargeting", "Outbound - Retargeting",
    "Inbound - Callback",
    "WhatsApp Follow-up",
];

const MASTER_INTERES = [
    "Producto A — Seguro de Vida",
    "Producto B — Crédito Personal",
    "Producto C — Inversión Mensual",
    "Producto D — Seguro de Hogar",
    "No determinado", "No determinado",
    "Múltiple",
];

const CAMPAÑAS = ["Q4-2025", "Q1-2026", "Retargeting-ENE", "Campaña-FEB"];
const AGENTES_BOT = ["bot-01", "bot-02", "bot-03", "bot-04", "bot-05"];
const SENTIMIENTOS = ["positivo", "neutro", "negativo", "interrumpido"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinDays(days: number): string {
    const now = Date.now();
    const earliest = now - days * 24 * 60 * 60 * 1000;
    return new Date(earliest + Math.random() * (now - earliest)).toISOString();
}

function generateLeadId(): string {
    return `LEAD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

function generatePhone(): string {
    const prefixes = ["+34 6", "+34 9", "+52 5", "+57 3", "+54 11"];
    const number = Array.from({ length: 8 }, () => randInt(0, 9)).join("");
    return `${pick(prefixes)}${number}`;
}

// ─── Record Generator ────────────────────────────────────────────────────────

function generateRecord() {
    const status = pick(CALL_STATUSES);
    const contacted = status === "CONTACTED" || status === "TRANSFERRED_TO_HUMAN";
    const annulled = status === "ANNULLED";
    const isQualified = contacted && Math.random() < 0.35;

    const asesores = ["Carlos Ruiz", "María López", "Andrés Torres", "Laura Gómez", "Diego Martínez"];
    const agendado = isQualified && Math.random() < 0.6 ? pick(asesores) : pick(["NO", "NO", "PENDIENTE"]);

    return {
        created_at: randomDateWithinDays(90),
        lead_id: generateLeadId(),
        phone_number: generatePhone(),
        call_status: status,
        duration_seconds: contacted ? randInt(15, 480) : status === "VOICEMAIL" ? randInt(8, 45) : null,
        motivo_anulacion: annulled ? pick(MOTIVOS_ANULACION) : null,
        motivo_no_contacto: !contacted && !annulled ? pick(MOTIVOS_NO_CONTACTO) : null,
        tipologia_llamada: pick(TIPOLOGIAS),
        master_interes: contacted ? pick(MASTER_INTERES) : "No determinado",
        is_qualified: isQualified,
        agendado_con_asesor: isQualified ? agendado : "NO",
        opt_in_whatsapp: contacted ? pick(["SI", "SI", "NO", "NO", "PENDIENTE"]) : "NO",
        extra_data: {
            campaña: pick(CAMPAÑAS),
            agente_id: pick(AGENTES_BOT),
            sentimiento_detectado: contacted ? pick(SENTIMIENTOS) : null,
            intentos_previos: randInt(0, 3),
            score_lead: contacted ? randInt(1, 100) : null,
        },
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const TOTAL = 500;
const BATCH_SIZE = 50;

async function seed() {
    console.log(`\n🌱  ESDEN Seed — inserting ${TOTAL} records into post_call_analisis...\n`);

    let inserted = 0;
    const batches = Math.ceil(TOTAL / BATCH_SIZE);

    for (let b = 0; b < batches; b++) {
        const count = Math.min(BATCH_SIZE, TOTAL - inserted);
        const batch = Array.from({ length: count }, generateRecord);

        const { error } = await supabase.from("post_call_analisis").insert(batch);

        if (error) {
            console.error(`❌  Batch ${b + 1}/${batches} failed:`, error.message);
            process.exit(1);
        }

        inserted += count;
        console.log(`   ✅  Batch ${b + 1}/${batches} — ${inserted}/${TOTAL} records`);
    }

    console.log(`\n🎉  Done! ${TOTAL} records seeded successfully.\n`);
}

seed().catch((err) => {
    console.error("❌  Unexpected error:", err);
    process.exit(1);
});
