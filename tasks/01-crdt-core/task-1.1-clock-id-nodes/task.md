# Task 1.1: Базовые структуры данных CRDT (Clock, ID, BlockNode, TextNode)

## 1. Метаданные задачи
- **ID:** `TASK-1.1`
- **Модуль:** `01-crdt-core`
- **Приоритет:** P0 (Блокер)
- **Ответственная роль:** Systems / Algorithm Engineer (Go / Rust / TypeScript)
- **Зависимости:** [TASK-0.1](file:///c:/Users/sloobman/syncpro/tasks/00-infrastructure-foundation/task-0.1-dev-environment/task.md)
- **Родительская спецификация:** [ARCHITECTURE.md](file:///c:/Users/sloobman/syncpro/ARCHITECTURE.md#L56-L65)

---

## 2. Контекст и архитектурная роль
Любая CRDT-система (Conflict-free Replicated Data Type) опирается на строгий математический аппарат адресации символов и блоков. Для поддержки распределенного редактирования документов без центрального арбитра каждый элемент должен обладать глобально уникальным и детерминированно упорядочиваемым идентификатором:

$$\text{ID} = \langle \text{ClientID}, \text{LamportClock} \rangle$$

Задача закладывает базовые строительные блоки, на которых строятся алгоритмы YATA/Fugue (для текста внутри блоков) и Replicated Tree CRDT (для иерархии документа).

---

## 3. Цели и задачи
1. Реализовать структуру логических часов Лампорта (`LamportClock`) с операциями `tick()`, `witness(remote_clock)` и сравнения.
2. Реализовать композитный идентификатор узла `ID` (`ClientID: uint64/UUID`, `Clock: uint64`).
3. Реализовать строгий частичный/полный порядок между любыми двумя ID:
   $$\text{ID}_a < \text{ID}_b \iff (\text{Clock}_a < \text{Clock}_b) \lor (\text{Clock}_a = \text{Clock}_b \land \text{ClientID}_a < \text{ClientID}_b)$$
4. Спроектировать и реализовать структуру текстового элемента `TextNode` (содержимое, надгробие `is_deleted`, ссылки на левый и правый истоки `origin_left`, `origin_right`).
5. Спроектировать и реализовать структуру блочного элемента `BlockNode` (тип блока: абзац, заголовок, список, цитата; `parent_id`, порядковый индекс, вектор дочерних узлов).
6. Реализовать структуру `StateVector` — отображение $\text{Map}\langle \text{ClientID}, \text{MaxClock}\rangle$.

---

## 4. Технические спецификации и контракты

### 4.1. Структуры данных (Псевдокод / Rust / Go)
```rust
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct ID {
    pub client_id: u64,
    pub clock: u64,
}

impl PartialOrd for ID {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for ID {
    fn cmp(&self, other: &Self) -> Ordering {
        match self.clock.cmp(&other.clock) {
            Ordering::Equal => self.client_id.cmp(&other.client_id),
            ord => ord,
        }
    }
}

pub struct TextNode {
    pub id: ID,
    pub origin_left: Option<ID>,
    pub origin_right: Option<ID>,
    pub content: String,
    pub length: u32,
    pub is_deleted: bool, // Tombstone
}

#[derive(Clone, Debug, PartialEq)]
pub enum BlockType {
    Paragraph,
    Heading { level: u8 },
    ListItem { ordered: bool },
    CodeBlock { language: String },
    Quote,
}

pub struct BlockNode {
    pub id: ID,
    pub parent_id: Option<ID>,
    pub block_type: BlockType,
    pub text_items: Vec<TextNode>,
    pub children: Vec<ID>,
    pub is_deleted: bool,
}

pub struct StateVector {
    pub entries: HashMap<u64, u64>, // ClientID -> MaxClock
}
```

### 4.2. Правила манипуляции со StateVector
- При генерации локальной операции:
  $$\text{current\_clock} = \text{state\_vector}[\text{local\_client\_id}] + 1$$
- При приеме внешней операции с $\text{ID}(C, K)$:
  $$\text{state\_vector}[C] = \max(\text{state\_vector}[C], K)$$
- Проверка покрытия операции вектором:
  $$\text{has}(\text{ID}(C, K)) \iff \text{state\_vector}[C] \ge K$$

---

## 5. Граничные случаи и риски
- Переполнение счетчика часов: использование 64-битных целых чисел (`uint64`) гарантирует невозможность переполнения при реальной нагрузке.
- Сравнение ClientID: при использовании UUID необходимо использовать детерминированное лексикографическое или числовое сравнение (big-endian bytes).
- Память под надгробия (`is_deleted`): структуры `TextNode` должны быть оптимизированы по выравниванию памяти (memory padding).

---

## 6. Definition of Done (DoD)
- [ ] Реализованы типы `LamportClock`, `ID`, `TextNode`, `BlockNode`, `StateVector`.
- [ ] Реализован оператор полного строгого порядка `<` для `ID`.
- [ ] Написаны 100% покрывающие unit-тесты:
  - Корректность тиков и синхронизации часов Лампорта при `witness`.
  - Транзитивность и антисимметричность порядка `ID`.
  - Корректность операций добавления, слияния и проверки принадлежности в `StateVector`.
- [ ] Выполнен замер аллокаций памяти: базовый `TextNode` занимает не более 64 байт без учета строки.
