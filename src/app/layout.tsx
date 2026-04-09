import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});


export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Portale Polizia Locale",
  description: "Sistema di Gestione Reperibilità e Turni",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Polizia PL",
  },
  formatDetection: {
    telephone: false,
  },
};

import PWAListener from "@/components/PWAListener";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-semibold rounded-xl shadow-lg border border-slate-100', duration: 4000 }} />
        <PWAListener />
      </body>
    </html>
  );
}
