import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireSession();
  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";

  if (!allowedRoles.includes(role)) {
    redirect("/dashboard");
  }

  return { session, role };
}
