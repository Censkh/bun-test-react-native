import { describe, expect, test } from "bun:test";
import NetInfo, { NetInfoStateType, useNetInfo } from "@react-native-community/netinfo";

describe("@react-native-community/netinfo with the package jest mock", () => {
  test("exposes the package mock's default state", async () => {
    expect(NetInfoStateType.wifi).toBe("wifi");
    await expect(NetInfo.fetch()).resolves.toMatchObject({ isConnected: true, type: "cellular" });
    expect(useNetInfo()).toMatchObject({ isConnected: true });
  });

  test("returns an unsubscribe function from addEventListener", () => {
    expect(typeof NetInfo.addEventListener(() => {})).toBe("function");
  });
});
