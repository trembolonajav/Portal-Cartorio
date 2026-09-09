import { create } from "zustand";
import { inventoryApi } from "@/lib/inventory-api";
import { ApiError } from "@/lib/api";
import { buildBasicToken, clearStoredAuth, getStoredAuth, setStoredAuth, type AppRole } from "@/lib/auth";

export interface AuthUser {
  username: string;
  role: AppRole;
  roles: AppRole[];
  displayRole: string;
}

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  error: string | null;
  restoreSession: () => Promise<void>;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

const toUser = (payload: { username: string; role: AppRole; roles: AppRole[]; displayRole: string }): AuthUser => ({
  username: payload.username,
  role: payload.role,
  roles: payload.roles,
  displayRole: payload.displayRole,
});

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  error: null,

  restoreSession: async () => {
    const stored = getStoredAuth();
    if (!stored) {
      set({ status: "unauthenticated", user: null, error: null });
      return;
    }

    set({ status: "loading", error: null });
    try {
      const me = await inventoryApi.me();
      set({ status: "authenticated", user: toUser(me), error: null });
    } catch (error) {
      clearStoredAuth();
      set({
        status: "unauthenticated",
        user: null,
        error: error instanceof Error ? error.message : "Sessao invalida",
      });
    }
  },

  login: async (username, password, remember = false) => {
    set({ status: "loading", error: null });
    setStoredAuth({ username, token: buildBasicToken(username, password) }, remember);

    try {
      const me = await inventoryApi.me();
      set({ status: "authenticated", user: toUser(me), error: null });
    } catch (error) {
      clearStoredAuth();
      const message = error instanceof ApiError && error.status === 401
        ? "Usuario ou senha invalidos"
        : error instanceof Error
          ? error.message
          : "Falha ao autenticar";
      set({ status: "unauthenticated", user: null, error: message });
      throw new Error(message);
    }
  },

  logout: () => {
    clearStoredAuth();
    set({ status: "unauthenticated", user: null, error: null });
  },
}));
