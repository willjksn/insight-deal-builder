"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  contentIdeasCreateSession,
  contentIdeasGenerate,
  contentIdeasListProfiles,
} from "@/lib/contentIdeas/apiClient";
import { BrandProfile } from "@/lib/contentIdeas/types";
import {
  DEFAULT_IDEA_INPUTS,
  IdeaEngineForm,
} from "@/components/contentIdeas/IdeaEngineForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NewIdeaSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [profileId, setProfileId] = useState<string>();
  const [inputs, setInputs] = useState(DEFAULT_IDEA_INPUTS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    contentIdeasListProfiles(() => user.getIdToken())
      .then((res) => setProfiles(res.profiles))
      .catch(() => {});
  }, [user]);

  const run = async () => {
    if (!user || !inputs.roughIdea.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const { session } = await contentIdeasCreateSession(() => user.getIdToken(), {
        profileId,
        title: inputs.campaignName || inputs.weeklyTheme,
        inputs: { ...inputs, profileId },
      });
      const { session: generated } = await contentIdeasGenerate(() => user.getIdToken(), session.id);
      router.push(`/content/ideas/${generated.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link
        href="/content"
        className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Content development
      </Link>
      <PageHeader
        title="Weekly Idea Engine"
        subtitle="Gemini generates filmable concepts using your profile and cached weekly trend snapshots."
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Card>
        <CardBody className="space-y-6">
          <IdeaEngineForm
            inputs={inputs}
            onChange={setInputs}
            profiles={profiles}
            profileId={profileId}
            onProfileChange={setProfileId}
          />
          <Button size="touch" onClick={run} disabled={running || !inputs.roughIdea.trim()}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating ideas…
              </>
            ) : (
              "Generate weekly ideas"
            )}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
