<div align="center">

# ⚡ SyncPro

### Распределенная система совместного редактирования с Merkle-CRDT контролем версий

[![Production](https://img.shields.io/badge/Production-mihleev.ru-success?style=for-the-badge&logo=google-chrome&logoColor=white)](https://mihleev.ru)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![MinIO](https://img.shields.io/badge/MinIO-S3_CAS-c72c48?style=for-the-badge&logo=minio&logoColor=white)](https://min.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![CI/CD](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/sloobman/syncpro/actions)

<p align="center">
  <b>Высокопроизводительная web-платформа для командной работы над объемными rich-text документами, объединяющая посимвольное бесконфликтное редактирование (CRDT Fugue/YATA) с криптографическим контролем версий в стиле Git (Merkle-DAG, 2D ветвление, 3-Way Merge, Time-Travel).</b>
</p>

[🌐 Боевой сервер](https://mihleev.ru) • [📋 Архитектура](ARCHITECTURE.md) • [🚀 Быстрый старт](#-быстрый-старт) • [🌿 GitFlow](AGENTS.md)

</div>

---

## 📖 О проекте

Большинство современных текстовых процессоров либо предлагают совместную работу в реальном времени без глубокой истории и ветвления (Google Docs, Notion), либо требуют сложного ручного разрешения конфликтов при синхронизации файлов (Git + Markdown).

**SyncPro** решает эту проблему на фундаментальном алгоритмическом уровне:
1. **В реальном времени:** пользователи совместно редактируют один и тот же документ без задержек и блокировок — движок **CRDT** гарантирует строгое схождение состояния на всех устройствах.
2. **В контроле версий:** пользователи создают осмысленные коммиты, ответвляют идеи в изолированные ветки, исследуют историю через визуальный **2D DAG-граф**, выполняют **3-Way слияния** с алгоритмическим поиском общего предка (LCA) и путешествуют во времени через интерактивный Time-Travel док.

---

## 🌟 Ключевые возможности

### ⚡ 1. Алгоритмическое ядро CRDT (Conflict-Free Replicated Data Type)
- **Детерминированное посимвольное схождение:** реализация на базе алгоритмов **YATA / Fugue** исключает интерливинг и потерю символов при одновременном вводе.
- **Логические часы Лампорта и Векторы Состояния (State Vector):** частичный и полный порядок операций без синхронизации физического времени.
- **Компактный бинарный кодек:** эффективная сериализация дельт и состояний в бинарный формат для передачи по сети и долговременного хранения.
- **Fuzzing & Chaos Resilience:** ядро валидировано стресс-тестами на 10 000+ конкурентных операций между 4 независимыми пирами.

### 🌳 2. Полноценный контроль версий (Merkle-DAG)
- **Криптографическая неизменяемость:** каждый коммит идентифицируется 64-символьным SHA-256 хешем, вычисляемым от метаданных, родительских узлов и дельты контента.
- **Автоматический корневой коммит:** создается при создании любого документа и служит надежным базисом истории.
- **Многодорожечная 2D визуализация графа (DAG Lanes):**
  - Каждая ветка отображается на собственной цветной дорожке (синяя для `main`, изумрудная, фиолетовая, янтарная для фиче-веток).
  - Гладкие кривые Безье для разветвлений (fork) и штриховые кривые для слияний (merge).
  - Цветные бейджи веток (`[main]`, `[feature/...]`) и динамический индикатор `(HEAD)`.
- **Изолированные ветки:** создание ветки с пользовательским именем из любой точки графа; мгновенное переключение активного текста документа при смене ветки.
- **Интеллектуальный 3-Way Merge:**
  - Алгоритмический поиск наименьшего общего предка (LCA).
  - Dry-run анализ конфликтов (автоматическое бесконфликтное слияние или интерактивное разрешение по блокам: *Ours / Theirs / Both*).
  - Фиксация объединенного текста в документе и создание Merge-коммита.
- **Time-Travel и управление историей:**
  - Плавающий адаптивный док для инспекции исторических версий.
  - **Revert:** откат документа к любой исторической точке с созданием коммита восстановления.
  - **Delete:** безопасное удаление коммитов из DAG с автоматической перелинковкой связей родителей.

### 📝 3. Современный блочный Rich-Text редактор
- **Богатая структура блоков:**
  - Абзацы (Paragraph), Заголовки (H1, H2, H3)
  - Списки задач (Todo / Checkbox) с отметкой выполнения
  - Блоки цитат (Quote), Таблицы с динамическими строками и столбцами
  - Загрузка изображений на сервер в объектное хранилище MinIO S3
- **Инлайн-форматирование:** жирный (`Ctrl+B`), курсив (`Ctrl+I`), зачеркнутый, моноширинный код.
- **Навигация и статистика:** автоматическое оглавление документа, живой счетчик слов и символов, статус автосохранения черновика.
- **Экспорт и импорт:** импорт Markdown-файлов с автоматическим парсингом блоков, экспорт в чистый `.md` и печать в PDF.

### 👥 4. Командные пространства и совместная работа
- **Рабочие пространства (Workspaces):** организация документов по проектам, управление участниками и ролями (Владелец, Редактор, Читатель).
- **Живое присутствие (Redis Awareness):** индикация активных соавторов онлайн в реальном времени.
- **Внутридокументные комментарии:** контекстное обсуждение и обратная связь в боковой панели.
- **Центр уведомлений:** оповещения о коммитах, слияниях веток и изменениях в пространствах.
- **Профиль и безопасность:** загрузка кастомных аватарок, смена пароля, защищенные HTTP-only cookies с JWT.

---

## 🏗 Архитектура системы

```
                              [ Клиенты / Браузеры ]
                                        │
                               HTTPS / WSS / REST
                                        ▼
                        [ Nginx Reverse Proxy (SSL) ]
                                        │
                                        ▼
                     [ Next.js 16 Fullstack App / API ]
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        [ PostgreSQL 16 ]           [ Redis 7 ]          [ MinIO S3 CAS ]
    • Документы и пространства  • Живое присутствие    • Снапшоты CRDT
    • Учетные записи и роли     • Awareness-курсоры    • Дельты коммитов
    • Merkle-DAG и связи        • Очереди событий      • Загруженные медиа
    • Ветки и комментарии       • Heartbeat таймеры    • Аватарки пользователей
```

### Стек технологий

| Уровень | Технологии |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.9, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons |
| **Backend & API** | Next.js Server Components, API Route Handlers, Node.js Crypto (SHA-256), JWT Auth |
| **База данных** | PostgreSQL 16 (расширения `uuid-ossp`, `pgcrypto`), пул соединений `pg` |
| **Кэш и шина событий** | Redis 7 (In-memory Awareness, Heartbeat presence, Streams) |
| **Объектное хранилище** | MinIO S3 (Content-Addressable Storage для дельт и файлов) |
| **DevOps & Deploy** | Docker Compose, Nginx, GitHub Actions (CI линтер/типы/сборка + CD auto-deploy на Ubuntu VPS) |

---

## 🚀 Быстрый старт

### Предварительные требования
- **Docker & Docker Compose** (v24+)
- **Node.js** (v20+ или v22 LTS)
- **npm** (v10+)

### 1. Клонирование репозитория
```bash
git clone https://github.com/sloobman/syncpro.git
cd syncpro
```

### 2. Настройка переменных окружения
Скопируйте пример файла конфигурации:
```bash
cp .env.example .env
```
*(Параметры по умолчанию настроены для локальной разработки и не требуют правок при первом запуске)*.

### 3. Запуск инфраструктуры в Docker
Поднимите контейнеры базы данных, кэша и объектного хранилища:
```bash
docker compose up -d
```

Сервисы будут доступны по адресам:
- **PostgreSQL 16:** `localhost:5432` (`syncpro` / `syncpro_secret`, БД `syncpro_dev`)
- **Redis 7:** `localhost:6379`
- **MinIO S3 API:** `localhost:9000` (`minioadmin` / `minioadmin`)
- **MinIO Web Console:** `http://localhost:9001`

### 4. Проверка готовности сервисов (Healthcheck)
```bash
# Через Node.js (кроссплатформенно):
node scripts/healthcheck.js

# Либо через PowerShell (Windows):
.\scripts\healthcheck.ps1

# Либо через Bash (Linux / macOS):
./scripts/healthcheck.sh
```

### 5. Запуск веб-приложения (Frontend)
```bash
cd frontend
npm install
npm run dev
```

Откройте в браузере: **`http://localhost:3000`**

---

## 🧪 Тестирование и верификация

Система покрыта многоуровневыми тестами и строгими проверками качества перед каждым релизом:

```bash
# 1. Запуск модульных тестов CRDT и Merkle-DAG:
npm --prefix frontend test

# 2. Строгая проверка статической типизации:
cd frontend && npx tsc --noEmit

# 3. Проверка правил линтинга ESLint:
npm --prefix frontend run lint

# 4. Проверка production-сборки Next.js:
npm --prefix frontend run build
```

### Результаты автоматизированного набора тестов:
- `hashPassword & verifyPassword` — криптографическая проверка паролей bcrypt.
- `signToken & verifyToken` — безопасность и восстановление сессионных JWT.
- `LamportClock` — монотонность и witness удаленных логических часов.
- `TextCRDT YATA / Fugue` — детерминированное схождение конкурентных вставок и удалений.
- `TreeCRDT` — защита от циклов в иерархических структурах блоков.
- `BinaryCodec` — сериализация векторов состояния и бинарных операций.
- `Fuzzing & Chaos Simulation` — 10 000+ случайных конкурентных операций между 4 репликами.
- `MerkleDAG LCA` — корректность нахождения наименьшего общего предка при ветвлении.
- `ThreeWayMergeEngine` — бесконфликтное автоматическое объединение непересекающихся веток.

---

## 🌿 Процесс разработки (GitFlow)

В проекте действует строгий регламент ветвления, описанный в [AGENTS.md](AGENTS.md):

```
[Задача / Фича]
       │
       ▼
1. Ветка от 'dev':
   feature/<название> или fix/<название> или docs/<название>
       │
       ▼
2. Локальная проверка (Чек-лист):
   - npm run lint      ── 0 ошибок
   - tsc --noEmit      ── 0 ошибок
   - npm test          ── Все тесты пройдены
   - npm run build     ── Успешный билд Next.js
       │
       ▼
3. Слияние в ветку 'dev':
   - git checkout dev
   - git merge --no-ff feature/<название>
   - git push origin dev
   (Запуск GitHub Actions CI: проверка кода и тестов)
       │
       ▼
4. Релиз на Production VPS:
   - git checkout main
   - git merge --no-ff dev
   - git push origin main
   (GitHub Actions CD автоматически обновляет боевой сервер https://mihleev.ru)
```

---

## 📁 Структура проекта

```
syncpro/
├── .github/workflows/          # CI/CD пайплайны (ci.yml, cd.yml)
├── docker-compose.yml          # Манифест инфраструктуры для локальной разработки
├── docker-compose.prod.yml     # Продакшн манифест с Nginx и переменными окружения
├── Makefile                    # Скрипты автоматизации команд
├── AGENTS.md                   # Инструкции и правила GitFlow для агентов и разработчиков
├── ARCHITECTURE.md             # Детальная архитектурная спецификация движка
├── README.md                   # Главная документация проекта
├── scripts/                    # Скрипты инициализации БД и healthcheck
└── frontend/                   # Полнофункциональное Next.js приложение
    ├── src/
    │   ├── app/                # Next.js App Router (страницы, дашборд, редактор, API)
    │   │   ├── api/            # REST API (документы, ветки, коммиты, слияния, auth)
    │   │   ├── dashboard/      # Личный кабинет и рабочие пространства
    │   │   └── doc/[id]/       # Страница редактора документа
    │   ├── components/         # React-компоненты
    │   │   ├── editor/         # Блочный редактор, 2D DAG граф, тулбар, TimeTravel dock
    │   │   ├── dashboard/      # Сайдбар, список документов, создание пространств
    │   │   └── ui/             # Библиотека базовых компонентов интерфейса (shadcn/ui)
    │   └── lib/                # Внутренние модули и алгоритмы
    │       ├── crdt/           # Реализация CRDT (Fugue/YATA, Lamport clock, binary codec)
    │       ├── merkle-dag/     # Merkle-DAG, вычисление SHA-256 хешей, 3-Way Merge LCA
    │       ├── db/             # Репозитории PostgreSQL (документы, коммиты, ветки)
    │       └── stores/         # Zustand хранилища состояния (auth, workspaces, ui)
    └── package.json
```

---

## 📄 Лицензия

Проект распространяется под лицензией **MIT**. Подробности в файле [LICENSE](LICENSE).

<div align="center">
  <sub>Разработано с акцентом на надежность, математическую строгость и удобство совместной работы.</sub>
</div>
