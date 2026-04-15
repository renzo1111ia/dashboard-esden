"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, X, Zap, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { syncRetellResources } from "@/lib/actions/retell-sync";
import { updateTenantConfig } from "@/lib/actions/tenant";
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentApiKey: string;
    tenantId: string;  // passed directly — don't rely on store which may not be initialized
    onSuccess: (newKey: string) => void;
}

export function RetellConfigModal({ isOpen, onClose, currentApiKey, tenantId, onSuccess }: Props) {
    const [apiKey, setApiKey] = useState(currentApiKey);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleTestConnection = async () => {
        if (!apiKey) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await syncRetellResources(apiKey);
            if (res.success) {
                setTestResult({ success: true, message: "Conexión exitosa. Se detectaron agentes y números." });
            } else {
                setTestResult({ success: false, message: res.error || "Error de autenticación." });
            }
        } catch {
            setTestResult({ success: false, message: "Fallo al conectar con la API de Retell." });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!tenantId) {
            alert("Error: No se encontró el ID del cliente activo. Asegúrate de haber iniciado sesión y seleccionado un cliente.");
            console.error("[RetellConfigModal] tenantId is empty — cannot save API key.");
            return;
        }
        if (!apiKey.trim()) {
            alert("Ingresa un API Key válido antes de guardar.");
            return;
        }
        setIsSaving(true);
        try {
            const res = await updateTenantConfig(tenantId, {
                retell: { api_key: apiKey.trim() }
            });

            if (res.success) {
                onSuccess(apiKey.trim());
                onClose();
            } else {
                alert("Error al guardar: " + res.error);
                console.error("[RetellConfigModal] updateTenantConfig error:", res.error);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido";
            alert("Error crítico al guardar la configuración: " + message);
            console.error("[RetellConfigModal] critical error:", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 text-left">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl space-y-6 overflow-hidden"
                    >
                        {/* Background Ornament */}
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Zap className="h-32 w-32 text-purple-500" />
                        </div>

                        <div className="space-y-2 relative">
                            <div className="h-12 w-12 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center mb-4">
                                <Key className="h-6 w-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Configurar Retell AI</h3>
                            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Establece tu API Key global para este cliente.</p>
                        </div>

                        <div className="space-y-4 relative">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Retell API Key</label>
                                {!tenantId && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                        <span className="text-[9px] font-bold">No se detectó cliente activo. Selecciona un cliente primero.</span>
                                    </div>
                                )}
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-mono focus:border-purple-500/40 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-white"
                                        placeholder="key_........"
                                    />
                                    {apiKey && (
                                        <button 
                                            onClick={handleTestConnection}
                                            disabled={isTesting}
                                            className="absolute right-3 top-3 h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                                        >
                                            {isTesting ? <RefreshCw className="h-3 w-3 animate-spin"/> : <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                                            Probar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {testResult && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    className={cn(
                                        "p-3 rounded-xl border text-[10px] font-bold flex items-center gap-2",
                                        testResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}
                                >
                                    {testResult.message}
                                </motion.div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2 relative">
                            <button 
                                onClick={onClose}
                                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !apiKey}
                                className="flex-[2] h-12 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Guardando..." : "Guardar y Conectar"}
                            </button>
                        </div>

                        <button 
                            onClick={onClose}
                            title="Cerrar modal"
                            className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

