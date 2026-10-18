# Техническая спецификация: Гибридная система совместного редактирования (Merkle-CRDT)

**Проект:** Распределенная система коллаборативного редактирования больших документов с версионированием в стиле Git  
**Исполнитель:** Antigravity  
**Статус:** Готово к разработке (Architecture & Task Breakdown)  
**Версия спецификации:** 1.0.0  

---

## 1. Концепция и цель проекта

Создать высокопроизводительный сервис совместного редактирования структурированных rich-text документов произвольного объема (500+ страниц), сочетающий:
1. **Realtime-коллаборацию:** посимвольное разрешение конфликтов на базе алгоритмов CRDT (отсутствие ручных маркеров слияния `<<<<<<< HEAD`).
2. **Асинхронный аудит и контроль версий (Git-модель):** неизменяемый Merkle-DAG коммитов, ветвление (`branches`), бесконфликтное слияние (`3-way CRDT merge`) и посимвольный Diff/Time-Travel.
3. **Оптимизацию для больших документов:** блочно-иерархическую структуру данных, ленивую загрузку (sparse sync) и компакцию истории (garbage collection надгробий).

---

## 2. Архитектура системы

### 2.1. Архитектурный стиль
Сервисно-ориентированный гибрид (3 функциональных контура):
* **Stateful Collaboration Engine (Go / Rust):** управление активными комнатами в RAM, терминация WebSockets/WebTransport, детерминированное слияние дельт, Awareness Protocol.
* **Stateless API Gateway & Management Service (Node.js / Go):** авторизация, метаданные проектов/документов, RBAC, ветки и PR-воркфлоу.
* **Storage & Compaction Workers:** фоновые воркеры для формирования Merkle-коммитов, снапшотов в CAS (S3) и сборки мусора.

```
                           [Client (Browser / Native)]
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │ WebSocket / WebTransport                           │ HTTPS (REST / GraphQL)
            ▼                                                     ▼
┌───────────────────────────────┐               ┌─────────────────────────────────┐
│ Stateful Sync Engine (In-Mem) │               │   Stateless Core API & Auth     │
│ - Room Manager (CRDT in RAM)  │               │   - Workspaces, Users, RBAC     │
│ - Ephemeral Awareness Channel │               │   - Branch & PR Orchestration   │
└───────────────┬───────────────┘               └────────────────┬────────────────┘
                │ Kafka / Redis Streams                          │
                ▼                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ASYNC PERSISTENCE WORKERS                             │
│  - Merkle-DAG Builder (Commit Hashing SHA-256)                                  │
│  - Periodic CRDT Snapshotting & Tombstone Garbage Collection                    │
└───────────────────────┬─────────────────────────────────┬───────────────────────┘
                        │                                 │
                        ▼                                 ▼
┌────────────────────────────────────────┐   ┌────────────────────────────────────┐
│      S3 / MinIO (CAS Storage)          │   │         PostgreSQL Database        │
│ - Immutable Binary Commits             │   │ - Document metadata & ACL          │
│ - Compressed CRDT Snapshots            │   │ - DAG Commits & Branch References  │
└────────────────────────────────────────┘   └────────────────────────────────────┘
```

---

## 3. Спецификация структур данных

### 3.1. Идентификация символов и блоков
Каждый редактируемый элемент получает неизменяемый логический идентификатор:
$$\text{ID} = \langle \text{ClientID}, \text{LamportClock} \rangle$$

* Внутри блоков текст организуется по правилам **YATA / Fugue**: вставка опирается на связку $\langle \text{originLeft}, \text{originRight} \rangle$.
* Дерево документа моделируется как **Replicated Tree CRDT** с детерминированным разрешением циклов (алгоритм Клеппмана `Move(BlockID, NewParent, Clock)`).

### 3.2. Структура Merkle-Коммита
```json
{
  "commit_id": "9f83c18b76e1a49a2a3e0b58e8b23f5b72e11894a37e5d83642d0794936d0f11",
  "document_id": "doc_8f12a9de",
  "parents": ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  "branch": "feature/chapter-1",
  "author": {
    "user_id": "usr_42",
    "name": "Alice"
  },
  "timestamp": 1776412800,
  "message": "Update section 1.2 introduction",
  "state_vector_snapshot": {
    "usr_42": 450,
    "usr_17": 128
  },
  "crdt_delta_url": "s3://commits/doc_8f12a9de/9f83c18b.bin",
  "snapshot_ref": "s3://snapshots/doc_8f12a9de/snapshot_v1.bin"
}
```

---

## 4. Спецификация сетевого протокола (WebSocket Sync)

Все сообщения передаются в бинарном формате (Protobuf / VarInt).

1. **Тип `SyncStep1 (StateVector)`:**
   * Отправляется клиентом при подключении.
   * Содержит словарь `Map<ClientID, MaxClock>`, описывающий локальное состояние.
2. **Тип `SyncStep2 (Delta)`:**
   * Сервер вычисляет разницу состояний и отправляет клиенту сжатые байты отсутствующих операций.
3. **Тип `Update (LiveDelta)`:**
   * Трансляция единичной правки в формате RLE (Run-Length Encoding) при активном вводе.
4. **Тип `Awareness`:**
   * TTL-сообщения: позиция курсора (блок, смещение), выделение, статус активности.

---

## 5. Поэтапный план реализации (Task Breakdown)

### Модуль 1: Математическое ядро CRDT (In-Memory Engine)
* [ ] **Task 1.1:** Реализовать структуры `Clock`, `ID`, `BlockNode` и `TextNode`.
* [ ] **Task 1.2:** Реализовать алгоритм упорядочивания операций YATA / Fugue при параллельных вставках между одинаковыми `origin`.
* [ ] **Task 1.3:** Реализовать Replicated Tree CRDT для операций перемещения блоков без циклических дефектов.
* [ ] **Task 1.4:** Реализовать сериализатор/десериализатор операций с применением VarInt и RLE.
* [ ] **Task 1.5:** Разработать стресс-тесты свойства сходимости (Fuzz testing с симуляцией задержек и перестановки 10 000 операций).

### Модуль 2: Реалтайм-сервер синхронизации
* [ ] **Task 2.1:** Развернуть WebSocket-шлюз на Go / Rust с поддержкой Sticky-маршрутизации комнат по `document_id`.
* [ ] **Task 2.2:** Реализовать протокол рукопожатия векторов состояний (`StateVector Handshake`).
* [ ] **Task 2.3:** Реализовать in-memory шину Awareness-событий (курсоры, выделения).
* [ ] **Task 2.4:** Организовать буферизацию дельт (Redis Streams / Kafka) с дебаунсом записи в персистентный слой.

### Модуль 3: Слой Merkle-DAG версионирования
* [ ] **Task 3.1:** Разработать механизм создания микро-коммитов на клиенте и именованных Milestones.
* [ ] **Task 3.2:** Спроектировать реляционную схему PostgreSQL для хранения ссылок на коммиты, веток и истории DAG.
* [ ] **Task 3.3:** Реализовать алгоритм автоматического бесконфликтного слияния (CRDT 3-Way Merge):
  * Вычисление Lowest Common Ancestor (LCA);
  * Наложение дельт обеих веток относительно LCA;
  * Генерация merge-коммита.

### Модуль 4: Клиентский интерфейс (Frontend & Virtualization)
* [ ] **Task 4.1:** Интегрировать ProseMirror / TipTap с локальным CRDT-состоянием.
* [ ] **Task 4.2:** Настроить сохранение состояния в IndexedDB для работы в автономном режиме (Offline First).
* [ ] **Task 4.3:** Реализовать DOM-виртуализацию: ленивый рендеринг блоков за пределами Viewport.
* [ ] **Task 4.4:** Разработать UI контроля версий: дерево веток, ползунок Time-Travel, интерфейс посимвольного Diff.

### Модуль 5: Оптимизация и Compaction
* [ ] **Task 5.1:** Написать воркер создания снапшотов (полный бинарный слепок каждые $N$ коммитов в S3).
* [ ] **Task 5.2:** Реализовать механизм Tombstone Garbage Collection (очистка надгробий для веток без параллельных правок).
* [ ] **Task 5.3:** Реализовать Sparse Sync (потоковая подгрузка секций 500-страничного документа по мере скролла).

---

## 6. База данных: Схема PostgreSQL (DDL)

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    head_commit_id CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, name)
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

CREATE INDEX idx_commits_doc ON commits(document_id, created_at DESC);
```

---

## 7. Критерии приемки (Definition of Done)

1. **Реалтайм:** Ввод текста двумя авторами в один абзац обрабатывается без видимых задержек (Latency $\le 50\text{ мс}$).
2. **Сходимость:** Ни при каких условиях параллельного редактирования (включая офлайн и обрывы сети) не возникают маркеры `<<<<<<<` или рассинхронизация текста.
3. **Производительность:** Холодный старт документа на 100 000 слов с диска занимает менее 1.5 секунд; потребление RAM на клиенте $\le 150\text{ МБ}$.
4. **Версионирование:** Возможность создавать ветки, переключаться между ними, открывать Merge Request и получать посимвольный Diff изменений.