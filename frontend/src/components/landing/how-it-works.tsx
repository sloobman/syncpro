"use client";

import { motion } from "framer-motion";
import { FilePlus, Users, Edit3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: FilePlus,
    title: "Создайте документ",
    description:
      "Начните с пустого документа или импортируйте существующий. Поддерживаются Markdown, HTML и DOCX.",
  },
  {
    number: 2,
    icon: Users,
    title: "Пригласите команду",
    description:
      "Отправьте ссылку-приглашение коллегам. Назначьте роли и настройте права доступа за пару кликов.",
  },
  {
    number: 3,
    icon: Edit3,
    title: "Редактируйте вместе",
    description:
      "Работайте одновременно в реальном времени. Все изменения сохраняются автоматически с полной историей.",
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: 0.15 * i },
  }),
};

export function HowItWorks() {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.h2
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          Как это работает
        </motion.h2>

        {/* Steps */}
        <div className="relative mt-16 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
          {/* Connector lines (desktop only) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-14 hidden lg:block"
            aria-hidden="true"
          >
            {/* Line from step 1 to step 2 */}
            <div className="absolute left-[calc(33.333%-2rem)] right-[calc(66.666%-2rem)] top-0 border-t-2 border-dashed border-border" />
            {/* Line from step 2 to step 3 */}
            <div className="absolute left-[calc(66.666%-2rem)] right-[calc(33.333%-2rem+4rem)] top-0 border-t-2 border-dashed border-border" />
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative flex flex-col items-center text-center"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stepVariants}
            >
              {/* Icon container with number badge */}
              <div className="relative">
                <div
                  className={cn(
                    "flex h-28 w-28 items-center justify-center rounded-2xl",
                    "border border-border bg-background shadow-sm"
                  )}
                >
                  <step.icon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Number badge */}
                <span
                  className={cn(
                    "absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full",
                    "bg-blue-600 text-sm font-bold text-white shadow-md"
                  )}
                >
                  {step.number}
                </span>
              </div>

              {/* Text */}
              <h3 className="mt-6 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
