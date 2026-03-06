import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TenantConfig } from "@/types/tenant";

interface TenantState extends TenantConfig {
    isConfigured: boolean;
    setTenant: (config: TenantConfig) => void;
    clearTenant: () => void;
}

const DEFAULT_STATE: TenantConfig = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    tenantName: "",
    config: {},
};

/**
 * Zustand store for multi-tenant configuration.
 * Persists to sessionStorage so credentials clear on tab close.
 */
export const useTenantStore = create<TenantState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,
            isConfigured: false,

            setTenant: (config) =>
                set({
                    ...config,
                    isConfigured: !!(config.supabaseUrl && config.supabaseAnonKey),
                }),

            clearTenant: () =>
                set({ ...DEFAULT_STATE, isConfigured: false }),
        }),
        {
            name: "esden-tenant",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
