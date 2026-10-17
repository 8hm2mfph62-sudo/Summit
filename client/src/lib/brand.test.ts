import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APP_NAME } from "./brand";

describe("application branding", () => {
  it("uses Summit as the current application name", () => {
    expect(APP_NAME).toBe("Summit");
  });

  it("uses the Summit browser-tab title", () => {
    const indexHtml = readFileSync(
      new URL("../../index.html", import.meta.url),
      "utf8"
    );
    expect(indexHtml).toContain("<title>Summit</title>");
  });
});
