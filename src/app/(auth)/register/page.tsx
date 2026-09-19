"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Unable to create account.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="shell py-16">
      <div className="card mx-auto max-w-md p-7">
        <p className="eyebrow">Client account</p>
        <h1 className="mt-2 text-3xl font-black">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-[#64706a]">
          New registrations start as client accounts. Artisan and operator access is approved separately.
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Full name</span>
            <input className="field" name="name" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Email</span>
            <input className="field" name="email" type="email" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Password</span>
            <input className="field" name="password" type="password" minLength={8} required />
          </label>
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          <button className="button-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-sm text-[#64706a]">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-[#1f5b45]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
