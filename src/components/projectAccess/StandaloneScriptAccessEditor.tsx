"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchScriptSharing,
  shareScriptSession,
  TeamUserCandidate,
  unshareScriptSession,
} from "@/lib/projectAccess/apiClient";
import { ResourceMember } from "@/lib/projectAccess/types";

function candidateLabel(candidate: TeamUserCandidate): string {
  if (candidate.displayName?.trim()) {
    return `${candidate.displayName.trim()} (${candidate.email})`;
  }
  return candidate.email;
}

interface StandaloneScriptAccessEditorProps {
  sessionId: string;
  hubCandidates?: TeamUserCandidate[];
}

export function StandaloneScriptAccessEditor({
  sessionId,
  hubCandidates,
}: StandaloneScriptAccessEditorProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ResourceMember[]>([]);
  const [candidates, setCandidates] = useState<TeamUserCandidate[]>(hubCandidates ?? []);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScriptSharing(() => user.getIdToken(), sessionId);
      setMembers(data.members);
      setCandidates(data.candidates ?? hubCandidates ?? []);
      setCanManage(data.canManageSharing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load script sharing");
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, hubCandidates]);

  useEffect(() => {
    void load();
  }, [load]);

  const addableCandidates = useMemo(
    () => candidates.filter((c) => !members.some((m) => m.userId === c.userId)),
    [candidates, members]
  );

  const selectOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "", label: "Select a person…" }];
    for (const c of addableCandidates) {
      options.push({
        value: c.userId,
        label: c.approved ? candidateLabel(c) : `${candidateLabel(c)} — pending approval`,
      });
    }
    return options;
  }, [addableCandidates]);

  const share = async () => {
    if (!user || !selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      await shareScriptSession(() => user.getIdToken(), sessionId, selectedUserId);
      setSelectedUserId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to share script");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: ResourceMember) => {
    if (!user) return;
    if (!window.confirm(`Remove access for ${member.displayName || member.email}?`)) return;
    setSaving(true);
    try {
      await unshareScriptSession(() => user.getIdToken(), sessionId, member.userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove access");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-6" />;

  if (!canManage) {
    return <p className="text-sm text-slate-500">You cannot manage sharing for this script.</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <Select
            label="Person"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            options={selectOptions}
            disabled={saving || addableCandidates.length === 0}
          />
        </div>
        <Button type="button" disabled={saving || !selectedUserId} onClick={() => void share()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Share script
        </Button>
      </div>
      {members.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between p-3 text-sm">
              <span>{m.displayName || m.email}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => void remove(m)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
