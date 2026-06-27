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
  canEditQuotes,
  canManageProjects,
  canManageUsers,
  hasAnyWritePermission,
  isInsightOrgUser,
  resolvePermissions,
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
    pushSupported,
    pushEnabled,
    registering,
    error: pushError,
    notifyEmail,
    notifyPush,
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
          description="Email and browser alerts when clients sign agreements"
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
              Send browser push notifications
            </label>
            {pushSupported ? (
              <div className="space-y-2">
                <Button
                  size="touch"
                  variant={pushEnabled ? "outline" : "primary"}
                  disabled={registering || pushEnabled}
                  onClick={() => enablePush()}
                >
                  {pushEnabled ? "Push enabled on this device" : "Enable push on this device"}
                </Button>
                {pushError && <p className="text-sm text-red-600">{pushError}</p>}
              </div>
            ) : (
              <InfoCallout variant="sky">
                Push notifications require a supported browser (Chrome, Edge, Firefox).
              </InfoCallout>
            )}
            <InfoCallout variant="emerald">
              When a client signs, Insight Media Group and the agreement creator receive an in-app alert, email (via Resend), and push if enabled.
            </InfoCallout>
          </div>
        </PageSection>

        {isInsightOrgUser(appUser) && canEditQuotes(appUser) && (
          <PageSection
            icon={FileStack}
            accent="blue"
            title="Reports & accounting"
            description="Export payee totals for your accountant or tax prep"
            action={
              <Link href="/reports/payments">
                <Button variant="outline" size="touch">
                  Payment export <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            }
          >
            <p className="text-sm text-slate-600">
              Download a CSV of talent, contractor, location, and equipment rental payouts from
              signed agreements — grouped by payee with tax ID and payment totals.
            </p>
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
                You can manage workers and partners from the{" "}
                <Link href="/admin" className="font-semibold underline underline-offset-2">
                  Admin
                </Link>{" "}
                tab — assign custom checkboxes per user.
              </>
            ) : (
              "Ask an Insight Media Group admin to adjust your permissions from the Admin tab."
            )}
          </InfoCallout>
          {canManageUsers(appUser) && (
            <Link href="/admin">
              <Button variant="outline" size="touch" className="w-full sm:w-auto">
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
