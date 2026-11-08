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
  GitMerge,
  MessageSquare,
  Sparkles,
  UserPlus,
  CreditCard,
  Shield,
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
  description: string;
  type: "system" | "invite" | "merge" | "comment";
  link?: string;
  createdAt: string;
  unread: boolean;
}

export function Topbar() {
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const [searchVal, setSearchVal] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll notifications every 30s
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.notifications)) {
            setNotifications(
              data.notifications.map((item: {
                id: string;
                title: string;
                description: string;
                type: string;
                link?: string;
                created_at: string;
                read: boolean;
              }) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                type: (item.type as NotificationItem["type"]) || "system",
                link: item.link,
                createdAt: item.created_at,
                unread: !item.read,
              }))
            );
            setUnreadCount(data.notifications.filter((n: { read: boolean }) => !n.read).length);
          }
        }
      } catch {
        // Ignore network errors in polling
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

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
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Mobile Menu Button & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-muted-foreground shrink-0"
          onClick={toggleSidebar}
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск по документам..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="pl-9 h-9 w-full bg-background/50 border-border/60 text-xs focus-visible:bg-background transition-colors"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Уведомления"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in fade-in zoom-in duration-200">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden text-xs">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">Уведомления</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                    {unreadCount} новых
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Прочитать все
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 text-left transition-colors flex gap-3 cursor-pointer hover:bg-muted/50 ${
                      n.unread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {n.type === "invite" ? (
                        <div className="h-7 w-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                          <UserPlus className="h-3.5 w-3.5" />
                        </div>
                      ) : n.type === "merge" ? (
                        <div className="h-7 w-7 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <GitMerge className="h-3.5 w-3.5" />
                        </div>
                      ) : n.type === "comment" ? (
                        <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-medium truncate ${n.unread ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {new Date(n.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
              <Link href="/settings/billing" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Тариф и подписка</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </Link>
            </DropdownMenuItem>
            {user?.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-2 cursor-pointer text-red-500 dark:text-red-400 font-semibold">
                    <Shield className="h-4 w-4" />
                    <span>Панель администратора</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
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
