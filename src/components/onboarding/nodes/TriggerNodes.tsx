"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
    Zap, Clock, Phone, MessageSquare, 
    BrainCircuit, Globe, GitBranchPlus 
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { cn } from "@/lib/utils";

/**
 * LEAD TRIGGER NODE
 */
export const LeadTriggerNode = memo(({ data, selected }: any) => {
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
export const ActionNode = memo(({ data, selected }: any) => {
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
export const LLMNode = memo(({ data, selected }: any) => {
    return (
      <BaseNode label="Agente de Texto" icon={<BrainCircuit className="h-4 w-4" />} colorClass="bg-purple-500" selected={selected}>
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-white border border-purple-500" />
        <div className="space-y-2">
          <p className="font-bold text-white/90">Razonamiento AI</p>
          <p className="text-[10px] opacity-50 line-clamp-2 italic">"{data.config?.prompt || "Analizar intención del lead..."}"</p>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-white border border-purple-500" />
      </BaseNode>
    );
});

/**
 * API REQUEST NODE (Integrations)
 */
export const APINode = memo(({ data, selected }: any) => {
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
export const SubWorkflowNode = memo(({ data, selected }: any) => {
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
export const DelayNode = memo(({ data, selected }: any) => {
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

LeadTriggerNode.displayName = 'LeadTriggerNode';
ActionNode.displayName = 'ActionNode';
LLMNode.displayName = 'LLMNode';
APINode.displayName = 'APINode';
SubWorkflowNode.displayName = 'SubWorkflowNode';
DelayNode.displayName = 'DelayNode';
