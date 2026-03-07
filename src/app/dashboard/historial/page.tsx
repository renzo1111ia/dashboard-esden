import { fetchCalls } from "@/lib/actions/calls";
import { HistorialTable } from "@/components/historial/HistorialTable";

export const dynamic = "force-dynamic";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<any> }) {
    const params = await searchParams;
    const range = (params.range as string) || "30d";

    const now = new Date();
    let fromDateObj = new Date();
    if (range === "7d") fromDateObj = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "90d") fromDateObj = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else fromDateObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fromDate = fromDateObj.toISOString();
    const toDate = now.toISOString();

    const initialData = await fetchCalls({ page: 1, pageSize: 50, fromDate, toDate });

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
                fromDate={fromDate}
                toDate={toDate}
            />
        </div>
    );
}
