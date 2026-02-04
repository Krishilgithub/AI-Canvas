import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Canvas | Intelligent Social Automation",
  description:
    "Enterprise-grade AI content automation for LinkedIn and beyond.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${manrope.variable} antialiased font-sans bg-background text-foreground`}
      >
        <SmoothScroll>{children}</SmoothScroll>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
