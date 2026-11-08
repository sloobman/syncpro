"use client";

import { useEffect, useState } from "react";
import {
  Zap,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Dices,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PromoCode {
  id: string;
  code: string;
  plan: "pro" | "enterprise";
  duration_days: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // New promo state
  const [newCode, setNewCode] = useState("");
  const [newPlan, setNewPlan] = useState<"pro" | "enterprise">("pro");
  const [newDuration, setNewDuration] = useState("30");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/promo-codes", { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setPromoCodes(data.promoCodes || []);
        }
      } catch (err) {
        console.error("Failed to fetch promos:", err);
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

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const reloadData = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(`PRO-${randomPart}`);
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: newCode.trim(),
          plan: newPlan,
          durationDays: parseInt(newDuration, 10) || 30,
          maxUses: newMaxUses.trim() ? parseInt(newMaxUses, 10) : null,
        }),
      });

      if (res.ok) {
        showFeedback("Промокод успешно создан");
        setNewCode("");
        setNewMaxUses("");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка создания промокода", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePromo = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        reloadData();
      }
    } catch {
      showFeedback("Не удалось изменить статус промокода", "error");
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/promo-codes?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        showFeedback("Промокод удален");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Не удалось удалить промокод", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Управление промокодами</h2>
        <p className="text-sm text-muted-foreground">
          Создавайте и управляйте промокодами для предоставления доступа к Pro и Enterprise планам.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-3 text-xs rounded-lg border ${
            feedbackMsg.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Generator Card */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            Создать новый промокод
          </CardTitle>
          <CardDescription>
            Задайте кодовое слово или сгенерируйте случайный ключ с нужными параметрами тарифа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePromo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="promo-name">Промокод</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="promo-name"
                    placeholder="SYNCPRO-PRO-2026"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-xs"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomCode}
                    title="Сгенерировать случайно"
                    className="shrink-0"
                  >
                    <Dices className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Тарифный план</Label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as "pro" | "enterprise")}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="pro">Pro (10 ГБ, кастомные шрифты)</option>
                  <option value="enterprise">Enterprise (100 ГБ, бизнес)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="promo-duration">Срок действия (дней)</Label>
                <Input
                  id="promo-duration"
                  type="number"
                  min="1"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="promo-max-uses">Лимит активаций (пусто = безлимит)</Label>
                <Input
                  id="promo-max-uses"
                  type="number"
                  min="1"
                  placeholder="Без ограничений"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <Button type="submit" disabled={!newCode.trim() || isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              <span>Создать промокод</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Promo Codes Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Код</th>
                <th className="py-3 px-4">Тариф</th>
                <th className="py-3 px-4">Длительность</th>
                <th className="py-3 px-4">Использовано</th>
                <th className="py-3 px-4">Активен</th>
                <th className="py-3 px-4">Дата создания</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Загрузка промокодов...
                  </td>
                </tr>
              ) : promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Промокодов пока нет. Создайте первый промокод выше.
                  </td>
                </tr>
              ) : (
                promoCodes.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{p.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCode(p.id, p.code)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title="Скопировать промокод"
                        >
                          {copiedId === p.id ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="uppercase text-[10px] font-bold py-0">
                        {p.plan}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {p.duration_days} дн.
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {p.times_used} / {p.max_uses !== null ? p.max_uses : "∞"}
                    </td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={() => handleTogglePromo(p.id, p.is_active)}
                      />
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePromo(p.id)}
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Удалить промокод"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
