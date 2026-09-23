import type { ShootGuideEquipmentItem, ShootGuideEquipmentPlan, ShootGuideShot } from "@/lib/shootGuide/types";

function rowFor(
  plan: ShootGuideEquipmentPlan | null | undefined,
  shot: ShootGuideShot,
  category: string,
  ideal: string
): ShootGuideEquipmentItem | undefined {
  const items = plan?.items ?? [];
  const id =
    category === "Camera"
      ? shot.cameraId
      : category === "Lens"
        ? shot.lensId
        : shot.supportId;
  return (
    items.find((i) => i.category === category && id && i.ownedCatalogId === id) ||
    items.find((i) => i.category === category && i.ideal === ideal)
  );
}

export function ShootGuideGearMatch({
  shot,
  plan,
  showIdealWhenNotOwned,
  useMyEquipment,
}: {
  shot: ShootGuideShot;
  plan: ShootGuideEquipmentPlan | null | undefined;
  showIdealWhenNotOwned: boolean;
  useMyEquipment: boolean;
}) {
  if (!useMyEquipment) return null;
  const rows = [
    rowFor(plan, shot, "Camera", shot.camera || ""),
    rowFor(plan, shot, "Lens", shot.lens || shot.focalLength || ""),
    rowFor(plan, shot, "Support", shot.support || ""),
  ].filter((r): r is ShootGuideEquipmentItem => Boolean(r && (r.ownedMatch || r.adjustment)));
  if (!rows.length) return null;
  return (
    <div className="space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
      {rows.map((row) => (
        <p key={row.id}>
          <span className="font-semibold text-slate-800">{row.category}</span>
          {row.ownedMatch ? ` · owned ${row.ownedMatch}` : ""}
          {showIdealWhenNotOwned && row.ideal && row.adjustment ? ` · ideal ${row.ideal}` : ""}
          {row.adjustment ? ` — ${row.adjustment}` : ""}
        </p>
      ))}
    </div>
  );
}
