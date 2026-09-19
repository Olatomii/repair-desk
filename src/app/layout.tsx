import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair Desk",
  description:
    "A multi-city repair-service platform for booking trusted artisans, agreeing quotes, and keeping a clear repair record.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-black/8 bg-[#fffdf8]/90 backdrop-blur">
          <div className="shell flex min-h-18 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#1f5b45] text-sm text-white">
                r.
              </span>
              <span>Repair Desk</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-semibold">
              <Link href="/login" className="button-secondary">
                Sign in
              </Link>
              <Link href="/register" className="button-primary">
                Create account
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
