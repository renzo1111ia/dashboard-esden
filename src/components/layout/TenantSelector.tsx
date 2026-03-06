"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantStore } from "@/store/tenant";
import { setTenantCookies, getTenants } from "@/lib/actions/tenant";
import { cn } from "@/lib/utils";
import { ChevronDown, Building2, Check } from "lucide-react";
import { Tenant } from "@/types/tenant";

export function TenantSelector({ collapsed }: { collapsed: boolean }) {
    const router = useRouter();
    const { tenantName, setTenant } = useTenantStore();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTenants() {
            const data = await getTenants();
            setTenants(data);
            setLoading(false);
        }
        loadTenants();
    }, []);

    async function handleSelect(t: Tenant) {
        setTenant({
            supabaseUrl: t.supabase_url,
            supabaseAnonKey: t.supabase_anon_key,
            tenantName: t.name,
            config: t.config
        });
        await setTenantCookies(t.supabase_url, t.supabase_anon_key, t.name);
        setIsOpen(false);
        router.refresh();
    }

    if (collapsed) {
        return (
            <div className="px-2 py-4 flex justify-center border-b border-white/[0.06]">
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                    <Building2 className="h-4 w-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative px-4 py-4 border-b border-white/[0.06]">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2 block">
                Cliente Activo
            </label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-left text-sm transition hover:bg-white/[0.08]"
            >
                <Building2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span className="flex-1 truncate text-white">
                    {tenantName || (loading ? "Cargando..." : "Seleccionar...")}
                </span>
                <ChevronDown className={cn("h-4 w-4 text-white/30 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute left-4 right-4 z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0c121e] p-1 shadow-2xl shadow-black/50 backdrop-blur-md">
                    {tenants.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleSelect(t)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5",
                                tenantName === t.name ? "text-indigo-400" : "text-white/70"
                            )}
                        >
                            <span className="flex-1 truncate">{t.name}</span>
                            {tenantName === t.name && <Check className="h-3 w-3" />}
                        </button>
                    ))}
                    {tenants.length === 0 && !loading && (
                        <div className="px-3 py-2 text-xs text-white/30 italic">No hay clientes configurados</div>
                    )}
                </div>
            )}
        </div>
    );
}
