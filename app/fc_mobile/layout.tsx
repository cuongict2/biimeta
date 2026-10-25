import type { Metadata } from "next";
import "./fc-mobile.css";

export const metadata: Metadata = {
  title: "FC Mobile Tournament Manager",
  description:
    "Quản lý giải đấu FC Mobile chuyên nghiệp - Round Robin & Finals",
};

export default function FCMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fc-mobile-app min-h-screen bg-[#0a0e17] text-white">
      {children}
    </div>
  );
}