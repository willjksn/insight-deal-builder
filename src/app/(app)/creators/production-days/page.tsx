"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCreators } from "@/lib/utils/permissions";
import { createProductionDay, listProductionDays } from "@/lib/creators/apiClient";
import type { CreatorProductionDay } from "@/lib/creators/opsTypes";

export default function CreatorProductionDaysPage() {
  const { user, appUser } = useAuth();
  const canManage = canManageCreators(appUser);
  const [days, setDays] = useState<CreatorProductionDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const res = await listProductionDays(getToken);
    setDays(res.days);
  }, [user, getToken]);

  useEffect(() => {
    if (!user || !canManage) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [user, canManage, reload]);

  if (!canManage) return <div className="p-6 text-sm">Not authorized.</div>;

  return (
    <div>
      <PageHeader
        title="Creator production days"
        subtitle="Shared studio days for incubator and multi-creator shoots"
        action={
          <Link href="/creators/campaigns">
            <Button size="touch" variant="outline">
              Campaigns
            </Button>
          </Link>
        }
      />
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold">Schedule a production day</h2>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} touch />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            touch
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            touch
          />
          <Input label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} touch />
          <div className="md:col-span-2">
            <Button
              size="touch"
              disabled={busy || !name.trim() || !date}
              onClick={async () => {
                setBusy(true);
                try {
                  await createProductionDay(getToken, {
                    name: name.trim(),
                    date,
                    location: location.trim() || undefined,
                    theme: theme.trim() || undefined,
                  });
                  setName("");
                  setDate("");
                  setLocation("");
                  setTheme("");
                  await reload();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create production day
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : days.length === 0 ? (
        <EmptyState
          title="No production days yet"
          description="Schedule a shared studio day for multiple creators."
        />
      ) : (
        <div className="space-y-3">
          {days.map((d) => (
            <Card key={d.id}>
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{d.name}</div>
                  <div className="text-sm text-slate-500">
                    {d.date}
                    {d.location ? ` · ${d.location}` : ""}
                    {d.theme ? ` · ${d.theme}` : ""}
                  </div>
                  <div className="text-xs text-slate-500">
                    {d.creatorIds.length} creator(s) assigned
                  </div>
                </div>
                <Badge>{d.status}</Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
