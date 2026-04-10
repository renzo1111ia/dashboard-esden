"use client";

import { useState, useEffect } from "react";
import { 
    BookOpen, 
    Search, 
    Plus, 
    ChevronRight, 
    Sparkles, 
    Book, 
    Users, 
    CreditCard, 
    Calendar,
    Award,
    Code,
    Save,
    Trash2,
    CheckCircle2,
    Info,
    Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPrograms, updateProgram, createProgram } from "@/lib/actions/programas";
import { Programa } from "@/types/database";
import { cn } from "@/lib/utils";

export default function ProgramManager() {
    const [programs, setPrograms] = useState<Programa[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<Programa | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadPrograms();
    }, []);

    const loadPrograms = async () => {
        try {
            const data = await getPrograms();
            setPrograms(data);
            if (data.length > 0 && !selectedProgram) setSelectedProgram(data[0]);
        } catch (error) {
            console.error("Error loading programs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedProgram) return;
        setSaving(true);
        try {
            await updateProgram(selectedProgram.id, selectedProgram);
            await loadPrograms();
            // Show success logic here
        } catch (error) {
            console.error("Error saving program:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof Programa, value: string) => {
        if (!selectedProgram) return;
        setSelectedProgram({ ...selectedProgram, [field]: value });
    };

    const filteredPrograms = programs.filter(p => 
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar List */}
            <div className="w-80 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Programas
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar curso..."
                            className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                    {filteredPrograms.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedProgram(p)}
                            className={cn(
                                "w-full p-4 rounded-2xl text-left transition-all mb-1 group relative overflow-hidden",
                                selectedProgram?.id === p.id 
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs truncate pr-4">{p.nombre}</span>
                                <ChevronRight className={cn("h-3 w-3 transition-transform", selectedProgram?.id === p.id ? "rotate-90" : "")} />
                            </div>
                            {p.id_producto && (
                                <p className={cn("text-[9px] mt-1 font-medium italic opacity-60")}>
                                    ID: {p.id_producto}
                                </p>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button className="w-full h-12 bg-slate-950 dark:bg-white dark:text-slate-950 text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                        <Plus className="h-4 w-4" />
                        Nuevo Programa
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                {!selectedProgram ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <Book className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-20">Selecciona un programa para editar</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                        {selectedProgram.nombre}
                                    </h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ficha Técnica del Programa</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {saving ? <Layout className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar Cambios
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
                            <div className="max-w-4xl space-y-12">
                                
                                {/* Section 1: Qual Criteria */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6 text-violet-500">
                                        <Award className="h-4 w-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Cualificación del Interesado</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-bold text-slate-500 ml-1">Requisitos Específicos (Prompting Logic)</label>
                                        <textarea 
                                            value={selectedProgram.requisitos_cualificacion || ""}
                                            onChange={(e) => updateField("requisitos_cualificacion", e.target.value)}
                                            rows={4}
                                            placeholder="Ej: Solo cualificar si tiene más de 3 años de experiencia y reside en Madrid..."
                                            className="w-full bg-violet-500/5 border border-violet-500/10 rounded-2xl p-5 text-sm leading-relaxed outline-none focus:border-violet-500/30 transition-all font-medium italic text-violet-700 dark:text-violet-300"
                                        />
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                            <Info className="h-3 w-3" />
                                            Esta información se inyecta automáticamente cuando el Agente detecta interés en este curso.
                                        </div>
                                    </div>
                                </section>

                                {/* Section 2: Core Info */}
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2 text-blue-500">
                                            <Users className="h-4 w-4" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Información Comercial</h3>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                <CreditCard className="h-3 w-3" /> Precio y Financiación
                                            </label>
                                            <textarea 
                                                value={selectedProgram.precio || ""}
                                                onChange={(e) => updateField("precio", e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-blue-500/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> Fechas de Inicio
                                            </label>
                                            <input 
                                                value={selectedProgram.fechas_inicio || ""}
                                                onChange={(e) => updateField("fechas_inicio", e.target.value)}
                                                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-bold outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                            <Award className="h-4 w-4" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Beneficios y Prácticas</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Metodología</label>
                                            <textarea 
                                                value={selectedProgram.metodologia || ""}
                                                onChange={(e) => updateField("metodologia", e.target.value)}
                                                rows={2}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-emerald-500/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Becas Disponibles</label>
                                            <input 
                                                value={selectedProgram.becas_financiacion || ""}
                                                onChange={(e) => updateField("becas_financiacion", e.target.value)}
                                                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-xs font-bold outline-none focus:border-emerald-500/50"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Section 3: Full Knowledge Base */}
                                <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                                        <Code className="h-4 w-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Contenido Master (Para el Agente)</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Presentación del Programa</label>
                                            <textarea 
                                                value={selectedProgram.presentacion || ""}
                                                onChange={(e) => updateField("presentacion", e.target.value)}
                                                rows={6}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-sm outline-none focus:border-blue-500/50 leading-relaxed"
                                                placeholder="Copia aquí el texto descriptivo que el agente debe conocer..."
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Objetivos del Alumno</label>
                                            <textarea 
                                                value={selectedProgram.objetivos || ""}
                                                onChange={(e) => updateField("objetivos", e.target.value)}
                                                rows={4}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-sm outline-none focus:border-blue-500/50 leading-relaxed"
                                                placeholder="¿Qué conseguirá el alumno al terminar?"
                                            />
                                        </div>
                                    </div>
                                </section>

                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
