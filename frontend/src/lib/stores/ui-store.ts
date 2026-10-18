import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  editorSidebarOpen: boolean;
  editorSidebarTab: string;
  theme: Theme;
  commandPaletteOpen: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  collapseSidebar: (collapsed?: boolean) => void;
  toggleEditorSidebar: () => void;
  setEditorSidebarTab: (tab: string) => void;
  setTheme: (theme: Theme) => void;
  toggleCommandPalette: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      editorSidebarOpen: false,
      editorSidebarTab: 'comments',
      theme: 'system',
      commandPaletteOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      collapseSidebar: (collapsed?: boolean) =>
        set((state) => ({
          sidebarCollapsed:
            typeof collapsed === "boolean" ? collapsed : !state.sidebarCollapsed,
        })),

      toggleEditorSidebar: () =>
        set((state) => ({ editorSidebarOpen: !state.editorSidebarOpen })),

      setEditorSidebarTab: (tab: string) =>
        set({ editorSidebarTab: tab, editorSidebarOpen: true }),

      setTheme: (theme: Theme) => set({ theme }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    }),
    {
      name: 'syncpro-ui',
      partialize: (state) => ({
        theme: state.theme,
      }),
    },
  ),
);
