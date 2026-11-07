"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Check, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
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

function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Выбранный файл должен быть изображением (JPG, PNG, WebP)"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const minSide = Math.min(img.width, img.height);
          const startX = (img.width - minSide) / 2;
          const startY = (img.height - minSide) / 2;

          const outputSize = Math.min(minSide, maxSize);
          canvas.width = outputSize;
          canvas.height = outputSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Не удалось инициализировать холст"));
            return;
          }

          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide,
            0,
            0,
            outputSize,
            outputSize
          );

          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } catch {
          reject(new Error("Ошибка при обработке изображения"));
        }
      };
      img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

function ProfileFormInner() {
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
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAvatar(true);
    setError(null);
    try {
      const resizedDataUrl = await resizeImageToDataUrl(file, 256);
      setAvatarUrl(resizedDataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось обработать изображение");
    } finally {
      setIsProcessingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Не удалось сохранить профиль");
      }

      if (data.user) {
        updateProfile({
          name: data.user.name,
          avatarUrl: data.user.avatarUrl,
          timezone,
          locale,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении данных");
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
        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* Avatar block */}
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Сменить фото профиля"
          >
            <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
              ) : null}
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessingAvatar || saving}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs cursor-pointer gap-1.5"
              >
                {isProcessingAvatar ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Сжатие...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    <span>{avatarUrl ? "Заменить фото" : "Загрузить фото"}</span>
                  </>
                )}
              </Button>

              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isProcessingAvatar || saving}
                  onClick={handleRemoveAvatar}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Удалить</span>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              JPG, PNG или WebP. Автоматически оптимизируется до 256×256.
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
          <Button type="submit" disabled={saving || isProcessingAvatar} className="cursor-pointer gap-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Check className="h-4 w-4 text-emerald-400" /> Изменения сохранены
              </span>
            ) : saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Сохранение...</span>
              </>
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

export function ProfileForm() {
  const { user } = useAuthStore();
  return <ProfileFormInner key={user?.id || "guest"} />;
}
