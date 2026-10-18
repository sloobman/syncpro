# Task 3.2: Проектирование и миграции схемы PostgreSQL для Merkle-DAG

## 1. Метаданные задачи
- **ID:** `TASK-3.2`
- **Модуль:** `03-merkle-dag-versioning`
- **Приоритет:** P0 (Блокер)
- **Ответственная роль:** Database / Backend Engineer
- **Зависимости:** [TASK-0.1](file:///c:/Users/sloobman/syncpro/tasks/00-infrastructure-foundation/task-0.1-dev-environment/task.md)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L141-L177), [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L122)

---

## 2. Контекст и архитектурная роль
Реляционная СУБД PostgreSQL выступает источником истины для:
- Метаданных документов, прав доступа и участников.
- Реестра веток (`branches`) и их текущих версий (`head_commit_id`).
- Ориентированного ациклического графа коммитов (DAG), связывающего коммиты с их родителями (`commit_parents`).

Схема должна быть оптимизирована под рекурсивные графовые запросы (например, поиск общего предка двух веток через `WITH RECURSIVE`).

---

## 3. Цели и задачи
1. Подготовить файлы миграций базы данных (инструмент миграций: `golang-migrate` или `sqitch` / `diesel`).
2. Создать таблицы `documents`, `branches`, `commits`, `commit_parents` со строгими внешними ключами и каскадным удалением.
3. Добавить индексы для ускорения выборок истории документа и рекурсивных обходов графа.
4. Разработать оптимизированные SQL-запросы:
   - Получение списка коммитов ветки в топологическом порядке с пагинацией.
   - Рекурсивный поиск цепочки предков от заданного коммита.
   - Атомарное переключение ветки (`HEAD update`).
5. Написать DAO / Repository слой для взаимодействия с базой.

---

## 4. Спецификация DDL и запросов

### 4.1. Схема базы данных
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commits (
    id CHAR(64) PRIMARY KEY, -- SHA-256 Hash
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    message TEXT NOT NULL,
    crdt_delta_storage_path TEXT NOT NULL,
    snapshot_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commit_parents (
    commit_id CHAR(64) NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    parent_commit_id CHAR(64) NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    parent_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (commit_id, parent_commit_id)
);

CREATE TABLE branches (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    head_commit_id CHAR(64) NOT NULL REFERENCES commits(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, name)
);

CREATE INDEX idx_commits_doc ON commits(document_id, created_at DESC);
CREATE INDEX idx_commit_parents_parent ON commit_parents(parent_commit_id);
```

### 4.2. Рекурсивный запрос предков (Ancestry Traversal)
```sql
WITH RECURSIVE Ancestors AS (
    SELECT commit_id, parent_commit_id, 1 as depth
    FROM commit_parents
    WHERE commit_id = $1
    UNION ALL
    SELECT cp.commit_id, cp.parent_commit_id, a.depth + 1
    FROM commit_parents cp
    INNER JOIN Ancestors a ON cp.commit_id = a.parent_commit_id
)
SELECT DISTINCT parent_commit_id FROM Ancestors;
```

---

## 5. Граничные случаи и риски
- Удаление документа: каскадное удаление `ON DELETE CASCADE` очищает всю историю DAG в базе данных, однако необходимо фоновым процессом удалить соответствующие бинарные файлы в S3.
- Циклические ссылки в родителях: на уровне API и триггеров должна быть исключена возможность коммиту сослаться на самого себя или своего потомка (DAG invariant).

---

## 6. Definition of Done (DoD)
- [ ] Все миграции написаны, применимы (`up`) и обратимы (`down`).
- [ ] Написаны unit/integration тесты для репозитория PostgreSQL (CRUD документов, коммитов и веток).
- [ ] Рекурсивный запрос предков тестируется на глубине дерева 1 000 коммитов и выполняется быстрее $5$ мс.
- [ ] Проверено предотвращение состояния гонки при параллельном Fast-Forward коммите в ветку.
