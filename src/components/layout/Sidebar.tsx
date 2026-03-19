"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/store/tenant";

import { LayoutDashboard, Megaphone, MessageCircle, Clock, History, Settings, X } from "lucide-react";
import { TenantSelector } from "./TenantSelector";

const NAV_ITEMS = [
    {
        label: "General",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Llamadas",
        href: "/dashboard/minutos",
        icon: <Clock className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "WhatsApp",
        href: "/dashboard/whatsapp",
        icon: <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Campañas",
        href: "/dashboard/campanas",
        icon: <Megaphone className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Historial",
        href: "/dashboard/historial",
        icon: <History className="h-5 w-5" strokeWidth={1.8} />
    },
    {
        label: "Config",
        href: "/dashboard/settings",
        icon: <Settings className="h-5 w-5" strokeWidth={1.8} />
    },
];

export function Sidebar({ isAdmin, mobileOpen, onMobileClose }: {
    isAdmin: boolean;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const isConfigured = useTenantStore((s) => s.isConfigured);

    // Close mobile sidebar on navigation
    useEffect(() => {
        if (mobileOpen && onMobileClose) {
            onMobileClose();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const visibleNavItems = NAV_ITEMS.filter(item => {
        if (item.href === "/dashboard/settings") {
            return isAdmin;
        }
        return true;
    });

    return (
        <>
            {/* ── MOBILE: Overlay backdrop ───────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={onMobileClose}
                />
            )}

            {/* ── DESKTOP Sidebar / MOBILE Drawer ───────────────────────── */}
            <aside
                className={cn(
                    // Desktop: always visible, collapsible
                    "relative hidden md:flex h-screen flex-col border-r border-sidebar-border dark:border-slate-800 bg-sidebar dark:bg-slate-950 transition-all duration-300",
                    collapsed ? "w-16" : "w-64",
                    // Mobile: slide-in drawer
                    "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:flex max-md:w-72 max-md:shadow-2xl",
                    mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
                    "max-md:transition-transform max-md:duration-300"
                )}
            >
                {/* Logo */}
                <div className={cn("flex h-16 md:h-20 items-center justify-between border-b border-sidebar-border transition-all px-4")}>
                    {!collapsed ? (
                        <img src="/logo.png" alt="App Automatiza" className="h-9 w-auto object-contain" />
                    ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 mx-auto transition-colors">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="currentColor">
                                <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" />
                            </svg>
                        </div>
                    )}
                    {/* Close button for mobile */}
                    {onMobileClose && (
                        <button
                            onClick={onMobileClose}
                            className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl text-sidebar-foreground/50 hover:bg-sidebar-accent transition-all"
                            title="Cerrar menú"
                            aria-label="Cerrar menú"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Tenant Selector */}
                {isAdmin && <TenantSelector collapsed={collapsed} isAdmin={isAdmin} />}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 mt-2">
                    {visibleNavItems.map((item) => {
                        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

                {/* Collapse toggle (desktop only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex m-3 items-center justify-center rounded-xl py-2.5 text-sidebar-foreground/40 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

            {/* ── MOBILE: Bottom Navigation Bar ─────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-sidebar-border dark:border-slate-800 bg-sidebar/95 dark:bg-slate-950/95 backdrop-blur-md px-1 pb-safe">
                {visibleNavItems.slice(0, 5).map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-2 py-2 min-w-[48px] rounded-xl transition-all",
                                active ? "text-primary" : "text-sidebar-foreground/40"
                            )}
                        >
                            <span className={cn(
                                "flex items-center justify-center h-9 w-9 rounded-xl transition-all",
                                active ? "bg-primary/10" : ""
                            )}>
                                {item.icon}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
