"use client";

import { useState, useTransition } from "react";
import type { PostCallAnalisis } from "@/types/database";
import { upsertExtraField } from "@/lib/actions/calls";

interface Props {
    records: PostCallAnalisis[];
    dynamicKeys: string[];
    onClose: () => void;
    onSaved: () => void;
}

export function NewFieldDialog({ records, dynamicKeys, onClose, onSaved }: Props) {
    const [selectedRecordId, setSelectedRecordId] = useState<string>("");
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [customKey, setCustomKey] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const finalKey = key === "__custom__" ? customKey : key;

    function handleSave() {
        if (!selectedRecordId) {
            setError("Debes seleccionar a qué registro quieres agregarle el campo.");
            return;
        }
        if (!finalKey.trim()) {
            setError("El nombre del campo es obligatorio.");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await upsertExtraField(selectedRecordId, finalKey.trim(), value.trim());
                onSaved();
                onClose();
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Error desconocido");
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1220] p-6 shadow-2xl">
                <h3 className="text-base font-semibold text-white">Nuevo Campo Dinámico</h3>
                <p className="mt-1 text-xs text-white/40">
                    El valor se guardará en la base de datos (<code className="text-indigo-400">extra_data</code>) y se reflejará como una nueva columna global.
                </p>

                <div className="mt-5 space-y-4">
                    {/* Record selector */}
                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                            Registro a Modificar
                        </label>
                        <select
                            value={selectedRecordId}
                            onChange={(e) => setSelectedRecordId(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="" className="bg-[#0d1220] text-white">— Seleccionar registro —</option>
                            {records.map((r) => (
                                <option key={r.id} value={r.id} className="bg-[#0d1220] text-white">
                                    {r.lead_id ? `LEAD ID: ${r.lead_id}` : (r.phone_number ? `Tel: ${r.phone_number}` : `ID: ${r.id}`)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Field key selector */}
                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                            Nombre del campo (Cabecera)
                        </label>
                        <select
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                            <option value="" className="bg-[#0d1220] text-white">— Seleccionar —</option>
                            {dynamicKeys.map((k) => (
                                <option key={k} value={k} className="bg-[#0d1220] text-white">{k}</option>
                            ))}
                            <option value="__custom__" className="bg-[#0d1220] text-white text-indigo-400 font-medium">+ Crear nuevo campo...</option>
                        </select>
                    </div>

                    {key === "__custom__" && (
                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                                Nombre personalizado
                            </label>
                            <input
                                type="text"
                                placeholder="ej. campaña_retargeting"
                                value={customKey}
                                onChange={(e) => setCustomKey(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Value */}
                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                            Valor (Opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Dejar en blanco para auto-rellenar por Supabase..."
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-400">{error}</p>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-white/40 hover:text-white/70 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                    >
                        {isPending ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
