"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    setTenantCookies
} from "@/lib/actions/tenant";
import { useTenantStore } from "@/store/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Check, X, Shield, Settings as SettingsIcon, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tenant, KpiConfig } from "@/types/tenant";
import { KpiBuilder } from "./KpiBuilder";

export default function SettingsPage() {
    const router = useRouter();
    const { tenantName: activeTenantName, setTenant: setActiveTenant } = useTenantStore();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null); // ID of tenant being edited
    const [editForm, setEditForm] = useState<Partial<Tenant>>({ name: "", supabase_url: "", supabase_anon_key: "", config: {} });
    const [showNewForm, setShowNewForm] = useState(false);

    useEffect(() => {
        loadTenants();
    }, []);

    async function loadTenants() {
        setLoading(true);
        const data = await getTenants();
        setTenants(data);
        setLoading(false);
    }

    async function handleSaveNew(e: React.FormEvent) {
        e.preventDefault();
        try {
            const configObj = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : editForm.config;
            await createTenant({ ...editForm, config: configObj });
            setShowNewForm(false);
            setEditForm({ name: "", supabase_url: "", supabase_anon_key: "", config: {} });
            loadTenants();
        } catch (err: any) {
            alert("Error al crear cliente: " + err.message);
        }
    }

    async function handleUpdate(id: string) {
        try {
            const configObj = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : editForm.config;
            await updateTenant(id, { ...editForm, config: configObj });
            setIsEditing(null);
            loadTenants();

            // Si el cliente editado es el activo, actualizar el store
            if (activeTenantName === editForm.name) {
                setActiveTenant({
                    supabaseUrl: editForm.supabase_url || "",
                    supabaseAnonKey: editForm.supabase_anon_key || "",
                    tenantName: editForm.name,
                    config: configObj
                });
            }
        } catch (err: any) {
            alert("Error al actualizar cliente: " + err.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Estás seguro de eliminar este cliente?")) return;
        try {
            await deleteTenant(id);
            loadTenants();
        } catch (err: any) {
            alert("Error al eliminar cliente: " + err.message);
        }
    }

    function startEdit(t: Tenant) {
        setIsEditing(t.id);
        setEditForm({
            name: t.name,
            supabase_url: t.supabase_url,
            supabase_anon_key: t.supabase_anon_key,
            config: JSON.stringify(t.config, null, 2) as unknown as Record<string, unknown>
        });
    }

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Administración de Clientes</h1>
                <p className="mt-2 text-base font-medium text-slate-500">
                    Gestiona los entornos de Supabase y configuraciones personalizadas para cada cliente.
                </p>
            </div>

            {/* Clients List */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-700 uppercase tracking-widest text-[11px]">Clientes Activos</h2>
                    {!showNewForm && (
                        <Button
                            onClick={() => {
                                setShowNewForm(true);
                                setEditForm({ name: "", supabase_url: "", supabase_anon_key: "", config: {} });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {loading && <div className="text-slate-400 font-bold animate-pulse">Cargando infraestructura...</div>}

                    {!loading && tenants.length === 0 && !showNewForm && (
                        <div className="rounded-3xl border border-dashed border-slate-200 p-20 text-center bg-white shadow-sm">
                            <Globe className="mx-auto h-16 w-16 text-slate-100 mb-6" />
                            <p className="text-slate-400 font-bold">No se han detectado clientes configurados.</p>
                        </div>
                    )}

                    {/* New Tenant Form */}
                    {showNewForm && (
                        <form onSubmit={handleSaveNew} className="rounded-3xl border border-blue-100 bg-blue-50/30 p-8 space-y-6 animate-in fade-in zoom-in duration-300 shadow-xl shadow-blue-100/50">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Configurar Nuevo Entorno</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowNewForm(false)}
                                    className="h-8 w-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-red-500 shadow-sm transition-all"
                                    aria-label="Cerrar"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Nombre del Proyecto</Label>
                                    <Input
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="h-12 bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-blue-100"
                                        placeholder="Ej: ESDEN México"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Supabase API URL</Label>
                                    <Input
                                        value={editForm.supabase_url}
                                        onChange={e => setEditForm({ ...editForm, supabase_url: e.target.value })}
                                        className="h-12 bg-white border-slate-200 text-slate-900 font-mono text-xs rounded-xl focus:ring-blue-100"
                                        placeholder="https://xxx.supabase.co"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Supabase Service Role / Anon Key</Label>
                                    <Input
                                        value={editForm.supabase_anon_key}
                                        onChange={e => setEditForm({ ...editForm, supabase_anon_key: e.target.value })}
                                        className="h-12 bg-white border-slate-200 text-slate-900 font-mono text-xs rounded-xl focus:ring-blue-100"
                                        placeholder="Acceso de solo lectura o administrador"
                                        type="password"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Título del Dashboard</Label>
                                            <Input
                                                value={(() => {
                                                    try {
                                                        const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                        return conf.dashboard_title || "";
                                                    } catch (e) { return ""; }
                                                })()}
                                                onChange={e => {
                                                    try {
                                                        const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                        conf.dashboard_title = e.target.value;
                                                        setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any });
                                                    } catch (e) { }
                                                }}
                                                className="h-11 bg-white border-slate-200 text-slate-900 rounded-xl"
                                                placeholder="Ej: Esden Global"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Encabezados Extra (Separados por coma)</Label>
                                            <Input
                                                value={(() => {
                                                    try {
                                                        const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                        return (conf.headers || []).join(", ");
                                                    } catch (e) { return ""; }
                                                })()}
                                                onChange={e => {
                                                    try {
                                                        const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                        conf.headers = e.target.value.split(",").map(s => s.trim()).filter(s => s !== "");
                                                        setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any });
                                                    } catch (e) { }
                                                }}
                                                className="h-11 bg-white border-slate-200 text-slate-900 rounded-xl"
                                                placeholder="Ej: Ventas, Marketing"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                                        <KpiBuilder
                                            kpis={(typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}").kpis : (editForm.config as any)?.kpis) || []}
                                            onChange={(kpis) => {
                                                try {
                                                    const current = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : (editForm.config || {});
                                                    current.kpis = kpis;
                                                    setEditForm({ ...editForm, config: JSON.stringify(current, null, 2) as unknown as Record<string, unknown> });
                                                } catch (e) { }
                                            }}
                                        />

                                        <details className="mt-8 border-t border-slate-100 pt-6">
                                            <summary className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors">Configuración Avanzada (JSON Raw)</summary>
                                            <div className="mt-4">
                                                <textarea
                                                    title="Configuracion JSON"
                                                    value={typeof editForm.config === 'string' ? editForm.config : JSON.stringify(editForm.config, null, 2)}
                                                    onChange={e => setEditForm({ ...editForm, config: e.target.value as unknown as Record<string, unknown> })}
                                                    className="w-full min-h-[120px] rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-700 font-mono focus:border-blue-500 outline-none"
                                                    placeholder='{ "headers": [], "dashboard_title": "" }'
                                                />
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" className="h-12 px-8 bg-blue-600 font-black text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all">Desplegar Cliente</Button>
                                <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="h-12 text-slate-400 font-bold rounded-xl hover:bg-slate-100">Descartar</Button>
                            </div>
                        </form>
                    )}

                    {tenants.map(t => (
                        <div key={t.id} className={cn(
                            "group rounded-3xl border transition-all duration-300 overflow-hidden",
                            isEditing === t.id
                                ? "border-blue-400 bg-blue-50/50 shadow-2xl shadow-blue-200/50"
                                : "border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50"
                        )}>
                            {isEditing === t.id ? (
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</Label>
                                            <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-11 bg-white border-slate-200 text-slate-900 rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">URL de Conexión</Label>
                                            <Input value={editForm.supabase_url} onChange={e => setEditForm({ ...editForm, supabase_url: e.target.value })} className="h-11 bg-white border-slate-200 text-slate-900 text-xs font-mono rounded-xl" />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Credenciales</Label>
                                            <Input value={editForm.supabase_anon_key} onChange={e => setEditForm({ ...editForm, supabase_anon_key: e.target.value })} className="h-11 bg-white border-slate-200 text-slate-900 text-xs font-mono rounded-xl" type="password" />
                                        </div>
                                        <div className="md:col-span-2 space-y-4 pt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título del Dashboard</Label>
                                                    <Input
                                                        value={(() => {
                                                            try {
                                                                const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                                return conf.dashboard_title || "";
                                                            } catch (e) { return ""; }
                                                        })()}
                                                        onChange={e => {
                                                            try {
                                                                const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                                conf.dashboard_title = e.target.value;
                                                                setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any });
                                                            } catch (e) { }
                                                        }}
                                                        className="h-10 bg-white border-slate-200 text-slate-900 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Encabezados Tabla (Comas)</Label>
                                                    <Input
                                                        value={(() => {
                                                            try {
                                                                const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                                return (conf.headers || []).join(", ");
                                                            } catch (e) { return ""; }
                                                        })()}
                                                        onChange={e => {
                                                            try {
                                                                const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {});
                                                                conf.headers = e.target.value.split(",").map(s => s.trim()).filter(s => s !== "");
                                                                setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any });
                                                            } catch (e) { }
                                                        }}
                                                        className="h-10 bg-white border-slate-200 text-slate-900 rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                                                <KpiBuilder
                                                    kpis={(typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}").kpis : (editForm.config as any)?.kpis) || []}
                                                    onChange={(kpis) => {
                                                        try {
                                                            const current = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : (editForm.config || {});
                                                            current.kpis = kpis;
                                                            setEditForm({ ...editForm, config: JSON.stringify(current, null, 2) as unknown as Record<string, unknown> });
                                                        } catch (e) { }
                                                    }}
                                                />
                                                <details className="mt-8 border-t border-slate-100 pt-6">
                                                    <summary className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600">Configuración Avanzada (JSON)</summary>
                                                    <div className="mt-4">
                                                        <textarea
                                                            title="Configuracion JSON"
                                                            value={typeof editForm.config === 'string' ? editForm.config : JSON.stringify(editForm.config, null, 2)}
                                                            onChange={e => setEditForm({ ...editForm, config: e.target.value as unknown as Record<string, unknown> })}
                                                            className="w-full min-h-[120px] rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-700 font-mono focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </details>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button onClick={() => handleUpdate(t.id)} className="h-11 px-6 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
                                            <Check className="mr-2 h-4 w-4" /> Sincronizar Cambios
                                        </Button>
                                        <Button onClick={() => setIsEditing(null)} variant="ghost" className="h-11 text-slate-400 font-bold hover:bg-slate-100 rounded-xl">
                                            <X className="mr-2 h-4 w-4" /> Abortar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6 p-6">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                        <Building2 className="h-7 w-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{t.name}</h3>
                                        <p className="text-xs text-slate-400 truncate font-mono mt-0.5">{t.supabase_url}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startEdit(t)}
                                            className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Editar parámetros"
                                        >
                                            <Edit2 className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Eliminar instancia"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Security/Info Alert */}
            <div className="rounded-3xl bg-blue-600 p-8 flex items-center gap-6 shadow-2xl shadow-blue-200 overflow-hidden relative">
                <div className="absolute right-0 top-0 h-full w-48 bg-white/5 skew-x-[-20deg] translate-x-12" />
                <Shield className="h-10 w-10 text-blue-100 relative z-10" />
                <div className="space-y-1 relative z-10">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Protocolo de Seguridad</h4>
                    <p className="text-sm font-medium text-blue-50 leading-relaxed max-w-2xl">
                        Cada entorno cargado aquí utiliza un túnel seguro hacia Supabase.
                        Los administradores registrados en el sistema central son los únicos con privilegios para modificar estos nodos.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Building2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M12 6h.01" />
            <path d="M12 10h.01" />
            <path d="M12 14h.01" />
            <path d="M16 10h.01" />
            <path d="M16 14h.01" />
            <path d="M8 10h.01" />
            <path d="M8 14h.01" />
        </svg>
    );
}
