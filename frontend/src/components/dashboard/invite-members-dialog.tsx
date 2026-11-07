"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, CheckCircle2 } from "lucide-react";
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

const defaultTeamMembers: MemberItem[] = [
  { id: "u2", name: "Алиса Смирнова", email: "alice@syncpro.dev", role: "Редактор" },
  { id: "u3", name: "Константин Козлов", email: "konstantin@syncpro.dev", role: "Редактор" },
];

export function InviteMembersDialog({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [copied, setCopied] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [extraMembers, setExtraMembers] = useState<MemberItem[]>([]);
  const { user } = useAuthStore();

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://syncpro.dev";
    navigator.clipboard.writeText(`${origin}/invite/my-project`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleLabelMap: Record<string, string> = {
    editor: "Редактор",
    commenter: "Комментатор",
    viewer: "Читатель",
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const newMember: MemberItem = {
      id: `m_${Date.now()}`,
      name: email.split("@")[0],
      email: email.trim().toLowerCase(),
      role: roleLabelMap[role] || "Редактор",
    };

    setExtraMembers((prev) => [newMember, ...prev]);
    setInviteSuccess(`Приглашение отправлено на ${email.trim()}`);
    setEmail("");
    setTimeout(() => setInviteSuccess(null), 3000);
  };

  const currentMember: MemberItem = {
    id: user?.id || "me",
    name: user?.name ? `${user.name} (Вы)` : "Вы",
    email: user?.email || "user@syncpro.dev",
    role: "Владелец",
  };

  const allMembers = [currentMember, ...extraMembers, ...defaultTeamMembers];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2 text-xs h-9 cursor-pointer">
            <UserPlus className="h-4 w-4" />
            Участники ({allMembers.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Участники пространства</DialogTitle>
          <DialogDescription>
            Приглашайте команду и настраивайте права доступа в реальном времени
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Success notice */}
          {inviteSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{inviteSuccess}</span>
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
            <Button type="submit" disabled={!email.trim()} className="text-xs shrink-0 cursor-pointer">
              Пригласить
            </Button>
          </form>

          {/* Members list */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              В пространстве ({allMembers.length})
            </p>
            <div className="divide-y divide-border border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              {allMembers.map((m) => (
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
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                      {m.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Share link */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              Ссылка для быстрого присоединения
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}/invite/my-project` : "https://syncpro.dev/invite/my-project"}
                className="text-xs font-mono bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0 cursor-pointer"
                title="Скопировать ссылку"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
