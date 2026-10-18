import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
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
  logout: () => void;
  setUser: (user: User) => void;
  refreshToken: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const mockUser: User = {
  id: 'usr_1',
  name: 'Иван Петров',
  email: 'ivan@syncpro.ru',
  avatarUrl: null,
  timezone: 'Europe/Moscow',
  locale: 'ru',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const user: User = { ...mockUser, email };
        const accessToken = `mock_token_${Date.now()}`;
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      register: async (data) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const user: User = {
          ...mockUser,
          name: data.name,
          email: data.email,
        };
        const accessToken = `mock_token_${Date.now()}`;
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
      },

      setUser: (user: User) => {
        set({ user });
      },

      refreshToken: async () => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 400));
        const accessToken = `mock_token_${Date.now()}`;
        set({ accessToken, isLoading: false });
      },
    }),
    {
      name: 'syncpro-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
