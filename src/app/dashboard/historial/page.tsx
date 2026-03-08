import { fetchCalls } from "@/lib/actions/calls";
import { HistorialTable } from "@/components/historial/HistorialTable";
import { parseFilters } from "@/lib/utils/date-filters";

export const dynamic = "force-dynamic";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const { from, to, filters } = parseFilters(params);

    const initialData = await fetchCalls({
        page: 1,
        pageSize: 50,
        fromDate: from,
        toDate: to,
        search: filters.search,
        curso: filters.curso,
        pais: filters.pais,
        origen: filters.origen,
        campana: filters.campana
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Historial de Llamadas</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {initialData.count.toLocaleString()} registros totales · Paginación servidor
                    </p>
                </div>
            </div>

            <HistorialTable
                initialData={initialData}
                fromDate={from}
                toDate={to}
            />
        </div>
    );
}
