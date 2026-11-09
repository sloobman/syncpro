"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Check, LayoutTemplate, FileUp, Loader2 } from "lucide-react";
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
import { DocumentConverter } from "@/lib/documents/document-converter";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const converted = await DocumentConverter.importFile(file);
      const newDoc = await createDocument({
        title: converted.title || file.name.replace(/\.[^/.]+$/, ""),
        workspaceId,
        content: converted.markdown,
      });

      setOpen(false);
      router.push(`/doc/${newDoc.id}`);
    } catch (err) {
      console.error("Failed to import document:", err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".docx,.odt,.md,.markdown,.txt"
        className="hidden"
        onChange={handleImportFile}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children || (
            <Button className="gap-2 cursor-pointer">
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
                Выберите шаблон оформления, начните с чистого листа или импортируйте готовый файл
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Ready file upload banner */}
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Загрузить готовый документ</p>
                    <p className="text-[11px] text-muted-foreground">Поддерживаются файлы .docx, .odt, .md, .txt</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="h-7 text-xs gap-1.5 cursor-pointer shrink-0"
                >
                  <FileUp className="h-3 w-3" />
                  <span>Импортировать</span>
                </Button>
              </div>

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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="cursor-pointer"
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading || !title.trim()} className="cursor-pointer">
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Создание...</span>
                  </>
                ) : (
                  "Создать и открыть"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
