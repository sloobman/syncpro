# ТЗ на устранение дефектов и уязвимостей в SyncPro

> **Инструкция для AI-агента / Разработчика:**  
> Строго соблюдай правила разработки из `AGENTS.md`:
> 1. Создай ветку от `dev`: `git checkout dev && git checkout -b fix/qa-acceptance-fixes`
> 2. Вноси изменения строго по пунктам ниже.
> 3. Перед коммитом выполни:
>    - `npm --prefix frontend run lint` (0 ошибок)
>    - `npx --prefix frontend tsc --noEmit` (0 ошибок)
>    - `npm --prefix frontend run build` (успешная сборка)
> 4. Закоммить по Conventional Commits: `fix: resolve qa acceptance issues and security headers`
> 5. Слей ветку в `dev` (`git checkout dev && git merge --no-ff fix/qa-acceptance-fixes`). **В `main` напрямую не пушить!**

---

## 📌 Список задач (отсортирован по приоритету)

### Задача 1. Добавить `id="how-it-works"` в секцию лендинга (Блокер навигации)
- **Файл:** `frontend/src/components/landing/how-it-works.tsx`
- **Строка:** ~49
- **Проблема:** Ссылка в шапке ведет на `#how-it-works`, но страница не скроллится, так как у `<section>` нет `id`.
- **Что сделать:**
  Заменить:
  ```tsx
  <section className="bg-muted/30 py-20 sm:py-28">
  ```
  на:
  ```tsx
  <section id="how-it-works" className="bg-muted/30 py-20 sm:py-28">
  ```

---

### Задача 2. Добавить `middleware.ts` для защиты `/dashboard`, `/settings`, `/doc`
- **Файл для создания:** `frontend/src/middleware.ts`
- **Проблема:** Неавторизованный пользователь получает 200 OK на `/dashboard` и видит заготовку интерфейса вместо редиректа на страницу входа.
- **Что сделать:** Создать `frontend/src/middleware.ts`:
  ```typescript
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/request";

  const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/doc/"];

  export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Исключаем публичный демо-документ, если он должен быть доступен
    const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isProtected) {
      const token = request.cookies.get("syncpro_token")?.value;
      if (!token) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ["/dashboard/:path*", "/settings/:path*", "/doc/:path*"],
  };
  ```

---

### Задача 3. Скрыть внутренние сервисы в `/api/health` для неавторизованных пользователей
- **Файл:** `frontend/src/app/api/health/route.ts`
- **Проблема:** Эндпоинт отдает открытый JSON с названиями `postgres`, `redis`, `minio_s3` и сетевыми задержками, что облегчает разведку потенциальному злоумышленнику.
- **Что сделать:**
  Для публичных запросов возвращать только компактный статус:
  ```typescript
  const isHealthy = Object.values(health).every((h) => h.status === "up");

  // Для неавторизованных или публичных запросов отдаем абстрактный ответ
  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
  ```
  *(Детальную информацию `services: health` отдавать только если передан внутренний секретный заголовок/токен или при наличии сессии администратора).*

---

### Задача 4. Уникальные `<title>` и `<meta description>` для страниц (SEO)
- **Проблема:** Все страницы (`/docs`, `/changelog`, `/privacy`, `/terms`, `/auth/login`, `/auth/register`) отображают общий тайтл лендинга.
- **Что сделать:** Добавить `export const metadata: Metadata = { ... }` в следующие файлы:
  1. `frontend/src/app/docs/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "Документация и API — SyncPro",
       description: "Руководства, документация по CRDT и интеграции SyncPro.",
     };
     ```
  2. `frontend/src/app/changelog/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "История обновлений (Changelog) — SyncPro",
       description: "Список релизов, новых возможностей и исправлений платформы SyncPro.",
     };
     ```
  3. `frontend/src/app/privacy/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "Политика конфиденциальности — SyncPro",
     };
     ```
  4. `frontend/src/app/terms/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "Условия использования — SyncPro",
     };
     ```
  5. `frontend/src/app/auth/login/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "Вход в аккаунт — SyncPro",
     };
     ```
  6. `frontend/src/app/auth/register/page.tsx`:
     ```typescript
     export const metadata: Metadata = {
       title: "Регистрация — SyncPro",
     };
     ```
  7. `frontend/src/app/not-found.tsx`: добавить `title: "Страница не найдена (404) — SyncPro"`.

---

### Задача 5. Сложность пароля при смене пароля (`/api/auth/change-password`)
- **Файл:** `frontend/src/app/api/auth/change-password/route.ts`
- **Проблема:** Проверяется только `newPassword.length < 8`. Отсутствует проверка на заглавную букву, цифру и спецсимвол (которые требуются при регистрации).
- **Что сделать:** Добавить проверку сложности, синхронизировав с `register/route.ts`:
  ```typescript
  const PASSWORD_UPPERCASE = /[A-Z]/;
  const PASSWORD_DIGIT = /\d/;
  const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

  if (
    !newPassword ||
    newPassword.length < 8 ||
    !PASSWORD_UPPERCASE.test(newPassword) ||
    !PASSWORD_DIGIT.test(newPassword) ||
    !PASSWORD_SPECIAL.test(newPassword)
  ) {
    return NextResponse.json(
      { error: "Новый пароль должен содержать минимум 8 символов, заглавную букву, цифру и спецсимвол" },
      { status: 400 }
    );
  }
  ```

---

### Задача 6. OAuth-кнопки (Интерфейс vs API 501)
- **Файл:** `frontend/src/components/auth/social-auth-buttons.tsx`
- **Проблема:** Кнопки «Войти через Google» и «Войти через GitHub» кликабельны, но API возвращает 501 («OAuth временно отключен»), что путает пользователя.
- **Что сделать:** 
  Либо временно скрыть блок `<SocialAuthButtons />` в `/auth/login/page.tsx` и `/auth/register/page.tsx`, либо добавить на кнопки статус `disabled` с понятным бейджем «Скоро» / «В разработке».

---

### Задача 7. Убрать заголовок `X-Powered-By: Next.js`
- **Файл:** `frontend/next.config.ts`
- **Что сделать:** Добавить свойство `poweredByHeader: false`:
  ```typescript
  const nextConfig: NextConfig = {
    poweredByHeader: false,
    output: "standalone",
    // ...
  };
  ```

---

### Задача 8. Локализация футера (Changelog → История обновлений)
- **Файл:** `frontend/src/components/layout/footer.tsx`
- **Строка:** ~108
- **Что сделать:** Заменить английский текст `Changelog` на `История изменений` или `Обновления`.

---

## 🔍 Чек-лист проверки перед коммитом
- [ ] `npm --prefix frontend run lint` завершается без ошибок
- [ ] `npx --prefix frontend tsc --noEmit` завершается без ошибок
- [ ] `npm --prefix frontend run build` успешно собирает проект
- [ ] Закоммитить в ветку `fix/...`, слить в `dev`
