"use client";

import { HowToUseGuide } from "@/components/guide/HowItWorksGuide";
import { useAuth } from "@/contexts/AuthContext";
import { isUserApproved } from "@/lib/users/approval";

export default function HowToUsePage() {
  const { appUser } = useAuth();

  if (!isUserApproved(appUser)) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>This guide is available after your account is approved.</p>
      </div>
    );
  }

  return <HowToUseGuide />;
}
