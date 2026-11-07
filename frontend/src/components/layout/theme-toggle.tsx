"use client";

import { useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore, type Theme } from "@/lib/stores/ui-store";

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = localStorage.getItem("syncpro-theme") as Theme | null;
      if (!current || current === "system") {
        document.documentElement.classList.toggle("dark", mql.matches);
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Переключить тему" className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={theme === "light" ? "bg-accent font-medium" : "cursor-pointer"}
        >
          <Sun className="mr-2 h-4 w-4 text-amber-500" />
          Светлая
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={theme === "dark" ? "bg-accent font-medium" : "cursor-pointer"}
        >
          <Moon className="mr-2 h-4 w-4 text-blue-500" />
          Тёмная
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={theme === "system" ? "bg-accent font-medium" : "cursor-pointer"}
        >
          <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />
          Системная
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
