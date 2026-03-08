"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Calendar, ChevronDown, RotateCcw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
    { label: "Hoy", value: "today" },
    { label: "Ayer", value: "yesterday" },
    { label: "Últimos 7 días", value: "7d" },
    { label: "Últimos 30 días", value: "30d" },
    { label: "Este mes", value: "this_month" },
    { label: "Este año", value: "this_year" },
    { label: "Todos", value: "all" },
];

export function FilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Local states for inputs
    const [draftPreset, setDraftPreset] = useState(searchParams.get("preset") || "30d");
    const [draftFrom, setDraftFrom] = useState(searchParams.get("from") || "");
    const [draftTo, setDraftTo] = useState(searchParams.get("to") || "");
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [curso, setCurso] = useState(searchParams.get("curso") || "");
    const [pais, setPais] = useState(searchParams.get("pais") || "");
    const [origen, setOrigen] = useState(searchParams.get("origen") || "");
    const [campana, setCampana] = useState(searchParams.get("campana") || "");

    const [isExpanded, setIsExpanded] = useState(false);

    function applyFilters() {
        const params = new URLSearchParams(searchParams.toString());

        if (draftPreset) params.set("preset", draftPreset);
        else params.delete("preset");

        if (draftFrom) params.set("from", draftFrom);
        else params.delete("from");

        if (draftTo) params.set("to", draftTo);
        else params.delete("to");

        if (search) params.set("q", search);
        else params.delete("q");

        if (curso) params.set("curso", curso);
        else params.delete("curso");

        if (pais) params.set("pais", pais);
        else params.delete("pais");

        if (origen) params.set("origen", origen);
        else params.delete("origen");

        if (campana) params.set("campana", campana);
        else params.delete("campana");

        params.set("page", "1"); // Reset pagination

        router.push(`${pathname}?${params.toString()}`);
    }

    function clearFilters() {
        setDraftPreset("30d");
        setDraftFrom("");
        setDraftTo("");
        setSearch("");
        setCurso("");
        setPais("");
        setOrigen("");
        setCampana("");
        router.push(pathname);
    }

    return (
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Row 1: Quick Presets & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 custom-scrollbar">
                    {DATE_PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => {
                                setDraftPreset(p.value);
                                setDraftFrom("");
                                setDraftTo("");
                            }}
                            className={cn(
                                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                                draftPreset === p.value
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-full max-w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar teléfono / ID..."
                            title="Buscar teléfono o ID de lead"
                            aria-label="Buscar teléfono o ID de lead"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all",
                            isExpanded ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros Avanzados
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                    <button
                        onClick={applyFilters}
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700"
                    >
                        Aplicar
                    </button>
                </div>
            </div>

            {/* Row 2: Advanced filters (Colapsible) */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Custom Dates */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Rango Personalizado</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                title="Fecha desde"
                                aria-label="Fecha desde"
                                value={draftFrom}
                                onChange={(e) => { setDraftFrom(e.target.value); setDraftPreset(""); }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-300">-</span>
                            <input
                                type="date"
                                title="Fecha hasta"
                                aria-label="Fecha hasta"
                                value={draftTo}
                                onChange={(e) => { setDraftTo(e.target.value); setDraftPreset(""); }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Curso */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Curso / Master</label>
                        <input
                            type="text"
                            placeholder="Ej: MBA..."
                            value={curso}
                            onChange={(e) => setCurso(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* País */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">País</label>
                        <input
                            type="text"
                            placeholder="Ej: España..."
                            value={pais}
                            onChange={(e) => setPais(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Origen */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Origen</label>
                        <input
                            type="text"
                            placeholder="Ej: Facebook..."
                            value={origen}
                            onChange={(e) => setOrigen(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Campaña */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Campaña</label>
                            <input
                                type="text"
                                placeholder="Ej: Invierno 2024..."
                                value={campana}
                                onChange={(e) => setCampana(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors mt-2"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
