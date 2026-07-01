import { NextRequest, NextResponse } from "next/server";
import { apiErrorStatus, assertCanUseShotScout, requireApprovedAuthUser } from "@/lib/api/routeAuth";
import { cineScoutSuggestGear } from "@/lib/scout/cineScoutAi";
import { ScoutSessionFormValues } from "@/lib/scout/sessionForm";
import { loadGearList, loadGearProfileForProject } from "@/lib/scout/scoutAdminGear";

export const runtime = "nodejs";

type SuggestGearBody = {
  sceneIdea: string;
  sceneType: string;
  mood: string;
  theme?: string;
  platform: string;
  aspectRatio: string;
  skillLevel: string;
  preferredLook: string;
  selectedGearProfileId?: string;
  cameraBody?: string;
  lensOptions?: string;
  lightingGear?: string;
  audioGear?: string;
  stabilizationGear?: string;
};

export async function POST(request: NextRequest) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseShotScout(appUser);

    const body = (await request.json()) as SuggestGearBody;
    if (!body.sceneIdea?.trim()) {
      return NextResponse.json({ error: "Scene idea is required" }, { status: 400 });
    }

    const profileId = body.selectedGearProfileId?.trim();
    const gearProfile = profileId
      ? await loadGearProfileForProject(uid, { selectedGearProfileId: profileId })
      : null;
    const gearList = await loadGearList(uid);

    const suggestion = await cineScoutSuggestGear(
      body as Pick<
        ScoutSessionFormValues,
        | "sceneIdea"
        | "sceneType"
        | "mood"
        | "theme"
        | "platform"
        | "aspectRatio"
        | "skillLevel"
        | "preferredLook"
        | "cameraBody"
        | "lensOptions"
        | "lightingGear"
        | "audioGear"
        | "stabilizationGear"
      >,
      gearProfile,
      gearList
    );
    return NextResponse.json({ ok: true, suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gear suggestion failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
