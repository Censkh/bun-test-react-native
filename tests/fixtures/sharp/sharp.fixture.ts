import { expect, test } from "bun:test";
import sharp from "sharp";

const oneByOnePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("loads sharp native binary under bun-test-react-native setup", async () => {
  const metadata = await sharp(oneByOnePng).metadata();

  expect(metadata.format).toBe("png");
  expect(metadata.width).toBe(1);
  expect(metadata.height).toBe(1);
});
