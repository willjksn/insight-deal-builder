"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ContentPanel, DetailRow, InfoCallout, PageSection } from "@/components/ui/PageSection";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useServicePackages } from "@/hooks/useServicePackages";
import {
  canAccessReports,
  canManageProjects,
  canManageUsers,
  hasAnyWritePermission,
  isInsightOrgUser,
  resolvePermissions,
  canUseShotScout,
} from "@/lib/utils/permissions";
import { repairAllAgreementAccessKeys } from "@/lib/agreement/lifecycle";
import { PAYOUT_RULES_SUMMARY } from "@/lib/seed/demoData";
import {
  User,
  Briefcase,
  Shield,
  Package,
  LogOut,
  ChevronRight,
  Bell,
  FileStack,
  Clapperboard,
  Camera,
  Lightbulb,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function formatPermissionLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function SettingsPage() {
  const { appUser, signOut, isConfigured } = useAuth();
  const { data: servicePackages, loading: packagesLoading, fromFirestore } = useServicePackages();
  const [repairing, setRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState("");
  const {
    pushStatus,
    pushSupportMessage,
    pushEnabled,
    registering,
    error: pushError,
    diagnostics,
    notifyEmail,
    notifyPush,
    isStandalonePwa,
    isIosDevice,
    enablePush,
    setNotifyEmail,
    setNotifyPushPref,
  } = usePushNotifications();

  const permissions = appUser ? resolvePermissions(appUser) : null;
  const activePermissions = permissions
    ? Object.entries(permissions).filter(([, v]) => v).map(([k]) => k)
    : [];

  const handleRepairAccess = async () => {
    setRepairing(true);
    setRepairMessage("");
    try {
      const result = await repairAllAgreementAccessKeys();
      setRepairMessage(
        `Checked ${result.total} agreements. Updated access keys on ${result.updated} record${result.updated === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setRepairMessage(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setRepairing(false);
    }
  };

  const initials = (appUser?.displayName || appUser?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, integrations, and business defaults" />

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection icon={User} accent="sky" title="Account" description="Your profile and session">
          {appUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-lg font-bold text-white shadow-md shadow-sky-500/25">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{appUser.displayName || "User"}</p>
                  <p className="text-sm text-slate-500">{appUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <DetailRow label="Organization" value={appUser.company || "—"} />
                <DetailRow
                  label="Access level"
                  value={
                    hasAnyWritePermission(appUser) ? (
                      <Badge variant="success">Active permissions</Badge>
                    ) : (
                      <Badge variant="warning">Limited access</Badge>
                    )
                  }
                />
              </div>
              {activePermissions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Your permissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activePermissions.map((key) => (
                      <span
                        key={key}
                        className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 ring-1 ring-sky-200"
                      >
                        {formatPermissionLabel(key)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <Button variant="outline" size="touch" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </PageSection>

        <PageSection
          icon={Bell}
          accent="emerald"
          title="Notifications"
          description="Email and push alerts for agreements, signups, and shared notes"
        >
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="h-5 w-5 rounded"
              />
              Email me when a client signs an agreement
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={notifyPush}
                onChange={(e) => setNotifyPushPref(e.target.checked)}
                className="h-5 w-5 rounded"
              />
              Send push notifications to this device (preference)
            </label>
            {isIosDevice && !isStandalonePwa ? (
              <InfoCallout variant="sky">
                <strong>iPhone / iPad:</strong> Open ShootSpine in Safari → <strong>Share</strong> →{" "}
                <strong>Add to Home Screen</strong>. Open the app from your home screen icon (not Safari), then
                enable push below.
              </InfoCallout>
            ) : null}
            {pushStatus === "loading" ? (
              <p className="text-sm text-slate-500">Checking push support…</p>
            ) : pushStatus === "missing_vapid" ? (
              <InfoCallout variant="sky">
                <strong>Push is not configured yet.</strong> Add{" "}
                <code className="text-xs">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> in Vercel (and{" "}
                <code className="text-xs">.env.local</code> for local dev). In Firebase Console → Project Settings →
                Cloud Messaging → Web Push certificates, copy the key pair value, redeploy, then try again.
              </InfoCallout>
            ) : pushStatus === "ios_install_required" ? (
              <InfoCallout variant="sky">
                Add ShootSpine to your Home Screen first, then open it from the icon — iOS will not offer push from
                a Safari tab.
              </InfoCallout>
            ) : pushStatus === "ready" || isStandalonePwa ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  size="touch"
                  variant={pushEnabled ? "outline" : "primary"}
                  disabled={registering || pushEnabled || pushStatus !== "ready"}
                  onClick={() => void enablePush()}
                >
                  {registering
                    ? "Enabling…"
                    : pushEnabled
                      ? "Push enabled on this device"
                      : "Enable push on this device"}
                </Button>
                {isIosDevice ? (
                  <p className="text-xs text-slate-600">
                    Tap the button above — iOS will ask to allow notifications. You must tap <strong>Allow</strong>{" "}
                    when prompted.
                  </p>
                ) : null}
                {isStandalonePwa ? (
                  <p className="text-xs text-emerald-700">
                    Installed app detected — alerts can show under your home screen icon.
                  </p>
                ) : null}
                {pushError ? <p className="text-sm text-red-600">{pushError}</p> : null}
                {diagnostics ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <p className="font-medium text-slate-700">Device check</p>
                    <ul className="mt-1 space-y-0.5">
                      <li>Home screen app: {diagnostics.standalone ? "Yes" : "No"}</li>
                      <li>Notification permission: {diagnostics.notificationPermission}</li>
                      <li>Push API: {diagnostics.pushManager ? "Yes" : "No"}</li>
                      <li>Service worker: {diagnostics.serviceWorkerState}</li>
                      <li>VAPID configured: {diagnostics.vapidConfigured ? "Yes" : "No"}</li>
                    </ul>
                    {!diagnostics.vapidConfigured ? (
                      <p className="mt-2 text-amber-800">
                        Server is missing the VAPID key — push cannot work on any device until it is added in Vercel
                        and the app is redeployed.
                      </p>
                    ) : null}
                    {diagnostics.notificationPermission === "denied" ? (
                      <p className="mt-2 text-amber-800">
                        {isIosDevice
                          ? "Permission was denied. Go to Settings → Notifications → ShootSpine → Allow Notifications, then tap Enable push again."
                          : "Permission was denied. Allow notifications in your browser site settings (lock icon in the address bar), then try again."}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <InfoCallout variant="sky">{pushSupportMessage}</InfoCallout>
            )}
            {pushStatus !== "ready" && !isStandalonePwa && pushError ? (
              <p className="text-sm text-red-600">{pushError}</p>
            ) : null}
            {diagnostics && pushStatus !== "ready" && pushStatus !== "loading" && !isStandalonePwa ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <p className="font-medium text-slate-700">Device check</p>
                <ul className="mt-1 space-y-0.5">
                  <li>VAPID configured: {diagnostics.vapidConfigured ? "Yes" : "No"}</li>
                  <li>Notification permission: {diagnostics.notificationPermission}</li>
                  <li>Push API: {diagnostics.pushManager ? "Yes" : "No"}</li>
                </ul>
              </div>
            ) : null}
            <InfoCallout variant="emerald">
              Push alerts cover client signatures, new signup approvals (admins), and shared resource notes. You need
              to enable push on each phone, tablet, or computer you use.
            </InfoCallout>
          </div>
        </PageSection>

        {isInsightOrgUser(appUser) && canAccessReports(appUser) && (
          <PageSection
            icon={FileStack}
            accent="blue"
            title="Reports & accounting"
            description="Export payee totals for your accountant or tax prep"
            action={
              <Link href="/reports">
                <Button variant="outline" size="touch">
                  Open reports <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            }
          >
            <p className="text-sm text-slate-600">
              View cash flow analytics and download CSV exports for payees and partner collaborator
              payouts from signed agreements.
            </p>
          </PageSection>
        )}

        {canUseShotScout(appUser) && (
          <PageSection
            icon={Clapperboard}
            accent="violet"
            title="Production tools"
            description="Scout gear and lighting presets used by Shot Scout"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/settings/scout-gear"
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50/50"
              >
                <Camera className="h-5 w-5 text-violet-500" />
                Scout gear lists
                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
              <Link
                href="/settings/lights"
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50/50"
              >
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Lighting presets
                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </PageSection>
        )}

        <PageSection
          icon={Briefcase}
          accent="violet"
          title="Business defaults"
          description="Packages and payout rules used in the wizard"
          className="lg:col-span-2"
          action={
            canManageProjects(appUser) ? (
              <Link href="/packages">
                <Button variant="outline" size="touch">
                  Manage packages <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : undefined
          }
        >
          <p className="text-sm text-slate-600">
            Service packages define price, deliverables, and default payout splits. When you pick a
            package in the quote wizard, fee, splits, deliverables, and payment terms fill in
            automatically.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <ContentPanel>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Package className="h-4 w-4 text-violet-500" /> Standard packages
                {!fromFirestore && (
                  <Badge variant="warning" className="ml-1 text-[10px]">
                    Built-in defaults
                  </Badge>
                )}
              </p>
              {packagesLoading ? (
                <LoadingSpinner className="py-6" />
              ) : (
                <ul className="space-y-2">
                  {servicePackages.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100"
                    >
                      <span className="text-slate-700">{p.name}</span>
                      <span className="font-semibold text-violet-700">
                        ${p.price.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ContentPanel>
            <ContentPanel>
              <p className="mb-3 text-sm font-semibold text-slate-800">Payout rules</p>
              <ul className="space-y-2">
                {PAYOUT_RULES_SUMMARY.map((r) => (
                  <li
                    key={r}
                    className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </ContentPanel>
          </div>
        </PageSection>

        <PageSection icon={Shield} accent="slate" title="Permissions" description="How access is managed">
          <InfoCallout variant="sky">
            {canManageUsers(appUser) ? (
              <>
                Approve users, org permissions, and project access are in{" "}
                <Link href="/admin" className="font-semibold underline underline-offset-2">
                  Admin → Team &amp; access
                </Link>
                .
              </>
            ) : canManageProjects(appUser) ? (
              <>
                Manage project team access from{" "}
                <Link href="/admin" className="font-semibold underline underline-offset-2">
                  Admin → Team &amp; access
                </Link>
                .
              </>
            ) : (
              "Ask an Insight Media Group admin to adjust your permissions from Admin."
            )}
          </InfoCallout>
          {(canManageProjects(appUser) || canManageUsers(appUser)) && (
            <Link href="/admin">
              <Button variant="outline" size="touch" className="mt-3 w-full sm:w-auto">
                Open Admin <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </PageSection>

        {canManageUsers(appUser) && (
          <PageSection
            icon={Shield}
            accent="violet"
            title="Repair deal access"
            description="Recompute party access keys on all agreements"
          >
            <p className="text-sm text-slate-600">
              Run this if partners or clients cannot see deals they should have access to. Keys are
              rebuilt from each agreement&apos;s party list (company name and email).
            </p>
            <Button size="touch" variant="outline" onClick={handleRepairAccess} disabled={!isConfigured || repairing}>
              {repairing ? "Repairing..." : "Repair Agreement Access"}
            </Button>
            {repairMessage && (
              <InfoCallout variant="emerald">
                <p>{repairMessage}</p>
              </InfoCallout>
            )}
          </PageSection>
        )}

      </div>
    </div>
  );
}
