import type { Metadata } from "next";
import { SpendView } from "@/components/spend/spend-view";

export const metadata: Metadata = { title: "Spend" };

export default function SpendPage() {
  return <SpendView />;
}
