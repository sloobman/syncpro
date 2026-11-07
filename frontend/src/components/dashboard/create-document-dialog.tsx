"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, BookOpen, Presentation, Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const templates = [
  { id: "blank", name: "Пустой документ", icon: FileText, desc: "Чистый лист для свободного письма" },
  { id: "article", name: "Статья / Гайд", icon: BookOpen, desc: "Структура заголовков и введение" },
  { id: "meeting", name: "Meeting Notes", icon: Presentation, desc: "Цели, участники, action items" },
  { id: "tech-spec", name: "Тех. Спецификация", icon: Code2, desc: "Архитектура, контракты и DoD" },
];

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CreateDocumentDialog({
  workspaceId,
  children,
}: {
  workspaceId?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const docId = generateUuid();
    setTimeout(() => {
      setLoading(false);
      setOpen(false);
      setTitle("");
      router.push(
        workspaceId
          ? `/doc/${docId}?workspace=${encodeURIComponent(workspaceId)}`
          : `/doc/${docId}`
      );
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Новый документ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Создать новый документ</DialogTitle>
            <DialogDescription>
              Выберите шаблон оформления или начните с чистого листа
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Название документа</Label>
              <Input
                id="doc-title"
                placeholder="Например, Архитектура распределённой системы"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2.5">
              <Label>Выберите шаблон</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {templates.map((tpl) => {
                  const Icon = tpl.icon;
                  const active = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-md ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {tpl.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {tpl.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Создание..." : "Создать и открыть"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
