"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { APP_NAME } from "@/lib/brand";
import { PRODUCER_LEGAL_NAME } from "@/lib/constants/legalTerms";
import {
  claimCreatorInvite,
  fetchCreatorInvitePreview,
} from "@/lib/creators/apiClient";

type Preview = {
  professionalName: string;
  email: string;
  expired: boolean;
  alreadyLinked: boolean;
};

export default function CreatorInviteClaimPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();
  const { user, appUser, loading: authLoading, isConfigured, refreshProfile } = useAuth();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const autoClaimed = useRef(false);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const invite = await fetchCreatorInvitePreview(token);
        if (!cancelled) setPreview(invite);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Invite not found");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleClaim = useCallback(async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      await claimCreatorInvite(getToken, token);
      await refreshProfile();
      router.replace("/creator-portal");
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Could not accept invite");
    } finally {
      setClaiming(false);
    }
  }, [getToken, token, refreshProfile, router]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !preview ||
      preview.expired ||
      preview.alreadyLinked ||
      claiming ||
      autoClaimed.current
    ) {
      return;
    }
    if (appUser?.creatorId) {
      router.replace("/creator-portal");
      return;
    }
    autoClaimed.current = true;
    void handleClaim();
  }, [authLoading, user, preview, appUser?.creatorId, claiming, handleClaim, router]);

  const loginHref = `/login?next=${encodeURIComponent(`/creator-invite/${token}`)}`;

  return (
    <div className="login-canvas safe-area-pt flex min-h-screen items-center justify-center px-4 pb-[env(safe-area-inset-bottom,0)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <BrandLogo variant="icon" className="h-16 w-16 drop-shadow-lg" priority />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-slate-400">Creator portal invite</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-white/95 p-6 shadow-2xl shadow-black/20">
          {!isConfigured ? (
            <p className="text-sm text-slate-600">Authentication is not configured.</p>
          ) : loadError ? (
            <div className="space-y-3">
              <p className="text-sm text-red-700">{loadError}</p>
              <p className="text-sm text-slate-600">
                Ask your {PRODUCER_LEGAL_NAME} contact for a new invite link.
              </p>
            </div>
          ) : !preview ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : preview.expired ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Invite expired</h2>
              <p className="text-sm text-slate-600">
                This invite for <strong>{preview.professionalName}</strong> has expired. Ask IMG
                to send a new ShootSpine invite.
              </p>
            </div>
          ) : preview.alreadyLinked ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Already connected</h2>
              <p className="text-sm text-slate-600">
                This creator profile is already linked to a ShootSpine account. Sign in to open
                your portal.
              </p>
              <Link href="/login" className="block">
                <Button type="button" size="touch" className="w-full">
                  Sign in
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Welcome, {preview.professionalName}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                You&apos;re invited to the {PRODUCER_LEGAL_NAME} Creator Network on {APP_NAME}.
                Create an account (or sign in) with{" "}
                <strong className="text-slate-800">{preview.email}</strong> to continue.
              </p>

              {authLoading || claiming ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <LoadingSpinner />
                  <p className="text-sm text-slate-500">
                    {claiming ? "Connecting your portal…" : "Checking session…"}
                  </p>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  {claimError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {claimError}
                    </p>
                  )}
                  <Button
                    type="button"
                    size="touch"
                    className="w-full"
                    disabled={claiming}
                    onClick={() => void handleClaim()}
                  >
                    Accept invite &amp; open portal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href={loginHref} className="block">
                    <Button type="button" size="touch" className="w-full">
                      Sign in or create account
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-slate-500">
                    Use the same email as your invite ({preview.email}).
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link
              href="https://insightmediagroupllc.com/"
              className="underline hover:text-slate-600"
            >
              {PRODUCER_LEGAL_NAME}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
