export function createBookingReference() {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 5).toUpperCase();
  return `RD-${time}-${random}`;
}
