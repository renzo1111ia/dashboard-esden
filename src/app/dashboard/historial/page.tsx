import { fetchCalls } from "@/lib/actions/calls";
import { HistorialTable } from "@/components/historial/HistorialTable";
import { parseFilters } from "@/lib/utils/date-filters";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getAdminStatus } from "@/lib/actions/auth";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);
    const tenant = await getActiveTenantConfig();
    const columns = (tenant?.config as any)?.historial_columns;
    const isAdmin = await getAdminStatus();

    const initialData = await fetchCalls({
        page: 1,
        pageSize: 50,
        fromDate: from,
        toDate: to,
        search: filters.search,
        pais: filters.pais,
        origen: filters.origen,
        campana: filters.campana,
        tipoLead: filters.tipoLead,
        cualificacion: filters.cualificacion,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Historial de Llamadas</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {initialData.count.toLocaleString()} registros · Paginación servidor
                    </p>
                </div>
            </div>

            <HistorialTable 
                initialData={initialData} 
                fromDate={from} 
                toDate={to} 
                columns={columns}
            />

            {isAdmin && (
                <div className="mt-12 pt-12 border-t border-border">
                    <AdminConfigSection />
                </div>
            )}
        </div>
    );
}

async function AdminConfigSection() {
    const tenant = await getActiveTenantConfig();
    if (!tenant) return null;

    // Fetch one lead to get available field keys
    const { fetchCalls } = await import("@/lib/actions/calls");
    const sample = await fetchCalls({ page: 1, pageSize: 1 });
    const sampleKeys = sample.data.length > 0 ? Object.keys(sample.data[0]) : [];

    const { HistorialColumnManager } = await import("@/components/dashboard/HistorialColumnManager") as any;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-[20px]">
                    <Settings className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Configuración <span className="text-amber-600 dark:text-amber-400">Avanzada</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px]">
                        Ajustes exclusivos para administradores del sistema
                    </p>
                </div>
            </div>

            <HistorialColumnManager tenant={tenant} sampleKeys={sampleKeys} />
        </div>
    );
}
