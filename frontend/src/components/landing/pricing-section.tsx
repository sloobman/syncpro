"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Базовый",
      icon: Zap,
      badge: "Бесплатно навсегда",
      price: "0",
      period: "навсегда",
      desc: "Идеально для индивидуальных авторов и небольших заметок",
      features: [
        "До 3 участников в пространстве",
        "Неограниченное число документов",
        "Полный CRDT Realtime-движок",
        "Ветвление и история коммитов (30 дней)",
        "Экспорт в Markdown и PDF",
      ],
      cta: "Начать бесплатно",
      href: "/auth/register?plan=free",
      popular: false,
    },
    {
      name: "Команда",
      icon: Sparkles,
      badge: "Самый популярный",
      price: annual ? "790" : "990",
      period: "руб/мес за пользователя",
      desc: "Для команд разработки, аналитиков и авторов тех. документации",
      features: [
        "Неограниченное число участников",
        "Бесконечная глубина истории Merkle-DAG",
        "Автоматический 3-Way CRDT Merge",
        "Поддержка документов 500+ страниц",
        "Приоритетная синхронизация WebSockets",
        "Детальный аудит доступа и ролей",
      ],
      cta: "Попробовать 14 дней бесплатно",
      href: "/auth/register?plan=team",
      popular: true,
    },
    {
      name: "Enterprise",
      icon: Building,
      badge: "Для корпораций",
      price: "По запросу",
      period: "индивидуальные условия",
      desc: "Развертывание в вашем контуре (Self-Hosted) и повышенная безопасность",
      features: [
        "On-Premises / Private Cloud установка",
        "Интеграция с корпоративным SSO / SAML",
        "SLA 99.99% и персональный инженер",
        "Аудит безопасности и кастомный бэкап S3",
        "Выделенные ноды синхронизации",
      ],
      cta: "Связаться с нами",
      href: "mailto:support@mihleev.ru?subject=SyncPro%20Enterprise",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-primary border-primary/30">
            Гибкие тарифные планы
          </Badge>
          <motion.h2
            className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Прозрачные тарифы для команд любого масштаба
          </motion.h2>
          <motion.p
            className="mt-4 text-base sm:text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Начните бесплатно, переходите на командный тариф по мере роста задач
          </motion.p>

          {/* Monthly / Annual toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-xs sm:text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
              Ежемесячно
            </span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-muted focus:ring-2 focus:ring-primary focus:ring-offset-2"
              role="switch"
              aria-checked={annual}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-primary shadow-lg ring-0 transition duration-200 ease-in-out ${
                  annual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs sm:text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Ежегодно <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1">-20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`relative rounded-2xl border p-8 flex flex-col justify-between transition-all duration-200 ${
                  plan.popular
                    ? "border-primary bg-card ring-2 ring-primary shadow-xl shadow-primary/10"
                    : "border-border bg-card/60 hover:bg-card hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.desc}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                      {plan.price}
                    </span>
                    {plan.price !== "По запросу" && plan.price !== "0" && (
                      <span className="text-sm text-muted-foreground">₽</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-1">/ {plan.period}</span>
                  </div>

                  <ul className="mt-8 space-y-3 border-t border-border/60 pt-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Button
                    className="w-full h-11 text-sm font-semibold"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
