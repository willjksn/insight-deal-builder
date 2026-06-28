"use client";

import { useParams } from "next/navigation";
import { ScriptWriterClient } from "@/components/scriptWriter/ScriptWriterClient";
import { useAuth } from "@/contexts/AuthContext";
import { canUseShotScout } from "@/lib/utils/permissions";

export default function ScriptWriterSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { appUser } = useAuth();

  if (!canUseShotScout(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Access denied.</p>
      </div>
    );
  }

  return <ScriptWriterClient sessionId={sessionId} />;
}
