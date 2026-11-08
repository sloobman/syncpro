import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified?: boolean;
  status?: string;
}

const TOKEN_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[SECURITY] JWT_SECRET environment variable is not set. " +
      "Refusing to start or operate without JWT_SECRET."
    );
  }
  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      return decoded as unknown as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractToken(request: NextRequest): string | null {
  // 1. Try reading from Authorization header: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // 2. Try reading from HTTP-only cookie
  const cookie = request.cookies.get("syncpro_token");
  if (cookie?.value) {
    return cookie.value;
  }

  return null;
}

export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}
