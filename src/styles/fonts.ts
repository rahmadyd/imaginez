import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";

export const fontDisplay = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const fontBody = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const fontMono = IBM_Plex_Mono({
  // Bukan "--font-mono": nama itu dipakai token tema Tailwind sehingga
  // deklarasinya akan merujuk dirinya sendiri.
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});
