import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, Cinzel } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import LandscapeLock from "@/components/LandscapeLock";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cabo",
  description: "Create or join a room with Cabo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="h-screen w-screen flex flex-col overflow-hidden">
        <LandscapeLock />
        <Header />
        <div className="flex-1 w-full min-h-0 relative flex flex-col overflow-hidden">
          {children}
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
