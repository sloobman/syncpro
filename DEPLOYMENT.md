# Руководство по развертыванию и Git-воркфлоу SyncPro

## 1. Структура веток Git

Проект настроен со стандартной моделью ветвления:
- **`main`** — стабильная продакшн-версия. Любой коммит/мерж в `main` автоматически триггерит **CD (автодеплой на VPS)** после успешного прохождения CI.
- **`dev`** — основная ветка разработки. Сюда вливаются проверенные фичи. На каждый пуш/PR запускается полный **CI (тесты, линтер, тайпчек, сборка)**.
- **`feature/<name>`** или **`fix/<name>`** — ветки под конкретные задачи. Создаются от `dev`, вливаются через Pull Request в `dev`.

### Как связать локальный репозиторий с GitHub:
```bash
# 1. Добавить удаленный репозиторий (замените URL на ваш)
git remote add origin git@github.com:USERNAME/syncpro.git

# 2. Отправить ветки main и dev
git push -u origin main
git push -u origin dev
```

---

## 2. Требования к VPS серверу (Production)

Для запуска полного стека (Next.js SSR Frontend, PostgreSQL 16, Redis 7, MinIO S3, Nginx Reverse Proxy, Sync Server):

### Рекомендуемые характеристики:
- **CPU:** 4 vCPU (минимум 2 vCPU)
- **Оперативная память (RAM):** 8 ГБ (минимально допустимо: 4 ГБ + 4 ГБ Swap)
  - Next.js SSR / Node: ~500 МБ - 1 ГБ
  - PostgreSQL 16: ~500 МБ - 1 ГБ
  - Redis 7: ~250 МБ - 500 МБ
  - MinIO: ~300 МБ - 600 МБ
  - Sync Engine (Go/Rust / WebSockets): ~300 МБ - 1 ГБ
  - Запас под сборку Docker образов на сервере: ~1.5 - 2 ГБ
- **Диск:** 50 - 80 ГБ NVMe SSD
- **ОС:** Ubuntu 22.04 LTS или Ubuntu 24.04 LTS
- **Сеть:** Статический публичный IPv4 адрес, открытые порты `80` (HTTP), `443` (HTTPS), `22` (SSH).

### Где арендовать:
- **В РФ (оплата РФ-картами/юрлицами):** Timeweb Cloud, Selectel, Beget, Aeza, FirstVDS.
- **За рубежом:** Hetzner (Cloud CPX31/CX32 ~7-13 €/мес — оптимально по соотношению цена/производительность), DigitalOcean, Vultr.

---

## 3. Настройка VPS (Первичная подготовка)

Подключитесь к VPS по SSH и выполните базовую настройку:

```bash
# 1. Обновление пакетов
sudo apt update && sudo apt upgrade -y

# 2. Установка Docker и Docker Compose v2
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Установка Git
sudo apt install -y git curl

# 4. Создание каталога проекта
sudo mkdir -p /opt/syncpro
sudo chown -R $USER:$USER /opt/syncpro

# 5. Клонирование репозитория
git clone https://github.com/USERNAME/syncpro.git /opt/syncpro
cd /opt/syncpro
git checkout main

# 6. Создание рабочего .env файла из шаблона
cp .env.prod.example .env
nano .env  # Заполните надежные пароли для Postgres, Redis и MinIO
```

---

## 4. Настройка автодеплоя (GitHub Secrets)

В репозитории GitHub перейдите в **Settings** -> **Secrets and variables** -> **Actions** и добавьте следующие секреты:

1. `VPS_HOST` — IP-адрес вашего сервера (например: `194.87.x.x`).
2. `VPS_USER` — пользователь для деплоя (например: `root` или `ubuntu`).
3. `VPS_SSH_KEY` — приватный SSH-ключ (содержимое `~/.ssh/id_ed25519` или `id_rsa` без пароля passphrase).
   *(Публичный ключ должен быть добавлен на сервере в `~/.ssh/authorized_keys`)*.
4. `VPS_PORT` — порт SSH (по умолчанию `22`).
5. `VPS_DEPLOY_PATH` — путь к проекту на сервере (по умолчанию `/opt/syncpro`).

---

## 5. Как работает пайплайн CI/CD

1. **При создании PR или пуше в `dev` / `main`:**
   - Автоматически запускается `.github/workflows/ci.yml`.
   - Проверяется ESLint (`npm run lint`), строгая типизация TypeScript (`tsc --noEmit`), сборка Next.js (`npm run build`) и валидность Docker Compose файлов.
2. **При слиянии (merge) в `main`:**
   - После прохождения CI запускается `.github/workflows/cd.yml`.
   - GitHub Actions подключается по SSH к вашему VPS.
   - Делает `git pull origin main`.
   - Пересобирает и перезапускает контейнеры через `docker compose -f docker-compose.prod.yml up -d --build`.
   - Очищает старые неиспользуемые Docker-образы.
