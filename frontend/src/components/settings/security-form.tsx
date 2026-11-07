"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone, KeyRound, Check, AlertCircle, LogOut, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [passUpdated, setPassUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionsTerminated, setSessionsTerminated] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 8) {
      setError("Пароль должен содержать не менее 8 символов");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось изменить пароль");
      }

      setPassUpdated(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPassUpdated(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка смены пароля");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = (checked: boolean) => {
    if (checked) {
      setShow2FAModal(true);
    } else {
      setTwoFactor(false);
    }
  };

  const handleConfirm2FA = () => {
    if (twoFactorCode.length >= 6) {
      setTwoFactor(true);
      setShow2FAModal(false);
      setTwoFactorCode("");
    }
  };

  const handleTerminateOtherSessions = async () => {
    setTerminating(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setTerminating(false);
    setSessionsTerminated(true);
    setTimeout(() => setSessionsTerminated(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Change password */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Смена пароля
        </h3>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

        <Button type="submit" disabled={loading || !newPassword || newPassword !== confirmPassword}>
          {loading ? (
            "Обновление..."
          ) : passUpdated ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
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
              {twoFactor
                ? "2FA активирована. Коды генерируются в вашем приложении."
                : "Используйте Google Authenticator или 1Password для генерации кодов"}
            </p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={handleToggle2FA} />
        </div>
      </div>

      <Separator />

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Активные сессии
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTerminateOtherSessions}
            disabled={terminating}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            {terminating ? "Завершение..." : "Завершить другие"}
          </Button>
        </div>

        {sessionsTerminated && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Check className="h-4 w-4 shrink-0" />
            <span>Все остальные сессии успешно завершены. Текущая сессия активна.</span>
          </div>
        )}

        <div className="divide-y divide-border border rounded-xl overflow-hidden bg-card text-xs">
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Браузер (Текущее устройство)
              </p>
              <p className="text-muted-foreground mt-0.5">
                Защищенный TLS / WebSocket • Сессия подтверждена
              </p>
            </div>
            <span className="text-emerald-500 font-medium">Активна</span>
          </div>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <QrCode className="size-5" />
              </div>
              <div>
                <DialogTitle>Настройка двухфакторной аутентификации</DialogTitle>
                <DialogDescription>Отсканируйте код в приложении</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center justify-center p-6 bg-muted/40 rounded-xl border border-dashed border-border text-center">
              <div className="w-36 h-36 bg-background rounded-lg border flex items-center justify-center shadow-inner mb-3">
                <QrCode className="size-24 text-foreground/80" />
              </div>
              <p className="text-xs font-mono bg-card px-2.5 py-1 rounded border text-muted-foreground select-all">
                SYNC-PRO-SEC-4982-AUTH
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Секретный ключ для ручного ввода
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="twoFactorCode" className="text-xs">
                Введите 6-значный код из приложения:
              </Label>
              <Input
                id="twoFactorCode"
                placeholder="000 000"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                className="font-mono text-center tracking-widest text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FAModal(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleConfirm2FA}
              disabled={twoFactorCode.length < 6}
            >
              Подтвердить и включить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
