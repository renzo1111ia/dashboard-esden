"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useDateRangeStore, type DateRange } from "@/store/dateRange";
import { cn } from "@/lib/utils";

const DATE_RANGES: { label: string; value: DateRange }[] = [
    { label: "7 días", value: "7d" },
    { label: "30 días", value: "30d" },
    { label: "90 días", value: "90d" },
];

export function Topbar({ title }: { title: string }) {
    const router = useRouter();
    const { range, setRange } = useDateRangeStore();

    async function handleLogout() {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.auth.signOut();
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            // Hard redirect para forzar re-evaluación del middleware
            window.location.href = "/login";
        }
    }

    return (
        <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#070b14]/80 px-6 backdrop-blur-sm">
            {/* Page Title */}
            <h1 className="text-base font-semibold text-white/90">{title}</h1>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
                {/* Date range selector */}
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] p-1">
                    {DATE_RANGES.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setRange(opt.value)}
                            className={cn(
                                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                                range === opt.value
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}
