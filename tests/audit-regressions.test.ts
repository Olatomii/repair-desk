import { describe, expect, it } from "vitest";
import { authConfiguration } from "../src/lib/auth-config";
import { readJson, readLimitedBody, rejectCrossOrigin } from "../src/lib/request-validation";
import { evidenceMatchesType } from "../src/lib/evidence";
import { bookingActionSchema } from "../src/lib/validators/workflow";

describe("audit: authentication origin configuration", () => {
  it("trusts the exact Render origin when only Render's URL is present", () => {
    const config = authConfiguration({ NODE_ENV: "production", RENDER_EXTERNAL_URL: "https://repair-desk-5jcz.onrender.com/" });
    expect(config.baseURL).toBe("https://repair-desk-5jcz.onrender.com");
    expect(config.trustedOrigins).toEqual([config.baseURL]);
  });
  it("fails closed when production has no public URL", () => {
    expect(() => authConfiguration({ NODE_ENV: "production" })).toThrow();
  });
  it("normalizes a configured URL and rejects insecure external production origins", () => {
    expect(authConfiguration({ NODE_ENV: "test", BETTER_AUTH_URL: "https://example.com/" }).baseURL).toBe("https://example.com");
    expect(() => authConfiguration({ NODE_ENV: "production", BETTER_AUTH_URL: "http://example.com" })).toThrow();
  });
});

describe("audit: hostile input", () => {
  it("bounds streamed bodies even without a Content-Length header", async () => {
    const request = new Request('http://localhost', { method: 'POST', body: '123456' });
    await expect(readLimitedBody(request, 5)).rejects.toThrow('Request too large');
  });
  it("returns validation input rather than throwing for truncated JSON", async () => {
    expect(await readJson(new Request("http://localhost/api/bookings", { method: "POST", body: '{"cityId":' }))).toBeNull();
  });
  it("rejects cross-site multipart mutations", () => {
    expect(rejectCrossOrigin(new Request("http://localhost/api/bookings", { method: "POST", headers: { origin: "https://attacker.invalid" } }))?.status).toBe(403);
  });
  it.each([0, -1, 0.001, 10.001, 10_000_001, Infinity, NaN])("rejects unrepresentable or invalid quote %s", amount => {
    expect(bookingActionSchema.safeParse({ action: "SUBMIT_QUOTE", amount, expectedUpdatedAt: new Date().toISOString() }).success).toBe(false);
  });
  it("requires the rendered booking snapshot", () => {
    expect(bookingActionSchema.safeParse({ action: "APPROVE_QUOTE" }).success).toBe(false);
  });
  it.each(["image/jpeg", "image/png", "image/webp", "application/pdf"])("rejects HTML disguised as %s", mime => {
    expect(evidenceMatchesType(new TextEncoder().encode('<html><script>alert(1)</script></html>'), mime)).toBe(false);
  });
  it("checks the full WebP container signature", () => {
    expect(evidenceMatchesType(new TextEncoder().encode('RIFFxxxxWEBP'), 'image/webp')).toBe(true);
    expect(evidenceMatchesType(new TextEncoder().encode('RIFFxxxxWAVE'), 'image/webp')).toBe(false);
  });
});
