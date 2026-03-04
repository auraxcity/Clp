import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CLP - Creso's Loan Plug | Fast. Structured. Reliable.",
  description: "Uganda's trusted micro-lending platform. Get quick access to loans from UGX 50,000 to UGX 20,000,000 with fast approval and flexible terms.",
  keywords: ["loans", "micro-lending", "Uganda", "mobile money", "quick cash", "business loans"],
  authors: [{ name: "CLP Capital" }],
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
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
