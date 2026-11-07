import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ChangelogPage() {
  const releases = [
    {
      version: "v1.2.0 — Production Security & Redesign Release",
      date: "Ноябрь 2026",
      tag: "Текущая версия",
      items: [
        "Комплексный аудит безопасности: строгая валидация JWT_SECRET, безопасные HTTP-only cookies, защита от спуфинга.",
        "Защита API документов middleware-авторизацией и изоляция портов локальной инфраструктуры.",
        "Полный адаптивный редизайн интерфейса с полноценной поддержкой Светлой и Тёмной темы без FOUC.",
        "Реализованы обработчики всех кнопок форматирования редактора, экспорта в Markdown/PDF и ветвления.",
        "Добавлены интерактивные тарифные планы, документация и панель уведомлений.",
      ],
    },
    {
      version: "v1.1.0 — Merkle-CRDT Engine & 3-Way Merge",
      date: "Октябрь 2026",
      tag: "Релиз ядра",
      items: [
        "Математическая сходимость посимвольных вставок по алгоритмам Fugue и YATA.",
        "Поддержка направленного ациклического графа (DAG) коммитов на базе SHA-256.",
        "Интерактивный Time-Travel слайдер и визуализатор расхождений (Diff).",
        "Двухуровневое хранилище дельт в S3/MinIO и метаданных в PostgreSQL 16.",
      ],
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-xs gap-1.5">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Назад на главную
            </Link>
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                История обновлений (Changelog)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Новые возможности, улучшения стабильности и релизы безопасности SyncPro
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {releases.map((rel) => (
              <div key={rel.version} className="p-6 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-foreground">{rel.version}</h2>
                    <p className="text-xs text-muted-foreground">{rel.date}</p>
                  </div>
                  <Badge variant="outline" className="w-fit border-primary/30 text-primary text-xs">
                    {rel.tag}
                  </Badge>
                </div>
                <ul className="space-y-2.5">
                  {rel.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
