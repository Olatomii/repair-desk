import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteHeader from "@/components/site-header";
import "./globals.css";
const sans = localFont({
  src: [
    { path: "./fonts/dm-sans-0.ttf", weight: "400" },
    { path: "./fonts/dm-sans-2.ttf", weight: "600" },
    { path: "./fonts/dm-sans-3.ttf", weight: "700" },
  ],
  variable: "--font-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Repair Desk",
  description:
    "Book repairs, approve your quote and keep every step connected, from the first request to the final handover.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={sans.variable}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="site-footer shell">
          <span>
            Repair Desk <span aria-hidden="true">/</span> Service, connected.
          </span>
          <span>From the first request to the final handover.</span>
        </footer>
      </body>
    </html>
  );
}
