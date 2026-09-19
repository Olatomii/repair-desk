import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function DashboardRouter() {
  const session = await requireSession();
  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";

  if (role === "ARTISAN") {
    redirect("/artisan");
  }

  if (role === "OPERATOR") {
    redirect("/operator");
  }

  redirect("/client");
}
