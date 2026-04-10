/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { 
    Mic, Zap, 
    Save, Settings2, 
    BarChart3, Layers, 
    Sparkles, PlusCircle,
    RotateCcw, Volume2, Phone,
    Building2, Cpu
} from "lucide-react";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getVoiceAgents, getVoiceAgentVariants, saveVoiceAgent, saveVoiceVariant } from "@/lib/actions/voice-agents";
import { VoiceAgent, VoiceAgentVariant } from "@/types/database";

export default function VoiceAgentsPage() {
    const [agents, setAgents] = useState<VoiceAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<VoiceAgent | null>(null);
    const [activeTab, setActiveTab] = useState<'A' | 'B' | 'CONFIG' | 'METRICS' | 'FLOW'>('A');
    const [saving, setSaving] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Create/Edit Agent Flow State
    const [editingAgentData, setEditingAgentData] = useState<Partial<VoiceAgent>>({
        name: "",
        description: "",
        provider: "RETELL",
        provider_agent_id: "",
        voice_id: ""
    });
    
    // Form State for Variants
    const [variantA, setVariantA] = useState<Partial<VoiceAgentVariant>>({});
    const [variantB, setVariantB] = useState<Partial<VoiceAgentVariant>>({});

    const loadAgents = async () => {
        const res = await getVoiceAgents();
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
                const res = await getVoiceAgentVariants(agentId);
                if (res.success && res.data) {
                    const data = res.data as VoiceAgentVariant[];
                    const a = data.find(v => !v.is_variant_b);
                    const b = data.find(v => v.is_variant_b);
                    setVariantA(a || { agent_id: agentId, is_variant_b: false, version_label: 'v1.0', prompt_text: '', weight: 0.5 });
                    setVariantB(b || { agent_id: agentId, is_variant_b: true, version_label: 'v1.0', prompt_text: '', weight: 0.5 });
                }
            }
            loadVariants(selectedAgent.id);
        }
    }, [selectedAgent]);

    const handleSaveVariants = async () => {
        if (!selectedAgent) return;
        setSaving(true);
        try {
            await saveVoiceVariant(variantA);
            await saveVoiceVariant(variantB);
            alert("Cambios de voz publicados correctamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateOrUpdateAgent = async () => {
        if (!editingAgentData.name?.trim()) return;
        setSaving(true);
        const res = await saveVoiceAgent({
            ...editingAgentData,
            status: editingAgentData.id ? editingAgentData.status : 'PAUSED'
        });

        if (res.success && res.data) {
            await loadAgents();
            setSelectedAgent(res.data);
            setIsCreateModalOpen(false);
            setEditingAgentData({ name: "", description: "", provider: "RETELL", provider_agent_id: "", voice_id: "" });
        } else {
            alert("Error al guardar el agente: " + (res.error || "Desconocido"));
        }
        setSaving(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white selection:bg-purple-500/30">
            {/* Header Area */}
            <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Mic className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Gestión de Agentes de Voz</h1>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-none mt-1">Configura Retell AI y Ultravox AI para llamadas inteligentes.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadAgents} 
                        title="Recargar agentes"
                        aria-label="Recargar agentes"
                        className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold"
                    >
                        <RotateCcw className="h-4 w-4 text-white/40" />
                    </button>
                    <button 
                        onClick={handleSaveVariants}
                        disabled={saving}
                        className="flex items-center gap-2 h-11 px-6 bg-purple-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
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
                            onClick={() => {
                                setEditingAgentData({ name: "", description: "", provider: "RETELL", provider_agent_id: "", voice_id: "" });
                                setIsCreateModalOpen(true);
                            }}
                            className="w-full h-11 border border-dashed border-purple-500/40 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/5 transition-all text-center shadow-lg shadow-purple-500/5"
                            title="Crear nuevo agente de voz"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Nuevo Agente de Voz
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
                                        ? "bg-purple-500/10 border-purple-500/20" 
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
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-white/40 uppercase tracking-widest">{agent.provider}</span>
                                    <p className="text-[10px] text-white/30 line-clamp-1">{agent.voice_id || "Voz base"}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── MAIN CONTENT: Editor & Tabs ── */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Tabs Navigation */}
                    <div className="flex items-center border-b border-white/5 bg-black/20 px-8">
                        <TabButton active={activeTab === 'A'} onClick={() => setActiveTab('A')} icon={Zap} label="Prompt A" color="purple" />
                        <TabButton active={activeTab === 'B'} onClick={() => setActiveTab('B')} icon={Layers} label="Prompt B" color="purple" />
                        <TabButton active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={Settings2} label="Config A/B" color="purple" />
                        <TabButton active={activeTab === 'METRICS'} onClick={() => setActiveTab('METRICS')} icon={BarChart3} label="Métricas" color="purple" />
                        <button 
                            onClick={() => {
                                if (selectedAgent) {
                                    setEditingAgentData(selectedAgent);
                                    setIsCreateModalOpen(true);
                                }
                            }}
                            title="Ajustes técnicos"
                            className="ml-auto flex items-center gap-2 h-9 px-4 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <Settings2 className="h-3 w-3" />
                            Ajustes Técnicos
                        </button>
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
                                            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Instrucciones Conversacionales</span>
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
                                            className="w-full h-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-sm leading-relaxed font-medium focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all resize-none shadow-inner text-white/80"
                                            placeholder="Eres un agente de ventas telefónico experto de ESDEN..."
                                            title="Editor de prompt"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
                                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                            <Volume2 className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Optimización de Voz</p>
                                            <p className="text-xs text-white/80 font-medium leading-none">Este prompt está configurado para la voz <span className="text-purple-400">{selectedAgent?.voice_id || "Estándar"}</span> en {selectedAgent?.provider}.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'CONFIG' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="max-w-2xl mx-auto space-y-12 py-12"
                                >
                                    <div className="text-center space-y-4">
                                        <div className="inline-flex h-16 w-16 items-center justify-center bg-purple-500/10 rounded-3xl border border-purple-500/20 mb-4">
                                            <Zap className="h-8 w-8 text-purple-400" />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight">Distribución A/B de Voz</h2>
                                        <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">Mide qué tono o script telefónico logra más agendamientos dividiendo el tráfico.</p>
                                    </div>

                                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-8 text-left">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-black uppercase tracking-widest text-white/60">Balanceo de Llamadas</span>
                                                <span className="text-xs font-black tabular-nums text-purple-400">{Math.round((variantA.weight || 0.5) * 100)}% / {Math.round((1 - (variantA.weight || 0.5)) * 100)}%</span>
                                            </div>
                                            <div className="h-4 w-full bg-white/5 rounded-full p-1 relative">
                                                <motion.div 
                                                    className="h-full bg-purple-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                                                    style={{ width: `${(variantA.weight || 0.5) * 100}%` }}
                                                />
                                                <input 
                                                    type="range" 
                                                    min="0" max="1" step="0.1"
                                                    value={variantA.weight || 0.5}
                                                    onChange={(e) => {
                                                        const w = parseFloat(e.target.value);
                                                        setVariantA(prev => ({...prev, weight: w}));
                                                        setVariantB(prev => ({...prev, weight: 1 - w}));
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    title="Balance de tráfico"
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

            {/* ── CREATE / EDIT MODAL ── */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-left">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[40px] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="text-center space-y-4">
                                <div className="h-16 w-16 bg-purple-500/10 rounded-3xl border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                    <Volume2 className="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tight">{editingAgentData.id ? "Editar Agente" : "Nuevo Agente de Voz"}</h3>
                                <p className="text-white/40 text-sm font-medium">Vincula los parámetros técnicos del proveedor de voz.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nombre Comercial</label>
                                    <input 
                                        autoFocus
                                        value={editingAgentData.name}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, name: e.target.value })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:border-purple-500/40 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
                                        placeholder="Ej: Retell Sales Agent v2"
                                        title="Nombre del agente"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 flex items-center gap-2" htmlFor="provider-select"><Building2 className="h-3 w-3" /> Proveedor</label>
                                    <select 
                                        id="provider-select"
                                        value={editingAgentData.provider}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, provider: e.target.value as any })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:border-purple-500/40 outline-none transition-all appearance-none"
                                        title="Seleccionar proveedor de voz"
                                    >
                                        <option value="RETELL" className="bg-slate-900">Retell AI</option>
                                        <option value="ULTRAVOX" className="bg-slate-900">Ultravox AI</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 flex items-center gap-2"><Cpu className="h-3 w-3" /> ID del Agente (Proveedor)</label>
                                    <input 
                                        value={editingAgentData.provider_agent_id || ""}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, provider_agent_id: e.target.value })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-mono focus:border-purple-500/40 outline-none transition-all"
                                        placeholder="agent_..."
                                        title="ID del agente en el proveedor"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4 flex items-center gap-2"><Phone className="h-3 w-3" /> Voice ID / Skin</label>
                                    <input 
                                        value={editingAgentData.voice_id || ""}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, voice_id: e.target.value })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-mono focus:border-purple-500/40 outline-none transition-all"
                                        placeholder="Ej: soft_female_voice"
                                        title="ID de la voz seleccionada"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4" htmlFor="status-select">Estado Inicial</label>
                                    <select 
                                        id="status-select"
                                        value={editingAgentData.status}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, status: e.target.value as any })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold focus:border-purple-500/40 outline-none transition-all appearance-none"
                                        title="Seleccionar estado"
                                    >
                                        <option value="PAUSED" className="bg-slate-900">Pausado (Draft)</option>
                                        <option value="ACTIVE" className="bg-slate-900">Activo (Listo)</option>
                                    </select>
                                </div>

                                <div className="space-y-3 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Notas Internas</label>
                                    <textarea 
                                        value={editingAgentData.description || ""}
                                        onChange={(e) => setEditingAgentData({ ...editingAgentData, description: e.target.value })}
                                        className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium focus:border-purple-500/40 outline-none transition-all resize-none"
                                        placeholder="Ej: Este agente se usará para campañas de Outbound en México..."
                                        title="Descripción interna"
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
                                    onClick={handleCreateOrUpdateAgent}
                                    disabled={saving || !editingAgentData.name?.trim()}
                                    className="flex-1 h-14 rounded-2xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {saving ? "Guardando..." : "Guardar Agente"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TabButton({ active, icon: Icon, label, onClick, color = "primary" }: { active: boolean, icon: React.ElementType, label: string, onClick: () => void, color?: string }) {
    return (
        <button 
            onClick={onClick}
            title={`Pestaña ${label}`}
            className={cn(
                "flex items-center gap-3 px-6 h-[72px] text-[11px] font-black uppercase tracking-widest transition-all relative",
                active ? `text-${color}-400` : "text-white/30 hover:text-white/60"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
            {active && (
                <motion.div 
                    layoutId="activeTabBadgeVoice"
                    className={cn(
                        "absolute bottom-0 left-0 right-0 h-1 rounded-t-full",
                        color === "purple" ? "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"
                    )}
                />
            )}
        </button>
    );
}
