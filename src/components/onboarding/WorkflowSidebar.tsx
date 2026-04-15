"use client";

import React, { useEffect, useState } from "react";
import { 
    Plus, FolderTree, Zap, ChevronRight, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Workflow {
    id: string;
    name: string;
    description: string;
    is_primary: boolean;
}

interface WorkflowSidebarProps {
    tenantId: string;
    selectedWorkflowId: string | null;
    onSelect: (id: string) => void;
}

export function WorkflowSidebar({ tenantId, selectedWorkflowId, onSelect }: WorkflowSidebarProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWorkflows = async () => {
            try {
                const res = await fetch(`/api/orchestration/workflows?tenantId=${tenantId}`);
                if (res.ok) {
                    const data = await res.json();
                    setWorkflows(data);
                    // Auto-select primary or first if none selected
                    if (!selectedWorkflowId && data.length > 0) {
                        const primary = data.find((w: Workflow) => w.is_primary) || data[0];
                        onSelect(primary.id);
                    }
                }
            } catch (error) {
                console.error("Failed to load workflows:", error);
            } finally {
                setLoading(false);
            }
        };
        loadWorkflows();
    }, [tenantId, selectedWorkflowId, onSelect]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("¿Estás seguro de que deseas eliminar este workflow? Esta acción no se puede deshacer.")) return;

        try {
            const res = await fetch(`/api/orchestration/workflows?id=${id}&tenantId=${tenantId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedWfs = workflows.filter(wf => wf.id !== id);
                setWorkflows(updatedWfs);
                // If deleted workflow was selected, select another one
                if (selectedWorkflowId === id) {
                    if (updatedWfs.length > 0) {
                        onSelect(updatedWfs[0].id);
                    } else {
                        onSelect("");
                    }
                }
            } else {
                const errData = await res.json();
                alert(`Error al eliminar workflow: ${errData.error || res.statusText}`);
            }
        } catch (error: any) {
            console.error("Failed to delete workflow:", error);
            alert(`Error de red: ${error.message}`);
        }
    };

    const handleCreate = async () => {
        const name = prompt("Nombre del nuevo workflow:");
        if (!name) return;

        try {
            const res = await fetch('/api/orchestration/workflows', {
                method: 'POST',
                body: JSON.stringify({ tenantId, name })
            });
            if (res.ok) {
                const newWf = await res.json();
                setWorkflows([newWf, ...workflows]);
                onSelect(newWf.id);
            } else {
                const errData = await res.json();
                alert(`Error al crear workflow: ${errData.error || res.statusText}`);
            }
        } catch (error: any) {
            console.error("Failed to create workflow:", error);
            alert(`Error de red: ${error.message}`);
        }
    };

    return (
        <div className="w-72 border-r border-white/5 bg-black/60 backdrop-blur-3xl flex flex-col h-full animate-in slide-in-from-left duration-500">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/40">
                    <FolderTree className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Colecciones</span>
                </div>
                <button 
                    onClick={handleCreate}
                    title="Crear nuevo flujo de automatización"
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>

            {/* Workflow List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="space-y-3 px-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : workflows.map((wf) => (
                    <div 
                        key={wf.id}
                        onClick={() => onSelect(wf.id)}
                        className={cn(
                            "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                            selectedWorkflowId === wf.id 
                                ? "bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/5" 
                                : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10"
                        )}
                    >
                        <div className={cn(
                            "h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
                            selectedWorkflowId === wf.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/20 group-hover:text-white/40"
                        )}>
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm font-bold truncate transition-colors",
                                selectedWorkflowId === wf.id ? "text-white" : "group-hover:text-white/60"
                            )}>
                                {wf.name}
                            </p>
                            {wf.is_primary && (
                                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">Default Entry</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={(e) => handleDelete(e, wf.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-500 transition-all"
                                title="Eliminar workflow"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <ChevronRight className={cn(
                                "h-4 w-4 transition-all",
                                selectedWorkflowId === wf.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                            )} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 bg-white/5 border-t border-white/5">
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/10 space-y-2">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">SaaS Engine V4.0</p>
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                        Crea flujos modulares para maximizar la conversión en cada etapa.
                    </p>
                </div>
            </div>
        </div>
    );
}
