"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#features", label: "Возможности" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#about", label: "О проекте" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "border-b border-border/40 bg-background/80 backdrop-blur-lg"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="SyncPro — Главная">
          <FileCode2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <span className="text-xl font-bold tracking-tight">SyncPro</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground",
                "transition-colors hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Войти</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Начать бесплатно</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              className={cn(
                "fixed inset-y-0 right-0 top-16 z-50 w-72",
                "border-l border-border bg-background shadow-xl md:hidden"
              )}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
            >
              <nav
                className="flex flex-col gap-1 p-4"
                aria-label="Мобильная навигация"
              >
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <Link
                      href={link.href}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
                        "transition-colors hover:bg-accent hover:text-foreground"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                <div className="mt-4 border-t border-border pt-4">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      Войти
                    </Link>
                  </Button>
                  <Button className="mt-2 w-full" asChild>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
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
