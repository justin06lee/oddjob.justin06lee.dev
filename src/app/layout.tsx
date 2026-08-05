import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Grain } from "@/components/chrome/grain";
import "./globals.css";

export const metadata: Metadata = {
  title: "odd jobs — justin06lee",
  description: "tell me what you want built. file a work order, or book a call.",
  metadataBase: new URL("https://oddjob.justin06lee.dev"),
  openGraph: {
    title: "odd jobs — justin06lee",
    description: "tell me what you want built.",
    url: "https://oddjob.justin06lee.dev",
    siteName: "oddjob.justin06lee.dev",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistMono.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-black text-white">
        {/* Page-wide paper texture. Fixed and pointer-events-none, so it lies
            over everything without touching interaction. */}
        <Grain opacity={0.035} />
        {children}
      </body>
    </html>
  );
}
