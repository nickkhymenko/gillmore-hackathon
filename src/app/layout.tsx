import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prevently: prevention that pays",
  description: "AI weekly pet health check-ins that catch problems early and turn prevention into savings for owners, vets and insurers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

const NAV = [
  { href: "/checkin", label: "Check-in" },
  { href: "/pet", label: "My pet" },
  { href: "/partner", label: "Partners" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-teal-900/10 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-teal-800">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-teal-700 text-white">P</span>
              Prevently
            </Link>
            <div className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-teal-900 hover:bg-teal-50">
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-teal-900/10 py-4 text-center text-xs text-teal-900/60">
          Gillmore Hackathon 2026 prototype. Triage and monitoring support only, not a diagnosis.
        </footer>
      </body>
    </html>
  );
}
