import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";

// Bold block headings to match the logo's "WESTWARD"
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Westward Property Care | Lawn Care & Yard Maintenance",
  description:
    "Westward Property Care offers lawn service (mowing & trimming), leaf cleanup and snow removal in Millard, Papillion, Bellevue and Plattsmouth, Nebraska. Free estimates — call or text 402-202-7197.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
