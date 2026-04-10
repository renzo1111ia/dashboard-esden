"use client";

import React, { useState, useEffect } from "react";
import { 
    X, Save, Settings2, Info, 
    Phone, MessageSquare, BrainCircuit, 
    Globe, GitBranchPlus, Clock, Bot, PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Node } from "@xyflow/react";
import { getWhatsAppTemplates } from "@/lib/actions/orchestration";
import { getAIAgents } from "@/lib/actions/agents";
import { WhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { AIAgent } from "@/types/database";

/**
 * NODE CONFIGURATION SIDEBAR
 * Dynamic form for editing node parameters in the Sequence Builder.
 */

interface NodeConfigSidebarProps {
    node: Node;
    onSave: (config: Record<string, unknown>) => void;
    onClose: () => void;
}

export function NodeConfigSidebar({ node, onSave, onClose }: NodeConfigSidebarProps) {
    // We use a key on this component from the parent to reset state when the node changes
    const [config, setConfig] = useState<Record<string, unknown>>(node.data?.config as Record<string, unknown> || {});
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingAgents, setLoadingAgents] = useState(false);

    async function loadTemplates() {
        setLoadingTemplates(true);
        try {
            const res = await getWhatsAppTemplates();
            if (res.success && res.data) {
                setTemplates(res.data);
            }
        } catch (error) {
            console.error("Templates fetch failed", error);
        } finally {
            setLoadingTemplates(false);
        }
    }

    async function loadAgents() {
        setLoadingAgents(true);
        try {
            const res = await getAIAgents();
            if (res.success && res.data) {
                setAgents(res.data);
            }
        } catch (error) {
            console.error("Agents fetch failed", error);
        } finally {
            setLoadingAgents(false);
        }
    }

    useEffect(() => {
        if (node.type === 'action' && node.data?.action === 'WHATSAPP') {
            loadTemplates();
        }
        if (node.type === 'action' && node.data?.action === 'AI_AGENT') {
            loadAgents();
            loadTemplates(); // Load templates too in case we want to send a msg
        }
    }, [node.id, node.type, node.data?.action]);

    const handleSave = () => {
        onSave(config);
    };

    const type = node.type;
    const action = node.data?.action as string | undefined;

    return (
        <div className="absolute top-0 right-0 h-full w-96 bg-black/60 backdrop-blur-3xl border-l border-white/10 z-[70] flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-white/90">Configuración</h3>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">Node: {type}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    title="Cerrar panel"
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-white/40"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* 1. RETELL CALL CONFIG */}
                {(type === 'action' && action === 'CALL') && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Phone className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Retell AI Agent</span>
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="agentId" className="text-[10px] font-bold text-white/40 uppercase">Agent ID (UUID)</label>
                             <input 
                                id="agentId"
                                value={(config.agentId as string) || ""}
                                onChange={(e) => setConfig({...config, agentId: e.target.value})}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                placeholder="retell-qualifier-v..."
                             />
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="dynamicVariables" className="text-[10px] font-bold text-white/40 uppercase">Variables Dinámicas (JSON)</label>
                             <textarea 
                                id="dynamicVariables"
                                value={(config.dynamicVariables as string) || ""}
                                onChange={(e) => setConfig({...config, dynamicVariables: e.target.value})}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                placeholder='{"nombre_lead": "{{lead.nombre}}"}'
                             />
                        </div>
                    </div>
                )}

                {/* 1.5. HTTP CONFIG */}
                {type === 'api' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Globe className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">HTTP Request</span>
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-white/40 uppercase">Método</label>
                             <select 
                                title="HTTP Method"
                                value={(config.method as string) || "GET"}
                                onChange={(e) => setConfig({...config, method: e.target.value})}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold"
                             >
                                 <option value="GET" className="bg-black text-white">GET</option>
                                 <option value="POST" className="bg-black text-white">POST</option>
                                 <option value="PUT" className="bg-black text-white">PUT</option>
                             </select>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-white/40 uppercase">URL (Endpoint)</label>
                             <input 
                                value={(config.url as string) || ""}
                                onChange={(e) => setConfig({...config, url: e.target.value})}
                                title="Endpoint URL"
                                placeholder="https://api.example.com/webhook"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono"
                             />
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-white/40 uppercase">Body (JSON)</label>
                             <textarea 
                                value={(config.body as string) || ""}
                                onChange={(e) => setConfig({...config, body: e.target.value})}
                                title="Body JSON"
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono"
                                placeholder='{"key": "value"}'
                             />
                        </div>
                    </div>
                )}

                {/* 2. WHATSAPP CONFIG */}
                {(type === 'action' && action === 'WHATSAPP') && (
                    <div className="space-y-6 text-left">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">WhatsApp Meta Template</span>
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-white/40 uppercase">Seleccionar Plantilla</label>
                             {loadingTemplates ? (
                                <div className="h-12 bg-white/5 border border-white/5 rounded-xl animate-pulse flex items-center px-4 text-xs text-white/20">Sincronizando con Meta...</div>
                             ) : (
                                <select 
                                    title="WhatsApp Template"
                                    value={(config.templateId as string) || ""}
                                    onChange={(e) => setConfig({...config, templateId: e.target.value})}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
                                >
                                    <option value="" disabled className="bg-black">-- Elige una plantilla --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.name} className="bg-black text-white">{t.name}</option>
                                    ))}
                                    {templates.length === 0 && <option value="" className="bg-black">Ingresa manualmente abajo</option>}
                                </select>
                             )}
                        </div>

                        <div className="space-y-2">
                             <label htmlFor="templateId" className="text-[10px] font-bold text-white/40 uppercase">Nombre Manual (Fallback)</label>
                             <input 
                                id="templateId"
                                value={(config.templateId as string) || ""}
                                onChange={(e) => setConfig({...config, templateId: e.target.value})}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono text-emerald-400/80"
                                placeholder="Ej: welcome_lead_v1"
                             />
                        </div>

                        <div className="h-px bg-white/5 my-4" />

                        {/* ADVANCED SCHEDULING SUB-PANEL */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Programación en Destino</span>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="delayMinutes" className="text-[9px] font-bold text-white/40 uppercase">Minutos (Delay)</label>
                                        <input 
                                            id="delayMinutes"
                                            title="Minutos de delay"
                                            placeholder="0"
                                            type="number"
                                            value={(config.delayMinutes as number) || 0}
                                            onChange={(e) => setConfig({...config, delayMinutes: parseInt(e.target.value)})}
                                            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-center font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="delayHours" className="text-[9px] font-bold text-white/40 uppercase">Horas (Delay)</label>
                                        <input 
                                            id="delayHours"
                                            title="Horas de delay"
                                            placeholder="0"
                                            type="number"
                                            value={(config.delayHours as number) || 0}
                                            onChange={(e) => setConfig({...config, delayHours: parseInt(e.target.value)})}
                                            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-center font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="exactSchedule" className="text-[9px] font-bold text-white/40 uppercase tracking-widest">O en Fecha/Hora Específica</label>
                                    <input 
                                        id="exactSchedule"
                                        title="Fecha específica de agendamiento"
                                        placeholder="YYYY-MM-DDTHH:MM"
                                        type="datetime-local"
                                        value={(config.exactSchedule as string) || ""}
                                        onChange={(e) => setConfig({...config, exactSchedule: e.target.value})}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:ring-emerald-500/20 [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. AI AGENT CONFIG (Integrated A/B + Meta) */}
                {(type === 'action' && action === 'AI_AGENT') && (
                    <div className="space-y-6 text-left">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Bot className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Agente de IA Orquestrado</span>
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-[10px] font-bold text-white/40 uppercase">Vincular Agente Predefinido</label>
                             {loadingAgents ? (
                                <div className="h-12 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
                             ) : (
                                <select 
                                    title="Seleccionar Agente"
                                    value={(config.agentId as string) || ""}
                                    onChange={(e) => setConfig({...config, agentId: e.target.value})}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-purple-500/20 transition-all font-bold"
                                >
                                    <option value="" disabled className="bg-black">-- Elige un Agente --</option>
                                    {agents.map(a => (
                                        <option key={a.id} value={a.id} className="bg-black text-white">{a.name} ({a.type})</option>
                                    ))}
                                </select>
                             )}
                             <p className="text-[9px] text-white/20 px-1 italic">Este nodo usará automáticamente las variantes A o B configuradas en el tablero de Agentes.</p>
                        </div>

                        <div className="h-px bg-white/5 my-4" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Enviar WhatsApp tras análisis</span>
                            <button 
                                title="Alternar Envio de WhatsApp"
                                onClick={() => setConfig({...config, sendWhatsApp: !config.sendWhatsApp})}
                                className={cn(
                                    "w-10 h-5 rounded-full transition-all relative",
                                    config.sendWhatsApp ? "bg-primary" : "bg-white/10"
                                )}
                            >
                                <div className={cn("absolute top-1 h-3 w-3 rounded-full bg-white transition-all", config.sendWhatsApp ? "left-6" : "left-1")} />
                            </button>
                        </div>

                        {Boolean(config.sendWhatsApp) && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4 pt-2 border-t border-white/5"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Plantilla Meta (Success)</label>
                                    <select 
                                        title="WhatsApp Success Template"
                                        value={(config.successTemplateId as string) || ""}
                                        onChange={(e) => setConfig({...config, successTemplateId: e.target.value})}
                                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled className="bg-black">-- Seleccionar plantilla --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.name} className="bg-black">{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}

                {/* 3.5 LLM TEXT CONFIG (LEGACY) */}
                {type === 'llm' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-purple-400">
                            <BrainCircuit className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">LLM Reasoning Node</span>
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="prompt" className="text-[10px] font-bold text-white/40 uppercase">System Instruction / Prompt</label>
                             <textarea 
                                id="prompt"
                                value={(config.prompt as string) || ""}
                                rows={6}
                                onChange={(e) => setConfig({...config, prompt: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed placeholder:opacity-20"
                                placeholder="Analiza el interés del lead basado en..."
                             />
                        </div>
                    </div>
                )}

                {/* 4. WAIT DELAY CONFIG */}
                {type === 'delay' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-amber-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Intervalo de Espera</span>
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="duration" className="text-[10px] font-bold text-white/40 uppercase">Horas de Retraso</label>
                             <div className="flex items-end gap-4">
                                <input 
                                    id="duration"
                                    type="number"
                                    value={(config.duration as number) || 2}
                                    onChange={(e) => setConfig({...config, duration: parseInt(e.target.value)})}
                                    className="w-24 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-center text-xl font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <span className="text-xs font-bold text-white/20 pb-4 uppercase">Horas</span>
                             </div>
                        </div>
                    </div>
                )}

                {/* 5. API REQUEST CONFIG */}
                {type === 'api' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Globe className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Integración API Externa</span>
                        </div>
                        <div className="space-y-4">
                             <div className="space-y-2">
                                <label htmlFor="apiUrl" className="text-[10px] font-bold text-white/40 uppercase">Endpoint URL</label>
                                <input 
                                    id="apiUrl"
                                    value={(config.url as string) || ""}
                                    onChange={(e) => setConfig({...config, url: e.target.value})}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono text-cyan-400/80"
                                    placeholder="https://api.crm.com/leads"
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="apiMethod" className="text-[10px] font-bold text-white/40 uppercase">Método</label>
                                    <select 
                                        id="apiMethod"
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm appearance-none cursor-pointer"
                                        value={(config.method as string) || "POST"}
                                        onChange={(e) => setConfig({...config, method: e.target.value})}
                                    >
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                    </select>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* 6. SUB-WORKFLOW CONFIG */}
                {type === 'subWorkflow' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-pink-400">
                            <GitBranchPlus className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Vincular Flujo</span>
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="targetWorkflowId" className="text-[10px] font-bold text-white/40 uppercase">Workflow ID Destino</label>
                             <input 
                                id="targetWorkflowId"
                                value={(config.targetWorkflowId as string) || ""}
                                onChange={(e) => setConfig({...config, targetWorkflowId: e.target.value})}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono"
                                placeholder="UUID del workflow..."
                             />
                        </div>
                    </div>
                )}

                {/* VARIABLE EXPLORER (HINT) */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-primary">
                        <Info className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Variables Disponibles</span>
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium transition-all group">
                        Usa <code className={cn("text-primary group-hover:bg-primary/20 transition-colors px-1 rounded")}>{"{{llm_result}}"}</code> para insertar el análisis de la IA o <code className="text-cyan-400">{"{{api_response}}"}</code> para datos externos.
                    </p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
                <button 
                    onClick={handleSave}
                    className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                >
                    <Save className="h-5 w-5" />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}
