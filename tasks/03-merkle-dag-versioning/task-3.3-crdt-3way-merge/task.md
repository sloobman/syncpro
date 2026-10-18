# Task 3.3: Алгоритм 3-стороннего бесконфликтного слияния веток (CRDT 3-Way Merge)

## 1. Метаданные задачи
- **ID:** `TASK-3.3`
- **Модуль:** `03-merkle-dag-versioning`
- **Приоритет:** P0 (Ключевая киллер-фича проекта)
- **Ответственная роль:** Algorithm / Backend Systems Engineer
- **Зависимости:** [TASK-1.2](file:///c:/Users/sloobman/syncpro/tasks/01-crdt-core/task-1.2-yata-fugue-ordering/task.md), [TASK-3.1](file:///c:/Users/sloobman/syncpro/tasks/03-merkle-dag-versioning/task-3.1-micro-commits-milestones/task.md), [TASK-3.2](file:///c:/Users/sloobman/syncpro/tasks/03-merkle-dag-versioning/task-3.2-postgres-dag-schema/task.md)
- **Родительская спецификация:** [antigravity.md](file:///c:/Users/sloobman/syncpro/antigravity.md#L123-L127)

---

## 2. Контекст и архитектурная роль
В классическом Git слияние веток текста часто приводит к прерыванию процесса из-за конфликтов:
```diff
<<<<<<< HEAD
Начало вводного раздела от Алисы.
=======
Вводная часть, дополненная Бобом.
>>>>>>> feature/intro
```
Это ломает пользовательский опыт совместного написания текстов и книг.

В гибридной архитектуре **Merkle-CRDT** слияние веток выполняется полностью **автоматически и бесконфликтно**:
1. Находится наименьший общий предок (**Lowest Common Ancestor — LCA**) двух веток.
2. Собираются все дельты ветки $A$ от точки LCA.
3. Собираются все дельты ветки $B$ от точки LCA.
4. Дельты накладываются на CRDT-состояние по математическим правилам YATA/Tree CRDT, детерминированно разрешая взаимные изменения.
5. Формируется Merge-коммит с двумя родителями.

---

## 3. Цели и задачи
1. Реализовать алгоритм поиска Lowest Common Ancestor (LCA) в графе DAG коммитов:
   - Обход графа в ширину (BFS) с раскраской вершин для нахождения ближайшего общего родителя.
2. Реализовать сборщик пути дельт от LCA до целевого HEAD:
   - Топологическая сортировка коммитов на отрезке $\text{LCA} \to \text{HEAD}$.
   - Загрузка бинарных дельт из S3.
3. Реализовать движок слияния:
   - Воспроизведение состояния в точке LCA.
   - Применение дельт ветки $A$ и ветки $B$.
4. Сформировать и зафиксировать Merge-коммит:
   - Поле `parents` содержит `[HEAD_A, HEAD_B]`.
   - Результирующая дельта коммита сохраняется в S3.
   - Указатель целевой ветки переводится на новый коммит.

---

## 4. Схема алгоритма слияния

```
        (C1: Базовый коммит - LCA)
               /        \
              ▼          ▼
         (A1: Alice)   (B1: Bob)
              │          │
              ▼          ▼
         (A2: Alice)   (B2: Bob)
              \          /
               ▼        ▼
       [3-Way CRDT Merge Engine]
                   │
                   ▼
       (M1: Merge Commit - 2 Parents)
```

### 4.1. Алгоритм LCA (Псевдокод)
```python
def find_lca(commit_a, commit_b):
    ancestors_a = bfs_ancestors_with_depth(commit_a)
    queue = [commit_b]
    visited = set()
    
    candidates = []
    while queue:
        curr = queue.pop(0)
        if curr in ancestors_a:
            candidates.append((curr, ancestors_a[curr]))
        for parent in get_parents(curr):
            if parent not in visited:
                visited.add(parent)
                queue.append(parent)
                
    # Выбираем предка с минимальной глубиной удаления от обоих HEAD
    return min(candidates, key=lambda x: x[1])[0]
```

---

## 5. Граничные случаи и риски
- Fast-Forward слияние: если ветка $B$ является прямым потомком ветки $A$ ($\text{LCA} == \text{HEAD}_A$), слияние сводится к простому перемещению указателя `HEAD_A = HEAD_B` без создания лишнего merge-коммита.
- Слияние веток без общего предка (Criss-Cross история / разные корни): fallback на объединение двух пустых корней через базовый пустой коммит.

---

## 6. Definition of Done (DoD)
- [ ] Реализован алгоритм LCA для произвольного графа коммитов в PostgreSQL.
- [ ] Реализован 3-way merge сервис: ветки с параллельными правками сливаются за один вызов API.
- [ ] Написан комплексный тест:
  - Создана ветка `feature`.
  - В `main` изменен 1-й абзац.
  - В `feature` параллельно изменен 1-й абзац и добавлен 2-й.
  - Произведен Merge.
  - Никаких маркеров `<<<<<<<` в тексте нет, правки обоих авторов логически объединены и согласованы.
- [ ] Merge-коммит корректно сохраняет обоих родителей в таблице `commit_parents`.
