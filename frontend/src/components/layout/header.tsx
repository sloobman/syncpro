"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navLinks = [
  { href: "#features", label: "Возможности" },
  { href: "#how-it-works", label: "Как это работает" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#about", label: "О проекте" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "border-b border-border/60 bg-background/85 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="SyncPro — Главная">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            <FileCode2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">SyncPro</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground",
                "transition-colors hover:text-foreground hover:bg-muted/50"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA & Theme Toggle */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Войти</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/register">Начать бесплатно</Link>
          </Button>
        </div>

        {/* Mobile/Tablet menu controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile/Tablet drawer menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              className={cn(
                "fixed inset-y-0 right-0 top-16 z-50 w-72",
                "border-l border-border bg-background/95 backdrop-blur-lg shadow-2xl lg:hidden"
              )}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
            >
              <nav className="flex flex-col gap-1.5 p-5" aria-label="Мобильная навигация">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <a
                      href={link.href}
                      className={cn(
                        "block rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground",
                        "transition-colors hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </a>
                  </motion.div>
                ))}

                <div className="mt-6 border-t border-border pt-5 space-y-2.5">
                  <Button variant="outline" className="w-full justify-center" asChild>
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                      Войти
                    </Link>
                  </Button>
                  <Button className="w-full justify-center" asChild>
                    <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                      Начать бесплатно
                    </Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
