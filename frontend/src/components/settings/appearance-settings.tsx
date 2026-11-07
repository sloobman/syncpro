"use client";

import { useUIStore, type CanvasWidth } from "@/lib/stores/ui-store";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { Label } from "@/components/ui/label";

export function AppearanceSettings() {
  const { theme, setTheme, canvasWidth, setCanvasWidth } = useUIStore();

  const widthOptions: { id: CanvasWidth; label: string; desc: string }[] = [
    { id: "narrow", label: "Узкая (700px)", desc: "Фокус на тексте и минимализм" },
    { id: "standard", label: "Стандарт (850px)", desc: "Оптимальный баланс для документации" },
    { id: "wide", label: "Широкая (1100px)", desc: "Таблицы, схемы и широкий код" },
  ];

  return (
    <div className="space-y-8 max-w-xl">
      {/* Theme Selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold text-foreground">Тема оформления</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Выберите тему интерфейса или синхронизируйте с операционной системой
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Light */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
              theme === "light"
                ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground font-semibold shadow-sm"
                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
              <Sun className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span>Светлая</span>
              {theme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
              theme === "dark"
                ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground font-semibold shadow-sm"
                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-inner">
              <Moon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span>Тёмная</span>
              {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
              theme === "system"
                ? "border-primary bg-primary/10 ring-2 ring-primary/30 text-foreground font-semibold shadow-sm"
                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shadow-inner">
              <Laptop className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span>Системная</span>
              {theme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          </button>
        </div>
      </div>

      {/* Editor Canvas Width */}
      <div className="space-y-3 pt-2">
        <div>
          <Label className="text-sm font-semibold text-foreground">Ширина полотна редактора</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Настройте комфортную ширину листа для чтения и совместного письма
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {widthOptions.map((opt) => {
            const active = canvasWidth === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCanvasWidth(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
