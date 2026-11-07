"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  LogOut,
  User as UserIcon,
  Settings,
  CheckCircle2,
  GitMerge,
  MessageSquare,
  Sparkles,
  UserPlus,
  FileText,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useUIStore } from "@/lib/stores/ui-store";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: "comment" | "merge" | "invite" | "commit" | "system";
  link?: string | null;
  createdAt?: string;
}

export function Topbar() {
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications?limit=30", {
          credentials: "include",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // Offline fallback
      }
    };

    void load();
    const interval = setInterval(load, 25000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/dashboard`);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      // Ignore network errors
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (n.unread) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          credentials: "include",
        });
      } catch {
        // Ignore
      }
    }

    if (n.link) {
      router.push(n.link);
    }
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
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Mobile hamburger & Global Search */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground cursor-pointer"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-56 sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Поиск документов... (Enter)"
            className="pl-9 h-9 text-xs sm:text-sm bg-muted/40 border-muted focus-visible:bg-background"
          />
        </form>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground relative cursor-pointer"
              aria-label="Уведомления"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 text-xs">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <DropdownMenuLabel className="p-0 text-xs font-semibold text-foreground">
                Уведомления {unreadCount > 0 && `(${unreadCount})`}
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Прочитать все
                </button>
              )}
            </div>
            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 transition-colors cursor-pointer ${
                      n.unread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1 rounded-md bg-muted text-muted-foreground shrink-0">
                        {n.type === "comment" && <MessageSquare className="h-3.5 w-3.5 text-blue-500" />}
                        {n.type === "merge" && <GitMerge className="h-3.5 w-3.5 text-emerald-500" />}
                        {n.type === "invite" && <UserPlus className="h-3.5 w-3.5 text-purple-500" />}
                        {n.type === "commit" && <FileText className="h-3.5 w-3.5 text-cyan-500" />}
                        {n.type === "system" && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-medium text-foreground leading-snug truncate">
                            {n.title}
                          </p>
                          {n.unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {n.desc}
                        </p>
                        <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                          {n.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground space-y-1.5">
                  <div className="mx-auto w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-2">
                    <Bell className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Нет уведомлений</p>
                  <p className="text-[11px] text-muted-foreground">
                    Здесь появятся приглашения, коммиты и результаты слияния веток.
                  </p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 cursor-pointer">
              <Avatar className="h-9 w-9">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2.5 py-1">
                <Avatar className="h-9 w-9 shrink-0">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={displayName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{displayEmail}</p>
                </div>
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
              onClick={handleLogout}
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
