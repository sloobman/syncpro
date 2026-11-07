import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type CanvasWidth = 'narrow' | 'standard' | 'wide';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  editorSidebarOpen: boolean;
  editorSidebarTab: string;
  theme: Theme;
  canvasWidth: CanvasWidth;
  commandPaletteOpen: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  collapseSidebar: (collapsed?: boolean) => void;
  toggleEditorSidebar: () => void;
  setEditorSidebarTab: (tab: string) => void;
  setTheme: (theme: Theme) => void;
  setCanvasWidth: (width: CanvasWidth) => void;
  toggleCommandPalette: () => void;
}

type UIStore = UIState & UIActions;

function applyThemeClass(theme: Theme) {
  if (typeof window === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('syncpro-theme', theme);
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      editorSidebarOpen: false,
      editorSidebarTab: 'comments',
      theme: 'system',
      canvasWidth: 'standard',
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

      setTheme: (theme: Theme) => {
        applyThemeClass(theme);
        set({ theme });
      },

      setCanvasWidth: (canvasWidth: CanvasWidth) => set({ canvasWidth }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    }),
    {
      name: 'syncpro-ui',
      partialize: (state) => ({
        theme: state.theme,
        canvasWidth: state.canvasWidth,
      }),
    },
  ),
);
