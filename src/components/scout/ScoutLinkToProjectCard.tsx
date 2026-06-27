"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteField } from "firebase/firestore";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScoutCard } from "@/components/scout/ScoutShell";
import { ScoutProjectLinkSelect } from "@/components/scout/ScoutProjectLinkSelect";
import { updateScoutProject } from "@/lib/firebase/scoutFirestore";
import { ScoutProject } from "@/lib/scout/types";
import { Project } from "@/lib/types";

interface Props {
  scoutSession: ScoutProject;
  projects: Project[];
  onUpdated: () => void;
}

export function ScoutLinkToProjectCard({ scoutSession, projects, onUpdated }: Props) {
  const [linkedProjectId, setLinkedProjectId] = useState(scoutSession.linkedProjectId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const linkedName = projects.find((p) => p.id === linkedProjectId)?.projectName;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateScoutProject(scoutSession.id, {
        linkedProjectId: linkedProjectId ? linkedProjectId : deleteField(),
        linkedProjectName: linkedName ? linkedName : deleteField(),
      });
      setSaved(true);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    (linkedProjectId || "") !== (scoutSession.linkedProjectId || "");

  return (
    <ScoutCard>
      <h2 className="text-sm font-semibold text-slate-900">Production project</h2>

      {scoutSession.linkedProjectId && !dirty && (
        <Link
          href={`/projects/${scoutSession.linkedProjectId}`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
        >
          <FolderKanban className="h-4 w-4" />
          {scoutSession.linkedProjectName ?? "View linked project"}
        </Link>
      )}

      <div className="mt-4">
        <ScoutProjectLinkSelect
          projects={projects}
          value={linkedProjectId}
          onChange={setLinkedProjectId}
          compact
        />
      </div>

      {dirty && (
        <Button size="sm" className="mt-3" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : linkedProjectId ? "Link to project" : "Remove project link"}
        </Button>
      )}
      {saved && !dirty && (
        <p className="mt-2 text-xs text-emerald-600">Project link updated.</p>
      )}
    </ScoutCard>
  );
}
