"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

import { LayoutDashboard, Megaphone, MessageCircle, Clock, History, Settings } from "lucide-react";

const NAV_ITEMS = [
    {
        label: "Panel General",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Campañas",
        href: "/dashboard/campanas",
        icon: <Megaphone className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "WhatsApp",
        href: "/dashboard/whatsapp",
        icon: <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Minutos Totales",
        href: "/dashboard/minutos",
        icon: <Clock className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Historial",
        href: "/dashboard/historial",
        icon: <History className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Configuración",
        href: "/dashboard/settings",
        icon: <Settings className="h-5 w-5" strokeWidth={1.8} />
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const isConfigured = useTenantStore((s) => s.isConfigured);

    return (
        <aside
            className={cn(
                "relative flex h-screen flex-col border-r border-white/[0.06] bg-[#070b14] transition-all duration-300",
                collapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                {!collapsed && (
                    <span className="font-bold text-sm tracking-wide text-white">ESDEN Analytics</span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-1 mt-2">
                {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                active
                                    ? "bg-indigo-600/20 text-indigo-400 shadow-sm"
                                    : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                            )}
                        >
                            <span className="relative flex-shrink-0">
                                {item.icon}
                                {item.href === "/dashboard/settings" && !isConfigured && (
                                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                    </span>
                                )}
                            </span>
                            {!collapsed && <span>{item.label}</span>}
                            {active && !collapsed && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="m-2 flex items-center justify-center rounded-lg py-2 text-white/30 transition hover:bg-white/5 hover:text-white/60"
                title={collapsed ? "Expandir" : "Colapsar"}
            >
                <svg
                    className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
            </button>
        </aside>
    );
}
