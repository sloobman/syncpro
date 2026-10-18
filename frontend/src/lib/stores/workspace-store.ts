import { create } from 'zustand';
import type { Workspace } from '@/types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
}

interface WorkspaceActions {
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  fetchWorkspaces: () => Promise<void>;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws_1',
    name: 'Мой проект',
    slug: 'my-project',
    description: 'Основное рабочее пространство для документации',
    iconEmoji: '🚀',
    ownerId: 'usr_1',
    plan: 'free',
    memberCount: 3,
    documentCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ws_2',
    name: 'Команда разработки',
    slug: 'dev-team',
    description: 'Инженерная база знаний и архитектурные решения',
    iconEmoji: '⚡',
    ownerId: 'usr_1',
    plan: 'pro',
    memberCount: 12,
    documentCount: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useWorkspaceStore = create<WorkspaceStore>()((set) => ({
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,

  setWorkspaces: (workspaces: Workspace[]) => set({ workspaces }),

  setCurrentWorkspace: (workspace: Workspace) =>
    set({ currentWorkspace: workspace }),

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 600));
    set({
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      isLoading: false,
    });
  },
}));
