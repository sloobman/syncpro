"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth";
import { PasswordStrength } from "@/components/auth/password-strength";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  const watchedPassword = watch("password");

  async function onSubmit(data: RegisterFormValues) {
    try {
      setApiError(null);
      // Placeholder for API call
      console.log("Register form data:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      setApiError("Не удалось создать аккаунт. Попробуйте позже.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {apiError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
        >
          {apiError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="register-name">Полное имя</Label>
        <Input
          id="register-name"
          type="text"
          placeholder="Иван Иванов"
          autoComplete="name"
          aria-invalid={!!errors.name}
          className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
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

      <div className="space-y-2">
        <Label htmlFor="register-password">Пароль</Label>
        <div className="relative">
          <Input
            id="register-password"
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
        <Label htmlFor="register-confirm-password">Подтвердите пароль</Label>
        <div className="relative">
          <Input
            id="register-confirm-password"
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

      <div className="flex items-start gap-2">
        <Checkbox
          id="accept-terms"
          aria-invalid={!!errors.acceptTerms}
          onCheckedChange={(checked) => {
            setValue("acceptTerms", (checked === true) as unknown as true);
            trigger("acceptTerms");
          }}
        />
        <Label
          htmlFor="accept-terms"
          className="text-sm font-normal leading-snug cursor-pointer"
        >
          Я согласен с{" "}
          <Link
            href="/terms"
            className="font-medium text-primary hover:underline"
            target="_blank"
          >
            Условиями использования
          </Link>{" "}
          и{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary hover:underline"
            target="_blank"
          >
            Политикой конфиденциальности
          </Link>
        </Label>
      </div>
      {errors.acceptTerms && (
        <p className="text-xs text-red-500">{errors.acceptTerms.message}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Создать аккаунт
      </Button>
    </form>
  );
}
