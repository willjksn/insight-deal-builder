"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { BusinessDashboard } from "@/components/dashboard/BusinessDashboard";
import { ProductionDashboard } from "@/components/dashboard/ProductionDashboard";
import { ShootGuideLibrary } from "@/components/shootGuide/ShootGuideLibrary";
import { CreatorPortalHome } from "@/components/creators/CreatorPortalHome";
import { isCreatorPortalUser } from "@/lib/utils/permissions";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const { appUser } = useAuth();
  if (isCreatorPortalUser(appUser)) {
    return <CreatorPortalHome />;
  }
  if (workspace === "shoot-guide") return <ShootGuideLibrary />;
  return workspace === "production" ? <ProductionDashboard /> : <BusinessDashboard />;
}
