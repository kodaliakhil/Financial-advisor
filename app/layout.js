import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Financial Advisor",
  description: "One stop Finance Platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <link rel="icon" href="/icon.png" />
      <html lang="en">
        <body className={`${inter.className}`} suppressHydrationWarning>
          {/* Header */}
          <Header />
          <main className="min-h-screen mt-40">{children}</main>
          <Toaster richColors/>
          {/* Footer */}
          <footer className="bg-blue-50 py-12">
            <p className="container mx-auto px-4 text-center text-gray-600">
              &copy; 2025 Financial Advisor. All rights reserved.
            </p>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
