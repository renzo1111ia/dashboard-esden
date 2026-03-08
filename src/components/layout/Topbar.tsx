"use client";

import { useTenantStore } from "@/store/tenant";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

export function Topbar({ title }: { title: string }) {
    const { tenantName, config } = useTenantStore();
    const router = useRouter();

    async function handleLogout() {
        try {
            await logoutAction();
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            // Hard redirect para forzar re-evaluación del middleware
            window.location.href = "/login";
        }
    }

    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/70 px-6 backdrop-blur-md">
            {/* Page Title */}
            <div className="flex flex-col">
                <h1 className="text-base font-bold text-slate-800">
                    {(config?.dashboard_title as string) || title}
                </h1>
                {tenantName && (
                    <span className="text-[10px] uppercase tracking-widest text-blue-600 font-black">
                        {tenantName}
                    </span>
                )}
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-4">

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}
