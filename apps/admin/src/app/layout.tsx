import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "The Renew Hope Initiative · Admin",
  description: "Biogas MRV Platform — Admin",
  icons: {
    icon: "/RENEW_HOPE_LOGO.png",
    shortcut: "/RENEW_HOPE_LOGO.png",
    apple: "/RENEW_HOPE_LOGO.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${spaceMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
