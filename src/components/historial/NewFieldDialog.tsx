"use client";

import { useState, useTransition } from "react";
import { addColumnHeader } from "@/lib/actions/calls";

interface Props {
    onClose: () => void;
    onSaved: () => void;
}

export function NewFieldDialog({ onClose, onSaved }: Props) {
    const [name, setName] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Preview how the name will be saved in Supabase (sanitized)
    const preview = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    function handleSave() {
        if (!name.trim()) {
            setError("El nombre del cabezal es obligatorio.");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await addColumnHeader(name);
                onSaved();
                onClose();
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Error desconocido");
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0d1220] p-6 shadow-2xl">
                <h3 className="text-base font-semibold text-white">Agregar Cabezal</h3>
                <p className="mt-1 text-xs text-white/40">
                    El cabezal se creará como nueva columna en Supabase.
                </p>

                <div className="mt-5">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">
                        Nombre del Cabezal
                    </label>
                    <input
                        type="text"
                        autoFocus
                        placeholder="ej. master_interes, campaña..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                    {name.trim() && (
                        <p className="mt-1.5 text-xs text-white/30">
                            Se guardará como: <span className="text-indigo-400 font-mono">{preview}</span>
                        </p>
                    )}
                    {error && (
                        <p className="mt-2 text-xs text-red-400">{error}</p>
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
