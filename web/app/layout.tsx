import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TeamSens — Admin Panel",
  description: "Internal admin panel for community management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
