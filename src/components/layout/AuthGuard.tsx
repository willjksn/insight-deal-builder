"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { NotificationBell } from "./NotificationBell";
import { PendingApprovalScreen } from "./PendingApprovalScreen";
import { isUserPendingApproval } from "@/lib/users/approval";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured && !user) {
      router.replace("/login");
    }
  }, [user, loading, isConfigured, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isConfigured && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isConfigured && user && !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="max-w-sm text-center text-sm text-slate-600">
          Your account profile could not be loaded. Try signing out and back in, or contact an
          administrator.
        </p>
      </div>
    );
  }

  if (isUserPendingApproval(appUser)) {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="app-canvas">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="sticky top-0 z-30 flex justify-end border-b border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur-sm md:px-6">
          <NotificationBell />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
