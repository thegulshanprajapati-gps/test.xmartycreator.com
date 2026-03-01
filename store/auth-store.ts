import { create } from 'zustand';
import { AuthUser, Role } from '@/types';
import * as authService from '@/services/auth-service';

type AuthState = {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  loading: true,
  hydrate: async () => {
    set({ loading: true });
    try {
      const user = await authService.getMe();
      set({ user, role: user?.role ?? null, loading: false });
    } catch {
      set({ user: null, role: null, loading: false });
    }
  },
  logout: async () => {
    await authService.logout();
    set({ user: null, role: null, loading: false });
  },
}));
