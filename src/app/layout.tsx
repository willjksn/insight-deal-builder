import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  APP_NAME,
  APP_TAGLINE,
  BRAND_ICON_180_PATH,
  BRAND_ICON_192_PATH,
  BRAND_ICON_32_PATH,
  BRAND_ICON_512_PATH,
  BRAND_THEME_COLOR,
} from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: BRAND_ICON_32_PATH, sizes: "32x32", type: "image/png" },
      { url: BRAND_ICON_192_PATH, sizes: "192x192", type: "image/png" },
      { url: BRAND_ICON_512_PATH, sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: BRAND_ICON_180_PATH, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col antialiased text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
