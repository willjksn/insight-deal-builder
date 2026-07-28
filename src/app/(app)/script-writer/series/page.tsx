"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clapperboard, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  scriptWriterCreateSeries,
  scriptWriterListSeries,
} from "@/lib/scriptWriter/apiClient";
import { ScriptSeries } from "@/lib/scriptWriter/series/types";

export default function SeriesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<ScriptSeries[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    scriptWriterListSeries(() => user.getIdToken())
      .then((res) => setSeries(res.series))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load series"))
      .finally(() => setLoading(false));
  }, [user]);

  const create = async () => {
    if (!user || !newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await scriptWriterCreateSeries(() => user.getIdToken(), {
        title: newTitle.trim(),
      });
      router.push(`/script-writer/series/${res.series.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create series");
      setCreating(false);
    }
  };

  return (
    <div className="pb-24">
      <Link
        href="/script-writer"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Script writer
      </Link>

      <PageHeader
        title="Series"
        subtitle="Group related scripts into a series with a shared world, recurring cast, and motifs. New episodes and trailers inherit the canon and carry the story forward."
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card className="mb-8">
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="New series"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. The Gaze"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                }}
              />
            </div>
            <Button
              type="button"
              onClick={() => void create()}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create series
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : series.length === 0 ? (
        <p className="text-sm text-slate-500">No series yet. Create one above.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {series.map((s) => (
            <li key={s.id}>
              <Link href={`/script-writer/series/${s.id}`}>
                <Card className="h-full transition-colors hover:border-violet-300">
                  <CardBody className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Clapperboard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{s.title}</p>
                      {s.premise ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{s.premise}</p>
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-400">No premise yet</p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
