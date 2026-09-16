import { describe, expect, jest, test } from "bun:test";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { render, waitFor } from "@testing-library/react-native";
import { createRef, useEffect } from "react";
import { Text } from "react-native";

const withPassthroughWrapper = <TProps,>(Component: React.ComponentType<TProps>) => Component;
const WrappedFlashList = withPassthroughWrapper(FlashList);

const renderItem = ({ item }: { item: string }) => <Text>{item}</Text>;

describe("@shopify/flash-list imperative ref compatibility", () => {
  test("exposes scrollToOffset through a wrapped FlashList ref", async () => {
    const ref = createRef<FlashListRef<string>>();
    const observedScrollToOffset = jest.fn();

    const Probe = () => {
      useEffect(() => {
        observedScrollToOffset(typeof ref.current?.scrollToOffset);
        ref.current?.scrollToOffset({ animated: false, offset: 0 });
      }, []);

      return <WrappedFlashList data={["one"]} keyExtractor={(item) => item} ref={ref} renderItem={renderItem} />;
    };

    render(<Probe />);

    await waitFor(() => expect(observedScrollToOffset).toHaveBeenCalledWith("function"));
    expect(typeof ref.current?.scrollToOffset).toBe("function");
  });
});
