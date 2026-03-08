import { ReactNode, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getAdminStatus } from "@/lib/actions/auth";

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const isAdmin = await getAdminStatus();

    return (
        <div className="flex h-screen overflow-hidden bg-[#f1f5f9]">
            <Sidebar isAdmin={isAdmin} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white/70"></div>}>
                    <Topbar title="Panel General" />
                </Suspense>
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
