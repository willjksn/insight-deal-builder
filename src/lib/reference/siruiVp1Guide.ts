import { ReferenceSection } from "@/lib/reference/types";

/** Sirui VP-1 Vision Prime full-frame cine 6-lens set — IMG / ShootSpine kit. */
export const SIRUI_VP1_SECTIONS: ReferenceSection[] = [
  {
    id: "sirui-vp1-kit",
    category: "lenses",
    title: "Sirui VP-1 Vision Prime — 6-lens set",
    summary:
      "House cine primes: 15 T1.6 · 24/35/50/75 T1.4 · 150 T4 macro. Native Sony E, matched gears for Nucleus-M II.",
    keywords: [
      "Sirui",
      "VP-1",
      "Vision Prime",
      "cine",
      "T1.4",
      "15mm",
      "24mm",
      "35mm",
      "50mm",
      "75mm",
      "150mm",
      "macro",
      "E-mount",
    ],
    body: `IMG kit: Sirui VP-1 Vision Prime full-frame cine 6-lens set. Native Sony E-mount (swap RF / Z / L modules if a body is not Sony). 0.8 MOD focus and iris gears sit in the same position across the set — mount Nucleus-M II motors once and swap glass without moving the motor.

These are cine lenses: iris is mechanical (T-stop on the barrel). The Sony body will not drive aperture electronically — set T-stop on the ring or with a Nucleus iris motor. No electronic focus either; pull by hand or with the FIZ.

46mm image circle covers full-frame FX6 / FX5 / FX3 / a7IV and FX30 Super 35 (APS-C). On FX30, multiply focal length by ~1.5 for field of view.

Official T-stops (use these, not mixed retail copy): 15mm is T1.6, 75mm is T1.4, 150mm is T4. 24 / 35 / 50 are T1.4.`,
    tips: [
      "Matched color and gear position — pick focal length for story, not because one lens “looks different”",
      "T1.4 is thin: confirm eye focus on a monitor, then set Nucleus A/B marks before the take",
      "15mm uses 77mm filters; the rest of the set is 67mm — do not grab the wrong ND stack",
    ],
    tables: [
      {
        headers: ["Lens", "T-stop", "FX30 equiv.", "Grab for", "MFD", "Filter"],
        rows: [
          [
            "15mm T1.6",
            "T1.6–T16",
            "~22.5mm",
            "Establish, architecture, tight rooms, gimbal wide, POV",
            "0.30 m / 1.0 ft",
            "77mm",
          ],
          [
            "24mm T1.4",
            "T1.4–T16",
            "~36mm",
            "Wide masters, walk-and-talk, interiors, documentary",
            "0.26 m / 0.85 ft",
            "67mm",
          ],
          [
            "35mm T1.4",
            "T1.4–T16",
            "~52.5mm",
            "Natural dialogue, home interiors, versatile A-cam",
            "0.30 m / 1.0 ft",
            "67mm",
          ],
          [
            "50mm T1.4",
            "T1.4–T16",
            "~75mm",
            "Close-ups, creator, interviews at desk distance",
            "0.43 m / 1.4 ft",
            "67mm",
          ],
          [
            "75mm T1.4",
            "T1.4–T16",
            "~112mm",
            "Beauty, reactions, isolation, compressed portraits",
            "0.75 m / 2.5 ft",
            "67mm",
          ],
          [
            "150mm T4 Macro 1.5×",
            "T4–T22",
            "~225mm",
            "Product, inserts, texture, compressed tele, 1.5× macro",
            "0.29 m / 0.95 ft",
            "67mm",
          ],
        ],
      },
      {
        headers: ["Look / job", "Start with", "T-stop start", "Notes"],
        rows: [
          ["Interview / corporate", "50mm (FX6/FX3) · 35mm if tight room", "T2.8–T4", "Safer focus than wide open; still separates the wall"],
          ["Podcast / talking head", "35mm or 50mm", "T2–T2.8", "4–6 ft typical; 75mm if you have the throw"],
          ["Cinematic drama", "35mm master · 50–75mm CU", "T1.4–T2.8", "Wide open only when eyes are marked"],
          ["Horror / thriller", "24mm wide · 50mm uneasy CU", "T2–T2.8", "15mm for hallways and vulnerability"],
          ["Beauty / glam", "75mm or tight 50mm", "T1.4–T2.8", "Watch breathing and eye focus"],
          ["Documentary / run-gun", "24mm or 35mm", "T2.8–T4", "More DOF; Nucleus if you cannot reach the barrel"],
          ["Gimbal (FX30)", "15mm or 24mm", "T2.8–T4", "Mount motors before balance; 75/150 are long for RS 4 Pro walks"],
          ["Product / insert", "150mm macro · 24mm if you need context", "T4–T8", "1.5× at 0.29 m — lock the camera, pull with Nucleus"],
        ],
      },
      {
        headers: ["Spec", "Value"],
        rows: [
          ["Format", "Full-frame (46mm image circle — open gate OK)"],
          ["Mount", "Native Sony E · user-changeable RF / Nikon Z / L"],
          ["Gears", "0.8 MOD focus + iris, matched position across the set"],
          ["Focus throw", "270° dual scale (imperial / metric)"],
          ["Front / gear OD", "75.2 mm (swap lenses without moving motors)"],
          ["Weight (E, approx.)", "15: 607 g · 24: 597 g · 35: 590 g · 50: 599 g · 75: 599 g · 150: 715 g"],
          ["Iris blades", "15/24/35: 12 · 50/75: 18 · 150: 13"],
        ],
      },
    ],
  },
  {
    id: "sirui-vp1-onset",
    category: "lenses",
    title: "VP-1 on-set habits",
    summary: "T-stop vs camera, FX30 crop, filters, Nucleus pairing, and when not to shoot wide open.",
    keywords: ["VP-1", "T-stop", "filter", "Nucleus", "FX30", "focus"],
    body: `T-stop is transmission, not the f-number on a stills lens. Light and match exposure by T-stop across the set — a 35mm T2.8 and a 50mm T2.8 should land close on the waveform.

Sony FX6 / FX3 / FX30: set iris on the lens (or Nucleus), not in the camera menu. Confirm the body is not hunting AF. Manual focus on cine glass.

Wide open (T1.4 / T1.6): eyes only, marks, and a monitor. Interviews, two-shots, and walking masters start at T2.8–T4 unless the look demands thin DOF.

Filters: 15mm is 77mm; everything else is 67mm. Matte box with 0.8 MOD iris/focus is cleaner than stacking 67mm screws on a follow-focus day.

Nucleus-M II: mesh the 0.8 MOD motor gear to the VP-1 focus gear (cine lenses have hard stops — CAL / auto-calibrate). Add a second motor on iris when the operator cannot reach the barrel (gimbal, Steadicam, remote). Ultimate Kit ships two motors — typical day is focus + iris; zoom motor is only needed if you add a cine zoom.

Change lens: gears match, so leave motors on the rods. Recalibrate after every swap. Rebalance the RS 4 Pro after any VP-1 swap — 150mm is ~120 g heavier and much longer than the 24–75 group.`,
    tips: [
      "Do not mix 15mm 77mm NDs onto 24–150 without a step ring — keep two labeled filter pouches",
      "150mm T4 is slower: add light or raise EI; do not underexpose log to “make it dark”",
    ],
    tables: [
      {
        headers: ["Check", "Do this"],
        rows: [
          ["Before roll", "Confirm T-stop on barrel, Nucleus mapped, A/B if racking"],
          ["Lens swap", "Caps on · motors stay · CAL · waveform match to previous T-stop"],
          ["FX30 gimbal", "Balance with this VP-1 + motors + ND already on"],
          ["Multi-cam", "Same T-stop and focal-length intent — 50mm FF ≠ 50mm on FX30"],
        ],
      },
    ],
  },
];
