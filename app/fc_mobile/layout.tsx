import type { Metadata } from "next";
import "./fc-mobile.css";

export const metadata: Metadata = {
  title: "FC Mobile Tournament Manager",
  description:
    "Quß║ún l├╜ giß║úi ─æß║Ñu FC Mobile chuy├¬n nghiß╗çp - Round Robin & Finals",
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
