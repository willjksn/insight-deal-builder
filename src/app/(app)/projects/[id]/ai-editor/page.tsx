"use client";

import { useParams } from "next/navigation";
import { AiEditorClient } from "@/components/aiEditor/AiEditorClient";

export default function ProjectAiEditorPage() {
  const params = useParams();
  const id = params.id as string;
  return <AiEditorClient projectId={id} />;
}
