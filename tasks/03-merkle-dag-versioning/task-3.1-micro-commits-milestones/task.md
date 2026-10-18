# Task 3.1: Механизм микро-коммитов и генерации SHA-256 Merkle-хешей

## 1. Метаданные задачи
- **ID:** `TASK-3.1`
- **Модуль:** `03-merkle-dag-versioning`
- **Приоритет:** P0 (Блокер версионирования)
- **Ответственная роль:** Backend / Core Systems Engineer
- **Зависимости:** [TASK-1.4](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.4-binary-codec-varint-rle/task.md), [TASK-2.4](file:///c:/Users/sloobman/syncpro/tasks/02-sync-server/task-2.4-delta-buffering-persistence/task.md)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L65-L85), [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L121)

---

## 2. Контекст и архитектурная роль
Чтобы объединить гибкость реалтайм-коллаборации и строгость систем контроля версий (Git), система формирует неизменяемый ориентированный ациклический граф (Merkle-DAG).

Каждая контрольная точка делится на два типа:
1. **Микро-коммиты (Micro-commits):** автоматически генерируемые слепки дельт (каждые $N$ правок или $M$ минут неактивности), сохраняющие непрерывную гранулярную историю изменений.
2. **Именованные вехи (Named Milestones / Releases):** явные коммиты пользователя с осмысленным сообщением (`"Релиз главы 1.2"`), создаваемые вручную через UI.

Каждый коммит получает криптографический SHA-256 хеш, гарантирующий неизменяемость истории и возможность проверки целостности.

---

## 3. Цели и задачи
1. Спроектировать канонический формат представления коммита для хеширования.
2. Реализовать вычисление детерминированного хеша SHA-256:
   $$\text{CommitID} = \text{SHA256}(\text{CanonicalJSON}(\text{DocumentID}, \text{Parents}, \text{DeltaHash}, \text{StateVector}, \text{Author}, \text{Timestamp}))$$
3. Реализовать сохранение сжатой бинарной дельты коммита в CAS (Content Addressable Storage) MinIO/S3:
   - Путь в S3: `commits/{document_id}/{commit_id}.bin`.
4. Реализовать генератор микро-коммитов:
   - Автоматический сборщик дельт из стрима Redis ([TASK-2.4](file:///c:/Users/sloobman/syncpro/tasks/02-sync-server/task-2.4-delta-buffering-persistence/task.md)).
   - Привязка к текущему указателю `HEAD` целевой ветки.
   - Продвижение указателя `HEAD` ветки вперед (Fast-Forward).
5. Реализовать API создания ручного коммита (Milestone) с авторским описанием.

---

## 4. Спецификация структуры данных Merkle-коммита

```json
{
  "commit_id": "9f83c18b76e1a49a2a3e0b58e8b23f5b72e11894a37e5d83642d0794936d0f11",
  "document_id": "doc_8f12a9de",
  "parents": [
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  ],
  "branch": "main",
  "author": {
    "user_id": "usr_42",
    "name": "Alice"
  },
  "timestamp": 1776412800,
  "message": "Update section 1.2 introduction",
  "delta_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "state_vector_snapshot": {
    "42": 450,
    "17": 128
  },
  "crdt_delta_url": "s3://syncpro-commits/doc_8f12a9de/9f83c18b76e1a49a2a3e0b58e8b23f5b72e11894a37e5d83642d0794936d0f11.bin",
  "snapshot_ref": null
}
```

---

## 5. Граничные случаи и риски
- Детерминизм JSON при хешировании: ключи JSON должны быть строго отсортированы лексикографически, иначе один и тот же коммит с разным порядком ключей даст разные SHA-256 хеши.
- Конкурентное обновление HEAD ветки: при параллельной попытке записать два коммита с одним и тем же родителем требуется механизм Optimistic Concurrency Control (CAS в Postgres: `UPDATE branches SET head_commit_id = :new WHERE head_commit_id = :old`).

---

## 6. Definition of Done (DoD)
- [ ] Функция генерации хеша коммита детерминирована и протестирована.
- [ ] Сжатые бинарные дельты коммитов успешно сохраняются в MinIO по вычисленному пути.
- [ ] Микро-коммиты формируются автоматически без задержек для пользователя.
- [ ] Ручной API вызов создания Milestone фиксирует коммит с авторским описанием и продвигает указатель ветки.
- [ ] Хеш коммита невозможно подделать без расхождения с содержимым дельты в S3.
