"use client";

import { useUIStore } from "@/lib/stores/ui-store";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { Label } from "@/components/ui/label";

export function AppearanceSettings() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Тема оформления</Label>
        <div className="grid grid-cols-3 gap-3">
          {/* Light */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all ${
              theme === "light"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sun className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Светлая</span>
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all ${
              theme === "dark"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Moon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Тёмная</span>
          </button>

          {/* System */}
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2.5 transition-all ${
              theme === "system"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
              <Laptop className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Системная</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Label className="text-sm font-semibold">Ширина полотна редактора</Label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            className="p-3 rounded-lg border border-border hover:bg-muted/40 text-xs font-medium"
          >
            Узкая (700px)
          </button>
          <button
            type="button"
            className="p-3 rounded-lg border border-primary bg-primary/5 text-xs font-medium"
          >
            Стандарт (850px)
          </button>
          <button
            type="button"
            className="p-3 rounded-lg border border-border hover:bg-muted/40 text-xs font-medium"
          >
            Широкая (1100px)
          </button>
        </div>
      </div>
    </div>
  );
}
