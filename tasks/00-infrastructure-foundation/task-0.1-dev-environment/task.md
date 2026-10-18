# Task 0.1: Локальное окружение разработки и базовая инфраструктура

## 1. Метаданные задачи
- **ID:** `TASK-0.1`
- **Модуль:** `00-infrastructure-foundation`
- **Приоритет:** P0 (Блокер)
- **Ответственная роль:** DevOps / Backend Core Engineer
- **Зависимости:** Отсутствуют (базовый шаг)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L20-L52)

---

## 2. Контекст и архитектурная роль
Для разработки распределенной системы с гибридным хранилищем (реляционная мета-информация, CAS-хранилище неизменяемых бинарных коммитов и снапшотов, in-memory шина сообщений) требуется воспроизводимое локальное окружение на базе контейнеризации (Docker Compose).

```
[Local Development Environment]
  ├── PostgreSQL 16 (Port 5432) ── Хранение документов, веток, DAG-связей
  ├── MinIO S3 (Port 9000/9001)   ── CAS хранилище дельт коммитов и CRDT-снапшотов
  ├── Redis 7 / Kafka (Port 6379) ── Шина Awareness и буферизация операций
  └── MailHog / Observability     ── Логи и метрики (Prometheus/Grafana опционально)
```

---

## 3. Цели и задачи
1. Подготовить конфигурационный манифест `docker-compose.yml` для поднятия всех инфраструктурных зависимостей проекта.
2. Сконфигурировать автоматическую инициализацию PostgreSQL (создание БД `syncpro_dev`, пользователя и расширений `pgcrypto` / `uuid-ossp`).
3. Сконфигурировать автоматическое создание бакетов MinIO (`syncpro-commits`, `syncpro-snapshots`) с политиками доступа.
4. Настроить Redis со включенным режимом сохранения (AOF/RDB) и поддержкой Redis Streams.
5. Создать файл окружения `.env.example` с переменными доступа для всех сервисов.
6. Написать healthcheck-скрипт или команды Makefile/Taskfile для быстрой проверки доступности сервисов.

---

## 4. Технические требования

### 4.1. Конфигурация сервисов
* **PostgreSQL:**
  - Образ: `postgres:16-alpine`
  - База: `syncpro_dev`
  - Пользователь: `syncpro_user` / пароль по умолчанию для dev.
  - Персистентный volume для данных: `postgres_data`.
  - Директория init-скриптов `/docker-entrypoint-initdb.d` для схемы БД.
* **MinIO (S3 Compatible Storage):**
  - Образ: `minio/minio:latest`
  - Консоль: порт `9001`, API: порт `9000`.
  - Вспомогательный контейнер `minio/mc` для создания бакетов `commits` и `snapshots`.
* **Redis:**
  - Образ: `redis:7-alpine`
  - Запуск с `appendonly yes` для надежной фиксации стримов.
  - Порт `6379`.

### 4.2. Файл переменных окружения (.env.example)
```dotenv
# Database
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

# Stream Broker (Redis)
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# App Server
PORT=8080
WS_PORT=8081
LOG_LEVEL=debug
```

---

## 5. Граничные случаи и риски
- Задержка готовности сервисов при старте: контейнеры должны обладать честными директивами `healthcheck`, чтобы зависимые сервисы запускались только после `service_healthy`.
- Кроссплатформенность путей на Windows / Linux: монтирование volumes в Docker Compose должно работать корректно на Windows WSL2 и локальных хостах.

---

## 6. Definition of Done (DoD)
- [x] Файл `docker-compose.yml` и `.env.example` созданы в репозитории.
- [x] Команда `docker compose up -d` поднимает Postgres, MinIO и Redis без ошибок.
- [x] Скрипты инициализации успешно создают бакеты MinIO и базу Postgres.
- [x] Написан `README.md` с инструкцией по запуску локального окружения.
- [x] Успешно проходит проверочный пинг каждого сервиса (psql, redis-cli, curl к minio health endpoint).
