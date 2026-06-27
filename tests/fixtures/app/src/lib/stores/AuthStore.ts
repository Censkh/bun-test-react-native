type AuthState = {
  isLoading: boolean;
  lastUsedAuthMethod?: string;
  session?: { idToken?: string };
};

let state: AuthState = {
  isLoading: false,
  session: undefined,
};

export const useAuthStore = Object.assign(() => state, {
  getState: () => state,
  setState: (nextState: Partial<AuthState>) => {
    state = { ...state, ...nextState };
  },
});
