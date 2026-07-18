import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const password = process.env.SITE_PASSWORD;
  if (!password) {
    // Ingen passord konfigurert ennå — ikke lås ute ved et uhell.
    return NextResponse.next();
  }

  const expected = await sha256Hex(password);
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
