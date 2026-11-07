"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bold, Italic, Underline, AlignLeft, List, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const floatingBadges = [
  { label: "CRDT", x: "2%", y: "15%", delay: 0.8 },
  { label: "Offline-First", x: "78%", y: "35%", delay: 1.0 },
  { label: "60 FPS", x: "8%", y: "80%", delay: 1.2 },
] as const;

const toolbarIcons = [Undo, Redo, Bold, Italic, Underline, AlignLeft, List] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 * i },
  }),
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background decorations */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="text-center">
          {/* Headline */}
          <motion.h1
            className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            Совместное редактирование
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
              с контролем версий
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            Редактируйте документы вместе в реальном времени. Ветвление, слияние
            и полная история изменений&nbsp;— как Git, но&nbsp;для текста.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <Button size="lg" asChild>
              <Link href="/auth/register">Начать бесплатно</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/doc/demo" className="gap-2">
                Смотреть демо
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Editor mockup */}
        <motion.div
          className="relative mx-auto mt-16 max-w-4xl sm:mt-20"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          {/* Gradient border wrapper */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-px shadow-2xl shadow-blue-500/20">
            <div className="rounded-[15px] bg-background">
              {/* Title bar */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  Техническое задание v2.3 — main
                </span>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b border-border px-4 py-2">
                {toolbarIcons.map((Icon, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      idx === 1 && "mr-2"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                ))}
              </div>

              {/* Editor content */}
              <div className="relative min-h-[240px] p-6 font-sans text-sm leading-relaxed sm:min-h-[280px] sm:p-8">
                <p className="text-foreground">
                  <span className="font-semibold">1. Архитектура</span>
                </p>
                <p className="mt-3 text-muted-foreground">
                  Основой платформы является Merkle-CRDT структура данных,
                  позволяющая обеспечить бесконфликтное слияние правок от
                  нескольких участников.
                </p>
                <p className="mt-3 text-muted-foreground">
                  Каждый коммит представляет собой узел в направленном
                  ациклическом графе (DAG), где хеш содержимого гарантирует
                  целостность{" "}
                  <span className="relative">
                    данных.
                    {/* Cursor 1 */}
                    <span
                      className="absolute -right-px top-0 h-full w-0.5 animate-pulse bg-blue-500"
                      aria-hidden="true"
                    />
                    <span className="absolute -right-1 -top-5 whitespace-nowrap rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Алексей
                    </span>
                  </span>
                </p>
                <p className="mt-3 text-muted-foreground">
                  Визуальный редактор построен на виртуализированном рендеринге
                  <span className="relative">
                    {" "}
                    блоков
                    {/* Cursor 2 */}
                    <span
                      className="absolute -right-px top-0 h-full w-0.5 animate-pulse bg-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="absolute -right-1 -top-5 whitespace-nowrap rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Мария
                    </span>
                  </span>
                  , что обеспечивает стабильные 60 FPS.
                </p>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          {floatingBadges.map((badge) => (
            <motion.div
              key={badge.label}
              className={cn(
                "absolute hidden rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold shadow-lg sm:block",
                "dark:border-border/60"
              )}
              style={{ left: badge.x, top: badge.y }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: badge.delay,
                duration: 0.4,
                ease: "easeOut",
              }}
            >
              <motion.span
                animate={{ y: [0, -4, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  delay: badge.delay,
                  ease: "easeInOut",
                }}
                className="inline-block"
              >
                {badge.label}
              </motion.span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
