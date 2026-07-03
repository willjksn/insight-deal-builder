"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FolderSearch, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InfoCallout, ContentPanel } from "@/components/ui/PageSection";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { AppUser } from "@/lib/types";
import { INSIGHT_MEDIA_GROUP_LLC } from "@/lib/utils/permissions";
import { ownerSummaryLabel } from "@/lib/projectAccess/workspaceAccess";
import type { WorkspaceListItem } from "@/lib/projectAccess/workspaceAccess";

type SearchResult = {
  ownerUserId: string;
  ownerCompany?: string;
  partnerPrivateHidden: boolean;
  scripts: WorkspaceListItem[];
};

interface AdminWorkspacePanelProps {
  users: AppUser[];
}

export function AdminWorkspacePanel({ users }: AdminWorkspacePanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [ownerUserId, setOwnerUserId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const ownerOptions = useMemo(() => {
    const approved = users.filter((u) => u.approved !== false && u.email);
    return [
      { value: "", label: "Select a team member…" },
      ...approved
        .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
        .map((u) => ({
          value: u.id,
          label: ownerSummaryLabel(u.displayName, u.email, u.company),
        })),
    ];
  }, [users]);

  const selectedOwner = users.find((u) => u.id === ownerUserId);
  const isPartnerOwner =
    selectedOwner?.company && selectedOwner.company !== INSIGHT_MEDIA_GROUP_LLC;

  const search = useCallback(async () => {
    if (!user || !ownerUserId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ ownerUserId });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/workspace-search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResult(data as SearchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [user, ownerUserId, query]);

  useEffect(() => {
    if (!ownerUserId) {
      setResult(null);
      return;
    }
    void search();
  }, [ownerUserId, search]);

  const openResource = async (item: WorkspaceListItem) => {
    if (!user) return;
    setOpeningId(item.id);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/workspace-open", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceType: item.resourceType,
          resourceId: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Open failed");
      router.push(data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open failed");
    } finally {
      setOpeningId(null);
    }
  };

  const items = result ? [...result.scripts].sort((a, b) => a.title.localeCompare(b.title)) : [];

  return (
    <ContentPanel className="mb-8">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <FolderSearch className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Open workspace (admin)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Search a team member&apos;s scripts. IMG internal private work opens read-only
            with an audit log. Partner private work is never listed unless already shared or on a project.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Team member"
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          options={ownerOptions}
          touch
        />
        <Input
          label="Filter by title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Optional keyword…"
          touch
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void search()} disabled={!ownerUserId || loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {isPartnerOwner && (
        <div className="mt-4">
          <InfoCallout variant="blue">
            <strong>Partner workspace.</strong> Only scripts this partner has shared or linked
            to a project appear here. Private partner drafts are not accessible.
          </InfoCallout>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading && <LoadingSpinner className="py-8" />}

      {!loading && result && items.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No matching scripts.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={`${item.resourceType}-${item.id}`} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <ScrollText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  Script
                  {item.linkedProjectId ? " · linked to project" : " · private"}
                  {item.status ? ` · ${item.status.replace(/_/g, " ")}` : ""}
                </p>
              </div>
              {!isPartnerOwner && !item.linkedProjectId && (
                <Badge variant="default">IMG private</Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={openingId === item.id}
                onClick={() => void openResource(item)}
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                {openingId === item.id ? "Opening…" : "Open"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ContentPanel>
  );
}
