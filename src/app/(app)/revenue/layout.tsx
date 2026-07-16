"use client";

import { ReactNode } from "react";
import { RevenueFeatureGate } from "@/components/revenue/RevenueFeatureGate";
import { RevenueSubNav } from "@/components/revenue/RevenueSubNav";

export default function RevenueLayout({ children }: { children: ReactNode }) {
  return (
    <RevenueFeatureGate>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <RevenueSubNav />
        {children}
      </div>
    </RevenueFeatureGate>
  );
}
