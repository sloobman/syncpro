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
  initialized: boolean;
}

interface WorkspaceActions {
  setCurrentWorkspaceId: (id: string) => void;
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceDocuments: (workspaceId: string) => Promise<Document[]>;
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
    content?: string;
  }) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  saveDocumentContent: (id: string, content: string, title?: string) => void;
  getDocumentContent: (id: string) => string;
  getDocumentById: (id: string) => Document | undefined;
  getWorkspaceById: (id: string) => Workspace | undefined;
  getWorkspaceDocuments: (workspaceId: string) => Document[];
  reset: () => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

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
      currentWorkspaceId: "",
      workspaces: [],
      documents: [],
      documentContents: {},
      isLoading: false,
      initialized: false,

      setCurrentWorkspaceId: (id: string) => {
        set({ currentWorkspaceId: id });
      },

      fetchWorkspaces: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/workspaces", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            const list: Workspace[] = data.workspaces || [];
            const currId =
              list.length > 0
                ? get().currentWorkspaceId && list.some((w) => w.id === get().currentWorkspaceId)
                  ? get().currentWorkspaceId
                  : list[0].id
                : "";
            set({
              workspaces: list,
              currentWorkspaceId: currId,
              initialized: true,
              isLoading: false,
            });
            if (currId) {
              get().fetchWorkspaceDocuments(currId);
            }
            return;
          }
        } catch {
          // offline
        }
        set({ isLoading: false, initialized: true });
      },

      fetchWorkspaceDocuments: async (workspaceId: string) => {
        try {
          const res = await fetch(`/api/workspaces/${workspaceId}/documents`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            const fetchedDocs: Document[] = data.documents || [];
            set((state) => {
              // Merge with other workspaces documents
              const otherDocs = state.documents.filter((d) => d.workspaceId !== workspaceId);
              return { documents: [...fetchedDocs, ...otherDocs] };
            });
            return fetchedDocs;
          }
        } catch {
          // offline
        }
        return get().documents.filter((d) => d.workspaceId === workspaceId);
      },

      createWorkspace: async (params) => {
        set({ isLoading: true });
        let newWs: Workspace;

        try {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: params.name.trim(),
              description: params.description?.trim() || "",
              iconEmoji: params.iconEmoji || "📁",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            newWs = data.workspace;
          } else {
            throw new Error("Server workspace creation failed");
          }
        } catch {
          // Fallback local ID
          const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const now = new Date().toISOString();
          newWs = {
            id,
            name: params.name.trim(),
            slug: params.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-"),
            description: params.description?.trim() || null,
            iconEmoji: params.iconEmoji || "📁",
            ownerId: "current_user",
            memberCount: 1,
            documentCount: 0,
            createdAt: now,
            updatedAt: now,
          };
        }

        set((state) => ({
          workspaces: [newWs, ...state.workspaces.filter((w) => w.id !== newWs.id)],
          currentWorkspaceId: newWs.id,
          isLoading: false,
        }));

        return newWs;
      },

      deleteWorkspace: (id: string) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          documents: state.documents.filter((d) => d.workspaceId !== id),
          currentWorkspaceId:
            state.currentWorkspaceId === id
              ? state.workspaces.find((w) => w.id !== id)?.id || ""
              : state.currentWorkspaceId,
        }));
        fetch(`/api/workspaces/${id}`, {
          method: "DELETE",
          credentials: "include",
        }).catch(() => {});
      },

      createDocument: async (params) => {
        const targetWsId = params.workspaceId || get().currentWorkspaceId;
        const now = new Date().toISOString();
        const docTitle = params.title.trim() || "Новый документ";
        const initialText = params.content !== undefined ? params.content : getTemplateContent(params.template, docTitle);
        const wordCount = initialText.split(/\s+/).filter(Boolean).length;

        let newDoc: Document;

        try {
          const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              workspaceId: targetWsId,
              title: docTitle,
              content: initialText,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            newDoc = data.document;
          } else {
            throw new Error("Server document creation failed");
          }
        } catch {
          const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          newDoc = {
            id,
            workspaceId: targetWsId,
            title: docTitle,
            defaultBranch: "main",
            createdBy: "current_user",
            wordCount,
            isFavorite: false,
            isArchived: false,
            createdAt: now,
            updatedAt: now,
          };
        }

        set((state) => {
          const updatedWorkspaces = state.workspaces.map((w) =>
            w.id === targetWsId
              ? { ...w, documentCount: (w.documentCount || 0) + 1, updatedAt: now }
              : w
          );

          return {
            documents: [newDoc, ...state.documents.filter((d) => d.id !== newDoc.id)],
            workspaces: updatedWorkspaces,
            documentContents: {
              ...state.documentContents,
              [newDoc.id]: {
                title: docTitle,
                content: initialText,
                wordCount,
                charCount: initialText.length,
                updatedAt: now,
              },
            },
          };
        });

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

        if (updates.title) {
          fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ title: updates.title }),
          }).catch(() => {});
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
                  workspaceId: state.currentWorkspaceId,
                  title: docTitle,
                  defaultBranch: "main",
                  createdBy: "current_user",
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
        fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, content }),
        }).catch(() => {});
      },

      getDocumentContent: (id: string) => {
        const record = get().documentContents[id];
        return record ? record.content : "";
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

      reset: () => {
        set({
          currentWorkspaceId: "",
          workspaces: [],
          documents: [],
          documentContents: {},
          isLoading: false,
          initialized: false,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("syncpro_workspace_storage");
        }
      },
    }),
    {
      name: "syncpro_workspace_storage",
    }
  )
);
