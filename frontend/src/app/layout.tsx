import type { Metadata } from "next";
import { Grenze, Questrial } from "next/font/google";
import "./globals.css";

const grenze = Grenze({
  variable: "--font-grenze",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const questrial = Questrial({
  variable: "--font-questrial",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Voicely",
  description: "Voice-Over Practice Studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${grenze.variable} ${questrial.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#262733] text-[#EDEFF1] font-body">
        {children}
      </body>
    </html>
  );
}
