"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchScriptSharing,
  shareScriptSession,
  unshareScriptSession,
} from "@/lib/projectAccess/apiClient";
import { ResourceMember } from "@/lib/projectAccess/types";

interface ScriptSharePanelProps {
  sessionId: string;
  isOwner: boolean;
}

export function ScriptSharePanel({ sessionId, isOwner }: ScriptSharePanelProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ResourceMember[]>([]);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchScriptSharing(() => user.getIdToken(), sessionId);
      setMembers(data.members);
      setLinkedProjectId(data.linkedProjectId);
      setCanManage(data.canManageSharing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sharing");
    } finally {
      setLoading(false);
    }
  }, [user, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || (!canManage && members.length === 0 && !linkedProjectId)) {
    return null;
  }

  const share = async () => {
    if (!user || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await shareScriptSession(() => user.getIdToken(), sessionId, email.trim());
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to share");
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

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-sky-600" />
        <h2 className="text-sm font-semibold text-slate-900">Sharing</h2>
      </div>
      {linkedProjectId && (
        <p className="mt-2 text-xs text-slate-500">
          Linked to{" "}
          <Link href={`/projects/${linkedProjectId}`} className="text-sky-700 hover:underline">
            project team
          </Link>
          . Project members with Scripts access can also open this session.
        </p>
      )}
      {!linkedProjectId && canManage && (
        <p className="mt-2 text-xs text-slate-500">
          Not linked to a project yet — share directly by email, or link a project and manage access
          from the project page.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className="min-w-[200px] flex-1"
          />
          <Button type="button" size="sm" disabled={saving || !email.trim()} onClick={() => void share()}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Share script
          </Button>
        </div>
      )}
      {members.length > 0 && (
        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span>{m.displayName || m.email}</span>
              {canManage && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => void remove(m)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
