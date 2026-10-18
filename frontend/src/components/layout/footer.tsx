import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const columns: FooterColumn[] = [
  {
    title: "Продукт",
    links: [
      { label: "Возможности", href: "#features" },
      { label: "Тарифы", href: "#pricing" },
      { label: "Обновления", href: "/changelog" },
    ],
  },
  {
    title: "Ресурсы",
    links: [
      { label: "Документация", href: "/docs" },
      { label: "API", href: "/api" },
      { label: "Статус", href: "/status" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О нас", href: "/about" },
      { label: "Блог", href: "/blog" },
      { label: "Карьера", href: "/careers" },
    ],
  },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/syncpro",
    renderIcon: () => (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Twitter",
    href: "https://twitter.com/syncpro",
    renderIcon: () => (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/syncpro",
    renderIcon: () => (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="SyncPro">
              <FileCode2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-bold tracking-tight">SyncPro</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Платформа совместного редактирования документов с контролем версий
              на основе Merkle-CRDT.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                    "text-muted-foreground transition-colors",
                    "hover:bg-accent hover:text-foreground"
                  )}
                  aria-label={social.label}
                >
                  {social.renderIcon()}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2.5" role="list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className={cn(
            "mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8",
            "sm:flex-row"
          )}
        >
          <p className="text-xs text-muted-foreground">
            © 2026 SyncPro. Все права защищены.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Конфиденциальность
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Условия
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
