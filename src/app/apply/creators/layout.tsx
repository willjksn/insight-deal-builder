import type { Metadata, Viewport } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-img-serif",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-img-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Creator application — Insight Media Group",
  description:
    "Apply to join the Insight Media Group creator network. Film, brand, and creator work from Charlotte.",
  icons: {
    icon: "https://insightmediagroupllc.com/favicon.ico",
    apple: "https://insightmediagroupllc.com/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
};

export default function PublicCreatorApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${newsreader.variable} ${sourceSans.variable} bg-slate-950 text-slate-300 antialiased selection:bg-[#0369a1] selection:text-white`}
      style={{ fontFamily: "var(--font-img-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
