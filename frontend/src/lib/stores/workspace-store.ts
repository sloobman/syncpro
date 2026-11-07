import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace, Document } from "@/types";

export interface DocumentContentRecord {
  title: string;
  content: string;
  wordCount: number;
  charCount: number;
  updatedAt: string;
}

interface WorkspaceState {
  currentWorkspaceId: string;
  workspaces: Workspace[];
  documents: Document[];
  documentContents: Record<string, DocumentContentRecord>;
  isLoading: boolean;
}

interface WorkspaceActions {
  setCurrentWorkspaceId: (id: string) => void;
  createWorkspace: (params: {
    name: string;
    description?: string;
    iconEmoji?: string;
  }) => Promise<Workspace>;
  deleteWorkspace: (id: string) => void;
  createDocument: (params: {
    title: string;
    workspaceId?: string;
    template?: string;
  }) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  saveDocumentContent: (id: string, content: string, title?: string) => void;
  getDocumentContent: (id: string) => string;
  getDocumentById: (id: string) => Document | undefined;
  getWorkspaceById: (id: string) => Workspace | undefined;
  getWorkspaceDocuments: (workspaceId: string) => Document[];
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: "ws_1",
    name: "Мой проект",
    slug: "my-project",
    description: "Основное рабочее пространство для документации",
    iconEmoji: "🚀",
    ownerId: "usr_1",
    plan: "free",
    memberCount: 3,
    documentCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "ws_2",
    name: "Команда разработки",
    slug: "dev-team",
    description: "Инженерная база знаний и архитектурные решения",
    iconEmoji: "⚡",
    ownerId: "usr_1",
    plan: "pro",
    memberCount: 12,
    documentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: "doc_1",
    workspaceId: "ws_1",
    title: "Глава 1: Введение в системы совместного редактирования",
    defaultBranch: "main",
    createdBy: "usr_1",
    wordCount: 2450,
    isFavorite: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "doc_2",
    workspaceId: "ws_1",
    title: "Архитектура и сетевой протокол Merkle-CRDT",
    defaultBranch: "feature/dag-sync",
    createdBy: "usr_2",
    wordCount: 5120,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "doc_3",
    workspaceId: "ws_1",
    title: "Roadmap Q4 2026: фазирование релизов",
    defaultBranch: "main",
    createdBy: "usr_1",
    wordCount: 1340,
    isFavorite: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "doc_4",
    workspaceId: "ws_1",
    title: "Протокол синхронизации состояния StateVector Handshake",
    defaultBranch: "main",
    createdBy: "usr_3",
    wordCount: 3890,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
  },
];

const INITIAL_DOC_1_CONTENT = `# Глава 1: Введение в системы совместного редактирования

Совместное редактирование документов в реальном времени является одной из ключевых технологических задач современных распределённых систем. В отличие от традиционных централизованных блокировок, современные архитектуры опираются на бессерверную или гибридную репликацию данных без централизованного арбитра разрешения конфликтов.

## 1.1. Архитектурный стиль Merkle-CRDT

Платформа SyncPro совмещает математическое ядро Conflict-free Replicated Data Types (CRDT) на базе алгоритмов YATA и Fugue с графом контроля версий Merkle-DAG. Каждый символ и блок текста идентифицируются неизменяемым кортежем из идентификатора клиента и логических часов Лампорта.

## 1.2. Локальная автономность и синхронизация

Все операции над текстом применяются немедленно в локальном дереве блоков с нулевой задержкой ввода, после чего асинхронно распространяются по сети через WebSocket. При разрыве соединения редактор сохраняет полную работоспособность, синхронизируя накопившиеся изменения при восстановлении связи.`;

function getTemplateContent(template?: string, title?: string): string {
  const docTitle = title || "Новый документ";
  switch (template) {
    case "spec":
      return `# ${docTitle}

## 1. Обзор и контекст
Краткое описание назначения и решаемой проблемы.

## 2. Функциональные требования
- [ ] FR-1: Поддержка совместного редактирования в реальном времени
- [ ] FR-2: Автономное сохранение изменений
- [ ] FR-3: Разрешение конфликтов без участия пользователя

## 3. Архитектура и протоколы
Описание структуры компонентов, модели данных и API.

## 4. Критерии приемки
Условия успешного внедрения и валидации.`;

    case "meeting":
      return `# Встреча команды: ${docTitle}

**Дата:** ${new Date().toLocaleDateString("ru-RU")}  
**Участники:** Команда разработки

## Повестка дня
1. Статус текущих задач спринта
2. Архитектурные решения по синхронизации
3. Развертывание и мониторинг production

## Заметки и обсуждение
- Основные решения и тезисы встречи...

## Action Items (Задачи)
- [ ] Подготовить релизный чеклист
- [ ] Провести валидацию производительности CRDT
- [ ] Обновить документацию API`;

    case "rfc":
      return `# RFC: ${docTitle}

**Автор:** Инженерная команда SyncPro  
**Статус:** Draft  

## Краткое резюме (Summary)
Предложение по внедрению новой функциональности.

## Мотивация (Motivation)
Почему это изменение необходимо и какие преимущества оно дает.

## Детальный дизайн (Detailed Design)
Технические подробности реализации, форматы данных и алгоритмы.

## Альтернативы и риски (Drawbacks & Alternatives)
Рассмотренные альтернативные подходы и оценка рисков.`;

    case "blank":
    default:
      return `# ${docTitle}

Начните вводить текст документа...`;
  }
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: "ws_1",
      workspaces: DEFAULT_WORKSPACES,
      documents: DEFAULT_DOCUMENTS,
      documentContents: {
        doc_1: {
          title: "Глава 1: Введение в системы совместного редактирования",
          content: INITIAL_DOC_1_CONTENT,
          wordCount: 2450,
          charCount: 14380,
          updatedAt: new Date().toISOString(),
        },
      },
      isLoading: false,

      setCurrentWorkspaceId: (id: string) => {
        set({ currentWorkspaceId: id });
      },

      createWorkspace: async (params) => {
        const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const newWs: Workspace = {
          id,
          name: params.name.trim(),
          slug: params.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-"),
          description: params.description?.trim() || null,
          iconEmoji: params.iconEmoji || "📁",
          ownerId: "usr_current",
          plan: "free",
          memberCount: 1,
          documentCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          workspaces: [newWs, ...state.workspaces],
          currentWorkspaceId: id,
        }));

        // Try background server sync if online
        try {
          fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              name: newWs.name,
              description: newWs.description,
              iconEmoji: newWs.iconEmoji,
            }),
          }).catch(() => {});
        } catch {
          // ignore
        }

        return newWs;
      },

      deleteWorkspace: (id: string) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          documents: state.documents.filter((d) => d.workspaceId !== id),
          currentWorkspaceId:
            state.currentWorkspaceId === id
              ? state.workspaces.find((w) => w.id !== id)?.id || "ws_1"
              : state.currentWorkspaceId,
        }));
      },

      createDocument: async (params) => {
        const targetWsId = params.workspaceId || get().currentWorkspaceId || "ws_1";
        const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const docTitle = params.title.trim() || "Новый документ";
        const initialText = getTemplateContent(params.template, docTitle);
        const wordCount = initialText.split(/\s+/).filter(Boolean).length;

        const newDoc: Document = {
          id,
          workspaceId: targetWsId,
          title: docTitle,
          defaultBranch: "main",
          createdBy: "usr_current",
          wordCount,
          isFavorite: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const updatedWorkspaces = state.workspaces.map((w) =>
            w.id === targetWsId
              ? { ...w, documentCount: (w.documentCount || 0) + 1, updatedAt: now }
              : w
          );

          return {
            documents: [newDoc, ...state.documents],
            workspaces: updatedWorkspaces,
            documentContents: {
              ...state.documentContents,
              [id]: {
                title: docTitle,
                content: initialText,
                wordCount,
                charCount: initialText.length,
                updatedAt: now,
              },
            },
          };
        });

        // Background server sync
        try {
          fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              workspaceId: targetWsId,
              title: docTitle,
              content: initialText,
            }),
          }).catch(() => {});
        } catch {
          // ignore
        }

        return newDoc;
      },

      updateDocument: (id: string, updates: Partial<Document>) => {
        const now = new Date().toISOString();
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: now } : d
          ),
          documentContents:
            updates.title !== undefined && state.documentContents[id]
              ? {
                  ...state.documentContents,
                  [id]: {
                    ...state.documentContents[id],
                    title: updates.title,
                    updatedAt: now,
                  },
                }
              : state.documentContents,
        }));

        // Background server sync if title changed
        if (updates.title) {
          try {
            fetch(`/api/documents/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: updates.title }),
            }).catch(() => {});
          } catch {
            // ignore
          }
        }
      },

      deleteDocument: (id: string) => {
        set((state) => {
          const doc = state.documents.find((d) => d.id === id);
          const wsId = doc?.workspaceId;
          const updatedWorkspaces = wsId
            ? state.workspaces.map((w) =>
                w.id === wsId
                  ? { ...w, documentCount: Math.max(0, (w.documentCount || 1) - 1) }
                  : w
              )
            : state.workspaces;

          return {
            documents: state.documents.filter((d) => d.id !== id),
            workspaces: updatedWorkspaces,
          };
        });
      },

      saveDocumentContent: (id: string, content: string, title?: string) => {
        const now = new Date().toISOString();
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const charCount = content.length;

        set((state) => {
          const existingMeta = state.documents.find((d) => d.id === id);
          const docTitle = title || existingMeta?.title || state.documentContents[id]?.title || "Без названия";

          const updatedDocs = existingMeta
            ? state.documents.map((d) =>
                d.id === id ? { ...d, title: docTitle, wordCount, updatedAt: now } : d
              )
            : [
                {
                  id,
                  workspaceId: state.currentWorkspaceId || "ws_1",
                  title: docTitle,
                  defaultBranch: "main",
                  createdBy: "usr_current",
                  wordCount,
                  isFavorite: false,
                  isArchived: false,
                  createdAt: now,
                  updatedAt: now,
                },
                ...state.documents,
              ];

          return {
            documents: updatedDocs,
            documentContents: {
              ...state.documentContents,
              [id]: {
                title: docTitle,
                content,
                wordCount,
                charCount,
                updatedAt: now,
              },
            },
          };
        });

        // Background server persistence
        try {
          fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          }).catch(() => {});
        } catch {
          // ignore
        }
      },

      getDocumentContent: (id: string) => {
        const record = get().documentContents[id];
        if (record) return record.content;
        if (id === "doc_1") return INITIAL_DOC_1_CONTENT;
        return "";
      },

      getDocumentById: (id: string) => {
        return get().documents.find((d) => d.id === id);
      },

      getWorkspaceById: (id: string) => {
        return get().workspaces.find((w) => w.id === id);
      },

      getWorkspaceDocuments: (workspaceId: string) => {
        return get().documents.filter((d) => d.workspaceId === workspaceId && !d.isArchived);
      },
    }),
    {
      name: "syncpro_workspace_storage",
    }
  )
);
