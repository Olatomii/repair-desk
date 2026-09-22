import Link from "next/link";

export const BOOKING_PAGE_SIZE = 20;

export function bookingPage(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100_000 ? page : 1;
}

export default function BookingPagination({ page, hasNext, href }: { page: number; hasNext: boolean; href: string }) {
  if (page === 1 && !hasNext) return null;
  return (
    <nav aria-label="Booking pages" className="mt-6 flex flex-wrap items-center gap-3">
      {page > 1 ? <Link className="button-secondary" href={`${href}?page=${page - 1}`}>Previous repairs</Link> : null}
      <span>Page {page}</span>
      {hasNext ? <Link className="button-secondary" href={`${href}?page=${page + 1}`}>More repairs</Link> : null}
    </nav>
  );
}
