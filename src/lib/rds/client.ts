import postgres from 'postgres';

/**
 * Amazon RDS Singleton Client
 * Utiliza postgres.js por ser el cliente más rápido y eficiente para Server Actions de Next.js.
 * Configurado para Automatiza Formación.
 */

const globalForRds = global as unknown as { rdsClient: postgres.Sql | undefined };

const rdsUrl = process.env.AWS_RDS_URL;

if (!rdsUrl && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ AWS_RDS_URL no está configurada. La conexión con Amazon RDS no estará disponible.');
}

export const rds = globalForRds.rdsClient ?? postgres(rdsUrl || '', {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
});

if (process.env.NODE_ENV !== 'production') {
    globalForRds.rdsClient = rds;
}

export default rds;
