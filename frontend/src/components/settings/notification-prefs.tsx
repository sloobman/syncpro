"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function NotificationPrefs() {
  const [mentionsEmail, setMentionsEmail] = useState(true);
  const [mentionsPush, setMentionsPush] = useState(true);
  const [commentsEmail, setCommentsEmail] = useState(false);
  const [commentsPush, setCommentsPush] = useState(true);
  const [workspaceEmail, setWorkspaceEmail] = useState(true);

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
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
    </div>
  );
}
