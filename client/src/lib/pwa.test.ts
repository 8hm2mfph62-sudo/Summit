import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const manifest = readFileSync(
  new URL("../../public/manifest.webmanifest", import.meta.url),
  "utf8"
);
const mainSource = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");
const serviceWorker = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8"
);

describe("Summit installable app configuration", () => {
  it("declares standalone display and a scoped start URL", () => {
    const parsed = JSON.parse(manifest) as Record<string, unknown>;
    expect(parsed.name).toBe("Summit");
    expect(parsed.display).toBe("standalone");
    expect(parsed.start_url).toBe("/");
    expect(parsed.scope).toBe("/");
  });

  it("includes Japanese mobile app metadata and the manifest link", () => {
    expect(indexHtml).toContain('<html lang="ja">');
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
  });

  it("registers a root-scoped service worker", () => {
    expect(mainSource).toContain('navigator.serviceWorker.register("/sw.js", { scope: "/" })');
    expect(serviceWorker).toContain('const CACHE_NAME = "summit-shell-v1"');
    expect(serviceWorker).toContain('request.mode === "navigate"');
  });
});
