"use client";

import React, { useState } from "react";
import { Upload, Type, Check, AlertCircle, Loader2, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontManager, type FontItem } from "@/lib/fonts/font-manager";

interface CustomFontDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  onFontAdded: (font: FontItem) => void;
}

export function CustomFontDialog({
  open,
  onOpenChange,
  workspaceId,
  onFontAdded,
}: CustomFontDialogProps) {
  const [activeTab, setActiveTab] = useState<"google" | "file">("google");

  // Google Font state
  const [googleFontName, setGoogleFontName] = useState("");
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fontFamilyName, setFontFamilyName] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [casNotice, setCasNotice] = useState<string | null>(null);

  const handleAddGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = googleFontName.trim();
    if (!cleanName) return;

    setIsSubmittingGoogle(true);
    setGoogleError(null);

    try {
      const res = await fetch("/api/fonts/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fontName: cleanName, workspaceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось подключить шрифт");
      }

      const newFont: FontItem = {
        id: `custom_${data.font.family_name.toLowerCase().replace(/\s+/g, "_")}`,
        name: data.font.display_name,
        family: `'${data.font.family_name}', system-ui, -apple-system, sans-serif`,
        category: "custom",
        sourceType: "google",
        fileUrl: data.font.file_url,
      };

      FontManager.loadFont(newFont);
      onFontAdded(newFont);
      setGoogleFontName("");
      onOpenChange(false);
    } catch (err) {
      setGoogleError((err as Error).message);
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploadingFile(true);
    setFileError(null);
    setCasNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (workspaceId) formData.append("workspaceId", workspaceId);
      if (fontFamilyName.trim()) formData.append("familyName", fontFamilyName.trim());

      const res = await fetch("/api/fonts/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось загрузить файл");
      }

      const fontData = data.font;
      const newFont: FontItem = {
        id: `custom_${fontData.family_name.toLowerCase().replace(/\s+/g, "_")}`,
        name: fontData.display_name,
        family: `'${fontData.family_name}', system-ui, -apple-system, sans-serif`,
        category: "custom",
        sourceType: "custom_file",
        fileUrl: fontData.file_url,
      };

      FontManager.loadFont(newFont);
      onFontAdded(newFont);

      if (data.isDuplicate) {
        setCasNotice("Шрифт успешно добавлен через CAS-дедупликацию (файл уже существовал)");
        setTimeout(() => {
          setFile(null);
          setFontFamilyName("");
          onOpenChange(false);
        }, 1200);
      } else {
        setFile(null);
        setFontFamilyName("");
        onOpenChange(false);
      }
    } catch (err) {
      setFileError((err as Error).message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Type className="h-4 w-4" />
            </div>
            <DialogTitle>Добавить собственный шрифт</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Подключите любой веб-шрифт из библиотеки Google Fonts или загрузите локальный файл (.woff2, .ttf, .otf).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "google" | "file")}>
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="google" className="text-xs gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span>Google Fonts</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span>Файл шрифта</span>
            </TabsTrigger>
          </TabsList>

          {/* Google Fonts Tab */}
          <TabsContent value="google" className="space-y-4">
            <form onSubmit={handleAddGoogleFont} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="google-font-name" className="text-xs">Название шрифта Google Fonts</Label>
                <Input
                  id="google-font-name"
                  placeholder="например: Comfortaa, Oswald, Rubik, Pacifico"
                  value={googleFontName}
                  onChange={(e) => setGoogleFontName(e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Шрифт будет автоматически загружен и станет доступен в селекторе редактора.
                </p>
              </div>

              {googleError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!googleFontName.trim() || isSubmittingGoogle}
                  className="gap-1.5"
                >
                  {isSubmittingGoogle && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Подключить шрифт</span>
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="file" className="space-y-4">
            <form onSubmit={handleUploadFile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="font-family" className="text-xs">Название гарнитуры (опционально)</Label>
                <Input
                  id="font-family"
                  placeholder="например: My Custom Sans"
                  value={fontFamilyName}
                  onChange={(e) => setFontFamilyName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Файл шрифта (.woff2, .ttf, .otf)</Label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-foreground font-medium">
                    {file ? file.name : "Нажмите или перетащите файл шрифта"}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Поддерживаются форматы WOFF2 (рекомендуется), TTF и OTF до 15 МБ
                  </span>
                  <input
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        if (!fontFamilyName) {
                          setFontFamilyName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                  />
                </label>
              </div>

              {casNotice && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>{casNotice}</span>
                </div>
              )}

              {fileError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!file || isUploadingFile}
                  className="gap-1.5"
                >
                  {isUploadingFile && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Загрузить шрифт</span>
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
