"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantStore } from "@/store/tenant";
import { setTenantCookies } from "@/lib/actions/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
    const router = useRouter();
    const { supabaseUrl, supabaseAnonKey, tenantName, isConfigured, setTenant, clearTenant } =
        useTenantStore();

    const [url, setUrl] = useState(supabaseUrl);
    const [key, setKey] = useState(supabaseAnonKey);
    const [name, setName] = useState(tenantName);
    const [saved, setSaved] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setTenant({ supabaseUrl: url, supabaseAnonKey: key, tenantName: name });
        await setTenantCookies(url, key);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
    }

    async function handleClear() {
        clearTenant();
        await setTenantCookies("", "");
        setUrl("");
        setKey("");
        setName("");
        router.refresh();
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <div>
                <h2 className="text-lg font-semibold text-white">Configuración de Conexión</h2>
                <p className="mt-1 text-sm text-white/40">
                    Ingresa las credenciales de tu proyecto Supabase. Las credenciales se almacenan en
                    sessionStorage y se eliminan al cerrar el navegador.
                </p>
            </div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isConfigured
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-white/[0.06] text-white/40 border border-white/10"
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConfigured ? "bg-emerald-400" : "bg-white/30"}`} />
                {isConfigured ? `Conectado — ${tenantName || "Proyecto personalizado"}` : "Sin configurar (usando credenciales por defecto)"}
            </div>

            <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="space-y-2">
                    <Label htmlFor="tenant-name" className="text-xs uppercase tracking-wider text-white/60">
                        Nombre del cliente / proyecto
                    </Label>
                    <Input
                        id="tenant-name"
                        placeholder="Ej: ESDEN - Bot Ventas Q1"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sb-url" className="text-xs uppercase tracking-wider text-white/60">
                        Supabase URL
                    </Label>
                    <Input
                        id="sb-url"
                        placeholder="https://xxxx.supabase.co"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="border-white/10 bg-white/5 font-mono text-sm text-white placeholder:text-white/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sb-key" className="text-xs uppercase tracking-wider text-white/60">
                        Supabase Anon Key
                    </Label>
                    <Input
                        id="sb-key"
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="border-white/10 bg-white/5 font-mono text-sm text-white placeholder:text-white/20"
                    />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button
                        type="submit"
                        className="bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                        {saved ? "✓ Guardado" : "Guardar conexión"}
                    </Button>
                    {isConfigured && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                            className="text-white/40 hover:text-red-400"
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </form>

            <p className="text-xs text-white/25">
                ⚠️ Nunca compartas tu Anon Key públicamente. Esta configuración es solo visible en tu sesión activa.
            </p>
        </div>
    );
}
