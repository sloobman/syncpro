# SyncPro Agent Instructions & GitFlow Rules

## Общие принципы разработки

SyncPro — высоконадежная распределенная система совместного редактирования.
Любой AI-агент или разработчик, работающий в этом репозитории, **ОБЯЗАН** строго следовать правилам ветвления и валидации перед мержем.

---

## 1. Строгий GitFlow: "Сначала DEV, затем MAIN"

### ❌ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Писать код или делать коммиты напрямую в ветку `main`.
- Пушить неоттестированный код в `main`. Ветка `main` подключена к автоматическому **CD на production VPS (144.31.192.179)**. Любой пуш в `main` сразу же обновляет боевой сервер.

### ✅ ПРАВИЛЬНЫЙ РАБОЧИЙ ПРОЦЕСС:

```
[task / issue]
      │
      ▼
1. Создать ветку от 'dev':
   feature/<название_фичи> или fix/<название_бага>
      │
      ▼
2. Разработка и локальная проверка:
   - npm run lint
   - npx tsc --noEmit
   - npm run build (или тесты backend)
      │
      ▼
3. Коммит и слияние в 'dev':
   - git checkout dev
   - git merge --no-ff feature/<название_фичи>
   - git push origin dev
   (В GitHub Actions запускается CI-пайплайн: линтер, типизация, сборка)
      │
      ▼
4. Релиз / Деплой на Production:
   Только после успешного прохождения всех проверок в 'dev':
   - git checkout main
   - git merge --no-ff dev
   - git push origin main
   (GitHub Actions автоматически запускает CD и деплоит на VPS)
```

---

## 2. Именование веток

- `feature/<name>` — для новой функциональности (например: `feature/crdt-yata-ordering`, `feature/workspace-sidebar`).
- `fix/<name>` — для исправления багов (например: `fix/nginx-websocket-timeout`, `fix/cursor-offset`).
- `refactor/<name>` — для оптимизации и рефакторинга без изменения поведения.
- `docs/<name>` — для документации и гайдов.

---

## 3. Чек-лист агента перед любым коммитом

Перед созданием коммита агент обязан выполнить:
1. `npm --prefix frontend run lint` — должно быть 0 ошибок.
2. `npx --prefix frontend tsc --noEmit` — строгая проверка типов TypeScript.
3. `npm --prefix frontend run build` — успешная проверка production-сборки Next.js.
4. Проверить `git status` — убедиться, что не закоммичены лишние временные файлы или локальные `.env`.

---

## 4. Конвенция коммитов (Conventional Commits)

Формат сообщений коммитов:
`<type>(<scope>): <описание на английском или русском>`

Типы:
- `feat`: новая функциональность
- `fix`: исправление бага
- `refactor`: переработка существующего кода
- `test`: добавление или исправление тестов
- `docs`: изменения в документации
- `chore`: конфигурация сборки, зависимости, CI/CD

Примеры:
- `feat(crdt): implement lamport clock and basic block ids`
- `fix(frontend): resolve memory leak in presence awareness avatar hook`
- `chore(ci): update github actions workflow timeout`
