import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Source_Sans_3 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "AquaOS",
  description: "Apartment water management for society admins, residents, and tanker vendors.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
