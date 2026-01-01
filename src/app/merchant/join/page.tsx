// src/app/merchant/join/page.tsx
import { Metadata } from "next";
import { MerchantJoinContent } from "./MerchantJoinContent";

export const metadata: Metadata = {
  title: "Join as Merchant - Raff",
  description:
    "Connect your Salla or Zid store to Raff and reach thousands of customers",
};

export default function MerchantJoinPage() {
  return <MerchantJoinContent />;
}
