"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Compass,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const mockWorkspaces = [
  { id: "ws_1", name: "Мой проект", emoji: "🚀" },
  { id: "ws_2", name: "Команда разработки", emoji: "⚡" },
];

const mockRecentDocs = [
  { id: "doc_1", title: "Глава 1: Введение", workspace: "Мой проект" },
  { id: "doc_2", title: "Архитектура Merkle-CRDT", workspace: "Команда разработки" },
  { id: "doc_3", title: "Roadmap Q4 2026", workspace: "Мой проект" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, collapseSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
    router.refresh();
  };

  const displayName = user?.name || "Гость";
  const displayEmail = user?.email || "guest@syncpro.dev";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ГС";

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300 select-none",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Top Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!sidebarCollapsed && <Logo size="sm" />}
        {sidebarCollapsed && (
          <div className="mx-auto">
            <Logo size="sm" showText={false} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hidden lg:flex cursor-pointer"
          onClick={() => collapseSidebar(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Развернуть панель" : "Свернуть панель"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Navigation Section */}
        <div className="px-3 space-y-1">
          <Link href="/dashboard">
            <span
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                pathname === "/dashboard"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                sidebarCollapsed && "justify-center px-0"
              )}
            >
              <Compass className="h-4 w-4 shrink-0 text-primary" />
              {!sidebarCollapsed && <span>Обзор</span>}
            </span>
          </Link>
        </div>

        {/* Workspaces Section */}
        <div className="mt-6 px-3">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Пространства
              </span>
              <CreateWorkspaceDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Создать пространство"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </CreateWorkspaceDialog>
            </div>
          )}
          <div className="space-y-1">
            {mockWorkspaces.map((ws) => {
              const active = pathname.includes(`/dashboard/workspace/${ws.id}`);
              return (
                <Link key={ws.id} href={`/dashboard/workspace/${ws.id}`}>
                  <span
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      sidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    <span className="text-base shrink-0">{ws.emoji}</span>
                    {!sidebarCollapsed && <span className="truncate">{ws.name}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="mt-6 px-3">
          {!sidebarCollapsed && (
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Недавние
              </span>
            </div>
          )}
          <div className="space-y-1">
            {mockRecentDocs.map((doc) => (
              <Link key={doc.id} href={`/doc/${doc.id}`}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors cursor-pointer",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{doc.title}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Profile and Controls */}
      <div className="p-3 border-t border-border space-y-1">
        <Link href="/settings">
          <span
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Настройки</span>}
          </span>
        </Link>

        <div
          className={cn(
            "flex items-center justify-between px-2 py-2 rounded-lg bg-muted/40",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {displayEmail}
                </span>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
              title="Выйти из аккаунта"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
