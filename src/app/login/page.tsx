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
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060912]">
            {/* Ambient glow background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-700/15 blur-[100px]" />
                <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-700/10 blur-[100px]" />
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">

                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 13h4" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">ESDEN Analytics</h1>
                        <p className="mt-1 text-sm text-white/50">Plataforma de inteligencia de llamadas IA</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/70 text-xs font-medium uppercase tracking-wider">
                                Correo electrónico
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-indigo-500 focus:ring-indigo-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-white/70 text-xs font-medium uppercase tracking-wider">
                                Contraseña
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-indigo-500 focus:ring-indigo-500/20"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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

                    <p className="mt-6 text-center text-xs text-white/25">
                        © {new Date().getFullYear()} ESDEN · Powered by Supabase
                    </p>
                </div>
            </div>
        </div>
    );
}
