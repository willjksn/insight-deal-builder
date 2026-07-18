"use client";

import { ReactNode } from "react";
import { RevenueFeatureGate } from "@/components/revenue/RevenueFeatureGate";
import { RevenueSubNav } from "@/components/revenue/RevenueSubNav";

export default function RevenueLayout({ children }: { children: ReactNode }) {
  return (
    <RevenueFeatureGate>
      <div className="min-w-0">
        <RevenueSubNav />
        {children}
      </div>
    </RevenueFeatureGate>
  );
}
