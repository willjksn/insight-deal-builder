"use client";

import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { ProductionBoard } from "@/lib/production/types";
import { cn } from "@/lib/utils/cn";

interface ProjectShotProgressCardProps {
  projectId: string;
  board: ProductionBoard;
}

export function ProjectShotProgressCard({ projectId, board }: ProjectShotProgressCardProps) {
  const days = [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const totalShots = days.reduce((n, d) => n + d.shots.length, 0);
  const doneShots = days.reduce((n, d) => n + d.shots.filter((s) => s.done).length, 0);

  if (totalShots === 0) {
    return (
      <Card>
        <CardBody>
          <h2 className="mb-2 text-lg font-semibold flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-violet-600" />
            Shot list progress
          </h2>
          <p className="text-sm text-slate-500">
            No shots yet. Apply a script with detailed shot list or add shots on{" "}
            <Link href={`/projects/${projectId}/production`} className="font-medium text-sky-700 hover:underline">
              pre-production
            </Link>
            .
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-violet-600" />
            Shot list progress
          </h2>
          <span className="text-sm font-medium tabular-nums text-sky-700">
            {doneShots}/{totalShots} captured
          </span>
        </div>
        <ul className="space-y-3">
          {days.map((day) => {
            const done = day.shots.filter((s) => s.done).length;
            const total = day.shots.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <li key={day.id}>
                <Link
                  href={`/projects/${projectId}/production/days/${day.id}/shots`}
                  className="block rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition-colors hover:border-sky-200 hover:bg-sky-50/40"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900">
                      Day {day.dayNumber}
                      {day.title && day.title !== `Day ${day.dayNumber}` ? `: ${day.title}` : ""}
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {done}/{total} shots
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct === 100 ? "bg-emerald-500" : "bg-sky-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
