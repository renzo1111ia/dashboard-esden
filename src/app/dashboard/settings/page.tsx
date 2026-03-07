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
import { Plus, Trash2, Edit2, Check, X, Shield, Settings as SettingsIcon, Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tenant, KpiConfig } from "@/types/tenant";
import { KpiBuilder } from "./KpiBuilder";

export default function SettingsPage() {
    const router = useRouter();
    const { tenantName: activeTenantName, setTenant: setActiveTenant } = useTenantStore();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null); // ID of tenant being edited
    const [editForm, setEditForm] = useState<Partial<Tenant> & { password?: string }>({
        name: "",
        supabase_url: "",
        supabase_anon_key: "",
        client_email: "",
        password: "",
        config: {}
    });
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
        console.log("SUBMITTING NEW TENANT:", editForm);
        setSaving(true);
        try {
            const configObj = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : editForm.config;
            await createTenant({ ...editForm, config: configObj });
            setShowNewForm(false);
            setEditForm({ name: "", supabase_url: "", supabase_anon_key: "", client_email: "", password: "", config: {} });
            await loadTenants();
        } catch (err: any) {
            console.error("SAVE TENANT ERROR:", err);
            alert("Error al crear cliente: " + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdate(id: string) {
        try {
            const configObj = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : editForm.config;
            const tenantObj = tenants.find(t => t.id === id);

            await updateTenant(id, {
                ...editForm,
                config: configObj,
                auth_user_id: tenantObj?.auth_user_id
            });

            setIsEditing(null);
            loadTenants();

            // Si el cliente editado es el activo, actualizar el store
            if (activeTenantName === editForm.name) {
                setActiveTenant({
                    supabaseUrl: editForm.supabase_url || "",
                    supabaseAnonKey: editForm.supabase_anon_key || "",
                    tenantName: editForm.name || "",
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
            client_email: t.client_email || "",
            password: "",
            config: JSON.stringify(t.config, null, 2) as unknown as Record<string, unknown>
        });
    }

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de App Automatiza</h1>
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
                                setEditForm({ name: "", supabase_url: "", supabase_anon_key: "", client_email: "", password: "", config: {} });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                        </Button>
                    )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Infraestructura (Link)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Email de Acceso</th>
                                <th className="px-6 py-4 text-right px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold animate-pulse">
                                        Sincronizando infraestructura...
                                    </td>
                                </tr>
                            )}

                            {!loading && tenants.length === 0 && !showNewForm && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold">
                                        <Globe className="mx-auto h-12 w-12 text-slate-100 mb-4" />
                                        No se han detectado clientes configurados.
                                    </td>
                                </tr>
                            )}

                            {/* New Tenant Form */}
                            {showNewForm && (
                                <tr>
                                    <td colSpan={4} className="p-0">
                                        <div className="bg-blue-50/30 p-8 border-b border-blue-100 animate-in slide-in-from-top duration-300">
                                            <form onSubmit={handleSaveNew} className="space-y-6">
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
                                                            placeholder="Ej: Proyecto México"
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
                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Email de Acceso (Dashboard)</Label>
                                                        <Input
                                                            value={editForm.client_email}
                                                            onChange={e => setEditForm({ ...editForm, client_email: e.target.value })}
                                                            className="h-12 bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-blue-100"
                                                            placeholder="cliente@ejemplo.com"
                                                            type="email"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">Contraseña de Acceso</Label>
                                                        <Input
                                                            value={editForm.password}
                                                            onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                            className="h-12 bg-white border-slate-200 text-slate-900 rounded-xl focus:ring-blue-100"
                                                            placeholder="••••••••"
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
                                                                    placeholder="Ej: App Automatiza"
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
                                                                        setEditForm({ ...editForm, config: JSON.stringify(current, null, 2) as any });
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
                                                                        className="w-full min-h-[120px] rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-900 font-mono focus:border-blue-500 outline-none"
                                                                        placeholder='{ "headers": [], "dashboard_title": "" }'
                                                                    />
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pt-4">
                                                    <Button
                                                        type="submit"
                                                        disabled={saving}
                                                        className="h-12 px-8 bg-blue-600 font-black text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                                                    >
                                                        {saving ? "Desplegando..." : "Desplegar Cliente"}
                                                    </Button>
                                                    <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="h-12 text-slate-400 font-bold rounded-xl hover:bg-slate-100">Descartar</Button>
                                                </div>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {tenants.map(t => (
                                <tr key={t.id} className={cn(
                                    "transition-all duration-300",
                                    isEditing === t.id ? "bg-blue-50/50" : "hover:bg-slate-50/50"
                                )}>
                                    {isEditing === t.id ? (
                                        <td colSpan={4} className="p-8">
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nombre</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-11 bg-white rounded-xl text-slate-900 font-bold" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">URL Supabase</Label><Input value={editForm.supabase_url} onChange={e => setEditForm({ ...editForm, supabase_url: e.target.value })} className="h-11 bg-white font-mono text-xs rounded-xl text-slate-900" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Acceso</Label><Input value={editForm.client_email} onChange={e => setEditForm({ ...editForm, client_email: e.target.value })} className="h-11 bg-white rounded-xl text-slate-900 font-bold" /></div>
                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cambiar Contraseña</Label><Input value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="h-11 bg-white rounded-xl text-slate-900" type="password" placeholder="Solo para cambiarla" /></div>
                                                    <div className="md:col-span-2 space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Service Role / Key</Label><Input value={editForm.supabase_anon_key} onChange={e => setEditForm({ ...editForm, supabase_anon_key: e.target.value })} className="h-11 bg-white font-mono text-xs rounded-xl text-slate-900" type="password" /></div>

                                                    <div className="md:col-span-2 space-y-4 pt-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título</Label><Input value={(() => { try { const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {}); return conf.dashboard_title || ""; } catch (e) { return ""; } })()} onChange={e => { try { const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {}); conf.dashboard_title = e.target.value; setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any }); } catch (e) { } }} className="h-10 bg-white rounded-xl text-slate-900" /></div>
                                                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Headers</Label><Input value={(() => { try { const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {}); return (conf.headers || []).join(", "); } catch (e) { return ""; } })()} onChange={e => { try { const conf = typeof editForm.config === 'string' ? JSON.parse(editForm.config || '{}') : (editForm.config || {}); conf.headers = e.target.value.split(",").map(s => s.trim()).filter(s => s !== ""); setEditForm({ ...editForm, config: JSON.stringify(conf, null, 2) as any }); } catch (e) { } }} className="h-10 bg-white rounded-xl text-slate-900" /></div>
                                                        </div>
                                                        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                                                            <KpiBuilder kpis={(typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}").kpis : (editForm.config as any)?.kpis) || []} onChange={(kpis) => { try { const current = typeof editForm.config === "string" ? JSON.parse(editForm.config || "{}") : (editForm.config || {}); current.kpis = kpis; setEditForm({ ...editForm, config: JSON.stringify(current, null, 2) as any }); } catch (e) { } }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button onClick={() => handleUpdate(t.id)} className="bg-emerald-600 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-emerald-100"><Check className="mr-2 h-4 w-4" /> Sincronizar</Button>
                                                    <Button onClick={() => setIsEditing(null)} variant="ghost" className="text-slate-400 font-bold h-10 px-6 rounded-xl hover:bg-slate-100"><X className="mr-2 h-4 w-4" /> Cancelar</Button>
                                                </div>
                                            </div>
                                        </td>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">{t.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                                {t.supabase_url}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                                {t.client_email || "No asignado"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => startEdit(t)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar"><Edit2 className="h-4 w-4" /></button>
                                                    <button onClick={() => handleDelete(t.id)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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


