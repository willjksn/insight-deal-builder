"use client";

import { use } from "react";
import { ContentPlanPitchClient } from "@/components/contentPlan/ContentPlanPitchClient";

type Props = { params: Promise<{ id: string }> };

export default function ContentPlanPitchSessionPage({ params }: Props) {
  const { id } = use(params);
  return <ContentPlanPitchClient initialSessionId={id} />;
}
