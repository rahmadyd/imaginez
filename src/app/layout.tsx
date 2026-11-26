import type { Metadata } from "next";
import { connection } from "next/server";
import { fontDisplay, fontBody, fontMono } from "@/styles/fonts";
import "./globals.css";

const FAVICON_VERSION = "v3";

export const metadata: Metadata = {
  title: "Imagine Z - Photo Booth Online",
  description: "Foto strip, tanpa jejak. Diproses di perangkatmu.",
  icons: {
    icon: `/favicon.svg?${FAVICON_VERSION}`,
    shortcut: `/favicon.svg?${FAVICON_VERSION}`,
    apple: `/favicon.svg?${FAVICON_VERSION}`,
  },
  manifest: `/manifest.json?${FAVICON_VERSION}`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce CSP dihasilkan per request, jadi render tidak boleh diprasasti.
  await connection();

  return (
    <html
      lang="id"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-body">
        {children}
      </body>
    </html>
  );
}
