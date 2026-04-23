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
  title: "Sentinel Security Suite — La Sala Operativa Digitale per la Polizia Locale",
  description: "Piattaforma cloud per la gestione turni, OdS con firma digitale, timbrature GPS, SOS emergenze e notifiche Telegram. Pensata per i Comandi di Polizia Locale italiani.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentinel PL",
  },
  formatDetection: {
    telephone: false,
  },
  keywords: ["polizia locale", "turni", "ordine di servizio", "reperibilità", "gestione turni", "OdS digitale", "firma digitale"],
};

import PWAListener from "@/components/PWAListener";
import SessionWrapper from "@/components/SessionWrapper";
import PrivacyConsentModal from "@/components/PrivacyConsentModal";
import TwoFactorModal from "@/components/TwoFactorModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionWrapper>
          {children}
          <PrivacyConsentModal />
          <TwoFactorModal />
          <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-semibold rounded-xl shadow-lg border border-slate-100', duration: 4000 }} />
          <PWAListener />
        </SessionWrapper>
      </body>
    </html>
  );
}
