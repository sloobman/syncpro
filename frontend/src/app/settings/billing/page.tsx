"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  FolderKanban,
  FileText,
  Type,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  id: string;
  plan: "free" | "pro" | "enterprise";
  status: string;
  starts_at: string;
  expires_at: string | null;
  storage_limit_bytes: number;
  max_workspaces: number;
}

interface BillingData {
  subscription: SubscriptionInfo;
  storageUsedBytes: number;
  workspacesCount: number;
  documentsCount: number;
  canUseCustomFonts: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/billing/subscription", { credentials: "include" });
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load subscription info:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setIsSubmittingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await fetch("/api/billing/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const result = await res.json();
      if (!res.ok) {
        setPromoError(result.error || "Не удалось применить промокод");
      } else {
        setPromoSuccess(result.message || "Промокод успешно активирован!");
        setPromoCode("");
        setIsLoading(true);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setPromoError("Ошибка подключения к серверу");
    } finally {
      setIsSubmittingPromo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sub = data?.subscription;
  const plan = sub?.plan || "free";
  const usedStorage = data?.storageUsedBytes || 0;
  const limitStorage = sub?.storage_limit_bytes || 104857600;
  const storagePercentage = Math.min(100, Math.round((usedStorage / limitStorage) * 100));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Тариф и подписка</h2>
        <p className="text-sm text-muted-foreground">
          Управляйте вашим планом, квотами хранилища и промокодами.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Текущий тариф:{" "}
              <span className="font-extrabold uppercase text-primary">
                {plan}
              </span>
              <Badge
                variant={sub?.status === "active" ? "default" : "secondary"}
                className={
                  sub?.status === "active"
                    ? "bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/30"
                    : ""
                }
              >
                {sub?.status === "active"
                  ? "Активен"
                  : sub?.status === "trial"
                  ? "Пробный период"
                  : "Истек"}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {sub?.expires_at
                ? `Действует до ${new Date(sub.expires_at).toLocaleDateString("ru-RU")}`
                : "Бессрочный базовый тариф"}
            </CardDescription>
          </div>
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {plan === "pro" || plan === "enterprise" ? (
              <Sparkles className="size-6" />
            ) : (
              <CreditCard className="size-6" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Storage usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <HardDrive className="size-4 text-muted-foreground" />
                Хранилище документов и файлов
              </span>
              <span className="text-muted-foreground">
                {formatBytes(usedStorage)} из {formatBytes(limitStorage)} ({storagePercentage}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercentage > 90
                    ? "bg-red-500"
                    : storagePercentage > 75
                    ? "bg-yellow-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.max(2, storagePercentage)}%` }}
              />
            </div>
          </div>

          {/* Quick Quota Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-lg border border-border/50 bg-card/40 flex items-center gap-3">
              <FolderKanban className="size-5 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Пространства</div>
                <div className="text-sm font-semibold">
                  {data?.workspacesCount || 0} / {sub?.max_workspaces || 3}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/50 bg-card/40 flex items-center gap-3">
              <FileText className="size-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Документов создано</div>
                <div className="text-sm font-semibold">
                  {data?.documentsCount || 0}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/50 bg-card/40 flex items-center gap-3">
              <Type className="size-5 text-indigo-500 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Кастомные шрифты</div>
                <div className="text-sm font-semibold">
                  {data?.canUseCustomFonts ? "Включены (Pro)" : "Недоступны (Free)"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promo Code Card */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-amber-500" />
            Активация промокода
          </CardTitle>
          <CardDescription>
            Если у вас есть подарочный или корпоративный промокод, введите его здесь для расширения тарифа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRedeemPromo} className="space-y-4 max-w-md">
            <div className="flex gap-2">
              <Input
                placeholder="SYNCPRO-PRO-2026"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  if (promoError) setPromoError(null);
                }}
                className="font-mono uppercase tracking-wider"
                disabled={isSubmittingPromo}
              />
              <Button type="submit" disabled={!promoCode.trim() || isSubmittingPromo}>
                {isSubmittingPromo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Применить"
                )}
              </Button>
            </div>

            {promoError && (
              <div className="flex items-center gap-2 p-2.5 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{promoError}</span>
              </div>
            )}

            {promoSuccess && (
              <div className="flex items-center gap-2 p-2.5 text-xs rounded-md bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{promoSuccess}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div className="pt-4">
        <h3 className="text-base font-semibold mb-4">Сравнение планов</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free */}
          <div className="p-5 rounded-xl border border-border/60 bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-base">Free</h4>
                <Badge variant="outline">0 ₽</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Базовый тариф для личных заметок и легкой работы
              </p>
              <ul className="text-xs space-y-2.5 text-muted-foreground">
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  Хранилище до 100 МБ
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  До 3 рабочих пространств
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                  Совместное редактирование CRDT
                </li>
                <li className="flex items-center gap-2 text-muted-foreground/60">
                  <span className="size-3.5 text-center leading-3">✕</span>
                  Кастомные шрифты (Google & TTF)
                </li>
              </ul>
            </div>
            {plan === "free" && (
              <div className="mt-6 text-center text-xs font-medium text-muted-foreground">
                Ваш текущий тариф
              </div>
            )}
          </div>

          {/* Pro */}
          <div className="p-5 rounded-xl border-2 border-primary/40 bg-card/60 flex flex-col justify-between relative shadow-sm">
            <div className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              Популярный
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-base text-primary">Pro</h4>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Промокод
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Для профессиональных команд и авторов документов
              </p>
              <ul className="text-xs space-y-2.5">
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Хранилище до 10 ГБ
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  До 20 рабочих пространств
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Полная коллекция Google Fonts
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Загрузка собственных TTF / WOFF2 шрифтов
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Безлимитная история коммитов и веток
                </li>
              </ul>
            </div>
            {plan === "pro" ? (
              <div className="mt-6 text-center text-xs font-semibold text-primary">
                Ваш текущий тариф
              </div>
            ) : (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                Активируйте промокодом
              </div>
            )}
          </div>

          {/* Enterprise */}
          <div className="p-5 rounded-xl border border-border/60 bg-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-base">Enterprise</h4>
                <Badge variant="outline">Для бизнеса</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Корпоративная инфраструктура и неограниченные масштабы
              </p>
              <ul className="text-xs space-y-2.5 text-muted-foreground">
                <li className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-3.5 text-indigo-500 shrink-0" />
                  Хранилище 100 ГБ+
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-3.5 text-indigo-500 shrink-0" />
                  До 100 рабочих пространств
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-3.5 text-indigo-500 shrink-0" />
                  Приоритетная синхронизация и аудит
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="size-3.5 text-indigo-500 shrink-0" />
                  Выделенная поддержка
                </li>
              </ul>
            </div>
            {plan === "enterprise" ? (
              <div className="mt-6 text-center text-xs font-semibold text-indigo-500">
                Ваш текущий тариф
              </div>
            ) : (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                Свяжитесь с администратором
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
