"use client";

import { use } from "react";
import { ShootGuideWorkspace } from "@/components/shootGuide/ShootGuideWorkspace";

type Props = { params: Promise<{ id: string }> };

export default function ShootGuideDetailPage({ params }: Props) {
  const { id } = use(params);
  return <ShootGuideWorkspace guideId={id} />;
}
