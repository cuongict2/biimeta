import type { Metadata } from "next";
import FbVerifyClient from "./FbVerifyClient";

export const metadata: Metadata = {
  title: "FB Verify Tool",
  description: "Facebook Account Verification Tool",
};

export default function FbVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return <FbVerifyClient searchParamsPromise={searchParams} />;
}
