import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Условия использования — SyncPro",
};

export default function TermsPage() {
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

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Пользовательское соглашение
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Редакция от 7 ноября 2026 г. • SyncPro Platform
              </p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">1. Общие положения</h2>
              <p>
                Настоящее Соглашение определяет условия использования облачного сервиса SyncPro для совместного создания, редактирования и версионирования электронных документов. Регистрируясь в сервисе, вы соглашаетесь с условиями настоящего документа.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">2. Данные и конфиденциальность</h2>
              <p>
                Все права на создаваемые вами документы принадлежат исключительно вам и вашей организации. Сервис использует децентрализованные математические алгоритмы CRDT и Merkle-DAG для обеспечения сохранности истории правок без несанкционированного доступа третьих лиц.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">3. Доступность сервиса и SLA</h2>
              <p>
                Команда SyncPro гарантирует доступность сервиса на уровне 99.9% для коммерческих планов. Локальные реплики данных сохраняются в вашем браузере (IndexedDB) и продолжают функционировать даже при временном отсутствии сетевого подключения (Offline-First).
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
