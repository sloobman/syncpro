"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { AdminNav } from "./admin-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      notFound();
    }
  }, [user, isLoading]);

  // Zero Leakage: Render nothing if not verified as admin
  if (isLoading || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Top Header */}
      <header className="h-16 border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-foreground">
                Sync<span className="text-primary">Pro</span>
              </span>
              <Badge variant="secondary" className="gap-1.5 py-0.5 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                <Shield className="size-3" />
                Админ-панель
              </Badge>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <ArrowLeft className="size-3.5" />
                <span>В приложение</span>
              </Link>
            </Button>
            {user?.email && (
              <div className="hidden sm:block text-xs font-medium text-muted-foreground px-2 py-1 rounded bg-muted/50 border border-border/50">
                {user.email}
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Sub-header Navigation Bar */}
      <div className="border-b border-border bg-card/40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <AdminNav />
        </div>
      </div>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
