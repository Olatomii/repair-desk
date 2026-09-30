import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import OperationForm from "@/components/operation-form";
import CoverageFields from "@/components/coverage-fields";
export default async function ApplyPage() {
  const { session } = await requireRole(["CLIENT", "ARTISAN"]);
  const [profile, cities, services] = await Promise.all([
    prisma.artisanProfile.findUnique({ where: { userId: session.user.id }, include: { cities: true, services: true } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return <main className="shell py-12"><Link href="/dashboard" className="button-secondary">Back to dashboard</Link>
    <h1 className="mt-6 text-3xl font-black">Work with Repair Desk</h1>
    <p className="mt-3">Tell us about your experience and coverage. An operator reviews every application before activation.</p>
    {profile ? <p className="mt-4 font-bold">Application status: {profile.status}</p> : null}
    {!profile || profile.status === "PENDING" ? <section className="card mt-6 max-w-2xl p-6">
      <OperationForm key={profile?.updatedAt.toISOString() ?? "new"} endpoint="/api/artisan-application" values={profile ? { expectedUpdatedAt: profile.updatedAt.toISOString() } : {}} label={profile ? "Update application" : "Submit application"}>
        <label className="block">Phone number<input className="field mt-1" name="phone" type="tel" minLength={7} maxLength={30} defaultValue={profile?.phone ?? ""} required /></label>
        <label className="block">Experience and qualifications<textarea className="field mt-1" name="bio" minLength={20} maxLength={1000} rows={4} defaultValue={profile?.bio ?? ""} required /></label>
        <CoverageFields cities={cities} services={services} cityIds={profile?.cities.map(c => c.cityId)} serviceIds={profile?.services.map(s => s.serviceId)} />
      </OperationForm>
    </section> : <p className="mt-4">Contact an operator to change your coverage or discuss your application status.</p>}
  </main>;
}
