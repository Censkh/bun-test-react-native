const state = {
  clearEditorState: () => {},
  filterId: undefined,
  layerId: undefined,
  projectId: undefined,
  setEditorState: () => {},
};

export const useEditorStore = Object.assign(
  (selector?: (state: typeof state) => unknown) => (selector ? selector(state) : state),
  {
    getState: () => state,
  },
);
