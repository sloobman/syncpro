"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validators/auth";
import { PasswordStrength } from "@/components/auth/password-strength";

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = watch("password");

  async function onSubmit(data: ResetPasswordFormValues) {
    // Placeholder for API call
    console.log("Reset password form data:", data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSuccess(true);
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Пароль обновлён</h3>
          <p className="text-sm text-muted-foreground">
            Ваш пароль был успешно изменён. Теперь вы можете войти с новым
            паролем.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/auth/login">Войти</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-password">Новый пароль</Label>
        <div className="relative">
          <Input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className={cn(
              "pr-10",
              errors.password && "border-red-500 focus-visible:ring-red-500"
            )}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              <EyeOff className="size-4 text-muted-foreground" />
            ) : (
              <Eye className="size-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
        <PasswordStrength password={watchedPassword} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Подтвердите пароль</Label>
        <div className="relative">
          <Input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className={cn(
              "pr-10",
              errors.confirmPassword &&
                "border-red-500 focus-visible:ring-red-500"
            )}
            {...register("confirmPassword")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={
              showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4 text-muted-foreground" />
            ) : (
              <Eye className="size-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Сбросить пароль
      </Button>
    </form>
  );
}
