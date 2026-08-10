import { defaultContentPlanInputs } from "@/lib/contentPlan/types";
import type { ContentPlanInputs } from "@/lib/contentPlan/types";
import type { ContentPlanPitchIdea, ContentPlanPitchSession } from "@/lib/contentPlan/pitchTypes";
import { contentStyleHintFromDeliverable } from "@/lib/contentPlan/pitchStyleHint";

export function contentPlanInputsFromPitchIdea(
  session: Pick<
    ContentPlanPitchSession,
    "clientName" | "businessContext" | "brand" | "product" | "packageName"
  >,
  idea: ContentPlanPitchIdea
): ContentPlanInputs {
  const style =
    idea.contentStyleHint || contentStyleHintFromDeliverable(idea.deliverableName);
  const ideaText = [
    idea.oneLiner,
    "",
    `Deliverable type: ${idea.deliverableName}`,
    `Package: ${session.packageName}`,
    session.clientName ? `Client: ${session.clientName}` : "",
    session.businessContext ? `Business: ${session.businessContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return defaultContentPlanInputs({
    contentStyle: style,
    idea: ideaText,
    brand: session.brand || session.clientName || undefined,
    product: session.product || undefined,
    durationPreset: style === "cinematic_reel" ? "45" : "30",
    durationSeconds: style === "cinematic_reel" ? 45 : 30,
  });
}
