import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "syncpro-prod-super-secret-jwt-key-minimum-32-chars";
const TOKEN_EXPIRY = "7d";

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
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
