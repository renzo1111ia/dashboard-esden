import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cliente de Amazon S3 para Automatiza Formación
 * Gestiona grabaciones de llamadas y documentos.
 */

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET || 'automatiza-knowledge-base';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

/**
 * Sube un archivo a S3 (grabaciones de audio, etc.)
 */
export async function uploadToS3(key: string, body: Buffer | Uint8Array | Blob | string, contentType?: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return `s3://${bucketName}/${key}`;
  } catch (error) {
    console.error('❌ Error subiendo a S3:', error);
    throw error;
  }
}

/**
 * Genera una URL firmada temporal para acceder al archivo de audio
 */
export async function getSignedRecordingUrl(key: string, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('❌ Error generando URL de S3:', error);
    return null;
  }
}
