import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, BookOpen, GitBranch, Terminal, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  const guides = [
    {
      icon: Zap,
      title: "Быстрый старт с SyncPro",
      desc: "Как создать первое пространство, пригласить команду и начать одновременную работу.",
    },
    {
      icon: GitBranch,
      title: "Ветвление и слияние (Git for Rich-Text)",
      desc: "Создание изолированных веток, 3-Way CRDT Merge и анализ расхождений с предком LCA.",
    },
    {
      icon: Terminal,
      title: "Протоколы StateVector и Synchronization",
      desc: "Спецификация бинарных сообщений, рукопожатия и репликации операций через WebSockets.",
    },
    {
      icon: Shield,
      title: "Безопасность и Self-Hosted развёртывание",
      desc: "Настройка Docker Compose, SSL-сертификатов, переменных окружения и бэкапов MinIO.",
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-xs gap-1.5">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Назад на главную
            </Link>
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Документация и технические руководства
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Архитектурные гайды, примеры API и справочник пользователя
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {guides.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  className="p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-4">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{g.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{g.desc}</p>
                  </div>
                  <div className="mt-6 pt-2">
                    <Button variant="outline" size="sm" className="text-xs w-full" asChild>
                      <Link href="/dashboard">Перейти к практике</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
