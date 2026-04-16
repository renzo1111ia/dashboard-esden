import { 
  BedrockAgentRuntimeClient, 
  RetrieveCommand,
  RetrieveAndGenerateCommand 
} from "@aws-sdk/client-bedrock-agent-runtime";

/**
 * Cliente de Amazon Bedrock para Automatiza Formación
 * Gestiona el acceso a la base de conocimientos (Knowledge Base) para RAG.
 */

const region = process.env.AWS_REGION || 'us-east-1';

const bedrockClient = new BedrockAgentRuntimeClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

/**
 * Recupera información relevante de la Knowledge Base de AWS
 * @param query La duda del usuario
 * @param knowledgeBaseId Opcional, si no se provee usa el de Automatiza Formación por defecto
 */
export async function queryKnowledgeBase(query: string, knowledgeBaseId?: string) {
  const kbId = knowledgeBaseId || process.env.AWS_BEDROCK_KB_ID || 'G9P0FC3S29';

  if (!kbId) {
    console.warn('⚠️ No se ha proporcionado un Knowledge Base ID.');
    return [];
  }

  try {
    const command = new RetrieveCommand({
      knowledgeBaseId: kbId,
      retrievalQuery: {
        text: query,
      },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 3, // Recuperamos los 3 fragmentos más relevantes
        }
      }
    });

    const response = await bedrockClient.send(command);
    
    return response.retrievalResults?.map(res => ({
      text: res.content?.text,
      score: res.score,
      source: res.location?.s3Location?.uri
    })) || [];

  } catch (error) {
    console.error('❌ Error consultando AWS Knowledge Base:', error);
    return [];
  }
}

/**
 * Genera una respuesta completa usando Bedrock (Retrieve and Generate)
 * Útil para una integración más directa si no se usa LangChain por separado.
 */
export async function getBedrockResponse(query: string, knowledgeBaseId?: string) {
  const kbId = knowledgeBaseId || process.env.AWS_BEDROCK_KB_ID || 'G9P0FC3S29';

  const command = new RetrieveAndGenerateCommand({
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: 'KNOWLEDGE_BASE',
      knowledgeBaseConfiguration: {
        knowledgeBaseId: kbId,
        modelArn: `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`, // Haiku es rápido y económico
      }
    }
  });

  try {
    const response = await bedrockClient.send(command);
    return response.output?.text;
  } catch (error) {
    console.error('❌ Error en RetrieveAndGenerate de AWS:', error);
    return null;
  }
}
