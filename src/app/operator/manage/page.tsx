import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import OperationForm from "@/components/operation-form";
import CoverageFields from "@/components/coverage-fields";
import BookingPagination, { bookingPage, BOOKING_PAGE_SIZE } from "@/components/booking-pagination";

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await requireRole(["OPERATOR"]);
  const page = bookingPage((await searchParams).page);
  const [profiles, cities, services] = await Promise.all([
    prisma.artisanProfile.findMany({ include: { user: { select: { name: true, email: true } }, cities: true, services: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * BOOKING_PAGE_SIZE, take: BOOKING_PAGE_SIZE + 1 }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <main className="shell py-12">
    <Link href="/operator" className="button-secondary">Back to repairs</Link>
    <h1 className="mt-6 text-3xl font-black">People and service coverage</h1>
    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold">Artisan applications and accounts</h2>
      <p>Review the applicant before activation. Active artisans need at least one available city and service. Suspension blocks assignments, work actions and uploads; existing repairs remain visible for operator review.</p>
      {!profiles.length ? <p className="card p-5">No artisan applications yet.</p> : null}
      {profiles.slice(0, BOOKING_PAGE_SIZE).map(profile => <details key={profile.id} className="card p-5">
        <summary className="cursor-pointer font-bold">{profile.user.name} — {profile.status}</summary>
        <div className="mt-4 space-y-4">
          <p className="break-words">{profile.user.email} · {profile.phone ?? "No phone supplied"}</p><p className="whitespace-pre-wrap">{profile.bio ?? "No application details supplied"}</p>
          <OperationForm key={profile.updatedAt.toISOString()} endpoint="/api/operator" values={{ action: "REVIEW_ARTISAN", id: profile.id, expectedUpdatedAt: profile.updatedAt.toISOString() }}>
            <label className="block">Account decision<select name="status" className="field mt-1" defaultValue={profile.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"}><option value="ACTIVE">Activate / keep active</option><option value="SUSPENDED">Suspend / decline application</option></select></label>
            <CoverageFields cities={cities} services={services} cityIds={profile.cities.map(c => c.cityId)} serviceIds={profile.services.map(s => s.serviceId)} />
          </OperationForm>
        </div>
      </details>)}
      <BookingPagination page={page} hasNext={profiles.length > BOOKING_PAGE_SIZE} href="/operator/manage" />
    </section>
    <section className="card mt-8 p-6">
      <h2 className="mb-3 text-2xl font-bold">Operator access</h2>
      <p className="mb-4">Use the exact email of an existing registered account. This grants access to customer data and operations. Changed accounts must sign in again. You cannot change your own access or convert an artisan account here.</p>
      <OperationForm endpoint="/api/operator" values={{ action: "SET_OPERATOR" }} label="Update operator access">
        <label className="block">Registered email<input type="email" name="email" className="field mt-1" required maxLength={254} /></label>
        <label className="block">Access<select name="operator" className="field mt-1"><option value="false">Remove operator access</option><option value="true">Grant operator access</option></select></label>
      </OperationForm>
    </section>
    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold">Cities</h2>
      <p>Deactivation stops new bookings in a city. Existing repairs and history remain available.</p>
      {cities.map(city => <details key={city.id} className="card p-5"><summary className="cursor-pointer font-bold">{city.name} — {city.isActive ? "Active" : "Inactive"}</summary>
        <div className="mt-4"><OperationForm key={city.updatedAt.toISOString()} endpoint="/api/operator" values={{ action: "UPDATE_CITY", id: city.id, expectedUpdatedAt: city.updatedAt.toISOString() }}>
          <label className="block">City name<input className="field" name="name" required minLength={2} maxLength={100} defaultValue={city.name} /></label>
          <label className="block">State<input className="field" name="state" required minLength={2} maxLength={100} defaultValue={city.state} /></label>
          <label className="block">Country<input className="field" name="country" required minLength={2} maxLength={100} defaultValue={city.country} /></label>
          <label className="block">Availability<select className="field" name="isActive" defaultValue={String(city.isActive)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        </OperationForm></div>
      </details>)}
      <details className="card p-5"><summary className="cursor-pointer font-bold">Add city</summary><div className="mt-4"><OperationForm endpoint="/api/operator" values={{ action: "CREATE_CITY" }} label="Create city">
        <label className="block">City name<input className="field" name="name" required minLength={2} maxLength={100} /></label>
        <label className="block">URL name (lowercase words separated by hyphens)<input className="field" name="slug" required minLength={2} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
        <label className="block">State<input className="field" name="state" required minLength={2} maxLength={100} /></label>
        <label className="block">Country<input className="field" name="country" required minLength={2} maxLength={100} defaultValue="Nigeria" /></label>
      </OperationForm></div></details>
    </section>
    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold">Services</h2>
      <p>Service mode stays fixed to preserve existing bookings. Create a new service if its delivery mode changes.</p>
      {services.map(service => <details key={service.id} className="card p-5"><summary className="cursor-pointer font-bold">{service.name} — {service.mode} — {service.isActive ? "Active" : "Inactive"}</summary>
        <div className="mt-4"><OperationForm key={service.updatedAt.toISOString()} endpoint="/api/operator" values={{ action: "UPDATE_SERVICE", id: service.id, expectedUpdatedAt: service.updatedAt.toISOString() }}>
          <label className="block">Service name<input className="field" name="name" required minLength={2} maxLength={100} defaultValue={service.name} /></label>
          <label className="block">Description<textarea className="field" name="description" required minLength={10} maxLength={1000} defaultValue={service.description} /></label>
          <label className="block">Availability<select className="field" name="isActive" defaultValue={String(service.isActive)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        </OperationForm></div>
      </details>)}
      <details className="card p-5"><summary className="cursor-pointer font-bold">Add service</summary><div className="mt-4"><OperationForm endpoint="/api/operator" values={{ action: "CREATE_SERVICE" }} label="Create service">
        <label className="block">Service name<input className="field" name="name" required minLength={2} maxLength={100} /></label>
        <label className="block">URL name (lowercase words separated by hyphens)<input className="field" name="slug" required minLength={2} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
        <label className="block">Description<textarea className="field" name="description" required minLength={10} maxLength={1000} /></label>
        <label className="block">Delivery mode<select className="field" name="mode"><option value="HOME">Home visit</option><option value="WORKSHOP">Workshop</option></select></label>
      </OperationForm></div></details>
    </section>
  </main>;
}
