type UserState = {
  isMeFetched: boolean;
  remoteData: {
    filters: unknown[];
    savedFilters: unknown[];
    showcaseCards: unknown[];
    user: unknown;
  };
};

let state: UserState = {
  isMeFetched: false,
  remoteData: {
    filters: [],
    savedFilters: [],
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
