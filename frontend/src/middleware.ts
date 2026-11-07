import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/doc/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Исключаем публичный демо-документ, если он должен быть доступен без авторизации
  if (pathname === "/doc/demo") {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    const token = request.cookies.get("syncpro_token")?.value;
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/doc/:path*"],
};
