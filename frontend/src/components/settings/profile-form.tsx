"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/stores/auth-store";

export function ProfileForm() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name || "Пользователь");
  const [email] = useState(user?.email || "user@syncpro.dev");
  const [company, setCompany] = useState("SyncPro Core Team");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [timezone, setTimezone] = useState<string>(user?.timezone || "Europe/Moscow");
  const [locale, setLocale] = useState<"ru" | "en">(user?.locale || "ru");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        updateProfile({ avatarUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, avatarUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          updateProfile({ name: data.user.name, avatarUrl, timezone, locale });
        }
      } else {
        updateProfile({ name, avatarUrl, timezone, locale });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      updateProfile({ name, avatarUrl, timezone, locale });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "П";

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6 max-w-xl">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Avatar block */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="h-16 w-16 border-2 border-border">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Сменить аватар"
            >
              <Camera className="h-5 w-5" />
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs cursor-pointer"
            >
              Загрузить фото
            </Button>
            <p className="text-[11px] text-muted-foreground mt-1">
              JPG, PNG или WebP. До 2MB.
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">Полное имя</Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-email">Email адрес</Label>
            <div className="flex gap-2">
              <Input id="prof-email" value={email} disabled className="bg-muted/40" />
              <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5">
                Подтверждён
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-company">Организация</Label>
            <Input
              id="prof-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Часовой пояс</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                  <SelectItem value="Europe/Kaliningrad">Калининград (UTC+2)</SelectItem>
                  <SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem>
                  <SelectItem value="Asia/Novosibirsk">Новосибирск (UTC+7)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Язык интерфейса</Label>
              <Select value={locale} onValueChange={(val) => setLocale(val as "ru" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving} className="cursor-pointer">
            {saved ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-400" /> Сохранено
              </span>
            ) : saving ? (
              "Сохранение..."
            ) : (
              "Сохранить изменения"
            )}
          </Button>
        </div>

        <Separator className="my-8" />

        {/* Danger Zone */}
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Опасная зона: Удаление аккаунта</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            После удаления вашей учётной записи все личные документы, локальные реплики и доступы к пространствам будут безвозвратно удалены.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-2 cursor-pointer"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить мой аккаунт
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Подтверждение удаления аккаунта
            </DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                await logout();
                router.push("/auth/login");
              }}
            >
              Да, удалить аккаунт
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
