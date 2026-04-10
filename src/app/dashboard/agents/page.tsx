"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Bot, Zap, 
    Save, Settings2, 
    BarChart3, Layers, 
    ArrowRight, Sparkles, AlertCircle, PlusCircle,
    GitBranch, RotateCcw
} from "lucide-react";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getAIAgents, getAgentVariants, saveAgentVariant, saveAIAgent } from "@/lib/actions/agents";
import { AIAgent, AIAgentVariant } from "@/types/database";
import { AgentFlowBuilder } from "@/components/orchestrator/AgentFlowBuilder";

export default function AgentsPage() {
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [activeTab, setActiveTab] = useState<'A' | 'B' | 'CONFIG' | 'METRICS' | 'FLOW'>('A');
    const [saving, setSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newAgentName, setNewAgentName] = useState("");
    const [newAgentDescription, setNewAgentDescription] = useState("");
    const router = useRouter();
    
    // Form State
    const [variantA, setVariantA] = useState<Partial<AIAgentVariant>>({});
    const [variantB, setVariantB] = useState<Partial<AIAgentVariant>>({});

    const loadAgents = async () => {
        const res = await getAIAgents();
        if (res.success && res.data) {
            setAgents(res.data);
            if (res.data.length > 0 && !selectedAgent) {
                setSelectedAgent(res.data[0]);
            }
        }
    };

    useEffect(() => {
        loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedAgent) {
            async function loadVariants(agentId: string) {
                const res = await getAgentVariants(agentId);
                if (res.success && res.data) {
                    const data = res.data as AIAgentVariant[];
                    const a = data.find(v => !v.is_variant_b);
                    const b = data.find(v => v.is_variant_b);
                    setVariantA(a || { agent_id: agentId, is_variant_b: false, version_label: 'v1.0', prompt_text: '', weight: 0.5 });
                    setVariantB(b || { agent_id: agentId, is_variant_b: true, version_label: 'v1.0', prompt_text: '', weight: 0.5 });
                }
            }
            loadVariants(selectedAgent.id);
        }
    }, [selectedAgent]);

    const handleSave = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        try {
            await saveAgentVariant(variantA);
            await saveAgentVariant(variantB);
            alert("Cambios de prompts publicados correctamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateAgent = async () => {
        if (!newAgentName.trim()) return;
        setSaving(true);
        const res = await saveAIAgent({
            name: newAgentName,
            description: newAgentDescription,
            status: 'PAUSED',
            type: 'QUALIFY',
            flow_config: { nodes: [{ id: "start", type: "flow_trigger", position: { x: 250, y: 0 }, data: {} }], edges: [] }
        });

        if (res.success && res.data) {
            await loadAgents();
            setSelectedAgent(res.data);
            setIsCreateModalOpen(false);
            setNewAgentName("");
            setNewAgentDescription("");
        }
        setSaving(false);
    };


    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white selection:bg-primary/30">
            {/* Header Area */}
            <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Gestión de Agentes de IA</h1>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-none mt-1">Itera sobre los prompts de tus agentes y configura pruebas A/B.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadAgents} 
                        title="Recargar agentes"
                        aria-label="Recargar lista de agentes"
                        className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold"
                    >
                        <RotateCcw className="h-4 w-4 text-white/40" />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 h-11 px-6 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Publicando..." : "Publicar Cambios"}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── LEFT PANEL: Agents List ── */}
                <div className="w-80 border-r border-white/5 bg-black/40 flex flex-col">
                    <div className="p-6">
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full h-11 border border-dashed border-primary/40 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all text-center shadow-lg shadow-primary/5"
                            title="Crear nuevo agente"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Nuevo Agente
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10">
                        {agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent)}
                                className={cn(
                                    "w-full p-4 rounded-2xl text-left transition-all border group",
                                    selectedAgent?.id === agent.id 
                                        ? "bg-primary/10 border-primary/20" 
                                        : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                                )}
                                title={`Seleccionar Agente: ${agent.name}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest",
                                        agent.status === 'ACTIVE' ? "text-emerald-400" : "text-white/20"
                                    )}>
                                        {agent.status === 'ACTIVE' ? 'Activo' : 'Pausado'}
                                    </span>
                                    {agent.status === 'ACTIVE' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </div>
                                <h3 className="font-bold text-sm text-white/90 group-hover:text-white">{agent.name}</h3>
                                <p className="text-[10px] text-white/30 line-clamp-1 mt-0.5">{agent.description || "Sin descripción"}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── MAIN CONTENT: Editor & Tabs ── */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Tabs Navigation */}
                    <div className="flex items-center border-b border-white/5 bg-black/20 px-8">
                        <TabButton active={activeTab === 'A'} onClick={() => setActiveTab('A')} icon={Zap} label="Prompt A" />
                        <TabButton active={activeTab === 'B'} onClick={() => setActiveTab('B')} icon={Layers} label="Prompt B" />
                        <TabButton active={activeTab === 'FLOW'} onClick={() => setActiveTab('FLOW')} icon={GitBranch} label="Lógica de Flujo" />
                        <TabButton active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={Settings2} label="Config A/B" />
                        <TabButton active={activeTab === 'METRICS'} onClick={() => setActiveTab('METRICS')} icon={BarChart3} label="Métricas" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 relative">
                        <AnimatePresence mode="wait">
                            {(activeTab === 'A' || activeTab === 'B') && (
                                <motion.div 
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="h-full flex flex-col space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                <Sparkles className="h-4 w-4 text-emerald-400" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Instrucciones del Sistema</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">Version {(activeTab === 'A' ? variantA : variantB).version_label}</span>
                                    </div>

                                    <div className="flex-1 min-h-[400px] relative group text-left">
                                        <textarea 
                                            value={(activeTab === 'A' ? variantA : variantB).prompt_text || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (activeTab === 'A') setVariantA(prev => ({...prev, prompt_text: val}));
                                                else setVariantB(prev => ({...prev, prompt_text: val}));
                                            }}
                                            className="w-full h-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-sm leading-relaxed font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner text-white/80"
                                            placeholder="Eres un asistente experto de ESDEN Business School..."
                                            aria-label="Editor de prompt"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
                                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                            <AlertCircle className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Contexto Recomendado</p>
                                            <p className="text-xs text-white/80 font-medium leading-none">Este prompt funciona mejor con el modelo <span className="text-blue-400">GPT-4o</span>.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'FLOW' && selectedAgent && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 z-10 bg-slate-950"
                                >
                                    <AgentFlowBuilder 
                                        agentName={selectedAgent.name}
                                        initialFlow={selectedAgent.flow_config || { nodes: [], edges: [] }}
                                        onClose={() => setActiveTab('A')}
                                        onSave={async (flow) => {
                                            setSaving(true);
                                            const res = await saveAIAgent({
                                                id: selectedAgent.id,
                                                flow_config: flow
                                            } as Partial<AIAgent>);
                                            if (res.success) {
                                                // Update local state to reflect the new flow
                                                setAgents(prev => prev.map(a => 
                                                    a.id === selectedAgent.id ? { ...a, flow_config: flow } : a
                                                ));
                                                alert("Lógica de comportamiento guardada.");
                                            }
                                            setSaving(false);
                                        }}
                                    />
                                </motion.div>
                            )}

                            {activeTab === 'CONFIG' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="max-w-2xl mx-auto space-y-12 py-12"
                                >
                                    <div className="text-center space-y-4">
                                        <div className="inline-flex h-16 w-16 items-center justify-center bg-primary/10 rounded-3xl border border-primary/20 mb-4">
                                            <Zap className="h-8 w-8 text-primary" />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight">Configuración Experimento A/B</h2>
                                        <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">Divide el tráfico entrante entre dos versiones de prompt para medir qué agente cualifica mejor a los leads.</p>
                                    </div>

                                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-8 text-left">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-black uppercase tracking-widest text-white/60">Distribución de Tráfico</span>
                                                <span className="text-xs font-black tabular-nums text-primary">{Math.round((variantA.weight || 0.5) * 100)}% / {Math.round((1 - (variantA.weight || 0.5)) * 100)}%</span>
                                            </div>
                                            <div className="h-4 w-full bg-white/5 rounded-full p-1 relative">
                                                <motion.div 
                                                    className="h-full bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
                                                    style={{ width: `${(variantA.weight || 0.5) * 100}%` }}
                                                />
                                                <input 
                                                    type="range" 
                                                    min="0" max="1" step="0.1"
                                                    title="Distribución de tráfico"
                                                    value={variantA.weight || 0.5}
                                                    onChange={(e) => {
                                                        const w = parseFloat(e.target.value);
                                                        setVariantA(prev => ({...prev, weight: w}));
                                                        setVariantB(prev => ({...prev, weight: 1 - w}));
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── CREATE MODAL ── */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[40px] p-10 shadow-2xl space-y-8"
                        >
                            <div className="text-center space-y-4">
                                <div className="h-16 w-16 bg-primary/10 rounded-3xl border border-primary/20 flex items-center justify-center mx-auto mb-4">
                                    <PlusCircle className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tight">Nuevo Agente</h3>
                                <p className="text-white/40 text-sm font-medium">Define la identidad base de tu nuevo agente inteligente.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nombre del Agente</label>
                                    <input 
                                        autoFocus
                                        value={newAgentName}
                                        onChange={(e) => setNewAgentName(e.target.value)}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:border-primary/40 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                        placeholder="Ej: Asistente Lead Master"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Descripción / Objetivo</label>
                                    <textarea 
                                        value={newAgentDescription}
                                        onChange={(e) => setNewAgentDescription(e.target.value)}
                                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium focus:border-primary/40 outline-none transition-all resize-none"
                                        placeholder="Define el propósito de este agente..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bold"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleCreateAgent}
                                    disabled={saving || !newAgentName.trim()}
                                    className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {saving ? "Creando..." : "Crear Agente"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-6 h-[72px] text-[11px] font-black uppercase tracking-widest transition-all relative",
                active ? "text-primary" : "text-white/30 hover:text-white/60"
            )}
            title={`Pestaña: ${label}`}
        >
            <Icon className="h-4 w-4" />
            {label}
            {active && (
                <motion.div 
                    layoutId="activeTabBadge"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"
                />
            )}
        </button>
    );
}
