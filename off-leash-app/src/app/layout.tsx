import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Off Leash Deal Analyzer",
  description:
    "Modern, deterministic calculator for buy & hold, BRRRR, and flip deals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <div className="bg-accent-blob" />
        <div className="app-shell">
          <div className="site-frame">
            <nav className="nav">
              <div className="nav-left">
                <div className="brand-mark">
                  <Image
                    src="/logo.jpg"
                    alt="Off Leash logo"
                    fill
                    sizes="40px"
                    priority
                    className="brand-logo"
                  />
                </div>
                <div>
                  <div className="brand-text">Off Leash</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Deal Analyzer
                  </div>
                </div>
              </div>
              <div className="nav-links">
                <Link className="nav-link" href="/">
                  Home
                </Link>
                <Link className="nav-link" href="/analyze">
                  Analyzer
                </Link>
                <Link className="nav-link" href="/admin">
                  Admin
                </Link>
                <Link className="btn btn-primary" href="/analyze">
                  Analyze a deal
                </Link>
              </div>
            </nav>
            <main style={{ marginTop: 24, marginBottom: 48 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
