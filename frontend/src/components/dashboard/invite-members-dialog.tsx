"use client";

import { useState } from "react";
import { UserPlus, Copy, Check, Trash2 } from "lucide-react";
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

const mockMembers = [
  { id: "u1", name: "Иван Петров (Вы)", email: "ivan@syncpro.ru", role: "Владелец" },
  { id: "u2", name: "Алиса Смирнова", email: "alice@example.com", role: "Редактор" },
  { id: "u3", name: "Боб Козлов", email: "bob@example.com", role: "Редактор" },
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://syncpro.ru/invite/invite_abc123xyz");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Участники
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Участники пространства</DialogTitle>
          <DialogDescription>
            Приглашайте команду и управляйте уровнями доступа
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Invite form */}
          <div className="flex gap-2">
            <Input
              placeholder="Коллега@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Редактор</SelectItem>
                <SelectItem value="commenter">Комменты</SelectItem>
                <SelectItem value="viewer">Читатель</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={!email.trim()}>Пригласить</Button>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              В пространстве ({mockMembers.length})
            </p>
            <div className="divide-y divide-border border rounded-lg overflow-hidden">
              {mockMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {m.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
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
                value="https://syncpro.ru/invite/invite_abc123xyz"
                className="text-xs font-mono bg-muted/40"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
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
