import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAuthRoute = pathname.startsWith("/login");
    const isAdminDashboard = pathname.startsWith("/dashboardadmin");
    const isUserDashboard = pathname.startsWith("/dashboard") && !isAdminDashboard;
    const isProtected = isAdminDashboard || isUserDashboard;

    const supabaseUrl = AUTH_SUPABASE_URL;
    const supabaseAnonKey = AUTH_SUPABASE_ANON_KEY;

    // Nunca faltarán las vars (auth-config tiene fallback hardcodeado)
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (error) {
        console.error("MIDDLEWARE AUTH ERROR:", error);
        // Si hay error de auth y la ruta es protegida → redirigir al login
        if (isProtected) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }
        return NextResponse.next({ request });
    }

    // Sin sesión en ruta protegida → login
    if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Restriction: Only admins can access /dashboardadmin and /dashboard/settings
    const isAdmin = user?.user_metadata?.is_admin === true;

    if (isAdminDashboard && !isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.replace("/dashboardadmin", "/dashboard");
        return NextResponse.redirect(url);
    }

    if (isUserDashboard && isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboardadmin" + pathname.substring(10); // replace "/dashboard" with "/dashboardadmin"
        return NextResponse.redirect(url);
    }

    if (user && pathname.includes("/settings")) {
        if (!isAdmin) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }
    }

    // Con sesión en página de login → redirect based on role
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = isAdmin ? "/dashboardadmin" : "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

