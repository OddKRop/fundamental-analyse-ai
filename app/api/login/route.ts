import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const redirectTo = String(form.get("redirect") ?? "/");
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  const expectedPassword = process.env.SITE_PASSWORD;
  if (!expectedPassword || password !== expectedPassword) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", safeRedirect);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const hash = await sha256Hex(expectedPassword);
  const response = NextResponse.redirect(new URL(safeRedirect, request.url), { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return response;
}
