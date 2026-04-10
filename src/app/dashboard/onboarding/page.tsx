"use client";

import { useState } from "react";
import { SequenceCanvas } from "@/components/onboarding/SequenceCanvas";
import { WorkflowSidebar } from "@/components/onboarding/WorkflowSidebar";
import { Workflow, Settings2, Building2, LayoutGrid } from "lucide-react";
import { useTenantStore } from "@/store/tenant";
import { ReactFlowProvider } from "@xyflow/react";

/**
 * ONBOARDING - PROFESSIONAL WORKFLOW ORCHESTRATOR (v4.0)
 * Multi-workflow management with nodal interaction.
 */

export default function OnboardingPage() {
    const { tenantId, tenantName, isConfigured } = useTenantStore();
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

    if (!isConfigured || !tenantId) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center gap-6 animate-in fade-in duration-700">
                <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-primary/10 text-primary">
                    <Building2 className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Selecciona un Cliente</h2>
                    <p className="text-muted-foreground opacity-60">Debes seleccionar un cliente en el menú lateral para gestionar sus flujos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] w-full overflow-hidden bg-black animate-in fade-in duration-1000">
            {/* Professional Top Bar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl z-[60]">
                <div className="flex items-center gap-4">
                    <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/10">
                        <LayoutGrid className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tight text-white/90 uppercase">
                            Workflow Orchestrator <span className="text-white/20 text-xs font-normal ml-2">{tenantName.toUpperCase()}</span>
                        </h1>
                        <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">
                            SaaS Engine V4.0 / Technical Hub
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-500 font-bold uppercase tracking-wider">
                         Environment: Production Ready
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <button 
                        title="Configuración del Orquestador"
                        className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-white/60"
                    >
                        <Settings2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Main Workspace: Sidebar + Canvas */}
            <div className="flex-1 flex overflow-hidden">
                <WorkflowSidebar 
                    tenantId={tenantId} 
                    selectedWorkflowId={selectedWorkflowId} 
                    onSelect={setSelectedWorkflowId} 
                />
                
                <div className="flex-1 relative bg-[#050505]">
                    {selectedWorkflowId ? (
                        <ReactFlowProvider key={selectedWorkflowId}>
                            <SequenceCanvas 
                                tenantId={tenantId} 
                                workflowId={selectedWorkflowId} 
                            />
                        </ReactFlowProvider>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-20 group">
                             <Workflow className="h-16 w-16 group-hover:scale-110 transition-transform duration-700" />
                             <p className="text-sm font-bold uppercase tracking-widest">Cargando Workflow...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sub-Footer Status Bar */}
            <div className="px-8 py-2 border-t border-white/5 bg-black/60 flex items-center justify-between z-50">
                <div className="flex items-center gap-6 text-[10px] font-bold tracking-widest text-white/30 uppercase">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Multi-Workflow Sync: OK
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Cross-Connection: Active
                    </div>
                </div>
                <div className="text-[10px] font-mono text-white/10 italic">
                   Professional Suite V4.0.1
                </div>
            </div>
        </div>
    );
}
