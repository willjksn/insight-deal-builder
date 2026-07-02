"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { NotificationBell } from "./NotificationBell";
import { PendingApprovalScreen } from "./PendingApprovalScreen";
import { isUserPendingApproval } from "@/lib/users/approval";

const PUBLIC_APP_PATHS = new Set(["/terms", "/privacy"]);

function isPublicAppPath(pathname: string) {
  return PUBLIC_APP_PATHS.has(pathname);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const publicPath = isPublicAppPath(pathname);

  useEffect(() => {
    if (!loading && isConfigured && !user && !publicPath) {
      router.replace("/login");
    }
  }, [user, loading, isConfigured, router, publicPath]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isConfigured && !user && !publicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (publicPath && !user) {
    return (
      <div className="safe-area-pt min-h-screen bg-slate-50 px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom,0))] md:py-14">
        <div className="mx-auto max-w-3xl">{children}</div>
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

  if (isUserPendingApproval(appUser) && !publicPath) {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="app-canvas">
      <Sidebar />
      <MobileNav />
      <main className="safe-area-main-pb lg:pl-64 lg:pb-0">
        {!publicPath ? (
          <div className="sticky top-0 z-30 flex justify-end border-b border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur-sm md:px-6">
            <NotificationBell />
          </div>
        ) : null}
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
