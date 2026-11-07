import Link from "next/link";
import { FileQuestion, Home, LayoutDashboard, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />
      </div>

      {/* 404 badge & icon */}
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
        <FileQuestion className="h-10 w-10" />
      </div>

      <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
        Ошибка 404
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
        Страница не найдена
      </h1>

      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
        Запрашиваемый документ или раздел перемещён, удалён либо адрес был введён с ошибкой.
      </p>

      {/* Action navigation */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            В панель управления
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="gap-2">
          <Link href="/docs">
            <BookOpen className="h-4 w-4" />
            Документация
          </Link>
        </Button>
      </div>

      <div className="mt-12 text-xs text-muted-foreground">
        Если вы считаете, что это ошибка платформы SyncPro, свяжитесь с поддержкой:{" "}
        <a
          href="mailto:support@mihleev.ru?subject=SyncPro%20404%20Error"
          className="text-primary hover:underline font-medium"
        >
          support@mihleev.ru
        </a>
      </div>
    </div>
  );
}
