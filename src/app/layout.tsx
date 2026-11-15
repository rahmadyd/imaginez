import type { Metadata } from "next";
import { fontDisplay, fontBody, fontMono } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bilik Analog — Web Photobooth",
  description: "Foto strip, tanpa jejak. Diproses di perangkatmu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
