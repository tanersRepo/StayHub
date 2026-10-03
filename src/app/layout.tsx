import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { SupportWidget } from "@/components/support-widget";
import { currentUser } from "@/lib/auth";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "StayHub", template: "%s · StayHub" },
  description: "Find and book hotels, apartments and homes — or list your own.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    <html lang="en" className={cn("h-full", "antialiased", geistMono.variable, "font-sans", inter.variable)}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} StayHub
        </footer>
        <SupportWidget userEmail={user?.email} />
        <Toaster richColors />
      </body>
    </html>
  );
}
