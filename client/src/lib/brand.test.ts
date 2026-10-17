import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APP_ICON_512_URL, APP_LOGO_URL, APP_NAME } from "./brand";

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

  it("uses the supplied Summit logo in the app header and login screen", () => {
    const appSource = readFileSync(
      new URL("../App.tsx", import.meta.url),
      "utf8"
    );
    const authScreenSource = readFileSync(
      new URL("../components/AuthEntryScreen.tsx", import.meta.url),
      "utf8"
    );

    expect(APP_LOGO_URL).toMatch(/^\/manus-storage\/summit-logo_/);
    expect(APP_ICON_512_URL).toMatch(/^\/manus-storage\/summit-app-icon-512_/);
    expect(appSource).toContain("APP_LOGO_URL");
    expect(authScreenSource).toContain("APP_LOGO_URL");
  });
});
