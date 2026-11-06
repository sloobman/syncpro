"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 -z-10",
          "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900",
          "dark:from-blue-800 dark:via-blue-900 dark:to-slate-950"
        )}
      />

      {/* Decorative dot grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            Начните работать вместе уже сегодня
          </motion.h2>

          <motion.p
            className="mt-4 text-lg leading-relaxed text-blue-100"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Бесплатно для команд до 3&nbsp;человек. Без привязки карты.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "mt-8 border-white/20 bg-white text-blue-700",
                "hover:bg-blue-50 hover:text-blue-800",
                "dark:bg-white dark:text-blue-800 dark:hover:bg-blue-50"
              )}
              asChild
            >
              <Link href="/auth/register">Создать аккаунт бесплатно</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
