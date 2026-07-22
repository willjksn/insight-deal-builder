"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BusinessDashboard } from "@/components/dashboard/BusinessDashboard";
import { ProductionDashboard } from "@/components/dashboard/ProductionDashboard";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  return workspace === "production" ? <ProductionDashboard /> : <BusinessDashboard />;
}
