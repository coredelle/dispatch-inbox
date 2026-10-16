import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Dispatch Inbox",
  description:
    "Paste a load email or drop in a rate confirmation PDF. AI extracts the details, flags what's missing, and drafts the follow-up.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
