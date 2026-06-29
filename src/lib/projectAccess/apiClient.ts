import {
  ProjectAccessPermissions,
  ProjectMember,
  PROJECT_ACCESS_LABELS,
  ProjectAccessArea,
  ResourceMember,
} from "@/lib/projectAccess/types";

export interface TeamUserCandidate {
  userId: string;
  email: string;
  displayName?: string;
  approved: boolean;
}

async function authFetch(
  getToken: () => Promise<string>,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = await getToken();
  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function fetchTeamManagementHub(
  getToken: () => Promise<string>
): Promise<{
  projects: { id: string; projectName: string; clientName?: string; ownerUserId: string | null }[];
  candidates: TeamUserCandidate[];
  standaloneScripts: { id: string; title: string }[];
  canManage: boolean;
}> {
  const res = await authFetch(getToken, "/api/projects/team-management");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load access settings");
  return data;
}

export async function fetchProjectTeam(
  getToken: () => Promise<string>,
  projectId: string
): Promise<{
  members: ProjectMember[];
  candidates: TeamUserCandidate[];
  permissions: ProjectAccessPermissions;
  canManageTeam: boolean;
  ownerUserId: string | null;
}> {
  const res = await authFetch(getToken, `/api/projects/${projectId}/members`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load team");
  return data;
}

export async function addProjectMember(
  getToken: () => Promise<string>,
  projectId: string,
  userId: string,
  permissions: Partial<ProjectAccessPermissions>
): Promise<ProjectMember> {
  const res = await authFetch(getToken, `/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, permissions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to add member");
  return data.member;
}

export async function updateProjectMemberPermissions(
  getToken: () => Promise<string>,
  projectId: string,
  userId: string,
  permissions: Partial<ProjectAccessPermissions>
): Promise<void> {
  const res = await authFetch(getToken, `/api/projects/${projectId}/members`, {
    method: "PATCH",
    body: JSON.stringify({ userId, permissions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update member");
}

export async function removeProjectMember(
  getToken: () => Promise<string>,
  projectId: string,
  userId: string
): Promise<void> {
  const res = await authFetch(getToken, `/api/projects/${projectId}/members?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to remove member");
}

export async function fetchScriptSharing(
  getToken: () => Promise<string>,
  sessionId: string
): Promise<{
  members: ResourceMember[];
  candidates: TeamUserCandidate[];
  canManageSharing: boolean;
  linkedProjectId: string | null;
}> {
  const res = await authFetch(getToken, `/api/script-writer/sessions/${sessionId}/members`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load sharing");
  return data;
}

export async function shareScriptSession(
  getToken: () => Promise<string>,
  sessionId: string,
  userId: string
): Promise<ResourceMember> {
  const res = await authFetch(getToken, `/api/script-writer/sessions/${sessionId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to share script");
  return data.member;
}

export async function unshareScriptSession(
  getToken: () => Promise<string>,
  sessionId: string,
  userId: string
): Promise<void> {
  const res = await authFetch(
    getToken,
    `/api/script-writer/sessions/${sessionId}/members?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to remove access");
}

export { PROJECT_ACCESS_LABELS };
export type { ProjectAccessArea, ProjectAccessPermissions, ProjectMember };
