"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Check, Bell } from "lucide-react";

export function NotificationPrefs() {
  const [mentionsPush, setMentionsPush] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("syncpro_notification_prefs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.mentionsPush !== undefined) return Boolean(parsed.mentionsPush);
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [commentsPush, setCommentsPush] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("syncpro_notification_prefs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.commentsPush !== undefined) return Boolean(parsed.commentsPush);
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [workspaceEmail, setWorkspaceEmail] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("syncpro_notification_prefs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.workspaceEmail !== undefined) return Boolean(parsed.workspaceEmail);
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    try {
      localStorage.setItem(
        "syncpro_notification_prefs",
        JSON.stringify({
          mentionsPush,
          commentsPush,
          workspaceEmail,
        })
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Активность в документах
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">
                Упоминания (@username)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Когда вас тегают в тексте документа или комментарии
              </p>
            </div>
            <Switch checked={mentionsPush} onCheckedChange={setMentionsPush} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">
                Новые комментарии
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Уведомления об ответах в тредах ваших правок
              </p>
            </div>
            <Switch checked={commentsPush} onCheckedChange={setCommentsPush} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Email-дайджесты
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">
                Еженедельный дайджест правок
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Сводка изменений в документах вашего рабочего пространства
              </p>
            </div>
            <Switch checked={workspaceEmail} onCheckedChange={setWorkspaceEmail} />
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              Сохранено
            </>
          ) : (
            "Сохранить настройки"
          )}
        </Button>
        {saved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Настройки уведомлений успешно обновлены
          </span>
        )}
      </div>
    </div>
  );
}
