"use client";

import { use } from "react";
import { ShootGuideWorkspace } from "@/components/shootGuide/ShootGuideWorkspace";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generateError?: string }>;
};

export default function ShootGuideDetailPage({ params, searchParams }: Props) {
  const { id } = use(params);
  const query = use(searchParams);
  return <ShootGuideWorkspace guideId={id} generateError={query.generateError} />;
}
