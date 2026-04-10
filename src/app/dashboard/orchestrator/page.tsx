"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Plus, Trash2, GripVertical,
    Phone, MessageSquare, Bot, Clock, Zap,
    ChevronDown, Check, RotateCcw,
    GitBranch, Settings
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
    getOrchestratorConfig, saveOrchestratorConfig,
    type TenantOrchestratorConfig, type OrchestratorSequenceStep
} from "@/lib/actions/orchestrator-config";
import { TenantMigrationBanner } from "@/components/orchestrator/TenantMigrationBanner";
import { AgentSelector } from "@/components/orchestrator/AgentSelector";
import { SequenceTimeline } from "@/components/orchestrator/SequenceTimeline";
import { AgentFlowBuilder } from "@/components/orchestrator/AgentFlowBuilder";
import { getAIAgents, saveAIAgent } from "@/lib/actions/agents";
import { AIAgent } from "@/types/database";

const ACTION_CONFIG = {
    call:      { label: "Llamada IA",      icon: Phone,          color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    whatsapp:  { label: "WhatsApp",        icon: MessageSquare,  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    ai_agent:  { label: "Agente de IA",   icon: Bot,            color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    wait:      { label: "Esperar",         icon: Clock,          color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const DAYS_MAP = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
];

type ActionType = keyof typeof ACTION_CONFIG;

function OrchestratorConfigContent() {
    const searchParams = useSearchParams();
    const [config, setConfig] = useState<TenantOrchestratorConfig | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedStep, setExpandedStep] = useState<number | null>(0);
    
    // Flow Builder State
    const [editingFlowAgent, setEditingFlowAgent] = useState<{ id: string; name: string; config: any } | null>(null);

    const loadConfig = useCallback(async () => {
        const res = await getOrchestratorConfig();
        if (res.success && res.data) setConfig(res.data);
    }, []);

    // Initial Load
    useEffect(() => { 
        let isMounted = true;
        getOrchestratorConfig().then(res => {
            if (isMounted && res.success && res.data) setConfig(res.data);
        });
        return () => { isMounted = false; };
    }, []);

    // Handle Search Params for Auto-edit Flow
    useEffect(() => {
        const agentId = searchParams.get('agentId');
        const action = searchParams.get('action');

        if (agentId && action === 'editFlow') {
            const checkAndOpen = async () => {
                const agentsRes = await getAIAgents();
                const agent = agentsRes.data?.find(a => a.id === agentId);
                if (agent) {
                    setEditingFlowAgent({
                        id: agent.id,
                        name: agent.name,
                        config: agent.flow_config || { nodes: [], edges: [] }
                    });
                    // Clear params from URL without reload
                    window.history.replaceState({}, '', '/dashboard/orchestrator');
                }
            };
            checkAndOpen();
        }
    }, [searchParams]);

    async function handleSave() {
        if (!config) return;
        setSaving(true);
        const res = await saveOrchestratorConfig(config);
        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        setSaving(false);
    }

    function removeSequence() {
        if (confirm("¿Estás seguro de que deseas eliminar toda la secuencia? Esta acción no se puede deshacer.")) {
            setConfig(c => c ? ({ ...c, sequence: [] }) : c);
        }
    }

    function updateTimezone(key: string, value: unknown) {
        setConfig(c => c ? ({
            ...c,
            timezone_rules: { ...c.timezone_rules, [key]: value as any }
        }) : c);
    }

    function updateStep(index: number, update: Partial<OrchestratorSequenceStep>) {
        setConfig(c => {
            if (!c) return c;
            const seq = [...c.sequence];
            seq[index] = { ...seq[index], ...update };
            return { ...c, sequence: seq };
        });
    }

    function addStep() {
        setConfig(c => {
            if (!c) return c;
            const newStep: OrchestratorSequenceStep = {
                step: c.sequence.length + 1,
                action: "call",
                agents: [],
                delay_hours: 0,
            };
            return { ...c, sequence: [...c.sequence, newStep] };
        });
        setExpandedStep(config ? config.sequence.length : 0);
    }

    function removeStep(index: number) {
        if (!confirm("¿Eliminar este paso?")) return;
        setConfig(c => {
            if (!c) return c;
            const seq = c.sequence.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 }));
            return { ...c, sequence: seq };
        });
    }

    function toggleWorkingDay(day: number) {
        setConfig(c => {
            if (!c) return c;
            const days = c.timezone_rules.working_days;
            const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
            return { ...c, timezone_rules: { ...c.timezone_rules, working_days: updated } };
        });
    }

    const handleSaveFlow = async (flow: { nodes: any[]; edges: any[] }) => {
        if (!editingFlowAgent) return;
        
        // Save to DB via AIAgent update
        const res = await saveAIAgent({
            id: editingFlowAgent.id,
            flow_config: flow
        } as Partial<AIAgent>);

        if (res.success) {
            setEditingFlowAgent(null);
            alert("Flujo guardado correctamente");
        }
    };

    if (!config) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* HEADER */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Constructor Orquestador v2</h1>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Secuencias 100% funcionales con flujos de IA</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadConfig} title="Recargar configuración" className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold">
                        <RotateCcw className="h-4 w-4 text-white/40" />
                    </button>
                    <button
                        onClick={handleSave} disabled={saving}
                        className={cn(
                            "flex items-center gap-2 h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all",
                            saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:scale-[1.02] shadow-lg shadow-primary/20",
                            saving && "opacity-60 cursor-wait"
                        )}
                    >
                        {saved ? <><Check className="h-4 w-4" /> Guardado!</> : saving ? "Guardando..." : <><Check className="h-4 w-4" /> Guardar Cambios</>}
                    </button>
                </div>
            </div>

            <div className="p-8 max-w-5xl mx-auto space-y-12">

                <TenantMigrationBanner />

                {/* ── VISUAL TIMELINE ────────────────────────────────────── */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="h-px w-8 bg-primary/20" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-3">Secuencia Maestra (Línea de Tiempo)</span>
                         </div>
                         {config.sequence.length > 0 && (
                             <button 
                                onClick={removeSequence}
                                className="text-[9px] font-black uppercase tracking-widest text-red-400/40 hover:text-red-400 flex items-center gap-2 transition-colors"
                             >
                                <Trash2 className="h-3 w-3" /> Reiniciar Orquestación
                             </button>
                         )}
                    </div>
                    
                    {config.sequence.length > 0 ? (
                        <SequenceTimeline sequence={config.sequence} />
                    ) : (
                        <div className="h-32 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[40px] flex items-center justify-center text-white/10 font-bold uppercase tracking-widest hover:border-white/10 transition-colors">
                            Carga una secuencia para proyectar el flujo
                        </div>
                    )}
                </section>

                {/* ── AGENT CONSRUCTOR SECTION (NEW) ──────────────────────── */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="h-px w-8 bg-purple-500/20" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400/60 px-3">Biblioteca de Agentes & Comportamiento</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AgentsList onEditFlow={(agent) => setEditingFlowAgent({
                            id: agent.id,
                            name: agent.name,
                            config: agent.flow_config || { nodes: [], edges: [] }
                        })} />
                    </div>
                </section>

                {/* ── TIMEZONE RULES SECTION ─────────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-3">Zonas Horarias & Disponibilidad</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label htmlFor="tz-start" className="text-[9px] font-black uppercase tracking-widest text-white/40">Hora de Inicio (Activación)</label>
                                <input
                                    id="tz-start"
                                    type="time"
                                    value={config.timezone_rules.start}
                                    onChange={e => updateTimezone("start", e.target.value)}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                            <div className="space-y-3">
                                <label htmlFor="tz-end" className="text-[9px] font-black uppercase tracking-widest text-white/40">Hora de Fin (Cierre)</label>
                                <input
                                    id="tz-end"
                                    type="time"
                                    value={config.timezone_rules.end}
                                    onChange={e => updateTimezone("end", e.target.value)}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Días Laborables Permitidos</p>
                            <div className="flex gap-3">
                                {DAYS_MAP.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => toggleWorkingDay(d.value)}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl text-xs font-black transition-all border shrink-0",
                                            config.timezone_rules.working_days.includes(d.value)
                                                ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                                                : "bg-white/[0.03] border-white/5 text-white/20 hover:text-white/40"
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── SEQUENCE BUILDER ───────────────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-3">Constructor de Secuencia</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="space-y-4">
                        {config.sequence.map((step, i) => {
                            const ac = ACTION_CONFIG[step.action as ActionType] || ACTION_CONFIG.call;
                            const Icon = ac.icon;
                            const isExpanded = expandedStep === i;

                            return (
                                <div key={i} className={cn(
                                    "rounded-[32px] border overflow-hidden transition-all duration-300", 
                                    isExpanded ? "border-white/20 bg-white/[0.04] shadow-2xl" : "border-white/5 bg-white/[0.02]"
                                )}>
                                    {/* Step Header */}
                                    <div
                                        className="flex items-center gap-6 p-6 cursor-pointer group"
                                        onClick={() => setExpandedStep(isExpanded ? null : i)}
                                    >
                                        <GripVertical className="h-4 w-4 text-white/10 group-hover:text-white/30 transition-colors" />
                                        <div className={cn("h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg", ac.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Paso {step.step}</span>
                                                <span className={cn("text-[10px] px-3 py-1 rounded-full border font-black uppercase tracking-widest", ac.color)}>{ac.label}</span>
                                                {step.delay_hours > 0 && (
                                                    <span className="text-[10px] text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/5 font-bold">
                                                        +{step.delay_hours}h espera
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={e => { e.stopPropagation(); removeStep(i); }}
                                                title="Eliminar Paso"
                                                className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all font-bold"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </button>
                                            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                 <ChevronDown className={cn("h-4 w-4 text-white/20 transition-transform duration-300", isExpanded && "rotate-180")} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step Config */}
                                    {isExpanded && (
                                        <div className="px-8 pb-8 space-y-8 border-t border-white/5 pt-8 animate-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-2 gap-8">
                                                {/* Action Type */}
                                                <div className="space-y-3">
                                                    <label htmlFor={`action-${i}`} className="text-[9px] font-black uppercase tracking-widest text-white/40">Tipo de Acción</label>
                                                    <div className="relative">
                                                        <select
                                                            id={`action-${i}`}
                                                            value={step.action}
                                                            onChange={e => updateStep(i, { action: e.target.value as any })}
                                                            className="w-full h-12 bg-slate-900 border border-white/10 rounded-2xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                                                        >
                                                            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                                                                <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-white/20 pointer-events-none" />
                                                    </div>
                                                </div>

                                                {/* Delay */}
                                                <div className="space-y-3">
                                                    <label htmlFor={`delay-${i}`} className="text-[9px] font-black uppercase tracking-widest text-white/40">Retraso antes de ejecutar (horas)</label>
                                                    <input
                                                        id={`delay-${i}`}
                                                        type="number" min={0} step={1}
                                                        value={step.delay_hours}
                                                        onChange={e => updateStep(i, { delay_hours: parseInt(e.target.value) || 0 })}
                                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Agent Selector (Unified for call / ai_agent) */}
                                            {(step.action === "call" || step.action === "ai_agent") && (
                                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                                                    <AgentSelector 
                                                        selectedAgentIds={step.agents || []}
                                                        onToggleAgent={(agentId) => {
                                                            const current = step.agents || [];
                                                            const updated = current.includes(agentId)
                                                                ? current.filter(id => id !== agentId)
                                                                : [...current, agentId].slice(0, 2);
                                                            updateStep(i, { agents: updated });
                                                        }}
                                                    />

                                                    {/* FLOW BUILDER LINK for ai_agent */}
                                                    {step.action === "ai_agent" && step.agents && step.agents.length > 0 && (
                                                        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                                                            {step.agents.map(agentId => (
                                                                <button
                                                                    key={agentId}
                                                                    onClick={async () => {
                                                                        const agentsRes = await getAIAgents();
                                                                        const agent = agentsRes.data?.find(a => a.id === agentId);
                                                                        if (agent) {
                                                                            setEditingFlowAgent({
                                                                                id: agent.id,
                                                                                name: agent.name,
                                                                                config: agent.flow_config || { nodes: [], edges: [] }
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                                                >
                                                                    <GitBranch className="h-4 w-4" />
                                                                    Diseñar Flujo: {agentId.slice(0, 8)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Template (for whatsapp) */}
                                            {step.action === "whatsapp" && (
                                                <div className="space-y-3">
                                                    <label htmlFor={`template-${i}`} className="text-[9px] font-black uppercase tracking-widest text-white/40">Nombre de Plantilla Meta (WhatsApp Cloud API)</label>
                                                    <input
                                                        id={`template-${i}`}
                                                        value={step.template || ""}
                                                        onChange={e => updateStep(i, { template: e.target.value })}
                                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                        placeholder="contact_initial_v1"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Step */}
                    <button
                        onClick={addStep}
                        className="w-full h-20 border-2 border-dashed border-white/5 rounded-[40px] flex items-center justify-center gap-4 text-white/20 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.02] transition-all group mt-4"
                    >
                        <Plus className="h-6 w-6 group-hover:scale-110 group-hover:text-primary transition-all text-white/10" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Inyectar Nuevo Paso en la Secuencia</span>
                    </button>
                </section>
            </div>

            {/* AI FLOW BUILDER OVERLAY */}
            {editingFlowAgent && (
                <AgentFlowBuilder 
                    agentName={editingFlowAgent.name}
                    initialFlow={editingFlowAgent.config}
                    onClose={() => setEditingFlowAgent(null)}
                    onSave={handleSaveFlow}
                />
            )}
        </div>
    );
}


function AgentsList({ onEditFlow }: { onEditFlow: (agent: AIAgent) => void }) {
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const res = await getAIAgents();
            if (res.success) setAgents(res.data || []);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="h-20 flex items-center justify-center text-white/20 text-[10px] font-black uppercase tracking-widest">Cargando Agentes...</div>;

    return (
        <>
            {agents.map(agent => (
                <div key={agent.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-[32px] flex items-center justify-between group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-bold text-white group-hover:text-purple-400 transition-colors">{agent.name}</h3>
                            <p className="text-[10px] text-white/30 uppercase font-black tracking-tighter italic">{agent.type || 'QUALIFY'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onEditFlow(agent)}
                        className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white hover:border-purple-400 transition-all shadow-xl"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Abrir Constructor
                    </button>
                </div>
            ))}
        </>
    );
}

export default function OrchestratorConfigPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        }>
            <OrchestratorConfigContent />
        </Suspense>
    );
}
