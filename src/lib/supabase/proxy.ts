import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    // Rewrite (not redirect) so the browser keeps the original URL. Los
    // enlaces de invitación/recuperación de Supabase llegan con el token en
    // el fragmento (#access_token=...), que el navegador nunca envía al
    // servidor; un redirect a otra ruta puede perder ese fragmento por el
    // camino. Con rewrite no hay navegación real, así que el fragmento se
    // mantiene intacto y el login.tsx puede leerlo.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const rewritten = NextResponse.rewrite(url);
    response.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));
    return rewritten;
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
