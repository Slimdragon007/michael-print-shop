import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PrintShop - Professional Photo Prints",
  description: "Transform your digital memories into beautiful, high-quality prints. Metal, canvas, and fine art paper options available.",
  keywords: ["photo prints", "metal prints", "canvas prints", "fine art", "photography", "wall art"],
  openGraph: {
    title: "PrintShop - Professional Photo Prints",
    description: "Transform your digital memories into beautiful, high-quality prints.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintShop - Professional Photo Prints",
    description: "Transform your digital memories into beautiful, high-quality prints.",
  },
  robots: {
    index: true,
    follow: true,
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
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
