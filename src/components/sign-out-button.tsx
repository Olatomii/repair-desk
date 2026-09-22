"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div><button className="button-secondary" onClick={signOut} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>{error ? <p role="alert">{error}</p> : null}</div>
  );
}
