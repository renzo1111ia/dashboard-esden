"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PostCallAnalisis, Reintento } from "@/types/database";

export interface FetchCallsParams {
    page: number;
    pageSize: number;
    search?: string;
    callStatus?: string;
    fromDate?: string;
    toDate?: string;
    curso?: string;
    pais?: string;
    origen?: string;
    campana?: string;
}

export interface FetchCallsResult {
    data: PostCallAnalisis[];
    count: number;
    totalPages: number;
}

export async function fetchCalls({
    page = 1,
    pageSize = 50,
    search,
    callStatus,
    fromDate,
    toDate,
    curso,
    pais,
    origen,
    campana,
}: FetchCallsParams): Promise<FetchCallsResult> {
    const emptyResult: FetchCallsResult = { data: [], count: 0, totalPages: 0 };
    try {
        const supabase = await getSupabaseServerClient();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from("post_call_analisis")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (search) {
            query = query.or(
                `lead_id.ilike.%${search}%,phone_number.ilike.%${search}%`
            );
        }

        if (callStatus && callStatus !== "ALL") {
            query = query.eq("call_status", callStatus);
        }

        if (fromDate) query = query.gte("created_at", fromDate);
        if (toDate) query = query.lte("created_at", toDate);

        // Advanced filters
        if (curso) query = query.ilike("master_interes", `%${curso}%`);
        if (pais) query = query.contains("extra_data", { pais: pais });
        if (origen) query = query.contains("extra_data", { origen: origen });
        if (campana) query = query.contains("extra_data", { campana: campana });

        const { data, error, count } = await query;

        if (error) {
            console.error("fetchCalls ERROR:", error.message);
            return emptyResult;
        }

        return {
            data: (data as PostCallAnalisis[]) ?? [],
            count: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / pageSize),
        };
    } catch (e) {
        console.error("fetchCalls EXCEPTION:", e);
        return emptyResult;
    }
}

export async function upsertExtraField(
    id: string,
    key: string,
    value: string
) {
    const supabase = await getSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("upsert_extra_field", {
        p_id: id,
        p_key: key,
        p_value: value,
    });
    if (error) throw new Error((error as { message: string }).message);
}

/**
 * Adds a new column header to ALL records in post_call_analisis.
 * Sets the key with an empty string so it appears as a column in the table.
 */
export async function addColumnHeader(key: string) {
    // Sanitize key: lowercase, only letters, numbers and underscores
    const sanitized = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!sanitized) throw new Error("Nombre de campo inválido.");

    const supabase = await getSupabaseServerClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("add_column_header_to_all", {
        p_key: sanitized,
    });
    if (error) throw new Error((error as { message: string }).message);
    return sanitized;
}

export async function getCallsByPhone(phone: string): Promise<PostCallAnalisis[]> {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
        .from("post_call_analisis")
        .select("*")
        .eq("phone_number", phone)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data as PostCallAnalisis[]) ?? [];
}

export async function fetchReintentosByPhone(phone: string): Promise<Reintento[]> {
    const supabase = await getSupabaseServerClient();
    // Try filtering by telefono OR phone_number columns (both may be used)
    const { data, error } = await supabase
        .from("reintentos")
        .select("*")
        .or(`telefono.eq.${phone},phone_number.eq.${phone}`)
        .order("created_at", { ascending: false });

    if (error) {
        // If phone_number column doesn't exist, fall back to telefono only
        const { data: data2, error: error2 } = await supabase
            .from("reintentos")
            .select("*")
            .eq("telefono", phone)
            .order("created_at", { ascending: false });
        if (error2) {
            console.error("fetchReintentosByPhone ERROR:", error2.message);
            return [];
        }
        return (data2 as Reintento[]) ?? [];
    }
    return (data as Reintento[]) ?? [];
}
