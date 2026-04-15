import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, Key, Phone, Mic, PhoneCall, Zap, RefreshCw } from "lucide-react";
import { syncRetellResources } from "@/lib/actions/retell-sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IntegrationsManagerProps {
    config: Record<string, unknown>;
    onChange: (newConfig: Record<string, unknown>) => void;
}

export function IntegrationsManager({ config, onChange }: IntegrationsManagerProps) {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async (apiKey: string) => {
        if (!apiKey) {
            alert("Por favor, introduce una API Key antes de sincronizar.");
            return;
        }
        setIsSyncing(true);
        try {
            const res = await syncRetellResources(apiKey);
            if (res.success && res.data) {
                // Success feedback
            } else {
                alert(res.error || "Error al sincronizar con Retell");
            }
        } catch {
            alert("Fallo crítico en la conexión con Retell.");
        } finally {
            setIsSyncing(false);
        }
    };

    // ── WhatsApp Config ──
    const whatsapp = (config?.whatsapp as Record<string, unknown>) || {
        accessToken: "",
        phoneNumberId: "",
        wabaId: "",
        verifyToken: ""
    };

    // ── Retell AI Config ──
    const retell = (config?.retell as Record<string, unknown>) || {};
    const retellApiKey = (retell.api_key as string) || ""; 

    // ── Ultravox AI Config ──
    const ultravox = (config?.ultravox as Record<string, unknown>) || {};
    const ultravoxApiKey = (ultravox.api_key as string) || "";

    const updateField = (category: string, fields: Record<string, unknown>) => {
        const categoryData = { ...((config[category] as Record<string, unknown>) || {}), ...fields };
        
        // Forced cleanup of legacy keys for Retell
        if (category === 'retell') {
            delete categoryData.apiKey;
            delete categoryData.agentId;
        }

        // Standardization for Ultravox (handle migration from legacy apiKey if existing)
        if (category === 'ultravox' && categoryData.apiKey) {
            categoryData.api_key = categoryData.apiKey;
            delete categoryData.apiKey;
        }

        onChange({
            ...config,
            [category]: categoryData
        });
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* ── SECTION: RETELL AI ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Retell AI Integration</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Motor de Voz Conversacional de Baja Latencia</p>
                        </div>
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync(retellApiKey)}
                        disabled={isSyncing || !retellApiKey}
                        className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"
                    >
                        <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                        {isSyncing ? "Sincronizando..." : "Sincronizar Recursos"}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
                            <Key className="h-3 w-3" /> API Key
                        </Label>
                        <Input 
                            value={retellApiKey}
                            onChange={(e) => updateField('retell', { api_key: e.target.value })}
                            type="password"
                            placeholder="key_..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 space-y-2">
                    <p className="text-[10px] text-slate-500 font-medium italic">
                        * Sugerencia: La API Key de Retell permite que el sistema se comunique con tus agentes. La configuración específica de IDs y números se realiza ahora directamente en el módulo de **Agentes de Voz**.
                    </p>
                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">
                        RECUERDA PULSAR &quot;GUARDAR&quot; AL FINAL DEL PANEL PARA PERSISTIR LOS CAMBIOS.
                    </p>
                </div>
            </div>

            {/* ── SECTION: ULTRAVOX AI ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                            <Mic className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Ultravox AI Integration</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">Web-native Realtime Voice Inference</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
                            <Key className="h-3 w-3" /> API Key
                        </Label>
                        <Input 
                            value={ultravoxApiKey}
                            onChange={(e) => updateField('ultravox', { api_key: e.target.value })}
                            type="password"
                            placeholder="Ultravox API Secret"
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* ── SECTION: TELEPHONY (Multi-Provider) ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
                            <Phone className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Telephony Settings</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">External Voice Connectors (Outbound Streams)</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            Provider
                        </Label>
                        <select 
                            value={(config?.telephony as any)?.provider || "twilio"}
                            onChange={(e) => updateField('telephony', { provider: e.target.value })}
                            className="w-full h-11 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-bold"
                        >
                            <option value="twilio">Twilio (Recomendado)</option>
                            <option value="telnyx">Telnyx (Próximamente)</option>
                            <option value="plivo">Plivo (Próximamente)</option>
                        </select>
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                             Account SID / API Key
                        </Label>
                        <Input 
                            value={(config?.telephony as any)?.credentials?.accountSid || ""}
                            onChange={(e) => updateField('telephony', { credentials: { ...((config?.telephony as any)?.credentials || {}), accountSid: e.target.value } })}
                            placeholder="AC..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            Auth Token / API Secret
                        </Label>
                        <Input 
                            value={(config?.telephony as any)?.credentials?.authToken || ""}
                            onChange={(e) => updateField('telephony', { credentials: { ...((config?.telephony as any)?.credentials || {}), authToken: e.target.value } })}
                            type="password"
                            placeholder="••••••••"
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                             Default From Number
                        </Label>
                        <Input 
                            value={(config?.telephony as any)?.credentials?.fromNumber || ""}
                            onChange={(e) => updateField('telephony', { credentials: { ...((config?.telephony as any)?.credentials || {}), fromNumber: e.target.value } })}
                            placeholder="+1..."
                            className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                        />
                    </div>
                </div>
            </div>
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
