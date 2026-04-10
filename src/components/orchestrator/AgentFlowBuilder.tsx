"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { 
    ReactFlow, 
    Background, 
    Controls, 
    Connection, 
    Node, 
    addEdge, 
    useNodesState, 
    useEdgesState,
    Panel,
    Handle,
    Position,
    PanelPosition
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
    MessageSquare,
    HelpCircle,
    GitBranch,
    Calendar,
    Settings,
    ChevronRight,
    Zap,
    Check,
    Timer,
    Terminal,
    Database,
    Trash2,
    X,
    Globe,
    Brain,
    Plus,
    Play,
    Share2,
    Sparkles,
    LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Custom Node Types ─────────────────────────────────────────────

const NodeWrapper = ({ title, icon: Icon, children, color, selected, type, headerColor }: { title: string; icon: LucideIcon; children: React.ReactNode; color: string; selected?: boolean; type?: string; headerColor: string }) => (
    <div className={cn(
        "rounded-2xl border-2 transition-all duration-300 min-w-[240px] shadow-2xl bg-slate-900 overflow-hidden",
        selected 
            ? "border-white/40 ring-4 ring-white/10 scale-[1.02] -translate-y-1" 
            : "border-white/5 hover:border-white/10 shadow-black/40",
    )}>
        {/* n8n style header bar */}
        <div className={cn("h-1.5 w-full", headerColor)} />
        
        <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2 rounded-xl shadow-lg shrink-0", color)}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 block truncate">{type || "MODULO"}</span>
                    <span className="text-xs font-bold text-white tracking-tight truncate">{title}</span>
                </div>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    </div>
);

const TriggerNode = ({ data, selected }: { data: { event?: string }; selected?: boolean }) => (
    <NodeWrapper title="Disparador" icon={Zap} color="bg-yellow-500/20 text-yellow-500" headerColor="bg-yellow-500" selected={selected} type="INICIO">
        <div className="px-2 py-1.5 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
            <p className="text-[10px] text-yellow-200/50 font-medium leading-relaxed">
                {data.event || "Nueva entrada de lead"}
            </p>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const MessageNode = ({ data, selected }: { data: { text?: string }; selected?: boolean }) => (
    <NodeWrapper title="Mensaje AI" icon={MessageSquare} color="bg-blue-500/20 text-blue-400" headerColor="bg-blue-500" selected={selected} type="SALIDA">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
        <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 italic text-[10px] text-white/70 line-clamp-3">
            &quot;{data.text || "Escribiendo respuesta..."}&quot;
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const HTTPRequestNode = ({ data, selected }: { data: { method?: string; url?: string }; selected?: boolean }) => (
    <NodeWrapper title="HTTP Request" icon={Globe} color="bg-orange-500/20 text-orange-400" headerColor="bg-orange-500" selected={selected} type="INTEGRACIÓN">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500 border-2 border-slate-900" />
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">{data.method || "POST"}</span>
                <span className="text-[10px] text-white/40 truncate flex-1">{data.url || "https://api..."}</span>
            </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const DatabaseNode = ({ data, selected }: { data: { action?: string; target?: string }; selected?: boolean }) => (
    <NodeWrapper title="Acción DB" icon={Database} color="bg-cyan-500/20 text-cyan-400" headerColor="bg-cyan-500" selected={selected} type="DATOS">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500 border-2 border-slate-900" />
        <div className="p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter">{data.action || "UPDATE_LEAD"} <span className="text-white/20">→</span> {data.target || "Status"}</p>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const AITaskNode = ({ data, selected }: { data: { task?: string }; selected?: boolean }) => (
    <NodeWrapper title="Tarea IA" icon={Brain} color="bg-purple-500/20 text-purple-400" headerColor="bg-purple-500" selected={selected} type="PROCESO">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
        <div className="flex items-center gap-2 text-[10px] text-purple-200/60 font-medium italic">
            <Sparkles className="w-3 h-3" />
            {data.task || "Analizar sentimientos..."}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const QuestionNode = ({ data, selected }: { data: { text?: string; validation?: string }; selected?: boolean }) => (
    <NodeWrapper title="Pregunta" icon={HelpCircle} color="bg-emerald-500/20 text-emerald-400" headerColor="bg-emerald-500" selected={selected} type="INTERACCIÓN">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900" />
        <div className="space-y-2">
            <p className="text-[10px] text-white/80 font-medium italic leading-relaxed">&quot;{data.text || "¿Cuál es tu duda?"}&quot;</p>
            {data.validation && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{data.validation}</span>
                </div>
            )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const ConditionNode = ({ data, selected }: { data: { ifLabel?: string; elseLabel?: string }; selected?: boolean }) => (
    <NodeWrapper title="Filtro" icon={GitBranch} color="bg-pink-500/20 text-pink-400" headerColor="bg-pink-500" selected={selected} type="LÓGICA">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-pink-500 border-2 border-slate-900" />
        <div className="flex justify-between items-center px-3 py-2 bg-pink-500/5 rounded-xl border border-pink-500/10">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{data.ifLabel || "SÍ"}</span>
            <div className="w-[1px] h-3 bg-white/10 mx-2" />
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">{data.elseLabel || "NO"}</span>
        </div>
        <Handle type="source" position={Position.Bottom} id="if" className="w-3 h-3 bg-emerald-500 border-slate-900 border-2 left-[25%]" />
        <Handle type="source" position={Position.Bottom} id="else" className="w-3 h-3 bg-rose-500 border-slate-900 border-2 left-[75%]" />
    </NodeWrapper>
);

const WaitNode = ({ data, selected }: { data: { delay_value?: number; delay_unit?: string }; selected?: boolean }) => (
    <NodeWrapper title="Esperar" icon={Timer} color="bg-amber-500/10 text-amber-400" headerColor="bg-amber-500" selected={selected} type="TEMPORIZADOR">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />
        <div className="flex flex-col items-center">
            <span className="text-[14px] font-black">{data.delay_value || 0}</span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">{data.delay_unit || "minutos"}</span>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const CommandNode = ({ data, selected }: { data: { command_type?: string }; selected?: boolean }) => (
    <NodeWrapper title="Comando" icon={Terminal} color="bg-blue-500/20 text-blue-400" headerColor="bg-blue-500" selected={selected} type="SISTEMA">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
        <div className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 text-[10px] font-bold text-blue-400 uppercase">
            {data.command_type || "EJECUTAR_ACCION"}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const CollectorNode = ({ data, selected }: { data: { fields?: string[]; target_variable?: string }; selected?: boolean }) => (
    <NodeWrapper title="Colector" icon={Database} color="bg-cyan-500/20 text-cyan-400" headerColor="bg-cyan-500" selected={selected} type="DATOS">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500 border-2 border-slate-900" />
        <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-tighter text-cyan-300/40">Destino: {data.target_variable || "unified_data"}</p>
            <div className="flex flex-wrap gap-1">
                {(data.fields || ["array"]).map((f, idx) => (
                    <span key={idx} className="text-[7px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/10 uppercase font-black">{f}</span>
                ))}
            </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500 border-2 border-slate-900" />
    </NodeWrapper>
);

const BookNode = ({ selected }: { selected?: boolean }) => (
    <NodeWrapper title="Agendar" icon={Calendar} color="bg-amber-500/10 text-amber-400" headerColor="bg-amber-500" selected={selected} type="CALENDARIO">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />
        <p className="text-[10px] font-bold text-white/40">Cierra y agenda cita</p>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-slate-900" />
    </NodeWrapper>
);

// ─── Component ─────────────────────────────────────────────────────

interface AgentFlowBuilderProps {
    initialFlow: { nodes: any[]; edges: any[] };
    onSave: (flow: { nodes: any[]; edges: any[] }) => void;
    onClose: () => void;
    agentName: string;
}

export function AgentFlowBuilder({ initialFlow, onSave, onClose, agentName }: AgentFlowBuilderProps) {
    const [saving, setSaving] = useState(false);

    const handlePublish = async () => {
        setSaving(true);
        try {
            await onSave({ nodes, edges });
        } finally {
            setSaving(false);
        }
    };

    const nodeTypes = useMemo(() => ({
        flow_trigger: TriggerNode,
        flow_message: MessageNode,
        flow_question: QuestionNode,
        flow_condition: ConditionNode,
        flow_wait: WaitNode,
        flow_command: CommandNode,
        flow_collector: CollectorNode,
        flow_book: BookNode,
        flow_http: HTTPRequestNode,
        flow_db: DatabaseNode,
        flow_ai: AITaskNode,
    }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState(
        initialFlow.nodes && initialFlow.nodes.length > 0 ? initialFlow.nodes : [
            { id: "start", type: "flow_trigger", position: { x: 250, y: 0 }, data: {} }
        ]
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges || []);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 } }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const updateNodeData = (id: string, newData: any) => {
        setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
    };

    const addNode = (type: string) => {
        const id = `${type}_${Date.now()}`;
        const newNode: Node = {
            id,
            type,
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: { 
                text: "", 
                ifLabel: "SÍ", 
                elseLabel: "NO",
                delay_value: 5,
                delay_unit: "minutos",
                command_type: "update_status",
                fields: ["leads", "responses"],
                target_variable: "unified_data",
                webhook_url: "",
                metadata_key: "",
                metadata_value: "",
                tag_name: "",
                event: "nueva_entrada"
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300 overflow-hidden text-white">
            {/* Header */}
            <div className="h-20 bg-white/[0.02] border-b border-white/5 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Flow Builder Pro</h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Lógica para: <span className="text-white/80">{agentName}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handlePublish}
                        disabled={saving}
                        className="h-11 px-8 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 border-b-4 border-primary-foreground/20 disabled:opacity-50"
                    >
                        {saving ? "Publicando..." : "Publicar Comportamiento"}
                    </button>
                    <button 
                        onClick={onClose}
                        title="Cerrar panel"
                        className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all font-bold"
                    >
                        <X className="h-5 w-5 text-white/40" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* ── Add Node Panel (Quick Add) ── */}
                <div className="w-16 h-full bg-white/[0.01] border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0">
                    <button 
                        onClick={() => addNode('flow_trigger')} title="Disparador"
                        className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-lg"
                    >
                        <Zap className="h-5 w-5" />
                    </button>
                    <div className="w-8 h-px bg-white/5" />
                    <button 
                        onClick={() => addNode('flow_message')} title="Mensaje AI"
                        className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                    >
                        <MessageSquare className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={() => addNode('flow_question')} title="Pregunta"
                        className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                    >
                        <HelpCircle className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={() => addNode('flow_condition')} title="Filtro Lógico"
                        className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-white transition-all shadow-lg"
                    >
                        <GitBranch className="h-5 w-5" />
                    </button>
                    <div className="w-8 h-px bg-white/5" />
                    <button 
                        onClick={() => addNode('flow_http')} title="HTTP / Webhook"
                        className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 hover:bg-orange-500 hover:text-white transition-all shadow-lg"
                    >
                        <Globe className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={() => addNode('flow_db')} title="Acción DB"
                        className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all shadow-lg"
                    >
                        <Database className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={() => addNode('flow_ai')} title="IA Proceso"
                        className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow-lg"
                    >
                        <Brain className="h-5 w-5" />
                    </button>
                    <div className="mt-auto">
                        <div className="h-10 w-10 rounded-xl border border-white/5 flex items-center justify-center text-white/10">
                            <Plus className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        colorMode="dark"
                    >
                        <Background color="#1e293b" gap={20} />
                        <Controls />
                        
                        {/* Tools Bar (Top) */}
                        <Panel position={"top-center" as PanelPosition} className="w-full max-w-4xl">
                            <div className="flex overflow-x-auto gap-2 p-3 bg-white/5 border-b border-white/10 no-scrollbar">
                                <ToolButton onClick={() => addNode("flow_trigger")} icon={Zap} label="Gatillo" color="text-yellow-400 bg-yellow-500/10" />
                                <div className="w-[1px] h-8 bg-white/10 mx-2" />
                                <ToolButton onClick={() => addNode("flow_message")} icon={MessageSquare} label="Mensaje" color="text-blue-400 bg-blue-500/10" />
                                <ToolButton onClick={() => addNode("flow_question")} icon={HelpCircle} label="Pregunta" color="text-emerald-400 bg-emerald-500/10" />
                                <ToolButton onClick={() => addNode("flow_condition")} icon={GitBranch} label="Condición" color="text-purple-400 bg-purple-500/10" />
                                <ToolButton onClick={() => addNode("flow_wait")} icon={Timer} label="Espera" color="text-amber-400 bg-amber-500/10" />
                                <ToolButton onClick={() => addNode("flow_command")} icon={Terminal} label="Comando" color="text-red-400 bg-red-500/10" />
                                <ToolButton onClick={() => addNode("flow_collector")} icon={Database} label="Colector" color="text-indigo-400 bg-indigo-500/10" />
                            </div>
                        </Panel>

                        <Panel position={"bottom-left" as PanelPosition} className="m-4">
                            <button 
                                 onClick={() => {
                                     setNodes((nds) => nds.filter((n) => !n.selected));
                                     setEdges((eds) => eds.filter((e) => !e.selected));
                                     setSelectedNodeId(null);
                                 }}
                                 className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/5 hover:bg-red-500/10 text-red-500/60 hover:text-red-400 group transition-all"
                            >
                                 <Trash2 className="h-4 w-4" />
                                 <span className="text-[11px] font-black uppercase tracking-widest">Eliminar Selección</span>
                            </button>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Sidebar (Right) */}
                {selectedNode && (
                    <div className="w-80 bg-slate-900 border-l border-white/5 p-8 flex flex-col gap-8 animate-in slide-in-from-right-5 duration-300 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="h-4 w-4 text-primary" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Propiedades</h3>
                            </div>
                            <button onClick={() => setSelectedNodeId(null)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                                <X className="h-4 w-4 text-white/30" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Common: Label */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Identificador Nodo</label>
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-white/20">
                                    {selectedNode.id}
                                </div>
                            </div>

                            {/* Node Specific Configs */}
                            {selectedNode.type === 'flow_message' && (
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Texto del Mensaje</label>
                                    <textarea 
                                        value={selectedNode.data.text || ""}
                                        onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                                        className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/80 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                                        placeholder="Ej: Hola, ¿en qué puedo ayudarte?"
                                    />
                                </div>
                            )}

                            {selectedNode.type === 'flow_question' && (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Pregunta al Usuario</label>
                                        <textarea 
                                            value={selectedNode.data.text || ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                                            className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white/80 leading-relaxed focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                                            placeholder="Escribe la pregunta que el agente hará..."
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Validación de Respuesta</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['texto', 'email', 'telefono', 'numero', 'fecha'].map((v) => (
                                                <button
                                                    key={v}
                                                    onClick={() => updateNodeData(selectedNode.id, { validation: v })}
                                                    className={cn(
                                                        "py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                                        selectedNode.data.validation === v
                                                            ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20"
                                                            : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'flow_trigger' && (
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Evento de Activación</label>
                                    <select 
                                        value={selectedNode.data.event || "nueva_entrada"}
                                        onChange={(e) => updateNodeData(selectedNode.id, { event: e.target.value })}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs text-white/80 focus:border-yellow-500/40 outline-none"
                                    >
                                        <option value="nueva_entrada">Nueva Entrada de Usuario</option>
                                        <option value="mensaje_recibido">Mensaje Específico Recibido</option>
                                        <option value="tiempo_inactivo">Tiempo de Inactividad</option>
                                        <option value="webhook">Webhook Externo</option>
                                    </select>
                                </div>
                            )}

                            {selectedNode.type === 'flow_condition' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Etiqueta SI (Verdad)</label>
                                        <input 
                                            value={selectedNode.data.ifLabel || ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, { ifLabel: e.target.value })}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-emerald-400 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Etiqueta NO (Falso)</label>
                                        <input 
                                            value={selectedNode.data.elseLabel || ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, { elseLabel: e.target.value })}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-red-400 font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'flow_wait' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Valor de Espera</label>
                                        <input 
                                            type="number"
                                            value={selectedNode.data.delay_value || 0}
                                            onChange={(e) => updateNodeData(selectedNode.id, { delay_value: parseInt(e.target.value) })}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-amber-400 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Unidad de Tiempo</label>
                                        <select 
                                            value={selectedNode.data.delay_unit || "minutos"}
                                            onChange={(e) => updateNodeData(selectedNode.id, { delay_unit: e.target.value })}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80 font-bold"
                                        >
                                            <option value="minutos">Minutos</option>
                                            <option value="horas">Horas</option>
                                            <option value="dias">Días</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedNode.type === 'flow_command' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Acción de Ejecución</label>
                                        <select 
                                            value={selectedNode.data.command_type || "update_status"}
                                            onChange={(e) => updateNodeData(selectedNode.id, { command_type: e.target.value })}
                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80 font-bold"
                                        >
                                            <option value="update_status">Actualizar Estado Lead</option>
                                            <option value="trigger_webhook">Disparar Webhook (POST)</option>
                                            <option value="add_tag">Añadir Etiqueta (Tag)</option>
                                            <option value="update_metadata">Actualizar Metadatos (JSON)</option>
                                            <option value="human_handoff">Transferir a Humano</option>
                                            <option value="notify_admin">Notificar a Admin (WhatsApp)</option>
                                        </select>
                                    </div>

                                    {/* Conditional Command Fields */}
                                    {selectedNode.data.command_type === 'trigger_webhook' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-red-400">URL del Webhook</label>
                                            <input 
                                                value={selectedNode.data.webhook_url || ""}
                                                onChange={(e) => updateNodeData(selectedNode.id, { webhook_url: e.target.value })}
                                                className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80"
                                                placeholder="https://api.tuservicio.com/hook"
                                            />
                                        </div>
                                    )}

                                    {selectedNode.data.command_type === 'add_tag' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-red-400">Nombre de la Etiqueta</label>
                                            <input 
                                                value={selectedNode.data.tag_name || ""}
                                                onChange={(e) => updateNodeData(selectedNode.id, { tag_name: e.target.value })}
                                                className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80"
                                                placeholder="Ej: interesado_premium"
                                            />
                                        </div>
                                    )}

                                    {selectedNode.data.command_type === 'update_metadata' && (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-red-400">Key</label>
                                                <input 
                                                    value={selectedNode.data.metadata_key || ""}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { metadata_key: e.target.value })}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80"
                                                    placeholder="budget"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-red-400">Value</label>
                                                <input 
                                                    value={selectedNode.data.metadata_value || ""}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { metadata_value: e.target.value })}
                                                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white/80"
                                                    placeholder="5000"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                             {selectedNode.type === 'flow_collector' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Variable de Destino (Array)</label>
                                        <input 
                                            value={selectedNode.data.target_variable || ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, { target_variable: e.target.value })}
                                            className="w-full h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 text-xs text-indigo-400 font-bold"
                                            placeholder="unified_data"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Campos a Unificar (Separados por coma)</label>
                                        <textarea 
                                            value={selectedNode.data.fields?.join(", ") || ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, { fields: e.target.value.split(",").map(f => f.trim()).filter(f => f !== "") })}
                                            className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/80"
                                            placeholder="nombre, email, presupuesto, fuente"
                                        />
                                        <p className="text-[8px] text-white/20 italic">Estos campos se empaquetarán en un objeto JSON dentro del array final.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-8 border-t border-white/5">
                             <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                 <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1 italic">Recordatorio</p>
                                 <p className="text-[10px] text-white/40 leading-relaxed font-bold">Los cambios en las propiedades se aplican instantáneamente al nodo en el canvas.</p>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ToolButton({ onClick, icon: Icon, label, color }: { onClick: () => void; icon: any; label: string; color: string }) {
    return (
        <button 
            onClick={onClick} 
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 group transition-all"
        >
             <div className="flex items-center gap-3">
                 <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all shadow-lg", color)}>
                     <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                 </div>
                 <span className="text-[11px] font-black uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">{label}</span>
             </div>
             <ChevronRight className="h-3 w-3 text-white/10 group-hover:text-white/30 transition-all" />
        </button>
    );
}
