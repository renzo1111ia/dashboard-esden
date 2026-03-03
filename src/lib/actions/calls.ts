"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PostCallAnalisis } from "@/types/database";

export interface FetchCallsParams {
    page: number;
    pageSize: number;
    search?: string;
    callStatus?: string;
    fromDate?: string;
    toDate?: string;
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
}: FetchCallsParams): Promise<FetchCallsResult> {

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

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return {
        data: (data as PostCallAnalisis[]) ?? [],
        count: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
    };
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
