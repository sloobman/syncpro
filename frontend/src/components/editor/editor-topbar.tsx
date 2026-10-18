"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Check,
  UserPlus,
  MoreVertical,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchSelector } from "@/components/editor/branch-selector";
import { PresenceAvatars } from "@/components/editor/presence-avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockOnlineUsers = [
  { id: "u1", name: "Алиса", avatarUrl: null, color: "bg-blue-500" },
  { id: "u2", name: "Боб", avatarUrl: null, color: "bg-emerald-500" },
  { id: "u3", name: "Вы", avatarUrl: null, color: "bg-amber-500" },
];

export function EditorTopbar() {
  const [isFavorite, setIsFavorite] = useState(true);
  const [title, setTitle] = useState("Глава 1: Введение в системы совместного редактирования");

  return (
    <header className="h-12 border-b border-border bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 select-none z-20">
      {/* Left controls */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          asChild
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-2 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs sm:text-sm font-semibold text-foreground bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 truncate max-w-[200px] sm:max-w-md"
          />

          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="text-muted-foreground hover:text-amber-500 transition-colors p-0.5 shrink-0"
            aria-label="Избранное"
          >
            <Star
              className={`h-3.5 w-3.5 ${
                isFavorite ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
          </button>
        </div>

        <div className="hidden md:flex items-center pl-2">
          <BranchSelector />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground pr-1">
          <Cloud className="h-3.5 w-3.5 text-emerald-500" />
          <span>Сохранено</span>
        </div>

        <PresenceAvatars users={mockOnlineUsers} />

        <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Поделиться</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 text-xs">
            <DropdownMenuItem>Экспорт в Markdown</DropdownMenuItem>
            <DropdownMenuItem>Экспорт в PDF</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>История версий (DAG)</DropdownMenuItem>
            <DropdownMenuItem>Сравнить ветки (Diff)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
