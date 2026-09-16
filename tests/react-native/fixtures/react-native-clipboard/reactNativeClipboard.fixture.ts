import { describe, expect, test } from "bun:test";
import Clipboard, { useClipboard } from "@react-native-clipboard/clipboard";

describe("@react-native-clipboard/clipboard package mock", () => {
  test("uses the package-provided Jest mock", async () => {
    expect(await Clipboard.getString()).toBe("mockString");
    expect(await Clipboard.hasString()).toBe(true);

    Clipboard.setString("copied");
    expect(Clipboard.setString).toHaveBeenCalledWith("copied");

    const [value, setValue] = useClipboard();
    expect(value).toBe("mockString");
    expect(typeof setValue).toBe("function");
  });
});
