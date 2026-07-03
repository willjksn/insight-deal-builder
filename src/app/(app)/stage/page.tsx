"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { StagePlanner } from "@/components/stage/StagePlanner";
import { useAuth } from "@/contexts/AuthContext";
import { ensurePersonalStageBoard } from "@/lib/stage/stageFirestore";
import { StageBoard } from "@/lib/stage/types";
import { canUseProductionTools } from "@/lib/utils/permissions";

export default function GlobalStagePlannerPage() {
  const { user, appUser } = useAuth();
  const [board, setBoard] = useState<StageBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !canUseProductionTools(appUser)) return;
    ensurePersonalStageBoard(user.uid)
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, appUser]);

  if (!canUseProductionTools(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to the stage planner.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner className="py-20" />;

  if (error || !board) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>{error ?? "Stage planner unavailable."}</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Stage planner"
        subtitle="Top-down lighting diagram — drag props, add note boxes for camera settings and f-stops."
        action={
          <Link href="/reference">
            <Button size="touch" variant="outline">
              Reference guide
            </Button>
          </Link>
        }
      />
      <StagePlanner board={board} onBoardChange={setBoard} />
    </div>
  );
}
