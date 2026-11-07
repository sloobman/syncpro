import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

const columns: FooterColumn[] = [
  {
    title: "Продукт",
    links: [
      { label: "Возможности", href: "/#features" },
      { label: "Тарифы", href: "/#pricing" },
      { label: "Обновления", href: "/changelog" },
    ],
  },
  {
    title: "Ресурсы",
    links: [
      { label: "Документация", href: "/docs" },
      { label: "Статус системы", href: "/api/health", external: true },
      { label: "Справка", href: "/docs" },
    ],
  },
  {
    title: "Правовая информация",
    links: [
      { label: "О проекте", href: "/#about" },
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Условия использования", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group min-h-[40px]" aria-label="SyncPro">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <FileCode2 className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">SyncPro</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Высокопроизводительная распределенная платформа совместного редактирования документов на базе Merkle-CRDT.
            </p>
          </div>

          {/* Nav columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wider">
                {column.title}
              </h3>
              <ul className="mt-2 space-y-1" role="list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center min-h-[38px] py-1 text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex items-center min-h-[38px] py-1 text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className={cn(
            "mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8",
            "sm:flex-row"
          )}
        >
          <p className="text-xs text-muted-foreground">
            © 2026 SyncPro Core Team. Все права защищены.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="inline-flex items-center min-h-[38px] py-1 hover:text-foreground transition-colors">
              Конфиденциальность
            </Link>
            <span>•</span>
            <Link href="/terms" className="inline-flex items-center min-h-[38px] py-1 hover:text-foreground transition-colors">
              Условия
            </Link>
            <span>•</span>
            <Link href="/changelog" className="inline-flex items-center min-h-[38px] py-1 hover:text-foreground transition-colors">
              История изменений
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
