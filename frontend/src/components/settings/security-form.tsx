"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone, KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) return;
    setPassUpdated(true);
    setTimeout(() => {
      setPassUpdated(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 2000);
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Change password */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Смена пароля
        </h3>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="curr-pass">Текущий пароль</Label>
            <Input
              id="curr-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pass">Новый пароль</Label>
            <Input
              id="new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conf-pass">Подтвердите новый пароль</Label>
            <Input
              id="conf-pass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={!newPassword || newPassword !== confirmPassword}>
          {passUpdated ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Пароль обновлён
            </span>
          ) : (
            "Обновить пароль"
          )}
        </Button>
      </form>

      <Separator />

      {/* Two-Factor Authentication */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Двухфакторная аутентификация (2FA)
        </h3>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Защита через приложение-аутентификатор
            </p>
            <p className="text-xs text-muted-foreground">
              Используйте Google Authenticator или 1Password для генерации кодов
            </p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </div>
      </div>

      <Separator />

      {/* Active Sessions */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Активные сессии
        </h3>

        <div className="divide-y divide-border border rounded-xl overflow-hidden bg-card text-xs">
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Chrome на macOS (Текущее устройство)
              </p>
              <p className="text-muted-foreground mt-0.5">
                Москва, Россия • IP: 185.120.45.10
              </p>
            </div>
            <span className="text-emerald-500 font-medium">Активна</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Safari на iPhone 15 Pro</p>
              <p className="text-muted-foreground mt-0.5">
                Москва, Россия • 2 дня назад
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive">
              Завершить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
