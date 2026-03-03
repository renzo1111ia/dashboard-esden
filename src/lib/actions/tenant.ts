"use server";

import { cookies } from "next/headers";

export async function setTenantCookies(url: string, key: string) {
    const cookieStore = await cookies();

    if (url && key) {
        cookieStore.set("esden-tenant-url", url, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        cookieStore.set("esden-tenant-key", key, { path: "/", maxAge: 30 * 24 * 60 * 60 });
    } else {
        cookieStore.delete("esden-tenant-url");
        cookieStore.delete("esden-tenant-key");
    }
}
