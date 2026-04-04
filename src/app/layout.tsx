import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CLP - Creso's Loan Plug | Fast. Structured. Reliable.",
  description: "Uganda's trusted micro-lending platform. Get quick access to loans from UGX 50,000 to UGX 20,000,000 with fast approval and flexible terms.",
  keywords: ["loans", "micro-lending", "Uganda", "mobile money", "quick cash", "business loans"],
  authors: [{ name: "CLP Capital" }],
  manifest: "/manifest.json",
  themeColor: "#0A1F44",
  openGraph: {
    title: "CLP - Creso's Loan Plug",
    description: "Fast. Structured. Reliable micro-lending in Uganda.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/window.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
