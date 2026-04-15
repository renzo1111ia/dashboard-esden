"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  addEdge, 
  useNodesState, 
  useEdgesState,
  Connection,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { LeadTriggerNode, ActionNode, DelayNode, LLMNode, APINode, SubWorkflowNode, WebhookNode, WebhookResponseNode, WebhookWaitNode } from './nodes/TriggerNodes';
import { NodeConfigSidebar } from './NodeConfigSidebar';
import { 
    Save, Plus, Play, Trash2, 
    Phone, MessageSquare, BrainCircuit, 
    Globe, Clock, GitBranchPlus, Webhook, 
    Reply, Hourglass 
} from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * SEQUENCE CANVAS - COMFYUI STYLE
 * The nodal engine for SaaS v2.0 Automation.
 */

const nodeTypes = {
  leadTrigger: LeadTriggerNode,
  webhookTrigger: WebhookNode,
  action: ActionNode,
  delay: DelayNode,
  llm: LLMNode,
  api: APINode,
  subWorkflow: SubWorkflowNode,
  webhookResponse: WebhookResponseNode,
  webhookWait: WebhookWaitNode
};

const initialNodes: Node[] = [
  { 
    id: '1', 
    type: 'leadTrigger', 
    position: { x: 250, y: 50 }, 
    data: { label: 'Lead Ingest' } 
  },
  { 
    id: '2', 
    type: 'action', 
    position: { x: 250, y: 300 }, 
    data: { action: 'CALL', config: { agentId: 'retell-qualifier-v1' } } 
  },
  { 
    id: '3', 
    type: 'delay', 
    position: { x: 250, y: 550 }, 
    data: { config: { duration: 2 } } 
  },
  { 
    id: '4', 
    type: 'action', 
    position: { x: 250, y: 800 }, 
    data: { action: 'WHATSAPP', config: { templateId: 'welcome_template' } } 
  },
];

const initialEdges: Edge[] = [
  { 
    id: 'e1-2', 
    source: '1', 
    target: '2', 
    animated: true, 
    style: { stroke: '#3b82f6', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } 
  },
  { 
    id: 'e2-3', 
    source: '2', 
    target: '3', 
    style: { stroke: '#f59e0b', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } 
  },
  { 
    id: 'e3-4', 
    source: '3', 
    target: '4', 
    style: { stroke: '#10b981', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } 
  },
];

export function SequenceCanvas({ tenantId, workflowId }: { tenantId: string, workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const { setViewport } = useReactFlow();

  // Close menu when clicking outside
  useEffect(() => {
    if (!isAddMenuOpen) return;
    const handleClickOutside = () => setIsAddMenuOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isAddMenuOpen]);

  // 1. Fetch Existing Graph State for THIS Workflow
  useEffect(() => {
    async function loadGraph() {
        try {
            const res = await fetch(`/api/orchestration/graph?workflowId=${workflowId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.graph_data) {
                    setNodes(data.graph_data.nodes || []);
                    setEdges(data.graph_data.edges || []);
                    if (data.graph_data.viewport) {
                        setViewport(data.graph_data.viewport);
                    }
                } else {
                    // Reset to initial if blank
                    setNodes(initialNodes);
                    setEdges(initialEdges);
                }
            }
        } catch (error) {
            console.error("Failed to load graph:", error);
        }
    }
    if (workflowId) loadGraph();
  }, [workflowId, setNodes, setEdges, setViewport]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
        ...params, 
        animated: true, 
        style: { stroke: '#3b82f6', strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
    }, eds)),
    [setEdges]
  );

  const onPublish = async () => {
    setIsPublishing(true);
    try {
        const res = await fetch('/api/orchestration/publish', {
            method: 'POST',
            body: JSON.stringify({
                tenantId,
                workflowId,
                graphData: { nodes, edges }
            })
        });
        if (res.ok) {
            alert("Secuencia Publicada con Éxito");
        } else {
            console.error("Publish failed");
        }
    } catch (error) {
        console.error("Error publishing:", error);
    } finally {
        setIsPublishing(false);
    }
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onConfigSave = (newConfig: Record<string, unknown>) => {
    if (!selectedNode) return;
    setNodes((nds) => 
        nds.map((node) => 
            node.id === selectedNode.id 
                ? { ...node, data: { ...node.data, config: newConfig } } 
                : node
        )
    );
    setSelectedNode(null);
  };

  const addNode = (type: string, action?: string) => {
    const id = `${nodes.length + 1}`;
    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: type === 'action' ? (action === 'CALL' ? 'Llamada' : 'WhatsApp') 
             : (type === 'webhookTrigger' ? 'Webhook' 
             : (type === 'webhookResponse' ? 'Respuesta Webhook'
             : (type === 'webhookWait' ? 'Espera Callback'
             : type.toUpperCase()))),
        action,
        config: {} 
      }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
  };

  return (
    <div className="flex-1 h-full w-full relative group">
      {/* Canvas Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl opacity-40 hover:opacity-100 transition-all duration-500">
        <button 
            disabled={isPublishing}
            onClick={onPublish}
            title="Publicar secuencia"
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-primary/20",
                isPublishing && "opacity-50 cursor-not-allowed"
            )}
        >
          <Save className={cn("h-4 w-4", isPublishing && "animate-spin")} />
          {isPublishing ? "Publicando..." : "Publicar Secuencia"}
        </button>
        <div className="h-4 w-px bg-white/10 mx-2" />
        <div className="relative">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsAddMenuOpen(!isAddMenuOpen);
                }}
                className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    isAddMenuOpen ? "bg-primary text-primary-foreground" : "hover:bg-white/5 text-white/60 hover:text-white"
                )} 
                title="Añadir Nódulo"
            >
                <Plus className="h-5 w-5" />
            </button>
            <div 
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "absolute top-full left-0 mt-2 w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl transition-all z-[100] origin-top-left text-left",
                    isAddMenuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                )}
            >
                <p className="px-3 py-2 text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 mb-1">Acciones</p>
                <button onClick={() => { addNode('action', 'CALL'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-500/20 text-xs font-bold text-white/60 hover:text-blue-400 transition-colors">
                    <Phone className="h-4 w-4" /> Llamada Retell
                </button>
                <button onClick={() => { addNode('action', 'WHATSAPP'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-500/20 text-xs font-bold text-white/60 hover:text-emerald-400 transition-colors">
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                </button>
                <p className="px-3 py-2 text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 my-1">Disparadores / Integración</p>
                <button onClick={() => { addNode('webhookTrigger'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orange-500/20 text-xs font-bold text-white/60 hover:text-orange-400 transition-colors">
                    <Webhook className="h-4 w-4" /> Webhook (Entrada)
                </button>
                <button onClick={() => { addNode('webhookResponse'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-500/20 text-xs font-bold text-white/60 hover:text-indigo-400 transition-colors">
                    <Reply className="h-4 w-4" /> Webhook (Respuesta)
                </button>
                <button onClick={() => { addNode('webhookWait'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-500/20 text-xs font-bold text-white/60 hover:text-pink-400 transition-colors">
                    <Hourglass className="h-4 w-4" /> Webhook (Espera)
                </button>
                <button onClick={() => { addNode('api'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-xs font-bold text-white/60 hover:text-cyan-400 transition-colors">
                    <Globe className="h-4 w-4" /> Petición API / Salida
                </button>
                <p className="px-3 py-2 text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 my-1">Inteligencia</p>
                <button onClick={() => { addNode('llm'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-500/20 text-xs font-bold text-white/60 hover:text-purple-400 transition-colors">
                    <BrainCircuit className="h-4 w-4" /> Agente de Texto
                </button>
                <p className="px-3 py-2 text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 my-1">Control</p>
                <button onClick={() => { addNode('delay'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-500/20 text-xs font-bold text-white/60 hover:text-amber-400 transition-colors">
                    <Clock className="h-4 w-4" /> Espera (Wait)
                </button>
                <button onClick={() => { addNode('subWorkflow'); setIsAddMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-500/20 text-xs font-bold text-white/60 hover:text-pink-400 transition-colors">
                    <GitBranchPlus className="h-4 w-4" /> Sub-Workflow
                </button>
            </div>
        </div>
        <button 
            onClick={deleteNode}
            className="p-2.5 rounded-xl hover:bg-red-500/10 text-white/60 hover:text-red-500 transition-colors" 
            title="Eliminar Selección"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <div className="h-4 w-px bg-white/10 mx-2" />
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold hover:bg-emerald-500/20 transition-all" title="Depurar flujo">
          <Play className="h-4 w-4" />
          Depurar
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        className="bg-[#0a0a0a]"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={30} 
          size={1.5} 
          color="#333" 
          className="opacity-40"
        />
        <Controls 
           className="bg-black/60 border border-white/10 rounded-xl overflow-hidden fill-white" 
           showInteractive={false}
        />
        <MiniMap 
          className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl" 
          nodeColor={(n: Node) => {
             if (n.type === 'leadTrigger') return '#f97316';
             if (n.type === 'webhookTrigger') return '#ea580c';
             if (n.type === 'action') return '#3b82f6';
             if (n.type === 'delay') return '#f59e0b';
             if (n.type === 'llm') return '#a855f7';
             if (n.type === 'api') return '#06b6d4';
             if (n.type === 'subWorkflow') return '#ec4899';
             return '#fff';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>

      {/* Node Configuration Sidebar */}
      {selectedNode && (
          <NodeConfigSidebar 
            key={selectedNode.id}
            node={selectedNode}
            workflowId={workflowId}
            onSave={onConfigSave}
            onClose={() => setSelectedNode(null)}
          />
      )}

      {/* Decorative Overlays */}
      <div className="absolute bottom-6 right-6 z-50 pointer-events-none text-right">
        <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-md border border-white/5 space-y-2">
           <p className="text-[10px] font-black tracking-widest text-white/20 uppercase">Core Status</p>
           <h4 className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine V2.0 Operational
           </h4>
        </div>
      </div>
    </div>
  );
}
