"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

import { LayoutDashboard, Megaphone, MessageCircle, Clock, History, Settings } from "lucide-react";
import { TenantSelector } from "./TenantSelector";

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

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const isConfigured = useTenantStore((s) => s.isConfigured);

    const visibleNavItems = NAV_ITEMS.filter(item => {
        if (item.href === "/dashboard/settings") {
            return isAdmin;
        }
        return true;
    });

    return (
        <aside
            className={cn(
                "relative flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className={cn("flex h-20 items-center justify-center border-b border-slate-100 transition-all", collapsed ? "px-2" : "px-4")}>
                {collapsed ? (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <svg viewBox="0 0 24 24" className="h-7 w-7 text-blue-600" fill="currentColor">
                            <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
                        </svg>
                    </div>
                ) : (
                    <img src="/logo.png" alt="Automatiza Formación" className="h-10 w-auto object-contain" />
                )}
            </div>

            {/* Tenant Selector */}
            {isAdmin && <TenantSelector collapsed={collapsed} />}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 mt-2">
                {visibleNavItems.map((item) => {
                    const targetHref = item.href;
                    const active = pathname === targetHref || pathname.startsWith(targetHref + "/");

                    return (
                        <Link
                            key={item.href}
                            href={targetHref}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                                active
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
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
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="m-3 flex items-center justify-center rounded-xl py-2.5 text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
                title={collapsed ? "Expandir" : "Colapsar"}
            >
                <svg
                    className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
            </button>
        </aside>
    );
}
