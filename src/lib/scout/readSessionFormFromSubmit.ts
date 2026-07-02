import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";

/** Read required text fields from the form DOM so submit matches what the user sees. */
export function readSessionFormFromSubmit(
  formEl: HTMLFormElement,
  state: ScoutSessionFormValues
): ScoutSessionFormValues {
  const fd = new FormData(formEl);
  const projectName = String(fd.get("projectName") ?? state.projectName).trim();
  const sceneIdea = String(fd.get("sceneIdea") ?? state.sceneIdea).trim();
  return { ...state, projectName, sceneIdea };
}

export function validateScoutSessionForm(values: Pick<ScoutSessionFormValues, "projectName" | "sceneIdea">): {
  ok: boolean;
  fieldErrors: Partial<Record<"projectName" | "sceneIdea", string>>;
  message: string | null;
} {
  const fieldErrors: Partial<Record<"projectName" | "sceneIdea", string>> = {};
  if (!values.projectName.trim()) {
    fieldErrors.projectName = "Enter a session name.";
  }
  if (!values.sceneIdea.trim()) {
    fieldErrors.sceneIdea = "Describe the scene — placeholder text does not count.";
  }
  const ok = Object.keys(fieldErrors).length === 0;
  return {
    ok,
    fieldErrors,
    message: ok ? null : "Session name and scene idea are required.",
  };
}
