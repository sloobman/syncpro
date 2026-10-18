"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Bell, Palette, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/settings/profile", label: "Профиль", icon: User },
  { href: "/settings/security", label: "Безопасность", icon: Shield },
  { href: "/settings/appearance", label: "Внешний вид", icon: Palette },
  { href: "/settings/notifications", label: "Уведомления", icon: Bell },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-sm font-semibold text-foreground">
            Настройки аккаунта
          </h1>
        </div>
      </header>

      {/* Main settings body */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-56 space-y-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Content pane */}
        <main className="flex-1 min-w-0 bg-card border border-border rounded-2xl p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
