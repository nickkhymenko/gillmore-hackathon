import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import { PetraLogo, PETRA_TAGLINE } from "@/components/brand/PetraLogo";
import { DeleteAllData } from "@/components/DeleteAllData";
import { DemoLoader } from "@/components/DemoLoader";
import { PetSwitcher } from "@/components/PetSwitcher";
import { ThemeSync } from "@/components/ThemeSync";
import { Toaster } from "@/components/Toaster";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], display: "swap" });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Petra: the rock your pet can rely on",
  description: `${PETRA_TAGLINE} A weekly pet health scan inside your insurer's app. It catches the question before it becomes a claim.`,
  applicationName: "Petra",
  openGraph: { siteName: "Petra", title: "Petra", description: PETRA_TAGLINE },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F7F5F0" };

const NAV = [
  { href: "/walk", label: "Walk" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/savings", label: "Savings" },
  { href: "/partner", label: "For insurers", wide: true },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${interTight.variable} ${instrumentSerif.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies the saved pet theme before first paint, so there is no flash of the default colours. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 sm:px-6" aria-label="Main">
            <Link href="/" className="flex shrink-0 items-center text-lg font-bold tracking-[-0.04em]" aria-label="Petra, home">
              <PetraLogo size={24} />
            </Link>
            <div className="-mr-1 ml-auto flex min-w-0 items-center overflow-x-auto text-[13px] font-medium sm:gap-1 sm:text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`min-h-11 items-center whitespace-nowrap rounded-brand px-2 hover:bg-ink/5 sm:px-3 ${n.wide ? "hidden sm:flex" : "flex"}`}>
                  {n.label}
                </Link>
              ))}
            </div>
            <PetSwitcher />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:px-6">
            <span>Triage and monitoring support only, not a diagnosis.</span>
            <span className="flex flex-wrap gap-x-5">
              <Link href="/partner" className="link min-h-11 content-center sm:hidden">
                For insurers
              </Link>
              <DeleteAllData />
            </span>
            <span>{PETRA_TAGLINE} Built for the Gillmore Hackathon 2026</span>
          </div>
        </footer>
        <ThemeSync />
        <DemoLoader />
        <Toaster />
      </body>
    </html>
  );
}
