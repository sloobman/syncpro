import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyncPro — Совместное редактирование с контролем версий",
  description:
    "Редактируйте документы вместе в реальном времени. Ветвление, слияние и полная история изменений — как Git, но для текста.",
  keywords: [
    "совместное редактирование",
    "CRDT",
    "контроль версий",
    "документы",
    "реальное время",
    "коллаборация",
  ],
  openGraph: {
    title: "SyncPro — Совместное редактирование с контролем версий",
    description:
      "Редактируйте документы вместе в реальном времени. Ветвление, слияние и полная история изменений — как Git, но для текста.",
    type: "website",
    locale: "ru_RU",
  },
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('syncpro-theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <div className="flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
