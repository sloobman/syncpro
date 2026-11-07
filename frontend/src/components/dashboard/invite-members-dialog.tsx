"use client";

import { useState, useCallback } from "react";
import { UserPlus, Copy, Check, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/stores/auth-store";

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function InviteMembersDialog({
  workspaceId,
  children,
}: {
  workspaceId?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const { user } = useAuthStore();

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // offline
    }
  }, [workspaceId]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && workspaceId) {
      loadMembers();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = workspaceId
        ? `${window.location.origin}/dashboard/workspace/${workspaceId}`
        : window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading || !workspaceId) return;

    setLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Не удалось отправить приглашение");
      }

      setInviteSuccess(data.message || `Приглашение отправлено на ${email.trim()}`);
      setEmail("");
      loadMembers();
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Ошибка при отправке приглашения");
    } finally {
      setLoading(false);
    }
  };

  // Fallback member if list is empty
  const displayMembers =
    members.length > 0
      ? members
      : [
          {
            id: user?.id || "me",
            name: user?.name ? `${user.name} (Вы)` : "Вы",
            email: user?.email || "user@syncpro.dev",
            role: "Владелец",
          },
        ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2 text-xs h-9 cursor-pointer">
            <UserPlus className="h-4 w-4" />
            Участники ({displayMembers.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Участники пространства</DialogTitle>
          <DialogDescription>
            Совместный доступ предоставляется только приглашенным пользователям
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Notifications */}
          {inviteSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          {inviteError && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {/* Invite form */}
          <form onSubmit={handleInviteSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 text-xs"
              required
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Редактор</SelectItem>
                <SelectItem value="commenter">Комменты</SelectItem>
                <SelectItem value="viewer">Читатель</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={loading || !email.trim() || !workspaceId}
              className="text-xs shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Пригласить"}
            </Button>
          </form>

          {/* Members list */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              В пространстве ({displayMembers.length})
            </p>
            <div className="divide-y divide-border border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {displayMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {m.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {m.name} {m.email === user?.email ? "(Вы)" : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted shrink-0">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Copy invite link */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Ссылка на рабочее пространство
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  typeof window !== "undefined" && workspaceId
                    ? `${window.location.origin}/dashboard/workspace/${workspaceId}`
                    : ""
                }
                className="text-xs font-mono bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="text-xs shrink-0 gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Копировать
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Доступ по ссылке будет открыт только тем пользователям, которых вы добавили в список выше.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
