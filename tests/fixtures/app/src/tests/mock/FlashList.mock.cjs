const React = require("react");
const { View } = require("react-native");

const renderComponent = (component, props = {}) => {
  if (!component) return null;
  if (React.isValidElement(component)) return component;
  return React.createElement(component, props);
};

const FlashList = React.forwardRef((props, ref) => {
  const {
    data = [],
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    ItemSeparatorComponent,
    contentContainerStyle,
    ...viewProps
  } = props;

  React.useImperativeHandle(ref, () => ({
    scrollToEnd: jest.fn(),
    scrollToIndex: jest.fn(),
    scrollToItem: jest.fn(),
    scrollToOffset: jest.fn(),
  }));

  const items = Array.isArray(data) ? data : [];

  return React.createElement(
    View,
    viewProps,
    renderComponent(ListHeaderComponent),
    items.length === 0 && renderComponent(ListEmptyComponent),
    React.createElement(
      View,
      { style: contentContainerStyle },
      items.map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor ? keyExtractor(item, index) : String(index) },
          renderItem?.({ item, index, target: "Cell" }),
          index < items.length - 1 && renderComponent(ItemSeparatorComponent),
        ),
      ),
    ),
    renderComponent(ListFooterComponent),
  );
});

const useRecyclingState = (initialState) => React.useState(initialState);

module.exports = {
  __esModule: true,
  FlashList,
  useRecyclingState,
};
