"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Check, LayoutTemplate } from "lucide-react";
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
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

const templates = [
  {
    id: "blank",
    title: "Пустой документ",
    desc: "Чистый лист для свободной работы",
    icon: FileText,
  },
  {
    id: "spec",
    title: "Техническая спецификация",
    desc: "SRS шаблон: обзор, требования, архитектура",
    icon: LayoutTemplate,
  },
  {
    id: "meeting",
    title: "Заметки встречи команды",
    desc: "Повестка, тезисы обсуждения, action items",
    icon: LayoutTemplate,
  },
  {
    id: "rfc",
    title: "Архитектурный RFC",
    desc: "Предложение по дизайну и аналитика альтернатив",
    icon: LayoutTemplate,
  },
];

export function CreateDocumentDialog({
  workspaceId,
  children,
}: {
  workspaceId?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const createDocument = useWorkspaceStore((state) => state.createDocument);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const newDoc = await createDocument({
        title,
        workspaceId,
        template: selectedTemplate,
      });

      setOpen(false);
      setTitle("");
      router.push(`/doc/${newDoc.id}`);
    } catch (err) {
      console.error("Failed to create document:", err);
    } finally {
      setLoading(false);
    }
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((tpl) => {
                  const Icon = tpl.icon;
                  const active = selectedTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <Icon className="h-4 w-4 text-primary" />
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {tpl.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {tpl.desc}
                      </p>
                    </div>
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
