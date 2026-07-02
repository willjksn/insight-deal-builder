export type ProductionChecklistMode = "portfolio" | "client";

export type ProductionChecklistPhase =
  | "prepro_business"
  | "prepro_creative"
  | "production"
  | "post";

export interface ProductionChecklistItem {
  id: string;
  stepKey: string;
  label: string;
  hint?: string;
  phase: ProductionChecklistPhase;
  /** Only shown in client project mode */
  clientOnly?: boolean;
  done: boolean;
  notes?: string;
  sortOrder: number;
}

export const CHECKLIST_PHASE_LABELS: Record<ProductionChecklistPhase, string> = {
  prepro_business: "Pre-production — Business",
  prepro_creative: "Pre-production — Creative",
  production: "Production",
  post: "Post-production",
};

const PHASE_ORDER: ProductionChecklistPhase[] = [
  "prepro_business",
  "prepro_creative",
  "production",
  "post",
];

function item(
  stepKey: string,
  label: string,
  phase: ProductionChecklistPhase,
  sortOrder: number,
  options?: { hint?: string; clientOnly?: boolean }
): ProductionChecklistItem {
  return {
    id: stepKey,
    stepKey,
    label,
    phase,
    sortOrder,
    done: false,
    ...(options?.hint ? { hint: options.hint } : {}),
    ...(options?.clientOnly ? { clientOnly: true } : {}),
  };
}

/** Shared creative + production + post steps (always visible). */
function coreChecklistItems(mode: ProductionChecklistMode): ProductionChecklistItem[] {
  const scopeLabel =
    mode === "client"
      ? "Deal & scope"
      : "Scope for you";
  const scopeHint =
    mode === "client"
      ? "Quick quote or agreement — fee, deliverables, shoot & delivery dates."
      : "What you are making: e.g. 60s fake trailer, 3 reels, BTS optional.";

  return [
    item("scope", scopeLabel, "prepro_creative", 10, { hint: scopeHint }),
    item("concept_script", "Concept & script", "prepro_creative", 20, {
      hint: "One-line concept, beats or full script — Script writer or notes.",
    }),
    item("visual_plan", "Visual plan", "prepro_creative", 30, {
      hint: "Shot Scout: location photos, shot list, DP plan, previs.",
    }),
    item("schedule", "Schedule & logistics", "prepro_creative", 40, {
      hint: "Shoot day, shot order, locations, talent/crew if any.",
    }),
    item("gear", "Gear & look", "prepro_creative", 50, {
      hint: "Camera, lenses, light, audio; frame rate, aspect, grade references.",
    }),
    item("ready_to_shoot", "Ready to shoot", "prepro_creative", 60, {
      hint: "Script + shot list + gear packed; reference clips saved.",
    }),
    item("shoot", "Shoot day", "production", 70, {
      hint: "Run call sheet order; circle must-get shots.",
    }),
    item("media_backup", "Media handoff", "production", 80, {
      hint: "Cards copied, renamed by setup, backed up same day.",
    }),
    item("edit", "Edit & grade", "post", 90, {
      hint: mode === "client"
        ? "Rough → client review → revisions within agreement."
        : "Assembly → rhythm pass → show a friend for one revision.",
    }),
    item("sound_polish", "Sound & polish", "post", 100, {
      hint: "SFX, score, mix; captions for reels.",
    }),
    item(
      "delivery",
      mode === "client" ? "Delivery & sign-off" : "Publish & portfolio",
      "post",
      110,
      {
        hint:
          mode === "client"
            ? "Final exports, client approval, archive, invoice if needed."
            : "Export 9:16 + 16:9, post, add to reel; note what to repeat next time.",
      }
    ),
  ];
}

function clientBusinessItems(): ProductionChecklistItem[] {
  return [
    item("client_linked", "Client & project linked", "prepro_business", 1, {
      hint: "Client profile on project; contacts for approvals.",
      clientOnly: true,
    }),
    item("fee_agreement", "Fee & agreement", "prepro_business", 2, {
      hint: "Signed agreement or internal OK; deposit received if required.",
      clientOnly: true,
    }),
    item("usage_revisions", "Usage & revisions", "prepro_business", 3, {
      hint: "Usage rights, revision rounds, and change-order rules clear.",
      clientOnly: true,
    }),
    item("spec_rights", "Music & asset rights", "prepro_business", 4, {
      hint: "Royalty-free music, stock, and AI assets cleared for publish.",
      clientOnly: false,
    }),
  ];
}

export function buildChecklistForMode(
  mode: ProductionChecklistMode,
  existing?: ProductionChecklistItem[]
): ProductionChecklistItem[] {
  const progress = new Map(
    (existing ?? []).map((i) => [i.stepKey, { done: i.done, notes: i.notes }])
  );

  const business =
    mode === "client"
      ? clientBusinessItems().filter((i) => i.clientOnly)
      : [clientBusinessItems().find((i) => i.stepKey === "spec_rights")!];

  const core = coreChecklistItems(mode);

  return [...business, ...core].map((template) => {
    const saved = progress.get(template.stepKey);
    return {
      ...template,
      id: template.stepKey,
      done: saved?.done ?? false,
      ...(saved?.notes !== undefined ? { notes: saved.notes } : {}),
    };
  });
}

export function resolveChecklistModeForProject(project: {
  agreementType: "internal_collaboration" | "client_project";
  clientId?: string;
  clientName?: string;
}): ProductionChecklistMode {
  if (project.agreementType === "client_project") return "client";
  if (project.clientId?.trim() || project.clientName?.trim()) return "client";
  return "portfolio";
}

export function isClientStyleProject(project: {
  agreementType: "internal_collaboration" | "client_project";
  clientId?: string;
  clientName?: string;
}): boolean {
  return resolveChecklistModeForProject(project) === "client";
}

export function defaultChecklistForProject(project: {
  agreementType: "internal_collaboration" | "client_project";
  clientId?: string;
  clientName?: string;
}): { mode: ProductionChecklistMode; items: ProductionChecklistItem[] } {
  const mode = resolveChecklistModeForProject(project);
  return { mode, items: buildChecklistForMode(mode) };
}

export type ChecklistAutoSignals = {
  hasClient?: boolean;
  hasAgreement?: boolean;
  hasSignedAgreement?: boolean;
  hasScript?: boolean;
  hasScout?: boolean;
  hasSchedule?: boolean;
  hasGear?: boolean;
  hasShots?: boolean;
  allShotsCaptured?: boolean;
};

export function buildChecklistAutoSignals(opts: {
  project: {
    clientId?: string;
    clientName?: string;
    totalProjectFee?: number;
  };
  board: {
    scriptSessionId?: string;
    scriptFountain?: string;
    linkedScoutProjectIds?: string[];
    gearItems?: string[];
    productionDays?: { shootDate?: string; schedule?: unknown[]; shots?: { done: boolean }[] }[];
  };
  hasScoutSessions: boolean;
  agreement?: { status: string } | null;
}): ChecklistAutoSignals {
  const dayOne = opts.board.productionDays?.[0];
  const shots = dayOne?.shots ?? [];
  const signed =
    opts.agreement?.status === "signed" || opts.agreement?.status === "completed";

  return {
    hasClient: Boolean(opts.project.clientId?.trim() || opts.project.clientName?.trim()),
    hasAgreement: Boolean(opts.agreement),
    hasSignedAgreement: signed,
    hasScript: Boolean(opts.board.scriptSessionId || opts.board.scriptFountain?.trim()),
    hasScout:
      opts.hasScoutSessions ||
      (opts.board.linkedScoutProjectIds?.length ?? 0) > 0,
    hasSchedule: Boolean(
      dayOne?.shootDate?.trim() || (dayOne?.schedule?.length ?? 0) > 0
    ),
    hasGear: (opts.board.gearItems?.length ?? 0) > 0,
    hasShots: shots.length > 0,
    allShotsCaptured: shots.length > 0 && shots.every((s) => s.done),
  };
}

const AUTO_CHECK_BY_STEP: Partial<Record<string, keyof ChecklistAutoSignals>> = {
  client_linked: "hasClient",
  fee_agreement: "hasSignedAgreement",
  usage_revisions: "hasAgreement",
  scope: "hasAgreement",
  concept_script: "hasScript",
  visual_plan: "hasScout",
  schedule: "hasSchedule",
  gear: "hasGear",
  ready_to_shoot: "hasShots",
  shoot: "allShotsCaptured",
};

/** Mark checklist steps done when project data supports them (never unchecks). */
export function applyChecklistAutoChecks(
  items: ProductionChecklistItem[],
  signals: ChecklistAutoSignals
): ProductionChecklistItem[] {
  return items.map((item) => {
    const signalKey = AUTO_CHECK_BY_STEP[item.stepKey];
    if (item.done) return item;
    if (
      item.stepKey === "scope" &&
      !signals.hasAgreement &&
      signals.hasScript
    ) {
      return { ...item, done: true };
    }
    if (signalKey && signals[signalKey]) {
      return { ...item, done: true };
    }
    return item;
  });
}

export function checklistItemsByPhase(
  items: ProductionChecklistItem[],
  mode: ProductionChecklistMode
): { phase: ProductionChecklistPhase; label: string; items: ProductionChecklistItem[] }[] {
  const visible = items.filter((i) => !i.clientOnly || mode === "client");
  return PHASE_ORDER.map((phase) => ({
    phase,
    label: CHECKLIST_PHASE_LABELS[phase],
    items: visible
      .filter((i) => i.phase === phase)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter((group) => group.items.length > 0);
}

export function checklistProgress(items: ProductionChecklistItem[], mode: ProductionChecklistMode) {
  const visible = items.filter((i) => !i.clientOnly || mode === "client");
  const done = visible.filter((i) => i.done).length;
  return { done, total: visible.length };
}

/** Filled walkthrough — 90s fake horror trailer spec piece. */
export const PORTFOLIO_CHECKLIST_EXAMPLE: {
  title: string;
  subtitle: string;
  mode: ProductionChecklistMode;
  entries: { stepKey: string; done: boolean; notes: string }[];
} = {
  title: "Example: 90s fake horror trailer",
  subtitle: "Spec / portfolio piece — cinematic fake movie trailer for your reel",
  mode: "portfolio",
  entries: [
    {
      stepKey: "spec_rights",
      done: true,
      notes: "Epidemic Sound trial track cleared; no recognizable logos in frame.",
    },
    {
      stepKey: "scope",
      done: true,
      notes:
        "Deliverables: 1× 45–60s trailer (16:9), 2× 15s teases (9:16), optional 30s BTS montage.",
    },
    {
      stepKey: "concept_script",
      done: true,
      notes:
        "Concept: “Camp Redwood ‘94” — summer camp slasher that never existed. Beats: idyllic opening → wrong turn → stinger title card “THIS SUMMER…”. Script: VO lines + 8 scene headings, no dialogue.",
    },
    {
      stepKey: "visual_plan",
      done: true,
      notes:
        "Scout: backyard + wooded path at golden hour. Must shots: wide establishing, POV run, flashlight under chin, fake blood insert, title card plate. Refs: Scream trailer ’96, Friday the 13th Part VI color.",
    },
    {
      stepKey: "schedule",
      done: true,
      notes:
        "Single half-day (4 hrs): 1 hr setup, 2 hrs scenes A–F in location order, 1 hr pickup/title card. Solo + one friend for silhouette shot.",
    },
    {
      stepKey: "gear",
      done: true,
      notes:
        "BMPCC 6K, 24–70 + 50/1.4, ND, small LED + haze in a bag, shotgun + lav. Shoot 24fps, 2.39 crop in post, grain overlay in grade.",
    },
    {
      stepKey: "ready_to_shoot",
      done: true,
      notes: "Shot list printed; fog machine tested; fake title PNG ready; batteries charged.",
    },
    {
      stepKey: "shoot",
      done: false,
      notes: "Circle must-gets: POV run, stinger scream, title reveal.",
    },
    {
      stepKey: "media_backup",
      done: false,
      notes: "Rename: CAMA_Scene01_Setup, etc. Duplicate to SSD before edit.",
    },
    {
      stepKey: "edit",
      done: false,
      notes: "Tease-cut structure: 5 fast hits → blackout → title → 3s tag. One friend review pass.",
    },
    {
      stepKey: "sound_polish",
      done: false,
      notes: "Whoosh + sting library; low drone under VO; loudness -14 LUFS for social.",
    },
    {
      stepKey: "delivery",
      done: false,
      notes: "Export ProRes master + H.264 reels; post to IG/TikTok; add to portfolio reel PDF.",
    },
  ],
};

export function applyChecklistExample(
  items: ProductionChecklistItem[],
  example: typeof PORTFOLIO_CHECKLIST_EXAMPLE
): ProductionChecklistItem[] {
  const byKey = new Map(example.entries.map((e) => [e.stepKey, e]));
  return items.map((item) => {
    const sample = byKey.get(item.stepKey);
    if (!sample) return item;
    return { ...item, done: sample.done, notes: sample.notes };
  });
}
