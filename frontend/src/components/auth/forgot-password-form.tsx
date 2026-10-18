"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validators/auth";

export function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    // Placeholder for API call
    console.log("Forgot password form data:", data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSentEmail(data.email);
    setIsSuccess(true);
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Ссылка отправлена</h3>
          <p className="text-sm text-muted-foreground">
            Ссылка отправлена на{" "}
            <span className="font-medium text-foreground">{sentEmail}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Проверьте вашу почту и перейдите по ссылке для сброса пароля.
          Если письмо не пришло, проверьте папку «Спам».
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Введите email, который вы использовали при регистрации. Мы отправим вам
        ссылку для сброса пароля.
      </p>

      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Отправить ссылку
      </Button>

      <div className="text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Вернуться ко входу
        </Link>
      </div>
    </form>
  );
}
