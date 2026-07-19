"use client";

import { useParams } from "next/navigation";
import { CoverageDeskClient } from "@/components/production/CoverageDeskClient";

export default function ProjectCoveragePage() {
  const params = useParams();
  const id = params.id as string;
  return <CoverageDeskClient projectId={id} />;
}
