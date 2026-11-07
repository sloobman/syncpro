"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useAuthStore } from "@/lib/stores/auth-store";

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  const watchedPassword = watch("password");

  const onInvalid = (fieldErrors: FieldErrors<RegisterFormValues>) => {
    if (fieldErrors.name) {
      setFormError(fieldErrors.name.message || "Введите имя");
    } else if (fieldErrors.email) {
      setFormError(fieldErrors.email.message || "Введите корректный email");
    } else if (fieldErrors.password) {
      setFormError(fieldErrors.password.message || "Введите надежный пароль");
    } else if (fieldErrors.confirmPassword) {
      setFormError(fieldErrors.confirmPassword.message || "Пароли не совпадают");
    } else if (fieldErrors.acceptTerms) {
      setFormError("Необходимо принять условия использования и политику конфиденциальности");
    } else {
      setFormError("Пожалуйста, заполните обязательные поля корректно");
    }
  };

  async function onSubmit(data: RegisterFormValues) {
    try {
      setApiError(null);
      setFormError(null);
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("Не удалось создать аккаунт. Попробуйте позже.");
      }
    }
  }

  const activeError = formError || apiError;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
      {activeError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive dark:border-destructive/40 dark:bg-destructive/20"
        >
          {activeError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="register-name">Имя</Label>
        <Input
          id="register-name"
          placeholder="Ваше имя"
          autoComplete="name"
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
          {...register("name")}
        />
        {errors.name && (
          <p role="alert" className="text-xs font-medium text-destructive error">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className="text-xs font-medium text-destructive error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Пароль</Label>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            placeholder="Придумайте пароль"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!errors.password}
            className={cn(
              "pr-10",
              errors.password && "border-destructive focus-visible:ring-destructive"
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
          <p role="alert" className="text-xs font-medium text-destructive error">
            {errors.password.message}
          </p>
        )}
        <PasswordStrength password={watchedPassword ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Подтверждение пароля</Label>
        <div className="relative">
          <Input
            id="register-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!errors.confirmPassword}
            className={cn(
              "pr-10",
              errors.confirmPassword &&
                "border-destructive focus-visible:ring-destructive"
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
          <p role="alert" className="text-xs font-medium text-destructive error">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="accept-terms"
            aria-label="Принять условия соглашения"
            aria-required="true"
            aria-invalid={!!errors.acceptTerms}
            checked={!!watch("acceptTerms")}
            onCheckedChange={(checked) => {
              setValue("acceptTerms", checked === true ? (true as unknown as true) : (false as unknown as true), {
                shouldValidate: true,
                shouldDirty: true,
              });
              if (checked === true && formError?.includes("условия")) {
                setFormError(null);
              }
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
              условиями использования
            </Link>{" "}
            и{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary hover:underline"
              target="_blank"
            >
              политикой конфиденциальности
            </Link>
          </Label>
        </div>
        {errors.acceptTerms && (
          <p role="alert" className="text-xs font-medium text-destructive error">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Зарегистрироваться
      </Button>
    </form>
  );
}
