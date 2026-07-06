import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: "E-Book SOP Sheriff Kerajaan Roxwood",
  description: "Buku panduan digital resmi dan Standar Operasional Prosedur (SOP) Sheriff Kerajaan Roxwood. Informasi taktik perampokan, pasal pidana, radio, dan persenjataan lengkap.",
  authors: [{ name: "Sheriff Department" }],
  icons: {
    icon: "/images/logo-sheriff.png",
    apple: "/images/logo-sheriff.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${outfit.variable} ${inter.variable}`}>
      <body>
        <div className="glow-bg glow-1"></div>
        <div className="glow-bg glow-2"></div>
        {children}
      </body>
    </html>
  );
}
