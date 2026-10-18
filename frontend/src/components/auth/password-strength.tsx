"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  met: boolean;
}

function getStrengthChecks(password: string): StrengthCheck[] {
  return [
    { label: "Минимум 8 символов", met: password.length >= 8 },
    { label: "Заглавная буква", met: /[A-Z]/.test(password) },
    { label: "Цифра", met: /\d/.test(password) },
    {
      label: "Специальный символ",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];
}

function getStrengthColor(strength: number): string {
  switch (strength) {
    case 0:
      return "bg-muted";
    case 1:
      return "bg-red-500";
    case 2:
      return "bg-orange-500";
    case 3:
      return "bg-yellow-500";
    case 4:
      return "bg-green-500";
    default:
      return "bg-muted";
  }
}

function getStrengthLabel(strength: number): string {
  switch (strength) {
    case 0:
      return "";
    case 1:
      return "Слабый";
    case 2:
      return "Средний";
    case 3:
      return "Хороший";
    case 4:
      return "Надёжный";
    default:
      return "";
  }
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = useMemo(() => getStrengthChecks(password), [password]);
  const strength = useMemo(
    () => checks.filter((c) => c.met).length,
    [checks]
  );
  const strengthColor = getStrengthColor(strength);
  const strengthLabel = getStrengthLabel(strength);

  if (!password) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Надёжность пароля
          </span>
          {strengthLabel && (
            <span
              className={cn(
                "text-xs font-medium",
                strength === 1 && "text-red-500",
                strength === 2 && "text-orange-500",
                strength === 3 && "text-yellow-500",
                strength === 4 && "text-green-500"
              )}
            >
              {strengthLabel}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i < strength ? strengthColor : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              check.met ? "text-green-500" : "text-muted-foreground"
            )}
          >
            {check.met ? (
              <Check className="size-3.5 shrink-0" />
            ) : (
              <X className="size-3.5 shrink-0" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
