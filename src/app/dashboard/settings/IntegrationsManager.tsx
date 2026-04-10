"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, Key, Phone, Link2 } from "lucide-react";

interface IntegrationsManagerProps {
    config: any;
    onChange: (newConfig: any) => void;
}

export function IntegrationsManager({ config, onChange }: IntegrationsManagerProps) {
    const whatsapp = config?.whatsapp || {
        accessToken: "",
        phoneNumberId: "",
        wabaId: "",
        verifyToken: ""
    };

    const updateWhatsapp = (fields: Partial<typeof whatsapp>) => {
        onChange({
            ...config,
            whatsapp: { ...whatsapp, ...fields }
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Meta API (WhatsApp Cloud)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuraciones de mensajería empresarial</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Key className="h-3 w-3" /> Access Token (Permanent)
                    </Label>
                    <Input 
                        value={whatsapp.accessToken}
                        onChange={(e) => updateWhatsapp({ accessToken: e.target.value })}
                        type="password"
                        placeholder="EAAB..."
                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl font-mono text-xs focus:ring-emerald-500/20"
                    />
                    <p className="text-[9px] text-slate-400 italic">Genera un Token de Acceso Permanente en el portal de Meta for Developers.</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Phone className="h-3 w-3" /> Phone Number ID
                    </Label>
                    <Input 
                        value={whatsapp.phoneNumberId}
                        onChange={(e) => updateWhatsapp({ phoneNumberId: e.target.value })}
                        placeholder="123456789..."
                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> WABA ID
                    </Label>
                    <Input 
                        value={whatsapp.wabaId}
                        onChange={(e) => updateWhatsapp({ wabaId: e.target.value })}
                        placeholder="WhatsApp Business Account ID"
                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Link2 className="h-3 w-3" /> Webhook Verify Token (Opcional)
                    </Label>
                    <Input 
                        value={whatsapp.verifyToken}
                        onChange={(e) => updateWhatsapp({ verifyToken: e.target.value })}
                        placeholder="Token para validar Webhooks"
                        className="h-11 bg-slate-50/50 border-slate-200 rounded-xl text-sm"
                    />
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex gap-4 items-start">
                <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Seguridad de Conectividad</h4>
                    <p className="text-[11px] text-blue-700/70 font-medium leading-relaxed">
                        Es recomendable usar un **Token de Sistema Permanente**. Si usas un Token Temporal, las automatizaciones dejarán de funcionar tras 24 horas.
                    </p>
                </div>
            </div>
        </div>
    );
}
