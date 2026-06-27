"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Clock, LogOut } from "lucide-react";

export function PendingApprovalScreen() {
  const { appUser, signOut } = useAuth();

  return (
    <div className="login-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-700/50 bg-white/95 shadow-2xl shadow-black/20">
          <CardBody className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Account pending approval</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Thanks for signing up{appUser?.displayName ? `, ${appUser.displayName}` : ""}. An
              administrator has been notified and will assign your access soon.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Signed in as {appUser?.email}. You cannot use the app until your account is approved.
            </p>
            <Button variant="outline" size="touch" className="mt-6 w-full" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
