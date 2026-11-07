# SyncPro: Hybrid Collaborative Editing Engine (Merkle-CRDT)

SyncPro — высокопроизводительная распределенная система совместного редактирования структурированных rich-text документов произвольного объема (500+ страниц) с версионированием в стиле Git.

Система объединяет посимвольное разрешение конфликтов на базе CRDT (YATA/Fugue) с контролем версий на основе неизменяемого Merkle-DAG коммитов и трехуровневым гибридным хранилищем.

---

## Архитектура локального окружения (Этап 0 / Task 0.1)

Локальное окружение разработки разворачивается с помощью Docker Compose и включает следующие ключевые сервисы:

```
[Local Development Environment]
  ├── PostgreSQL 16 (Port 5432) ── Хранение метаданных документов, веток, DAG-связей коммитов
  ├── MinIO S3 (Port 9000/9001)   ── CAS хранилище дельт коммитов и CRDT-снапшотов (S3 API + Console)
  ├── Redis 7 (Port 6379)         ── Шина Awareness (курсоры, presence) и буферизация операций (AOF + Streams)
  └── MinIO Init Worker           ── Автоматическое создание бакетов и настройка политик доступа
```

---

## Требования к окружению

- **Docker:** Engine 24+ / Docker Desktop (с поддержкой Docker Compose v2+)
- **Среда выполнения (для скриптов):** PowerShell (Windows) или Bash (Linux/macOS/WSL), либо Node.js 18+

---

## Быстрый старт

### 1. Подготовка переменных окружения

Скопируйте пример файла конфигурации:

```bash
cp .env.example .env
```

В `.env` содержатся настройки портов и параметров подключения по умолчанию:

```dotenv
# Database (PostgreSQL 16)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=syncpro_dev
POSTGRES_USER=syncpro
POSTGRES_PASSWORD=syncpro_secret

# Object Storage (MinIO / S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_COMMITS=syncpro-commits
S3_BUCKET_SNAPSHOTS=syncpro-snapshots
S3_USE_SSL=false
MINIO_CONSOLE_PORT=9001

# Stream Broker & Cache (Redis 7)
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# App Server
PORT=8080
WS_PORT=8081
LOG_LEVEL=debug
```

### 2. Запуск контейнеров

Запустите все сервисы в фоновом режиме:

```bash
docker compose up -d
```

*(или с использованием Makefile: `make up`)*

Docker Compose автоматически поднимет контейнеры:
1. `syncpro-postgres` — инициализирует БД `syncpro_dev`, расширения `uuid-ossp` и `pgcrypto`, а также базовую схему Merkle-DAG (`documents`, `commits`, `commit_parents`, `branches`).
2. `syncpro-minio` — запускает S3-совместимое объектное хранилище на портах 9000 (API) и 9001 (Web UI).
3. `syncpro-minio-init` — дожидается готовности MinIO и автоматически создает бакеты `syncpro-commits` и `syncpro-snapshots` с приватным доступом.
4. `syncpro-redis` — запускает Redis 7 со включенным AOF/RDB персистентным режимом и поддержкой Streams.

### 3. Проверка статуса (Healthcheck)

Для проверки доступности и корректной инициализации всех сервисов воспользуйтесь любым из доступных healthcheck-инструментов:

**В PowerShell (Windows):**
```powershell
.\scripts\healthcheck.ps1
```

**В Bash (Linux / macOS / Git Bash):**
```bash
./scripts/healthcheck.sh
```

**Кроссплатформенно через Node.js:**
```bash
node scripts/healthcheck.js
```

**Через Makefile:**
```bash
make healthcheck
```

Скрипт проверяет:
- [x] Доступность PostgreSQL (`pg_isready`), выполнение тестового SQL-запроса и наличие установленных расширений `uuid-ossp` и `pgcrypto`.
- [x] Доступность MinIO S3 API (`/minio/health/live`) и наличие созданных бакетов `syncpro-commits`, `syncpro-snapshots`.
- [x] Доступность Redis (`PING -> PONG`), а также корректную работу структуры `Redis Streams` (`XADD`/`XRANGE`).

---

## Подключение к сервисам

| Сервис | Хост / Порт | Учетные данные | Назначение |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `localhost:5432` | `syncpro` / `syncpro_secret` (БД: `syncpro_dev`) | Метаданные, DAG коммитов, ветки |
| **MinIO S3 API** | `localhost:9000` | `minioadmin` / `minioadmin` | CAS дельт коммитов и снапшотов |
| **MinIO Web Console** | `http://localhost:9001` | `minioadmin` / `minioadmin` | Веб-интерфейс управления бакетами |
| **Redis 7** | `localhost:6379` | Без пароля (по умолчанию) | Awareness-события и очередь дельт |

---

## Управление контейнерами

- **Просмотр статуса сервисов:**
  ```bash
  docker compose ps
  ```
- **Просмотр логов:**
  ```bash
  docker compose logs -f
  ```
- **Остановка сервисов:**
  ```bash
  docker compose down
  ```
- **Полная очистка с удалением томов:**
  ```bash
  docker compose down -v
  ```

---

## Структура проекта

```
syncpro/
├── docker-compose.yml              # Манифест инфраструктурных сервисов
├── .env.example                    # Пример конфигурации окружения
├── .env                            # Локальный файл переменных окружения
├── Makefile                        # Команды сборки и управления
├── README.md                       # Документация проекта
├── ARCHITECTURE.md                 # Полная техническая спецификация системы
├── scripts/
│   ├── init-db/
│   │   └── 01-init.sql             # SQL инициализации схемы PostgreSQL
│   ├── healthcheck.ps1             # Healthcheck для PowerShell
│   ├── healthcheck.sh              # Healthcheck для Bash / Linux / WSL
│   └── healthcheck.js              # Healthcheck для Node.js
└── tasks/                          # Декомпозиция задач и дорожная карта (Roadmap)
    ├── 00-infrastructure-foundation/ # Этап 0: Базовая инфраструктура
    ├── 01-crdt-core/                 # Этап 1: Ядро CRDT
    ├── 02-sync-server/               # Этап 2: Сервер синхронизации
    ├── 03-merkle-dag-versioning/     # Этап 3: Merkle-DAG версионирование
    ├── 04-frontend-editor/           # Этап 4: Редактор и UI
    └── 05-compaction-optimization/   # Этап 5: Оптимизация и компакция
```
