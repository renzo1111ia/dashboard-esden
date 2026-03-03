import { fetchCalls } from "@/lib/actions/calls";
import { HistorialTable } from "@/components/historial/HistorialTable";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
    // Default: last 30 days
    const toDate = new Date().toISOString();
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const initialData = await fetchCalls({ page: 1, pageSize: 50, fromDate, toDate });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Historial de Llamadas</h2>
                    <p className="text-xs text-white/40 mt-0.5">
                        {initialData.count.toLocaleString()} registros totales · Paginación servidor
                    </p>
                </div>
            </div>

            <HistorialTable
                initialData={initialData}
                fromDate={fromDate}
                toDate={toDate}
            />
        </div>
    );
}
