"use client";

import { useState } from "react";
import { User, Camera, Trash2, Check } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function ProfileForm() {
  const [name, setName] = useState("Иван Петров");
  const [email] = useState("ivan@syncpro.ru");
  const [company, setCompany] = useState("SyncPro Core Team");
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [locale, setLocale] = useState("ru");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      {/* Avatar block */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
              ИП
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
            Загрузить фото
          </Button>
          <p className="text-[11px] text-muted-foreground mt-1">
            JPG, GIF или PNG. Максимум 2MB.
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
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prof-email">Email адрес</Label>
          <div className="flex gap-2">
            <Input id="prof-email" value={email} disabled className="bg-muted/40" />
            <span className="inline-flex items-center text-xs text-emerald-600 font-medium px-2.5">
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
            <Select value={locale} onValueChange={setLocale}>
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
        <Button type="submit">
          {saved ? (
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Сохранено
            </span>
          ) : (
            "Сохранить изменения"
          )}
        </Button>
      </div>

      <Separator className="my-8" />

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">
          Опасная зона: Удаление аккаунта
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          После удаления вашей учётной записи все личные документы, локальные реплики и доступы к проектам будут безвозвратно удалены.
        </p>
        <Button type="button" variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          Удалить мой аккаунт
        </Button>
      </div>
    </form>
  );
}
