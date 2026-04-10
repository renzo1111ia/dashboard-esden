"use client";

import React, { useState, useEffect } from "react";
import { Bot, Check, ChevronsUpDown, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAIAgents } from "@/lib/actions/agents";
import { AIAgent } from "@/types/database";
import Link from "next/link";

interface AgentSelectorProps {
    selectedAgentIds: string[];
    onToggleAgent: (agentId: string) => void;
    maxSelection?: number; // Default 2 for A/B testing
}

export function AgentSelector({ 
    selectedAgentIds, 
    onToggleAgent, 
    maxSelection = 2 
}: AgentSelectorProps) {
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await getAIAgents();
            if (res.success && res.data) {
                setAgents(res.data);
            }
            setLoading(false);
        }
        load();
    }, []);

    const selectedAgents = agents.filter(a => selectedAgentIds.includes(a.id));

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    Agentes de IA (A/B Testing con {maxSelection})
                </label>
                <Link 
                    href="/dashboard/agents" 
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                    Gestionar Agentes <ExternalLink className="h-2.5 w-2.5" />
                </Link>
            </div>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center justify-between hover:bg-white/[0.08] transition-all group"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Bot className="h-4 w-4 text-white/30 group-hover:text-primary transition-colors" />
                        {selectedAgents.length > 0 ? (
                            <div className="flex gap-1 overflow-hidden">
                                {selectedAgents.map(agent => (
                                    <span key={agent.id} className="text-xs font-bold text-white/80 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                        {agent.name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-white/20 font-medium italic">Seleccionar agentes...</span>
                        )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-white/20" />
                </button>

                {isOpen && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)} 
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="max-h-60 overflow-y-auto p-2">
                                {loading ? (
                                    <div className="p-4 flex justify-center">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    </div>
                                ) : agents.length === 0 ? (
                                    <div className="p-4 text-center">
                                        <p className="text-xs text-white/30">No hay agentes creados.</p>
                                        <Link 
                                            href="/dashboard/agents" 
                                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary"
                                        >
                                            <Plus className="h-3 w-3" /> Crear Agente
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid gap-1">
                                        {agents.map(agent => {
                                            const isSelected = selectedAgentIds.includes(agent.id);
                                            const canSelectMore = selectedAgentIds.length < maxSelection;
                                            
                                            return (
                                                <button
                                                    key={agent.id}
                                                    type="button"
                                                    disabled={!isSelected && !canSelectMore}
                                                    onClick={() => onToggleAgent(agent.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left",
                                                        isSelected 
                                                            ? "bg-primary/20 border border-primary/30" 
                                                            : "hover:bg-white/5 border border-transparent",
                                                        !isSelected && !canSelectMore && "opacity-40 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white/90 truncate">{agent.name}</p>
                                                        <p className="text-[10px] text-white/30 uppercase font-black truncate">{agent.type}</p>
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            {selectedAgentIds.length === 0 && (
                <p className="text-[10px] text-amber-400/60 flex items-center gap-1 px-1">
                    Recuerda: Si no seleccionas agentes, el orquestador no podrá realizar acciones de IA.
                </p>
            )}
        </div>
    );
}
