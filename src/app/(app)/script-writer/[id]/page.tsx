"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ScriptWriterClient } from "@/components/scriptWriter/ScriptWriterClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { scriptWriterGetSession } from "@/lib/scriptWriter/apiClient";
import { canUseProductionTools } from "@/lib/utils/permissions";

export default function ScriptWriterSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { user, appUser } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    if (canUseProductionTools(appUser)) {
      setAllowed(true);
      return;
    }
    scriptWriterGetSession(() => user.getIdToken(), sessionId)
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false));
  }, [user, appUser, sessionId]);

  if (allowed === null) return <LoadingSpinner className="py-20" />;
  if (!allowed) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>You don&apos;t have access to this script.</p>
      </div>
    );
  }

  return <ScriptWriterClient sessionId={sessionId} />;
}
