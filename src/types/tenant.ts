export interface Tenant {
    id: string;
    name: string;
    supabase_url: string;
    supabase_anon_key: string;
    client_email?: string;
    auth_user_id?: string;
    config: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

export interface KpiConfig {
    id: string;
    label: string;
    icon: string;
    color: string;
    size: "3" | "4" | "6" | "12";

    // Main calculation (Numerator)
    calcType: "count" | "sum" | "avg";
    targetCol: string;
    isExtraTarget: boolean;

    condCol?: string;
    isExtraCond?: boolean;
    condOp?: "=" | "!=" | "ILIKE" | ">" | "<";
    condVal?: string;

    // Optional Denominator (for percentages)
    hasDenominator?: boolean;
    denomCalcType?: "count" | "sum" | "avg";
    denomTargetCol?: string;
    denomIsExtraTarget?: boolean;

    denomCondCol?: string;
    denomIsExtraCond?: boolean;
    denomCondOp?: "=" | "!=" | "ILIKE" | ">" | "<";
    denomCondVal?: string;

    isPercentage?: boolean;
}

export interface TenantConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    tenantName: string;
    kpis?: KpiConfig[];
    config?: Record<string, unknown>;
}
