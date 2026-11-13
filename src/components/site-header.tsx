"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "./brand";
import SignOutButton from "./sign-out-button";
export default function SiteHeader() {
  const path = usePathname();
  const workspace = [
    "/client",
    "/artisan",
    "/operator",
    "/book",
    "/apply",
    "/dashboard",
    "/notifications",
  ].some((p) => path === p || path.startsWith(p + "/"));
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          {workspace ? (
            <>
              <Link href="/dashboard" className="header-link">
                Workspace
              </Link>
              <Link href="/notifications" className="header-link">
                Updates
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="header-link desktop-link" href="/#services">
                Services
              </Link>
              <Link className="header-link desktop-link" href="/#how-it-works">
                Our process
              </Link>
              <Link href="/login" className="header-link">
                Sign in
              </Link>
              <Link href="/register" className="button-primary">
                Create account <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
