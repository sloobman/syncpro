# Task 1.4: Высокопроизводительный бинарный кодек дельт (VarInt / RLE)

## 1. Метаданные задачи
- **ID:** `TASK-1.4`
- **Модуль:** `01-crdt-core`
- **Приоритет:** P0 (Блокер)
- **Ответственная роль:** Systems / Network Protocol Engineer
- **Зависимости:** [TASK-1.1](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.1-clock-id-nodes/task.md), [TASK-1.2](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.2-yata-fugue-ordering/task.md), [TASK-1.3](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.3-replicated-tree-crdt/task.md)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L89-L102), [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L111)

---

## 2. Контекст и архитектурная роль
В документах объемом 500+ страниц число символов превышает сотни тысяч, а лог правок может насчитывать миллионы операций. Использование текстовых форматов (JSON) приводит к недопустимому оверхеду по памяти и пропускной способности сети (до 10–20x раздувание объема).

Для минимизации сетевого трафика и быстродействия парсинга все дельты, состояния и коммиты должны упаковываться в бинарный поток с применением:
1. **VarInt (LEB128):** сжатие целочисленных счетчиков часов и идентификаторов клиентов.
2. **Run-Length Encoding (RLE):** агрегация последовательно набранных символов одного автора в единый чанк (например, последовательность из 50 символов кодируется одним базовым ID и длиной).
3. **Bit-flags:** упаковка флагов надгробий (`is_deleted`) и типов блоков в один байт.

---

## 3. Цели и задачи
1. Реализовать низкоуровневые кодировщики и декодировщики `VarUint` / `VarInt` (LEB128).
2. Реализовать кодировщик строковых литералов (длина в VarUint + UTF-8 байты).
3. Реализовать RLE-компрессию непрерывных вставок от одного `ClientID`:
   - Если пользователь ввел слово "Antigravity", генерируется не 11 отдельных структур `TextNode`, а единая запись `InsertRun { client_id, start_clock: 10, len: 11, text: "Antigravity" }`.
4. Реализовать бинарный энкодер и декодер для:
   - `StateVector`
   - `SyncStep1` (запрос недостающих дельт)
   - `SyncStep2` (ответ со сжатыми дельтами)
   - `UpdateDelta` (одиночные или пакетные live-правки)
5. Реализовать кроссплатформенный валидатор формата (Zero-copy чтение там, где это возможно).

---

## 4. Спецификация бинарного лейаута дельты

### 4.1. Заголовок сообщения
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `protocol_version` | `uint8` | Версия формата (текущая: `0x01`) |
| `message_type` | `uint8` | `0x01` = SyncStep1, `0x02` = SyncStep2, `0x03` = Update, `0x04` = Awareness |
| `payload_len` | `VarUint` | Длина полезной нагрузки в байтах |

### 4.2. Сжатие StateVector
```
[Количество клиентов: VarUint]
  For each client:
    [ClientID: VarUint]
    [MaxClock: VarUint]
```

### 4.3. Структура сжатого чанка вставок (InsertRun)
```
[FlagByte: 0b00000001 (InsertText)]
[ClientID: VarUint]
[Clock: VarUint]
[OriginLeft_ClientID: VarUint] (0 если root)
[OriginLeft_Clock: VarUint]
[OriginRight_ClientID: VarUint] (0 если end)
[OriginRight_Clock: VarUint]
[String_Length: VarUint]
[String_Bytes: UTF-8]
```

---

## 5. Граничные случаи и риски
- Защита от OOM при чтении испорченных пакетов: лимит на максимальный `String_Length` (например, не более 10 МБ на один чанк).
- Недопустимость рассинхронизации endianness: все VarInt кодируются в строгом Little-Endian LEB128.
- Невалидный UTF-8: парсер должен валидировать UTF-8 последовательности на входе и возвращать ошибку протокола без паники.

---

## 6. Definition of Done (DoD)
- [ ] Написаны модули кодирования и декодирования `Encoder` и `Decoder`.
- [ ] Круговой тест (Round-trip test): `data == decode(encode(data))` для всех типов сообщений.
- [ ] Коэффициент сжатия: 10 000 символов связного текста должны сжиматься менее чем в 15 КБ бинарных данных.
- [ ] Скорость десериализации: парсинг 50 000 операций занимает $\le 10$ миллисекунд.
