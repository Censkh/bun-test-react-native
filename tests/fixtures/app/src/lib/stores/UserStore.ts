type UserState = {
  isMeFetched: boolean;
  remoteData: {
    prompts: unknown[];
    savedPrompts: unknown[];
    showcaseCards: unknown[];
    user: unknown;
  };
};

let state: UserState = {
  isMeFetched: false,
  remoteData: {
    prompts: [],
    savedPrompts: [],
    showcaseCards: [],
    user: null,
  },
};

export const useUserStore = Object.assign(() => state, {
  getState: () => state,
  setState: (nextState: Partial<UserState>) => {
    state = { ...state, ...nextState };
  },
});
