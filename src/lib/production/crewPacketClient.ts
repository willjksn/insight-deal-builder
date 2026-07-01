import { CrewPrintoutPacket } from "@/lib/production/crewPacketTypes";

export async function generateCrewPacketForDay(
  getToken: () => Promise<string>,
  projectId: string,
  dayId: string,
  scriptSessionId?: string
): Promise<CrewPrintoutPacket> {
  const token = await getToken();
  const res = await fetch(`/api/projects/${projectId}/production/crew-packet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dayId, scriptSessionId }),
  });
  const data = (await res.json()) as { packet?: CrewPrintoutPacket; error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate crew packet");
  }
  if (!data.packet) {
    throw new Error("No crew packet returned");
  }
  return data.packet;
}
