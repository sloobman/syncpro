"use client";

import { motion } from "framer-motion";
import { GitMerge, Layers, Cpu, ShieldCheck } from "lucide-react";

export function AboutSection() {
  const stats = [
    { value: "< 15ms", label: "Задержка синхронизации в реальном времени" },
    { value: "60 FPS", label: "Стабильный рендеринг при 500+ страницах текста" },
    { value: "100%", label: "Автономность и сохранение данных в Offline-First" },
    { value: "0 конфликтов", label: "Математическая сходимость по алгоритмам Fugue и YATA" },
  ];

  const highlights = [
    {
      icon: GitMerge,
      title: "Merkle-DAG и посимвольный 3-Way Merge",
      desc: "Каждая правка документа фиксируется неизменяемым криптографическим SHA-256 хешем в направленном графе, исключая перезапись чужой работы.",
    },
    {
      icon: Layers,
      title: "Трехуровневая архитектура хранения",
      desc: "In-memory шина Redis для курсоров, PostgreSQL для связей DAG и документов, S3/MinIO CAS-хранилище для бинарных снепшотов и сжатых дельт.",
    },
    {
      icon: Cpu,
      title: "Виртуализированный редактор",
      desc: "DOM-дерево монтирует только видимые в viewport блоки документа, что обеспечивает мгновенную загрузку даже колоссальных технических регламентов.",
    },
    {
      icon: ShieldCheck,
      title: "Корпоративная безопасность",
      desc: "Строгая изоляция рабочих пространств, RBAC роли (Owner, Admin, Member, Viewer) и защита от CSRF, XSS и SQL-инъекций на уровне ядра.",
    },
  ];

  return (
    <section id="about" className="py-20 sm:py-28 bg-muted/30 border-y border-border relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            О платформе SyncPro
          </motion.h2>
          <motion.p
            className="mt-4 text-base sm:text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            SyncPro создана инженерами для решения фундаментальной проблемы: сделать совместную работу над текстом такой же надёжной и предсказуемой, как разработка программного кода.
          </motion.p>
        </div>

        {/* Stats grid */}
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          {stats.map((s, idx) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="p-6 rounded-2xl border border-border bg-card text-center shadow-xs"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {s.value}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-snug">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Highlights */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-border bg-card flex gap-4 items-start shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
