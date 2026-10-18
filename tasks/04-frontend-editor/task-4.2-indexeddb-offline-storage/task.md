# Task 4.2: Офлайн-хранилище IndexedDB (Offline-First локальная персистентность)

## 1. Метаданные задачи
- **ID:** `TASK-4.2`
- **Модуль:** `04-frontend-editor`
- **Приоритет:** P1
- **Ответственная роль:** Frontend / Client Storage Engineer
- **Зависимости:** [TASK-1.4](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.4-binary-codec-varint-rle/task.md), [TASK-4.1](file:///c:/Users/sloobman/syncpro/tasks/04-frontend-editor/task-4.1-prosemirror-crdt-binding/task.md)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L130), [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L185)

---

## 2. Контекст и архитектурная роль
Архитектура **Offline-First** гарантирует, что пользователь может открыть и редактировать документ даже при полном отсутствии интернета (в самолете, поезде, при сбоях связи). 

При открытии вкладки браузер должен:
1. Мгновенно загрузить последнее состояние документа из локальной базы **IndexedDB** за $\le 100$ мс без ожидания сетевого ответа сервера.
2. Сохранять каждую локальную правку в IndexedDB транзакционно.
3. При появлении сети автоматически отправить накопившиеся локальные дельты на сервер и принять обновления от коллег через StateVector Handshake.

---

## 3. Цели и задачи
1. Спроектировать схему базы данных IndexedDB (используя легковесную обертку `idb`):
   - Store `documents`: `{ doc_id: string, snapshot: Uint8Array, updated_at: number }`.
   - Store `pending_deltas`: `{ id: auto_increment, doc_id: string, delta: Uint8Array, created_at: number }`.
2. Реализовать провайдер персистентности `IndexedDBStorageProvider`:
   - Метод `loadDocument(docId) -> Uint8Array | null`.
   - Метод `saveSnapshot(docId, bytes)`.
   - Метод `appendPendingDelta(docId, deltaBytes)`.
   - Метод `clearPendingDeltas(docId, upToId)`.
3. Реализовать сетевой менеджер синхронизации при переподключении:
   - Отслеживание событий `window.addEventListener('online', ...)`.
   - Чтение всех `pending_deltas` и отправка их в WebSocket шлюз в фазе `SyncStep2`.
   - Удаление подтвержденных дельт из `pending_deltas`.
4. Реализовать периодическую компакцию локальной IndexedDB: объединение накопившихся дельт в единый монолитный снапшот каждые 500 операций.

---

## 4. Схема потоков данных Offline-First

```
[ProseMirror Edit]
        │
        ▼
[Local CRDT Engine] ──(binary delta)──> [IndexedDB: pending_deltas]
        │
        ├── [Is Online?] ──YES──> [WebSocket Transport] ──> [Server]
        └── [Is Online?] ──NO───> (Stay in IndexedDB pending queue)

[On Network Restore (online event)]
        │
        ▼
[Drain pending_deltas] ──> [WebSocket SyncStep2] ──> [Clear pending_deltas]
```

---

## 5. Граничные случаи и риски
- Квота браузерного хранилища: обработка `QuotaExceededError` с очисткой кэша неактивных документов.
- Браузер закрыт до сброса дельты: транзакция в IndexedDB должна коммититься немедленно при вводе каждого абзаца.
- Дублирование дельт при реконнекте: CRDT операции идемпотентны по своей природе; повторное применение уже известной дельты не приводит к ошибкам или дублированию текста.

---

## 6. Definition of Done (DoD)
- [ ] Документ полностью сохраняется и восстанавливается из IndexedDB при отключенном Wi-Fi.
- [ ] Холодный старт документа на 100 000 слов из IndexedDB занимает менее 300 мс.
- [ ] Офлайн-правки, сделанные без интернета, успешно синхронизируются с сервером сразу при восстановлении связи.
- [ ] Написаны unit-тесты со сгенерированным моком IndexedDB (`fake-indexeddb`).
