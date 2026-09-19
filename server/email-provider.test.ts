import { describe, expect, it } from "vitest";

describe("email provider configuration", () => {
  it("accepts the configured Resend credential", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY is required").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status, "Resend API key must authenticate successfully").toBeLessThan(400);
    expect(response.headers.get("content-type") || "").toContain("application/json");
  }, 15000);
});
