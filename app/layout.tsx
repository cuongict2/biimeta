import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google"; // X├│a Geist nß║┐u kh├┤ng d├╣ng nß╗»a, giß╗» Geist_Mono
import { Inter } from "next/font/google"; // ─Éß╗òi sang Inter
import "./globals.css";

// Thay thß║┐ Geist bß║▒ng Nunito, giß╗» nguy├¬n t├¬n biß║┐n
const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// X├│a khai b├ío Nunito ri├¬ng biß╗çt nß║┐u bß║ín muß╗æn Nunito thay thß║┐ ho├án to├án Geist Sans
export const metadata: Metadata = {
  title: "9Router Config Generator",
  description: "9Router Config Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Chß╗ë truyß╗ün `geistSans.variable` v├á `geistMono.variable`
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

