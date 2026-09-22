import { expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: query } }));
import { GET } from "../src/app/api/health/route";
it("reports database unavailability without leaking connection details", async () => {
  query.mockRejectedValueOnce(new Error("secret database credentials"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ ok: false, service: "repair-desk" });
});
it("reports ready when the database answers", async () => {
  query.mockResolvedValueOnce([{ '?column?': 1 }]);
  expect((await GET()).status).toBe(200);
});
