"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { InfoCallout } from "@/components/ui/PageSection";
import { Project } from "@/lib/types";
import { formatProjectLinkLabel, projectsForScoutLinkDisplay } from "@/lib/utils/scoutProjectLink";

interface Props {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  /** Shorter label for compact UI */
  compact?: boolean;
}

export function ScoutProjectLinkSelect({ projects, value, onChange, compact }: Props) {
  const selected = projects.find((p) => p.id === value);
  const sorted = projectsForScoutLinkDisplay(projects);

  return (
    <div className="space-y-3">
      <Select
        label={compact ? "Production project" : "Link to an existing production project"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: "", label: "No project — standalone scout session" },
          ...sorted.map((p) => ({
            value: p.id,
            label: formatProjectLinkLabel(p),
          })),
        ]}
        touch
      />
      {selected && (
        <InfoCallout variant="sky">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sky-950">{selected.projectName}</p>
              <p className="mt-0.5 text-sm text-sky-900/80">
                {selected.clientName || "No client"}
                {selected.location ? ` · ${selected.location}` : ""}
              </p>
            </div>
            <Link
              href={`/projects/${selected.id}`}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              <FolderKanban className="h-4 w-4" />
              View project
            </Link>
          </div>
        </InfoCallout>
      )}
    </div>
  );
}
