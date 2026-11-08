"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";

interface VerifyEmailCardProps {
  initialEmail?: string;
}

export function VerifyEmailCard({ initialEmail }: VerifyEmailCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  const urlEmail = searchParams.get("email");
  const urlToken = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [email] = useState(() => initialEmail || urlEmail || "");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, startVerifyingTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(
    urlError ? "Ссылка недействительна или срок её действия истек" : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeEmail = email || currentUser?.email || "";

  // Handle countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle automatic verification if token is in query param
  useEffect(() => {
    if (!urlToken) return;

    let isMounted = true;
    startVerifyingTransition(async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(urlToken)}`);
        if (res.redirected) {
          await checkAuth();
          window.location.href = res.url;
          return;
        }
        if (res.ok && isMounted) {
          setSuccessMsg("Email успешно подтвержден! Перенаправление...");
          await checkAuth();
          setTimeout(() => {
            router.push("/dashboard?verified=true");
          }, 1200);
        } else if (isMounted) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || "Ссылка недействительна или срок ее действия истек");
        }
      } catch {
        if (isMounted) {
          setErrorMsg("Ошибка связи с сервером при подтверждении email");
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [urlToken, router, checkAuth]);

  // Handle resend email
  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isSending) return;
    if (!activeEmail) {
      setErrorMsg("Укажите email адрес");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email: activeEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Не удалось отправить письмо");
        if (data.cooldownSeconds) {
          setCooldown(data.cooldownSeconds);
        }
      } else {
        setSuccessMsg(data.message || "Новый код отправлен на вашу почту");
        setCooldown(60);
      }
    } catch {
      setErrorMsg("Не удалось связаться с сервером");
    } finally {
      setIsSending(false);
    }
  }, [cooldown, isSending, activeEmail]);

  // Handle OTP submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg("Пожалуйста, введите полный 6-значный код");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startVerifyingTransition(async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: activeEmail.trim(),
            otp: otp.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Неверный код подтверждения");
        } else {
          setSuccessMsg("Email успешно подтвержден! Перенаправление...");
          await checkAuth();
          setTimeout(() => {
            router.push("/dashboard?verified=true");
          }, 1000);
        }
      } catch {
        setErrorMsg("Ошибка сети при отправке кода");
      }
    });
  };

  return (
    <div className="flex flex-col items-center space-y-6 text-center max-w-sm mx-auto">
      <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
        <Mail className="size-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Подтверждение Email</h2>
        <p className="text-sm text-muted-foreground">
          Мы отправили 6-значный код подтверждения на{" "}
          <span className="font-semibold text-foreground">
            {activeEmail || "ваш почтовый ящик"}
          </span>
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 w-full text-left">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 w-full text-left">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* OTP Code Form */}
      <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
        <div className="space-y-1">
          <Input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setOtp(val);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="000000"
            className="text-center font-mono text-2xl tracking-[0.5em] h-12"
            autoFocus
            disabled={isVerifying}
          />
          <p className="text-[11px] text-muted-foreground">Введите 6 цифр из письма</p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={otp.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <ArrowRight className="size-4 mr-2" />
          )}
          Подтвердить
        </Button>
      </form>

      {/* Resend button */}
      <div className="w-full space-y-2 pt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={handleResend}
          disabled={cooldown > 0 || isSending}
        >
          {isSending ? (
            <Loader2 className="size-3.5 animate-spin mr-2" />
          ) : null}
          {cooldown > 0
            ? `Отправить код повторно (${cooldown}с)`
            : "Отправить код повторно"}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Не пришел код? Проверьте папку «Спам» или убедитесь в правильности email.
        </p>
      </div>
    </div>
  );
}
