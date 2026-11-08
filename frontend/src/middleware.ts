import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/doc/"];

interface DecodedToken {
  id?: string;
  email?: string;
  role?: string;
  email_verified?: boolean;
  status?: string;
  exp?: number;
}

/**
 * Validates JWT cryptographic HMAC-SHA256 signature in Edge Runtime (SEC-03).
 */
async function verifyJwtPayload(token: string): Promise<DecodedToken | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    // Verify HMAC-SHA256 signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = enc.encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!isValid) return null;

    // Decode payload
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonStr);

    // Expiry check
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public demo document
  if (pathname === "/doc/demo") {
    return NextResponse.next();
  }

  const token = request.cookies.get("syncpro_token")?.value;
  const payload = token ? await verifyJwtPayload(token) : null;

  // 1. Zero Leakage for /admin: strict 404 for non-admins
  if (pathname.startsWith("/admin")) {
    if (!token || !payload || payload.role !== "admin") {
      const notFoundUrl = new URL("/not-found", request.url);
      return NextResponse.rewrite(notFoundUrl, { status: 404 });
    }
  }

  // 2. Check if user is blocked
  if (payload && payload.status === "blocked") {
    const response = NextResponse.redirect(new URL("/auth/login?error=account_blocked", request.url));
    response.cookies.delete("syncpro_token");
    return response;
  }

  // 3. Email verification requirement for workspace & editor access
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/doc/")) {
    if (token && payload && payload.email_verified === false) {
      const verifyUrl = new URL("/auth/verify-email", request.url);
      if (payload.email) {
        verifyUrl.searchParams.set("email", payload.email);
      }
      return NextResponse.redirect(verifyUrl);
    }
  }

  // 4. Standard auth protection: redirect to login if missing or invalid token
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && (!token || !payload)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/doc/:path*", "/admin/:path*"],
};
