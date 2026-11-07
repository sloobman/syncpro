import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { useWorkspaceStore } from "./workspace-store";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  loginOAuth: (
    provider: "google" | "github",
    profile?: { name?: string; email?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateProfile: (data: Partial<User>) => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Неверный email или пароль");
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Load current user's workspaces
          useWorkspaceStore.getState().fetchWorkspaces();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });

          const resData = await res.json();
          if (!res.ok) {
            throw new Error(resData.error || "Не удалось зарегистрироваться");
          }

          set({
            user: resData.user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Load new user's workspaces
          useWorkspaceStore.getState().fetchWorkspaces();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginOAuth: async (provider, profile) => {
        set({ isLoading: true });
        try {
          const defaultName = provider === "google" ? "Google Пользователь" : "GitHub Разработчик";
          const defaultEmail = provider === "google" ? "google.user@syncpro.dev" : "github.dev@syncpro.dev";

          const res = await fetch("/api/auth/oauth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              provider,
              name: profile?.name || defaultName,
              email: profile?.email || defaultEmail,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Ошибка OAuth авторизации");
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });

          useWorkspaceStore.getState().fetchWorkspaces();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch {
          // ignore network failure on logout
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          useWorkspaceStore.getState().reset();
          if (typeof window !== "undefined") {
            localStorage.removeItem("syncpro-auth");
            localStorage.removeItem("syncpro_workspace_storage");
          }
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: !!user });
        if (user) {
          useWorkspaceStore.getState().fetchWorkspaces();
        }
      },

      updateProfile: (data: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({
          user: {
            ...currentUser,
            ...data,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      refreshToken: async () => {
        set({ isLoading: true });
        try {
          await get().checkAuth();
        } finally {
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              set({ user: data.user, isAuthenticated: true });
              useWorkspaceStore.getState().fetchWorkspaces();
            }
          } else if (res.status === 401) {
            set({ user: null, isAuthenticated: false });
            useWorkspaceStore.getState().reset();
            if (typeof window !== "undefined") {
              localStorage.removeItem("syncpro-auth");
              localStorage.removeItem("syncpro_workspace_storage");
            }
          }
        } catch {
          // ignore offline checks
        }
      },
    }),
    {
      name: "syncpro-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
