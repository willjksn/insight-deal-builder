import { ScriptWriterSession } from "@/lib/scriptWriter/types";

export function sessionsForProject(
  sessions: ScriptWriterSession[],
  projectId: string
): ScriptWriterSession[] {
  return sessions.filter(
    (s) => s.linkedProjectId === projectId || s.appliedProjectId === projectId
  );
}

export function scriptSessionStatusLabel(session: ScriptWriterSession): string {
  if (session.status === "applied") return "Applied to project";
  if (session.status === "script_ready") return "Script ready";
  if (session.status === "analysis_ready") return "Review analysis";
  return "In progress";
}
