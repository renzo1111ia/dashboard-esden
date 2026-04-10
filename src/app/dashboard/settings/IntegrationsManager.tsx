"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, Key, Phone, Mic, PhoneCall, Zap, Cpu } from "lucide-react";

interface IntegrationsManagerProps {
    config: Record<string, any>;
    onChange: (newConfig: Record<string, any>) => void;
}

export function IntegrationsManager({ config, onChange }: IntegrationsManagerProps) {
    // ── WhatsApp Config ──
    const whatsapp = config?.whatsapp || {
        accessToken: "",
        phoneNumberId: "",
        wabaId: "",
        verifyToken: ""
    };

    // ── Retell AI Config ──
    const retell = config?.retell || {
        apiKey: "",
        agentId: ""
    };

    // ── Ultravox AI Config ──
    const ultravox = config?.ultravox || {
        apiKey: ""
    };

    const updateField = (category: string, fields: Record<string, any>) => {
        onChange({
            ...config,
            [category]: { ...(config[category] || {}), ...fields }
        });
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* ── SECTION: RETELL AI ── */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                        <PhoneCall className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Retell AI Integration</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Motor de Voz Conversacional de Baja Latencia</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
                            <Key className="h-3 w-3" /> API Key
                        </Label>
                        <Input 
                            value={retell.apiKey}
                            onChange={(e) => updateField('retell', { apiKey: e.target.value })}
                            type="password"
                            placeholder="key_..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
                            <Cpu className="h-3 w-3" /> Default Agent ID
                        </Label>
                        <Input 
                            value={retell.agentId}
                            onChange={(e) => updateField('retell', { agentId: e.target.value })}
                            placeholder="agent_..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* ── SECTION: ULTRAVOX AI ── */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                        <Mic className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Ultravox AI Integration</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Web-native Realtime Voice Inference</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
                            <Key className="h-3 w-3" /> API Key
                        </Label>
                        <Input 
                            value={ultravox.apiKey}
                            onChange={(e) => updateField('ultravox', { apiKey: e.target.value })}
                            type="password"
                            placeholder="Ultravox API Secret"
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* ── SECTION: WHATSAPP ── */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Meta API (WhatsApp Cloud)</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Configuraciones de mensajería empresarial</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Key className="h-3 w-3" /> Access Token (Permanent)
                        </Label>
                        <Input 
                            value={whatsapp.accessToken}
                            onChange={(e) => updateField('whatsapp', { accessToken: e.target.value })}
                            type="password"
                            placeholder="EAAB..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Phone className="h-3 w-3" /> Phone Number ID
                        </Label>
                        <Input 
                            value={whatsapp.phoneNumberId}
                            onChange={(e) => updateField('whatsapp', { phoneNumberId: e.target.value })}
                            placeholder="1234..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" /> WABA ID
                        </Label>
                        <Input 
                            value={whatsapp.wabaId}
                            onChange={(e) => updateField('whatsapp', { wabaId: e.target.value })}
                            placeholder="WABA ID"
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start text-left">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <Zap className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Orquestación Multi-Agente</h4>
                    <p className="text-[11px] text-blue-700/70 dark:text-blue-300/60 font-medium leading-relaxed">
                        Estas credenciales permiten al orquestador central disparar llamadas y mensajes automáticos bajo la identidad de este cliente.
                    </p>
                </div>
            </div>
        </div>
    );
}
