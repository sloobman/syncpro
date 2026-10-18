"use client";

import Link from "next/link";
import { Search, Bell, Menu, LogOut, User as UserIcon, Settings, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";

export function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Mobile hamburger */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Search */}
        <div className="relative w-64 sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Поиск документов... (Cmd+K)"
            className="pl-9 h-9 text-sm bg-muted/40 border-muted focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user ? user.name.slice(0, 2).toUpperCase() : "ИП"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user ? user.name : "Иван Петров"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user ? user.email : "ivan@syncpro.ru"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
                <UserIcon className="h-4 w-4" />
                <span>Профиль</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
