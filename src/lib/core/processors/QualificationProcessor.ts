import { getSupabaseServerClient, getAdminSupabaseClient } from "@/lib/supabase/server";
import { Lead, Programa, LeadPrograma, AIAgentVariant } from "@/types/database";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

/**
 * Deep Qualification Processor
 * Analyzes call transcripts using Course specific knowledge and extraction rules.
 */
export class QualificationProcessor {
    
    private llm: ChatOpenAI;

    constructor() {
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o",
            temperature: 0,
            openAIApiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Entry point to analyze a call and update lead qualification.
     */
    public async process(params: {
        leadId: string;
        tenantId: string;
        transcript: string;
        callId?: string;
    }) {
        const supabase = await getSupabaseServerClient();

        // 1. Get Course details for this lead
        const { data: leadProgramas } = await supabase
            .from("lead_programas")
            .select("id_programa")
            .eq("id_lead", params.leadId);

        let courseDetails = "No se especificó un curso previo.";
        let qualRules = "Busca interés general en formación profesional.";

        if (leadProgramas && leadProgramas.length > 0) {
            const { data: program } = await supabase
                .from("programas")
                .select("*")
                .eq("id", leadProgramas[0].id_programa)
                .single();
            
            if (program) {
                const p = program as Programa;
                courseDetails = `Curso: ${p.nombre}\nPresentación: ${p.presentacion}\nPrecio: ${p.precio}\nObjetivos: ${p.objetivos}`;
                qualRules = p.requisitos_cualificacion || qualRules;
            }
        }

        // 2. Perform AI Extraction
        const analysis = await this.analyzeTranscript(params.transcript, courseDetails, qualRules);

        // 3. Persist results
        const { error } = await supabase.from("lead_cualificacion").insert({
            tenant_id: params.tenantId,
            id_lead: params.leadId,
            id_llamada: params.callId,
            cualificacion: analysis.summary,
            calificacion_score: analysis.interest_score,
            objeciones: analysis.objections.join(", "),
            analisis_profundo: analysis as any,
            fecha_creacion: new Date().toISOString()
        } as never);

        if (error) console.error("[QUAL-PROCESSOR] Error saving results:", error);

        // 4. Update Lead Status
        await supabase.from("lead").update({
            tipo_lead: analysis.interest_score >= 7 ? "CALIFICADO" : "Poco Interés"
        } as never).eq("id", params.leadId);

        console.log(`[QUAL-PROCESSOR] ✅ Deep analysis completed for lead ${params.leadId}. Score: ${analysis.interest_score}`);
    }

    private async analyzeTranscript(transcript: string, courseInfo: string, rules: string) {
        const parser = StructuredOutputParser.fromZodSchema(
            z.object({
                interest_score: z.number().describe("Puntuación de 1 a 10"),
                summary: z.string().describe("Resumen breve de la cualificación"),
                objections: z.array(z.string()).describe("Lista de objeciones detectadas"),
                profile_fit: z.boolean().describe("¿Encaja con los requisitos de cualificación?"),
                next_steps: z.string().describe("Recomendación de siguiente paso"),
                budget_mentioned: z.boolean().describe("¿Se habló de presupuesto?")
            })
        );

        const prompt = new PromptTemplate({
            template: `Eres un analista experto en ventas para ESDEN Business School.
            Analiza la siguiente transcripción de una llamada entre un Agente IA y un prospecto.
            
            INFORMACIÓN DEL CURSO:
            {courseInfo}
            
            REGLAS DE CUALIFICACIÓN:
            {rules}
            
            TRANSCRIPCIÓN:
            {transcript}
            
            {format_instructions}`,
            inputVariables: ["courseInfo", "rules", "transcript"],
            partialVariables: { format_instructions: parser.getFormatInstructions() }
        });

        const input = await prompt.format({ courseInfo, rules, transcript });
        const response = await this.llm.call([
            { role: "user", content: input } as any
        ]);

        return parser.parse(response.content as string);
    }
}

export const qualificationProcessor = new QualificationProcessor();
