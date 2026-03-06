"use client";

import { useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Server Action: la llamada a Supabase ocurre en el servidor,
        // que sí puede alcanzar la URL interna. El browser no puede.
        const result = await loginAction(email, password);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            // Hard redirect para que el middleware re-evalúe la sesión con cookies frescas
            window.location.href = "/dashboard";
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#f8fafc]">
            {/* Card */}
            <div className="w-full max-w-[440px] px-6 py-12">
                {/* Logo Area */}
                <div className="mb-10 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-200">
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor">
                            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Automatiza <span className="text-blue-600">Formación</span></span>
                </div>

                <div className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
                        Bienvenido de nuevo
                    </h1>
                    <p className="mt-2 text-base text-slate-500 font-medium">
                        Ingresa tus credenciales para acceder a tu cuenta
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 font-bold text-sm">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-slate-700 font-bold text-sm">
                                Contraseña
                            </Label>
                            <button type="button" className="text-sm font-bold text-blue-500 hover:text-blue-600">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-12 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 transition-all rounded-xl"
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full bg-[#0ea5e9] text-white font-black text-base shadow-lg shadow-blue-200/50 transition-all hover:bg-[#0284c7] rounded-xl active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Iniciando sesión...
                            </span>
                        ) : (
                            "Iniciar sesión"
                        )}
                    </Button>
                </form>

                <p className="mt-12 text-center text-xs font-bold text-slate-400 tracking-widest uppercase">
                    © {new Date().getFullYear()} Automatiza Formación
                </p>
            </div>
        </div>
    );
}
