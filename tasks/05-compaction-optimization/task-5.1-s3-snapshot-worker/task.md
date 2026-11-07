# Task 5.1: Фоновый воркер создания CRDT-снапшотов в CAS (S3/MinIO)

## 1. Метаданные задачи
- **ID:** `TASK-5.1`
- **Модуль:** `05-compaction-optimization`
- **Приоритет:** P1
- **Ответственная роль:** Backend / Distributed Systems Engineer
- **Зависимости:** [TASK-0.1](file:///c:/Users/sloobman/syncpro/tasks/00-infrastructure-foundation/task-0.1-dev-environment/task.md), [TASK-1.4](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.4-binary-codec-varint-rle/task.md), [TASK-3.1](file:///c:/Users/sloobman/syncpro/tasks/03-merkle-dag-versioning/task-3.1-micro-commits-milestones/task.md)
- **Родительская спецификация:** [ARCHITECTURE.md](file:///c:/Users/sloobman/syncpro/ARCHITECTURE.md#L41-L51), [ARCHITECTURE.md](file:///c:/Users/sloobman/syncpro/ARCHITECTURE.md#L135)

---

## 2. Контекст и архитектурная роль
Если документ живет месяцами и насчитывает сотни тысяч правок, загрузка документа с нуля через последовательное воспроизведение всех микро-коммитов от самого первого (`Replay from Genesis`) становится недопустимо медленной ($>30$ секунд).

Для обеспечения холодного старта документа за $\le 1.5$ секунд необходим **механизм периодического снапшотирования (Checkpointing)**:
- Каждые $N$ коммитов (например, каждые 100 коммитов) или каждые 6 часов активности фоновый воркер формирует монолитный бинарный слепок состояния CRDT.
- Слепок сжимается алгоритмом Zstandard (zstd) и загружается в бакет `syncpro-snapshots` в S3/MinIO.
- В таблице `commits` поле `snapshot_storage_path` заполняется ссылкой на данный файл.
- При загрузке документа читается последний снапшот + воспроизводится лишь короткий "хвост" коммитов (Tail Replay: $0..99$ дельт).

---

## 3. Цели и задачи
1. Разработать фоновый сервис `SnapshotWorker`:
   - Мониторинг новых коммитов через шину событий или опрос БД.
   - Триггер создания снапшота при преодолении порога шагов: $\text{count}(\text{deltas since last snapshot}) \ge N$.
2. Реализовать сериализацию полного монолитного дерева документа в бинарный блоб:
   - Включает все активные блоки, текстовые узлы, надгробия и `StateVector`.
3. Реализовать потоковую компрессию Zstandard (`zstd` уровень сжатия 3-5).
4. Загрузить блоб в S3 с генерацией SHA-256 Content-Hash:
   - Ключ в S3: `snapshots/{document_id}/{commit_id}.snap.zst`.
5. Обновить запись коммита в базе PostgreSQL: `UPDATE commits SET snapshot_storage_path = $path WHERE id = $commit_id`.
6. Реализовать в API загрузки документа стратегию быстрого восстановления:
   - Найти ближайший коммит-предок со `snapshot_storage_path IS NOT NULL`.
   - Загрузить и разжать снапшот.
   - Догрузить и накатить только последующие дельты до текущего `HEAD`.

---

## 4. Схема процесса Checkpointing

```
[Commits Stream] ──> C100 ──> C101 ──> ... ──> C200 (Threshold reached!)
                                                │
                                                ▼
                                    [SnapshotWorker Job]
                                                │
                                    1. Load In-Memory CRDT at C200
                                    2. Binary Serialize State
                                    3. Compress with Zstandard (.zst)
                                    4. Upload to MinIO (CAS)
                                                │
                                                ▼
                                    [S3: snapshots/doc/c200.snap.zst]
                                                │
                                                ▼
                                    [Postgres: commits.snapshot_storage_path]
```

---

## 5. Граничные случаи и риски
- Дублирование снапшотов при наличии нескольких воркеров: использование распределенного замка (Redis Lock: `SET lock:snap:{doc_id} NX EX 60`).
- Снапшот на ветках с активным слиянием: снапшот фиксируется строго для конкретного `commit_id`, что гарантирует неизменяемость и детерминизм.

---

## 6. Definition of Done (DoD)
- [ ] Воркер снапшотов развернут и автоматически реагирует на накопление $N$ коммитов.
- [ ] Сжатый снапшот успешно записывается в S3 и связывается в PostgreSQL.
- [ ] Функция `FastDocumentLoader` использует снапшот и докачивает только оставшийся хвост дельт.
- [ ] Время загрузки 500-страничного документа из снапшота $\le 1.2$ сек (включая распаковку в память).
- [ ] Размер сжатого снапшота для 100 000 слов $\le 3-5$ МБ.
