import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  booking: { findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  artisanProfile: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  bookingEvent: { create: vi.fn() },
  notification: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } }));
import { assignArtisan, respondToQuote, confirmHandover, submitQuote } from "../src/lib/booking-workflow";
const expectedUpdatedAt = "2026-09-20T00:00:00.000Z";
const context = { id: "booking", reference: "RD-1", clientId: "client", artisanId: "artisan", artisan: { userId: "artisan-user" } };

beforeEach(() => {
  vi.resetAllMocks();
  db.booking.updateMany.mockResolvedValue({ count: 1 });
  db.booking.findUniqueOrThrow.mockResolvedValue(context);
  db.artisanProfile.findFirst.mockResolvedValue({ id: "artisan", user: { name: "Artisan" } });
});

describe("workflow transaction regressions", () => {
  it("uses an exact snapshot when assigning and notifies inside the transaction", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "REQUESTED", cityId: "city", serviceCategoryId: "service" });
    await assignArtisan({ bookingId: "booking", artisanId: "artisan", actorId: "operator", expectedUpdatedAt });
    expect(db.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "booking", status: "REQUESTED", updatedAt: new Date(expectedUpdatedAt) } }));
    expect(db.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "artisan-user" }) }));
    expect(db.artisanProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE', user: { role: 'ARTISAN' }, cities: { some: { cityId: 'city' } }, services: { some: { serviceId: 'service' } } }) }));
  });
  it("does not write events or notifications when another assignment wins", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "ASSIGNED" });
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    await expect(assignArtisan({ bookingId: "booking", artisanId: "artisan", actorId: "operator", expectedUpdatedAt })).rejects.toMatchObject({ code: "BOOKING_CHANGED" });
    expect(db.bookingEvent.create).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });
  it("rejects approval of a revised quote from a stale page", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "QUOTED" });
    db.booking.updateMany.mockImplementation(async ({ where }) => ({ count: where.updatedAt ? 0 : 1 }));
    await expect(respondToQuote({ bookingId: "booking", clientId: "client", actorId: "client", decision: "APPROVE", expectedUpdatedAt })).rejects.toMatchObject({ code: "BOOKING_CHANGED" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
  it("clears rejected quote data", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "QUOTED" });
    await respondToQuote({ bookingId: "booking", clientId: "client", actorId: "client", decision: "REJECT", expectedUpdatedAt });
    expect(db.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quotedAmount: null, quoteNote: null, quotedAt: null, status: "ASSIGNED" }) }));
  });
  it("rejects another client's approval before any mutation", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "QUOTED" });
    await expect(respondToQuote({ bookingId: "booking", clientId: "intruder", actorId: "intruder", decision: "APPROVE", expectedUpdatedAt })).rejects.toMatchObject({ statusCode: 403 });
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });
  it("rejects an unassigned artisan's quote", async () => {
    db.artisanProfile.findUnique.mockResolvedValue({ id: "other", status: "ACTIVE" });
    db.booking.findUnique.mockResolvedValue({ ...context, status: "ASSIGNED" });
    await expect(submitQuote({ bookingId: "booking", artisanUserId: "other", actorId: "other", expectedUpdatedAt, amount: 100 })).rejects.toMatchObject({ statusCode: 403 });
    expect(db.booking.updateMany).not.toHaveBeenCalled();
  });
  it("does not increment completed jobs after a concurrent handover", async () => {
    db.booking.findUnique.mockResolvedValue({ ...context, status: "AWAITING_HANDOVER" });
    db.booking.updateMany.mockResolvedValue({ count: 0 });
    await expect(confirmHandover({ bookingId: "booking", clientId: "client", actorId: "client", expectedUpdatedAt })).rejects.toMatchObject({ code: "BOOKING_CHANGED" });
    expect(db.artisanProfile.update).not.toHaveBeenCalled();
  });
});
