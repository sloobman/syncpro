import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { UserRepository, SafeUser } from "@/lib/auth/user-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export type AdminAuthResult =
  | { ok: true; adminUser: SafeUser }
  | { ok: false; response: NextResponse };

/**
 * Strict Admin Guard for API Route Handlers.
 * Implements Zero Leakage: Non-admin or unauthenticated requests receive HTTP 404 (Not Found).
 */
export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const payload = getUserFromRequest(request);
    if (!payload || !payload.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Not Found" }, { status: 404 }),
      };
    }

    // Double check in database to prevent stale token elevation/revocation issues
    const user = await UserRepository.findById(payload.id);
    if (!user || user.role !== "admin") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Not Found" }, { status: 404 }),
      };
    }

    return { ok: true, adminUser: user };
  } catch (error) {
    if (isPrerenderInterrupted(error)) {
      throw error;
    }
    return {
      ok: false,
      response: NextResponse.json({ error: "Not Found" }, { status: 404 }),
    };
  }
}
