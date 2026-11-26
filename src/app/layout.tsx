import type { Metadata } from "next";
import { connection } from "next/server";
import { fontDisplay, fontBody, fontMono } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imagine Z - Photo Booth Online",
  description: "Foto strip, tanpa jejak. Diproses di perangkatmu.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
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
