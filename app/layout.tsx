import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google"; // Xóa Geist nếu không dùng nữa, giữ Geist_Mono
import { Inter } from "next/font/google"; // Đổi sang Inter
import "./globals.css";

// Thay thế Geist bằng Nunito, giữ nguyên tên biến
const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Xóa khai báo Nunito riêng biệt nếu bạn muốn Nunito thay thế hoàn toàn Geist Sans
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
      // Chỉ truyền `geistSans.variable` và `geistMono.variable`
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

