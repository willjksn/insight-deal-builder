"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { isUserApproved } from "@/lib/users/approval";
import { Clock, LogOut, RefreshCw } from "lucide-react";

export function PendingApprovalScreen() {
  const { user, appUser, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), () => {
      void refreshProfile();
    });
    return unsub;
  }, [user, refreshProfile]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      void refreshProfile();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [user, refreshProfile]);

  const approved = isUserApproved(appUser);

  return (
    <div className="login-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700/50 bg-white/95 shadow-2xl shadow-black/20">
          <CardBody className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {approved ? "Access granted" : "Account pending approval"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {approved ? (
                <>Your account is approved. Refreshing the app…</>
              ) : (
                <>
                  Thanks for signing up{appUser?.displayName ? `, ${appUser.displayName}` : ""}. An
                  administrator has been notified and will assign your access soon.
                </>
              )}
            </p>
            {!approved && (
              <p className="mt-2 text-xs text-slate-500">
                Signed in as {appUser?.email}. This page updates automatically when you are approved.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              {!approved && (
                <Button
                  variant="outline"
                  size="touch"
                  className="w-full"
                  onClick={() => void refreshProfile()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check again
                </Button>
              )}
              <Button variant="outline" size="touch" className="w-full" onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
