# Task 4.1: Интеграция ProseMirror / TipTap с локальным CRDT-состоянием

## 1. Метаданные задачи
- **ID:** `TASK-4.1`
- **Модуль:** `04-frontend-editor`
- **Приоритет:** P0 (Блокер клиентского редактора)
- **Ответственная роль:** Frontend / Rich-Text Editor Engineer (TypeScript / React)
- **Зависимости:** [TASK-1.1](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.1-clock-id-nodes/task.md), [TASK-1.4](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.4-binary-codec-varint-rle/task.md), [TASK-2.2](file:///c:/Users/sloobman/syncpro/tasks/02-sync-server/task-2.2-statevector-handshake/task.md)
- **Родительская спецификация:** [ARCHITECTURE.md](file:///c:/Users/sloobman/syncpro/ARCHITECTURE.md#L129)

---

## 2. Контекст и архитектурная роль
В браузерном приложении пользователь взаимодействует с редактором через визуальный rich-text фреймворк (ProseMirror / TipTap). ProseMirror оперирует абстрактным синтаксическим деревом документов (`Node`, `Fragment`) и цепочками шагов (`Step`, `ReplaceStep`). 

Задача данного слоя — создать адаптер (Plugin/Binding), который:
1. Перехватывает локальные транзакции пользователя в редакторе и транслирует их в вызовы CRDT-ядра.
2. Принимает удаленные дельты от WebSocket-сервера и применяет их к состоянию ProseMirror без искажения положения курсора локального пользователя.
3. Предотвращает зацикливание событий (**echo loop suppression**).

---

## 3. Цели и задачи
1. Разработать плагин ProseMirror `crdtSyncPlugin`.
2. Реализовать маппинг смещений: трансляция абсолютных индексов ProseMirror (`pos: 0..N`) в логические `ID` символов CRDT и обратно.
3. Обработка локальных изменений:
   - Перехват `dispatchTransaction`.
   - Анализ `tr.steps` (вставки текста, форматирование, перемещение блоков).
   - Генерация CRDT-операций и передача в сетевой транспорт.
4. Обработка удаленных изменений:
   - Подписка на события CRDT `on('update', delta)`.
   - Создание транзакции ProseMirror с мета-тегом `tr.setMeta('crdt-remote', true)`.
   - Применение изменений в ProseMirror `EditorView` без повторной отправки в CRDT.
5. Реализовать сохранение выделения и курсора: при вставке текста удаленным пользователем левее текущего курсора позиция локального курсора должна аккуратно сдвигаться вправо.

---

## 4. Схема взаимодействия компонентов

```
[User Types Key] ──> [ProseMirror EditorView]
                              │
                              ▼ dispatchTransaction
                      [crdtSyncPlugin]
                              │
                    Трансляция Step в CRDT Op
                              │
                              ▼
                      [Local CRDT Doc] ──> [WebSocket Transport]
                              ▲
                              │ Накат удаленной дельты
                      [crdtSyncPlugin] (tr.setMeta('crdt-remote', true))
                              │
                              ▼
                      [ProseMirror State Apply]
```

---

## 5. Граничные случаи и риски
- Зацикливание событий (Echo loop): если транзакция, пришедшая из сети, снова триггерит генерацию CRDT-операции, наступает бесконечный шквал сообщений. Решение: жесткая проверка флага `tr.getMeta('crdt-remote')`.
- Форматирование (Marks / Bold / Italic): форматирование текста должно храниться как диапазонные атрибуты (CRDT Per-character attributes или LWW-Mark Ranges).
- Удаление целого абзаца: операция должна атомарно удалять текстовые символы и сам блок `BlockNode` в CRDT-дереве.

---

## 6. Definition of Done (DoD)
- [ ] Плагин подключен к экземпляру TipTap / ProseMirror.
- [ ] Два открытых окна браузера в реальном времени синхронизируют вводимый текст.
- [ ] Позиция курсора не скачет при наборе текста вторым пользователем в соседнем абзаце.
- [ ] Ошибки `TransformError` и рассинхронизация DOM исключены при скорости ввода до 30 ударов в секунду.
