import { NextRequest, NextResponse } from "next/server";
import { VerificationRepository } from "@/lib/db/verification-repository";
import { UserRepository } from "@/lib/auth/user-repository";
import { signToken, getUserFromRequest } from "@/lib/auth/jwt";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    const errorUrl = new URL("/auth/verify-email?error=missing_token", request.url);
    return NextResponse.redirect(errorUrl);
  }

  const result = await VerificationRepository.verifyToken(token);
  if (!result.success || !result.userId) {
    const errorUrl = new URL(
      `/auth/verify-email?error=${encodeURIComponent(result.error || "invalid_token")}`,
      request.url
    );
    return NextResponse.redirect(errorUrl);
  }

  const successUrl = new URL("/dashboard?verified=true", request.url);
  const response = NextResponse.redirect(successUrl);

  // SEC-01 Fix: Only update cookie IF current caller is ALREADY authenticated as this user
  const currentUser = getUserFromRequest(request);
  if (currentUser && currentUser.id === result.userId) {
    const user = await UserRepository.findById(result.userId);
    if (user) {
      const newToken = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: true,
        status: user.status,
      });

      response.cookies.set("syncpro_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }
  }

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, otp } = body;

    // Resend action
    if (action === "resend") {
      const targetEmail = (email || "").trim();
      if (!targetEmail) {
        return NextResponse.json(
          { error: "Email адрес обязателен" },
          { status: 400 }
        );
      }

      const resendRes = await VerificationRepository.resendVerification(targetEmail);
      if (!resendRes.success) {
        return NextResponse.json(
          { error: resendRes.error || "Не удалось отправить код повторно", cooldownSeconds: resendRes.cooldownSeconds },
          { status: 429 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Если такой аккаунт существует, новый код подтверждения отправлен на почту",
        simulated: resendRes.simulated,
      });
    }

    // OTP verification
    const cleanEmail = (email || "").trim();
    const cleanOtp = (otp || "").trim();

    if (!cleanEmail || !cleanOtp) {
      return NextResponse.json(
        { error: "Укажите email и 6-значный код подтверждения" },
        { status: 400 }
      );
    }

    const otpResult = await VerificationRepository.verifyOtp(cleanEmail, cleanOtp);
    if (!otpResult.success || !otpResult.userId) {
      return NextResponse.json(
        { error: otpResult.error || "Неверный или просроченный код подтверждения" },
        { status: 400 }
      );
    }

    const user = await UserRepository.findById(otpResult.userId);
    const response = NextResponse.json({
      success: true,
      message: "Email успешно подтвержден",
      user,
    });

    // SEC-02 Fix: Only update/refresh session cookie if client is currently authenticated as this user
    const currentSession = getUserFromRequest(request);
    if (currentSession && user && currentSession.id === user.id) {
      const newToken = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: true,
        status: user.status,
      });

      response.cookies.set("syncpro_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (err) {
    if (isPrerenderInterrupted(err)) throw err;
    console.error("[Verify Email POST Error]:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка при проверке email" },
      { status: 500 }
    );
  }
}
