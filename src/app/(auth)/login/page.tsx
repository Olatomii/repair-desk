"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Unable to sign in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="shell py-16">
      <div className="card mx-auto max-w-md p-7">
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-sm text-[#64706a]">
          New here?{" "}
          <Link href="/register" className="font-bold text-[#1f5b45]">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
