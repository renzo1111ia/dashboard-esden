"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
    Zap, Clock, Phone, MessageSquare, 
    BrainCircuit, Globe, GitBranchPlus, Webhook, 
    Reply, Hourglass 
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { cn } from "@/lib/utils";

interface NodeProps {
    data: any;
    selected?: boolean;
}

/**
 * LEAD TRIGGER NODE
 */
export const LeadTriggerNode = memo(({ data, selected }: NodeProps) => {
  return (
    <BaseNode label="Disparador Lead" icon={<Zap className="h-4 w-4" />} colorClass="bg-orange-500" selected={selected}>
      <div className="flex flex-col gap-2">
        <p className="opacity-80 leading-relaxed font-bold">Ingesta vía Webhook</p>
        <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] break-all">
          /api/webhooks/crm
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500 border-2 border-white" />
    </BaseNode>
  );
});

/**
 * ACTION NODE (Voz/WA)
 */
export const ActionNode = memo(({ data, selected }: NodeProps) => {
    const isCall = data.action === 'CALL';
    return (
      <BaseNode 
        label={isCall ? "Llamada Retell" : "WhatsApp Proactivo"} 
        icon={isCall ? <Phone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />} 
        colorClass={isCall ? "bg-blue-500" : "bg-emerald-500"} 
        selected={selected}
      >
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-blue-500" />
        <div className="space-y-2">
          <p className="font-bold text-white/90 truncate">{data.config?.agentId || data.config?.templateId || "Sin Configurar"}</p>
          <div className="text-[10px] opacity-40 italic">Target: {isCall ? "Voice AI Agent" : "Meta Template v1"}</div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-blue-500" />
      </BaseNode>
    );
});

/**
 * LLM AGENT NODE (AI Logic)
 */
export const LLMNode = memo(({ data, selected }: NodeProps) => {
    return (
      <BaseNode label="Agente de Texto" icon={<BrainCircuit className="h-4 w-4" />} colorClass="bg-purple-500" selected={selected}>
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-purple-500" />
        <div className="space-y-2">
          <p className="font-bold text-white/90">Razonamiento AI</p>
          <p className="text-[10px] opacity-50 line-clamp-2 italic">
            &quot;{data.config?.prompt || "Analizar intención del lead..."}&quot;
          </p>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-purple-500" />
      </BaseNode>
    );
});

/**
 * API REQUEST NODE (Integrations)
 */
export const APINode = memo(({ data, selected }: NodeProps) => {
    return (
      <BaseNode label="Petición API" icon={<Globe className="h-4 w-4" />} colorClass="bg-cyan-500" selected={selected}>
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-cyan-500" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold text-[9px] uppercase">POST</span>
            <p className="font-mono text-[10px] truncate">{data.config?.url || "https://api.crm.com/v1"}</p>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-cyan-500" />
      </BaseNode>
    );
});

/**
 * SUB-WORKFLOW TRIGGER
 */
export const SubWorkflowNode = memo(({ data, selected }: NodeProps) => {
    return (
      <BaseNode label="Vincular Flujo" icon={<GitBranchPlus className="h-4 w-4" />} colorClass="bg-pink-500" selected={selected}>
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-pink-500" />
        <div className="space-y-2">
          <p className="font-bold text-white/90">Disparar Sub-Workflow</p>
          <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-[9px] font-black text-pink-400 uppercase tracking-widest">
            {data.config?.targetWorkflowId || "SELECCIONAR FLUJO"}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-pink-500" />
      </BaseNode>
    );
});

/**
 * DELAY NODE
 */
export const DelayNode = memo(({ data, selected }: NodeProps) => {
    return (
      <BaseNode label="Espera" icon={<Clock className="h-4 w-4" />} colorClass="bg-amber-500" selected={selected}>
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-amber-500" />
        <div className="flex items-center justify-center py-2 h-12">
           <span className="text-2xl font-black tabular-nums">{data.config?.duration || 2}H</span>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-amber-500" />
      </BaseNode>
    );
});

/**
 * WEBHOOK TRIGGER/ENTRY NODE
 */
export const WebhookNode = memo(({ data, selected }: NodeProps) => {
    const method = data.config?.method || 'POST';
    return (
        <BaseNode 
            label="Webhook (Entrada)" 
            icon={<Webhook className="h-4 w-4" />} 
            colorClass="bg-orange-600" 
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        method === 'GET' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                    )}>
                        {method}
                    </span>
                    <p className="font-mono text-[9px] truncate opacity-60">/{data.config?.path || 'webhook'}</p>
                </div>
                <div className="p-1 px-2 rounded-md bg-black/40 border border-white/5 font-mono text-[8px] truncate text-white/40 italic">
                   Configura la URL en el panel
                </div>
            </div>
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-orange-600 opacity-20" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-orange-600" />
        </BaseNode>
    );
});

/**
 * WEBHOOK RESPONSE NODE
 * Sends data back to the calling webhook.
 */
export const WebhookResponseNode = memo(({ data, selected }: NodeProps) => {
    return (
        <BaseNode 
            label="Respuesta Webhook" 
            icon={<Reply className="h-4 w-4" />} 
            colorClass="bg-indigo-600" 
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold text-[9px]">
                        HTTP {data.config?.statusCode || 200}
                    </span>
                    <p className="text-[9px] font-mono opacity-50 truncate">JSON Response</p>
                </div>
            </div>
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-indigo-600" />
        </BaseNode>
    );
});

/**
 * WEBHOOK WAIT / CALLBACK NODE
 * Pauses workflow and waits for external trigger.
 */
export const WebhookWaitNode = memo(({ data, selected }: NodeProps) => {
    return (
        <BaseNode 
            label="Espera Callback" 
            icon={<Hourglass className="h-4 w-4" />} 
            colorClass="bg-pink-600" 
            selected={selected}
        >
            <div className="space-y-2">
                <p className="text-[10px] font-bold opacity-80 leading-tight">Pausa hasta recibir señal</p>
                <div className="p-1 px-2 rounded bg-black/40 border border-pink-500/20 text-[8px] font-mono text-pink-400/80 italic">
                    URL dinámica generada
                </div>
            </div>
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-pink-600" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-pink-600" />
        </BaseNode>
    );
});

LeadTriggerNode.displayName = 'LeadTriggerNode';
ActionNode.displayName = 'ActionNode';
LLMNode.displayName = 'LLMNode';
APINode.displayName = 'APINode';
SubWorkflowNode.displayName = 'SubWorkflowNode';
DelayNode.displayName = 'DelayNode';
WebhookNode.displayName = 'WebhookNode';
WebhookResponseNode.displayName = 'WebhookResponseNode';
WebhookWaitNode.displayName = 'WebhookWaitNode';
