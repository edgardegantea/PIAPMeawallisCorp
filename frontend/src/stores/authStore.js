import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { authAPI } from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const { data } = await authAPI.login({ username, password });
        localStorage.setItem('refreshToken', data.tokens.refresh);
        set({ user: data.user, token: data.tokens.access, isAuthenticated: true });
        return data;
      },

      register: async (userData) => {
        const { data } = await authAPI.register(userData);
        localStorage.setItem('refreshToken', data.tokens.refresh);
        set({ user: data.user, token: data.tokens.access, isAuthenticated: true });
        return data;
      },

      logout: () => {
        authAPI.logout().catch(() => {});
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateProfile: async (profileData) => {
        const { data } = await authAPI.updateProfile(profileData);
        set({ user: data.user });
        return data;
      },

      refreshUserData: async () => {
        const { data } = await authAPI.getProfile();
        set({ user: data });
        return data;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
