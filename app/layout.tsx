import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P, Cinzel, Cinzel_Decorative } from "next/font/google";
import "./globals.css";
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
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  weight: "700",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cabo",
  description: "Create or join a room with Cabo",
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2" },
    ],
    shortcut: "/icon.png?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} ${cinzel.variable} ${cinzelDecorative.variable} h-full antialiased`}
    >
      <body className="h-full w-full min-h-screen flex flex-col overflow-x-hidden bg-slate-950">
        <LandscapeLock />
        <div className="flex-1 w-full min-h-0 relative flex flex-col overflow-y-auto">
          {children}
        </div>
        <Toaster position="top-right" richColors theme="dark" />
      </body>
    </html>
  );
}
