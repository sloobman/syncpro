import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password?: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password?: string;
  }) => Promise<void>;
  loginOAuth: (provider: "google" | "github", profile?: { name?: string; email?: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateProfile: (data: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password?: string) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Derive name from email if not present
        const derivedName = email.split("@")[0].replace(/[._-]/g, " ");
        const capitalizedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

        const user: User = {
          id: `usr_${Date.now()}`,
          name: capitalizedName || "Пользователь",
          email: email.trim(),
          avatarUrl: null,
          timezone: "Europe/Moscow",
          locale: "ru",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const accessToken = `jwt_token_${Date.now()}`;
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      register: async (data) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        const user: User = {
          id: `usr_${Date.now()}`,
          name: data.name.trim() || "Новый пользователь",
          email: data.email.trim(),
          avatarUrl: null,
          timezone: "Europe/Moscow",
          locale: "ru",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const accessToken = `jwt_token_${Date.now()}`;
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      loginOAuth: async (provider, profile) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        const defaultName = provider === "google" ? "Google Пользователь" : "GitHub Разработчик";
        const defaultEmail = provider === "google" ? "user@gmail.com" : "dev@github.com";

        const user: User = {
          id: `usr_${provider}_${Date.now()}`,
          name: profile?.name || defaultName,
          email: profile?.email || defaultEmail,
          avatarUrl: null,
          timezone: "Europe/Moscow",
          locale: "ru",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const accessToken = `oauth_token_${provider}_${Date.now()}`;
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("syncpro-auth");
        }
      },

      setUser: (user: User) => {
        set({ user });
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
        await new Promise((resolve) => setTimeout(resolve, 200));
        const accessToken = `jwt_token_${Date.now()}`;
        set({ accessToken, isLoading: false });
      },
    }),
    {
      name: "syncpro-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
