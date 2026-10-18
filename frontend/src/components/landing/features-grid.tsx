"use client";

import { motion } from "framer-motion";
import {
  Zap,
  GitBranch,
  WifiOff,
  FileText,
  Shield,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: "Realtime-коллаборация",
    description:
      "Посимвольная синхронизация без конфликтов на базе CRDT. Никаких <<<<<<< HEAD маркеров.",
    color: "text-amber-500",
  },
  {
    icon: GitBranch,
    title: "Версионирование как в Git",
    description:
      "Ветки, Merge Requests, Time-Travel и посимвольный Diff. Полный контроль над историей.",
    color: "text-violet-500",
  },
  {
    icon: WifiOff,
    title: "Offline-First",
    description:
      "Работайте без интернета. Все правки сохраняются локально и синхронизируются при восстановлении связи.",
    color: "text-sky-500",
  },
  {
    icon: FileText,
    title: "Огромные документы",
    description:
      "DOM-виртуализация позволяет работать с документами в 500+ страниц при 60 FPS.",
    color: "text-emerald-500",
  },
  {
    icon: Shield,
    title: "Контроль доступа",
    description:
      "Рабочие пространства, роли (владелец, редактор, читатель) и гибкие приглашения.",
    color: "text-orange-500",
  },
  {
    icon: Rocket,
    title: "Молниеносный старт",
    description:
      "Холодная загрузка документа на 100 000 слов менее чем за 1.5 секунды.",
    color: "text-rose-500",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.08 * i },
  }),
};

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            Всё для продуктивной работы
          </motion.h2>
          <motion.p
            className="mt-4 text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Инструменты, которые делают совместное редактирование быстрым,
            надёжным и удобным.
          </motion.p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.article
              key={feature.title}
              className={cn(
                "group relative rounded-xl border border-border bg-card p-6",
                "transition-all duration-200",
                "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
                "hover:-translate-y-0.5"
              )}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
            >
              {/* Icon */}
              <div
                className={cn(
                  "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg",
                  "bg-muted/60 transition-colors group-hover:bg-muted"
                )}
              >
                <feature.icon className={cn("h-5 w-5", feature.color)} />
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-foreground">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
