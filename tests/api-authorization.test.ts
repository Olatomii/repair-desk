import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  booking: { findUnique: vi.fn(), updateMany: vi.fn() },
  bookingEvidence: { findUnique: vi.fn(), create: vi.fn() },
  notification: { updateMany: vi.fn() },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks, $transaction: (fn: (tx: typeof mocks) => unknown) => fn(mocks) } }));
import { POST as create } from "../src/app/api/bookings/route";
import { POST as action } from "../src/app/api/bookings/[bookingId]/action/route";
import { POST as upload } from "../src/app/api/bookings/[bookingId]/evidence/route";
import { GET as download } from "../src/app/api/evidence/[evidenceId]/route";
import { POST as read } from "../src/app/api/notifications/read/route";
const params = { params: Promise.resolve({ bookingId: "booking", evidenceId: "evidence" }) };
const request = (body = "{}") => new Request("http://localhost:3000/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body });
const session = (role: string, id = "actor") => mocks.getSession.mockResolvedValue({ user: { id, role } });

beforeEach(() => { vi.resetAllMocks(); });
describe("API authorization", () => {
  it("requires authentication at every application API boundary", async () => {
    mocks.getSession.mockResolvedValue(null);
    for (const response of [await create(request()), await action(request(), params), await upload(request(), params), await download(request(), params), await read(request())]) expect(response.status).toBe(401);
    expect(mocks.booking.findUnique).not.toHaveBeenCalled();
  });
  it.each(['ARTISAN', 'OPERATOR', 'invalid'])("prevents %s from creating bookings", async role => {
    session(role);
    expect((await create(request())).status).toBe(403);
  });
  it.each([
    ['CLIENT', 'ASSIGN_ARTISAN'], ['CLIENT', 'SUBMIT_QUOTE'], ['CLIENT', 'START_WORK'],
    ['ARTISAN', 'APPROVE_QUOTE'], ['ARTISAN', 'CONFIRM_HANDOVER'], ['OPERATOR', 'REJECT_QUOTE'],
    ['invalid', 'ASSIGN_ARTISAN'],
  ])("prevents %s from performing %s", async (role, verb) => {
    session(role);
    expect((await action(request(JSON.stringify({ action: verb, artisanId: 'x', amount: 100, expectedUpdatedAt: new Date().toISOString() })), params)).status).toBe(403);
  });
  it("handles malformed JSON on both JSON APIs", async () => {
    session('CLIENT');
    expect((await create(request('{'))).status).toBe(400);
    expect((await action(request('{'), params)).status).toBe(400);
  });
  it("does not permit arbitrary status changes", async () => {
    session('OPERATOR');
    expect((await action(request('{"status":"COMPLETED"}'), params)).status).toBe(400);
  });
  it.each(['CLIENT', 'ARTISAN'])("blocks %s evidence ID manipulation", async role => {
    session(role);
    const booking = { clientId: 'other', artisan: { userId: 'someone-else' } };
    mocks.booking.findUnique.mockResolvedValue(booking);
    mocks.bookingEvidence.findUnique.mockResolvedValue({ booking });
    expect((await upload(request(), params)).status).toBe(403);
    expect((await download(request(), params)).status).toBe(403);
  });
  it("blocks upload after the booking changes while the body is read", async () => {
    session('CLIENT');
    mocks.booking.findUnique.mockResolvedValue({ clientId: 'actor', status: 'REQUESTED', updatedAt: new Date(), artisanId: null });
    mocks.booking.updateMany.mockResolvedValue({ count: 0 });
    const form = new FormData();
    form.set('kind', 'DOCUMENT');
    form.set('file', new File(['%PDF-1.4\n%%EOF'], 'proof.pdf', { type: 'application/pdf' }));
    const response = await upload(new Request('http://localhost/api/bookings/booking/evidence', { method: 'POST', body: form }), params);
    expect(response.status).toBe(409);
    expect(mocks.bookingEvidence.create).not.toHaveBeenCalled();
  });
  it("never marks another user's notifications read", async () => {
    session('CLIENT');
    expect((await read(request())).status).toBe(200);
    expect(mocks.notification.updateMany).toHaveBeenCalledWith({ where: { userId: 'actor', readAt: null }, data: { readAt: expect.any(Date) } });
  });
});
