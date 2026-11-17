import { Playfair_Display, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";

export const fontDisplay = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

export const fontBody = Plus_Jakarta_Sans({
  variable: "--font-body-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const fontMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});
