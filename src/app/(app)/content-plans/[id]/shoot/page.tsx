"use client";

import { use } from "react";
import { ContentPlanShootModeClient } from "@/components/contentPlan/ContentPlanShootModeClient";

type Props = { params: Promise<{ id: string }> };

export default function ContentPlanShootModePage({ params }: Props) {
  const { id } = use(params);
  return <ContentPlanShootModeClient planId={id} />;
}
