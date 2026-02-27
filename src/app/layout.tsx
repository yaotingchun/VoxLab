import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GlobalBackground } from "@/components/ui/GlobalBackground";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "VoxLab | AI Public Speaking Coach",
  description: "Master the art of public speaking with real-time AI feedback on voice, content, and posture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden`}>
        <Providers>
          <GlobalBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}

