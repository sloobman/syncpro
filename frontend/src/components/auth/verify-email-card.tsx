"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerifyEmailCardProps {
  email?: string;
}

export function VerifyEmailCard({
  email = "user@example.com",
}: VerifyEmailCardProps) {
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isSending) return;

    setIsSending(true);
    try {
      // Placeholder for API call
      console.log("Resending verification email to:", email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCooldown(60);
    } finally {
      setIsSending(false);
    }
  }, [cooldown, isSending, email]);

  return (
    <div className="flex flex-col items-center space-y-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <Mail className="size-8 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Подтвердите email
        </h2>
        <p className="text-sm text-muted-foreground">
          Мы отправили письмо на{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Перейдите по ссылке в письме, чтобы подтвердить ваш аккаунт.
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={cooldown > 0 || isSending}
      >
        {isSending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        {cooldown > 0
          ? `Отправить повторно (${cooldown}с)`
          : "Отправить повторно"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Не получили письмо? Проверьте папку «Спам»
      </p>
    </div>
  );
}
