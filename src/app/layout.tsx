import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Freight-paperwork type: condensed form headings, plain body, typewriter-ish data
const display = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "A sample AI MVP by Coredelle Digital. Paste a freight load email or drop in a PDF rate confirmation: AI builds a clean load record, flags what's missing, and drafts the follow-up. Live demo, no signup.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dispatch Inbox: AI load intake, built by Coredelle Digital",
    template: "%s · Dispatch Inbox",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Dispatch Inbox",
    title: "Dispatch Inbox: AI load intake, built by Coredelle Digital",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Cookieless page-view counts; only reports on Vercel, not in development */}
        <Analytics />
      </body>
    </html>
  );
}
