import { ReferenceSection } from "@/lib/reference/types";

/** DJI RS 4 Pro / Ronin setup — balancing and smooth-shot settings for IMG gimbal cams (often FX30). */
export const GIMBAL_GUIDE_SECTIONS: ReferenceSection[] = [
  {
    id: "dji-rs4-pro-setup",
    category: "movement",
    title: "DJI RS 4 Pro — mount & balance",
    summary:
      "Power off → mount camera → balance tilt → tilt depth → roll → pan → Auto Tune. Rebalance after TC-1, mic, or lens changes.",
    keywords: [
      "DJI",
      "Ronin",
      "RS4",
      "RS 4 Pro",
      "gimbal",
      "balance",
      "FX30",
      "Auto Tune",
    ],
    body: `IMG kit note: Sony FX30 commonly rides the RS 4 Pro. Menu labels may vary by firmware — confirm against the current DJI RS 4 Pro manual.

## Before you balance

1. Mount all shoot weight first — lens, ND, cage, monitor, TC-1, cables, mic — then balance. Adding gear later breaks balance.
2. If using an optical zoom / varifocal: power the camera ON and set the focal length you will shoot before balancing.
3. Gimbal must be powered OFF or in sleep while balancing.
4. Lock each finished axis before unlocking the next.

## Horizontal balance order (required)

Balance in this order only:

### 1) Vertical tilt
- Unlock tilt.
- Point the lens straight up.
- If top-heavy → slide camera backward on the mounting plate. If bottom-heavy → slide forward.
- Tighten the plate. Done when the camera stays pointing up without falling.

### 2) Tilt depth (front / back)
- Point the lens forward (horizon).
- If front-heavy → move camera back (fine knob / lower QR plate). If back-heavy → move forward.
- Lock the plate. Done when the camera stays put when tilted ~45° up or down.
- Lock the tilt axis.

### 3) Roll
- Unlock roll (support the arm lightly).
- If it rolls left → slide camera right. If it rolls right → slide left.
- Lock roll. Done when the camera sits level and does not drift.

### 4) Pan
- Unlock pan.
- Hold the grip, tilt the whole gimbal forward so the pan arm is roughly parallel to you.
- If the lens swings left → push the pan arm right. If it swings right → push left.
- Lock pan. Done when the camera stays steady while you rotate / tilt the grip.

## After balance — Auto Tune (do not skip)

1. Place the gimbal on a steady flat surface — do not hold it or walk during tune.
2. Power on (hold power ~2 s). Axes unlock.
3. Start Auto Tune: hold M + trigger, or use the touchscreen Auto Tune page.
4. On RS 4 Pro, choose Handheld for most walking/narrative work (Car Mount only for vehicle / harsh vibration).
5. Wait until finished. Motors will shake/noise during calibration — normal.
6. Check Balance Status (tilt ~15° left/right): green/gray = good · yellow = slight imbalance · red = rebalance that axis.

## Vertical shooting

Rebalance tilt and roll for vertical. Tilt depth and pan often carry over from horizontal — still verify with a short walk test.

## Always rebalance when

- You change lens, add ND, cage, monitor, TC-1, lav, or cables
- You switch horizontal ↔ vertical
- Motors whine, drift, or Auto Tune shows yellow/red`,
    tips: [
      "Unbalanced gimbal = soft footage, hot motors, short battery — fix balance before chasing settings",
      "After mounting TC-1 on FX30: short flexible cable + strain relief, then rebalance and Auto Tune again",
    ],
    tables: [
      {
        headers: ["Step", "Axis", "Pass test"],
        rows: [
          ["1", "Vertical tilt", "Lens up — camera stays put"],
          ["2", "Tilt depth", "Lens forward — holds at ~45° tilt"],
          ["3", "Roll", "Horizon stays level — no left/right drift"],
          ["4", "Pan", "Steady when grip is tilted / rotated"],
          ["5", "Auto Tune", "Balance status green/gray; Handheld mode for walk"],
        ],
      },
    ],
  },
  {
    id: "dji-rs4-pro-smooth-settings",
    category: "movement",
    title: "DJI RS 4 Pro — settings for smooth shots",
    summary:
      "PF mode, moderate speed, higher smoothness, Orbit Follow for arcs, soft knees, no stick fighting.",
    keywords: [
      "RS4",
      "smooth",
      "Pan Follow",
      "Orbit Follow",
      "stiffness",
      "follow mode",
      "walking shot",
    ],
    body: `Balance + Auto Tune first. Settings cannot fix a bad balance.

## Follow modes (touchscreen / M button)

| Mode | Use |
| --- | --- |
| Pan Follow (PF) | Default for walking / following talent — pan follows grip; tilt & roll locked for a level horizon |
| Lock | Static framing while you walk — horizon locked; use for push-ins / reveal without reframing |
| FPV / 3D / PTF | Only when you want the shot to tilt/roll with you — not for "smooth cinematic" walk |

For most IMG narrative / b-roll: start in Pan Follow.

## Smooth-shot control recipe

Touchscreen / Ronin app — joystick & follow feel:

- Speed / Max Speed: start Low–Medium. Fast stick = jerky reframes.
- Smoothness: raise it for softer starts/stops (higher = gentler; too low = twitchy).
- Deadband: a little higher reduces accidental micro-moves from hand shake on the stick.
- Endpoints: keep sane tilt limits so you do not slam into hard stops mid-take.

Orbit Follow (system settings): turn ON for arc / orbit moves around a subject — smoother curved paths.

Stiffness (after Auto Tune):
- If the image still wobbles under walk → raise stiffness slightly.
- If motors buzz / fight / micro-shake → lower stiffness and re-check balance.

## Operator technique (as important as settings)

1. Soft knees, chest-level gimbal, elbows in — do not "steer" with hard wrists.
2. Walk heel-to-toe; keep the handle height steady.
3. Lead the talent — do not chase with whip pans.
4. Spotter when walking backward.
5. Rehearse the path once without rolling; then roll.

## Camera settings that help the gimbal look smooth

- Prefer 24p / 23.976 with 1/48–1/50 shutter for natural motion blur (match project).
- Avoid ultra-wide + heavy ND stacks that unbalance mid-day.
- IBIS: often OFF or reduced on gimbal to avoid fighting motors (test your FX30 firmware — pick what looks cleaner on a walk test).
- Manual focus or reliable AF — focus hunting reads as "unstabilized."

## Quick pre-roll checklist

1. Balance status green
2. Auto Tune done for this payload
3. PF mode (or Lock if needed)
4. Speed moderate · Smoothness comfortable
5. Orbit Follow ON if arcs
6. Cables clear of motors
7. 10-second walk test before the take`,
    tips: [
      "If it shakes: rebalance → Auto Tune → lower speed → raise smoothness — in that order",
      "Do not fix a soft walk by cranking motor strength — that usually makes it worse",
    ],
  },
];
