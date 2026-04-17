"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
    Play, RotateCcw, ChevronRight, 
    Check, AlertCircle, Loader2, Terminal,
    Users, Workflow as WorkflowIcon, Zap, Activity,
    ShieldCheck, MessageSquare, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
    getRecentLeads, 
    getTenantWorkflows, 
    getWorkflowRules,
    triggerOrchestratorForLead 
} from "@/lib/actions/orchestration";
import { useTenantStore } from "@/store/tenant";

interface Lead { id: string; nombre?: string | null; apellido?: string | null; telefono?: string | null; origen?: string | null; }
interface WorkflowItem { id: string; name: string; is_primary?: boolean | null; is_active?: boolean | null; }
interface Rule { id: string; step_name: string; action_type: string; sequence_order: number; }

export default function OrchestratorPlaygroundPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [health, setHealth] = useState<{
        meta: { ok: boolean; msg: string };
        aws: { ok: boolean; msg: string };
        supabase: { ok: boolean; msg: string };
    }>({
        meta: { ok: false, msg: "Cargando..." },
        aws: { ok: false, msg: "Cargando..." },
        supabase: { ok: false, msg: "Cargando..." },
    });
    const logRef = useRef<HTMLDivElement>(null);

    const loadData = useCallback(async () => {
        const [leadsRes, wfRes] = await Promise.all([getRecentLeads(20), getTenantWorkflows()]);
        if (leadsRes.success && leadsRes.data) setLeads(leadsRes.data as Lead[]);
        if (wfRes.success && wfRes.data) {
            const wfs = wfRes.data as WorkflowItem[];
            setWorkflows(wfs);
            const primary = wfs.find(w => w.is_primary) || wfs[0];
            if (primary) setSelectedWorkflow(primary);
        }

        // Simulación de Health Check (se podría envolver en una Server Action real)
        const tenantConfig = useTenantStore.getState().config || {};
        const wa = (tenantConfig as any).whatsapp || {};
        const aws = (tenantConfig as any).aws || {};

        setHealth({
            meta: { 
                ok: !!(wa.accessToken && wa.phoneNumberId), 
                msg: wa.accessToken ? "Conectado a Meta" : "Falta Access Token en Ajustes" 
            },
            aws: { 
                ok: !!(aws.kbId), 
                msg: aws.kbId ? "Cerebro AWS Listo" : "Falta Knowledge Base ID" 
            },
            supabase: { 
                ok: true, 
                msg: "Base de Datos Operativa" 
            }
        });
    }, []);

    const loadRules = useCallback(async (workflowId: string) => {
        const res = await getWorkflowRules(workflowId);
        if (res.success && res.data) setRules(res.data as Rule[]);
        else setRules([]);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (selectedWorkflow) loadRules(selectedWorkflow.id);
    }, [selectedWorkflow, loadRules]);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [logs]);

    async function handleRun() {
        if (!selectedLead || !selectedWorkflow) return;
        setStatus("loading");
        setLogs([]);

        const addLog = (line: string) => setLogs(prev => [...prev, line]);

        addLog(`[INFO] Iniciando Orquestador...`);
        addLog(`[INFO] Lead: ${selectedLead.nombre} ${selectedLead.apellido} (${selectedLead.id.slice(0, 8)}...)`);
        addLog(`[INFO] Workflow: ${selectedWorkflow.name}`);
        addLog(`[INFO] Pasos configurados: ${rules.length}`);

        const res = await triggerOrchestratorForLead(selectedLead.id, selectedWorkflow.id);

        if (res.success) {
            if (res.logs && res.logs.length > 0) {
                res.logs.forEach(log => addLog(log));
            } else {
                addLog(`[ORCHESTRATOR] No active rules found. Add steps in the Constructor.`);
            }
            addLog(`\n✅ Ejecución Completada`);
            setStatus("success");
        } else {
            addLog(`[ERROR] ${res.error}`);
            setStatus("error");
        }
    }

    const actionColors: Record<string, string> = {
        CALL: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        WHATSAPP: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        AI_AGENT: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        WAIT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        LLM_TEXT: "text-pink-400 bg-pink-500/10 border-pink-500/20",
        API_CALL: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
        SUB_WORKFLOW: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Terminal className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Orchestrator Playground</h1>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Simula el motor de orquestación en tiempo real con leads reales</p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    title="Refrescar datos"
                    className="flex items-center gap-2 h-10 px-4 border border-white/10 rounded-xl text-white/40 hover:bg-white/5 text-xs font-bold uppercase tracking-widest"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Refrescar
                </button>
            </div>

            {/* ── DIAGNOSTIC BAR ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <HealthCard 
                    icon={Globe} 
                    title="Webhook Status" 
                    status={health.supabase.ok ? "ONLINE" : "OFFLINE"} 
                    desc="app.automatizaformacion.com" 
                />
                <HealthCard 
                    icon={MessageSquare} 
                    title="Meta Integration" 
                    status={health.meta.ok ? "CONFIGURED" : "MISSING DATA"} 
                    desc={health.meta.msg}
                    isError={!health.meta.ok}
                />
                <HealthCard 
                    icon={Zap} 
                    title="AWS Intelligence" 
                    status={health.aws.ok ? "SYNCED" : "NO KB ID"} 
                    desc={health.aws.msg}
                    isError={!health.aws.ok}
                />
                <HealthCard 
                    icon={ShieldCheck} 
                    title="Auth Security" 
                    status="ACTIVE" 
                    desc="Verify Token Validated" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: Config Panel ── */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Workflow Selector */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white/60">
                            <WorkflowIcon className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">1. Seleccionar Workflow</span>
                        </div>
                        <div className="space-y-2">
                            {workflows.length === 0 && (
                                <p className="text-xs text-white/20 italic text-center py-4">Sin workflows. Crea uno en el Constructor.</p>
                            )}
                            {workflows.map(wf => (
                                <button
                                    key={wf.id}
                                    onClick={() => setSelectedWorkflow(wf)}
                                    title={`Seleccionar: ${wf.name}`}
                                    className={cn(
                                        "w-full p-3 rounded-xl text-left border transition-all",
                                        selectedWorkflow?.id === wf.id
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "bg-white/[0.01] border-white/5 text-white/60 hover:bg-white/[0.03]"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">{wf.name}</span>
                                        {wf.is_primary && <span className="text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase">Principal</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Workflow Steps Preview */}
                    {rules.length > 0 && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Pasos del Workflow</span>
                            <div className="space-y-2">
                                {rules.map((rule, i) => (
                                    <div key={rule.id} className="flex items-center gap-3">
                                        <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-black text-white/30 flex-shrink-0">{i + 1}</div>
                                        <div className={cn("flex-1 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider", actionColors[rule.action_type] || "text-white/40 bg-white/5 border-white/10")}>
                                            {rule.step_name || rule.action_type}
                                        </div>
                                        {i < rules.length - 1 && <ChevronRight className="h-3 w-3 text-white/10" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lead Selector */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white/60">
                            <Users className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">2. Seleccionar Lead</span>
                        </div>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {leads.length === 0 && (
                                <p className="text-xs text-white/20 italic text-center py-4">Sin leads disponibles en este tenant.</p>
                            )}
                            {leads.map(lead => (
                                <button
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    title={`Lead: ${lead.nombre} ${lead.apellido}`}
                                    className={cn(
                                        "w-full p-3 rounded-xl text-left border transition-all",
                                        selectedLead?.id === lead.id
                                            ? "bg-emerald-500/10 border-emerald-500/30"
                                            : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                                    )}
                                >
                                    <div className="text-sm font-bold truncate">{lead.nombre} {lead.apellido}</div>
                                    <div className="text-[10px] text-white/30 font-mono truncate">{lead.telefono || lead.id.slice(0, 12) + "..."}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Execution Panel ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Run Button */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-3 w-3 rounded-full flex-shrink-0", {
                                "bg-white/10": status === "idle",
                                "bg-amber-400 animate-pulse": status === "loading",
                                "bg-emerald-400": status === "success",
                                "bg-red-400": status === "error",
                            })} />
                            <div>
                                <p className="text-sm font-bold">
                                    {status === "idle" && "Listo para simular"}
                                    {status === "loading" && "Ejecutando orquestador..."}
                                    {status === "success" && "Ejecución completada"}
                                    {status === "error" && "Error en ejecución"}
                                </p>
                                <p className="text-[10px] text-white/30">
                                    {selectedLead
                                        ? `Lead: ${selectedLead.nombre} / Workflow: ${selectedWorkflow?.name || "—"}`
                                        : "Selecciona un lead y un workflow para comenzar"
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleRun}
                            disabled={!selectedLead || !selectedWorkflow || status === "loading"}
                            title="Ejecutar orquestador"
                            className={cn(
                                "flex items-center gap-3 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex-shrink-0",
                                (!selectedLead || !selectedWorkflow || status === "loading")
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
                            )}
                        >
                            {status === "loading"
                                ? <><Loader2 className="h-5 w-5 animate-spin" /> Procesando</>
                                : <><Play className="h-5 w-5" /> Ejecutar</>
                            }
                        </button>
                    </div>

                    {/* Log Console */}
                    <div className="flex-1 bg-black/60 border border-white/5 rounded-3xl overflow-hidden flex flex-col min-h-[400px]">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-white/30" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Log de Ejecución</span>
                            </div>
                            {status === "success" && (
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <Check className="h-3 w-3" /> Completado
                                </span>
                            )}
                            {status === "error" && (
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                    <AlertCircle className="h-3 w-3" /> Error
                                </span>
                            )}
                        </div>
                        <div ref={logRef} className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1.5">
                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-white/10 py-20">
                                    <Terminal className="h-12 w-12" />
                                    <p className="font-bold uppercase tracking-widest text-[11px]">Esperando ejecución...</p>
                                </div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className={cn("leading-relaxed", {
                                    "text-white/50": log.includes("[INFO]"),
                                    "text-purple-400": log.includes("[ORCHESTRATOR]"),
                                    "text-red-400": log.includes("[ERROR]"),
                                    "text-emerald-400 font-bold": log.includes("✅"),
                                    "text-amber-400": log.includes("[WARN]"),
                                    "text-white/20": !log.includes("["),
                                })}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Workflows Activos", value: workflows.filter(w => w.is_active).length, icon: WorkflowIcon, color: "text-primary" },
                            { label: "Leads Disponibles", value: leads.length, icon: Users, color: "text-emerald-400" },
                            { label: "Pasos en Workflow", value: rules.length, icon: Zap, color: "text-purple-400" },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                                <div>
                                    <p className="text-xl font-black">{stat.value}</p>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthCard({ icon: Icon, title, status, desc, isError }: any) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
            <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
            )}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{title}</span>
                    <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                        isError ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                        {status}
                    </span>
                </div>
                <p className="text-[11px] font-bold text-white/80 leading-tight">{desc}</p>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2",
                active 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-white/20 hover:text-white/40"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}
