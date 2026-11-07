import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Политика конфиденциальности
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Защита персональных данных и безопасность документов
              </p>
            </div>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">1. Сбор и использование информации</h2>
              <p>
                SyncPro собирает минимально необходимый объём учетных данных: ваш адрес электронной почты, отображаемое имя и хэшированные пароли (bcrypt, 12 раундов соли). Мы никогда не передаем ваши контактные данные рекламным трекерам.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">2. Шифрование и безопасность данных</h2>
              <p>
                Все сетевые соединения защищены современным протоколом TLS 1.3 с обязательным HSTS. Бинарные дельты коммитов шифруются при передаче и хранятся в изолированных бакетах S3/MinIO с проверкой целостности по контрольным суммам SHA-256.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">3. Удаление аккаунта и экспорт</h2>
              <p>
                Вы имеете полное право в любой момент выгрузить свои документы в формате Markdown или полностью удалить свой аккаунт и связанные пространства через панель настроек профиля.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
