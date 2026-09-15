import { ReferenceSection } from "@/lib/reference/types";

/** Tilta Nucleus-M II Ultimate Kit — wireless FIZ for IMG / ShootSpine. */
export const NUCLEUS_M2_SECTIONS: ReferenceSection[] = [
  {
    id: "nucleus-m2-kit",
    category: "movement",
    title: "Tilta Nucleus-M II — Ultimate Kit",
    summary:
      "Wireless FIZ: hand unit, dual grips, two motors. Focus / iris / zoom / ND up to four channels. Pairs with VP-1 0.8 MOD gears.",
    keywords: [
      "Tilta",
      "Nucleus",
      "Nucleus-M II",
      "Nucleus-M2",
      "FIZ",
      "follow focus",
      "wireless",
      "motor",
      "handwheel",
    ],
    body: `IMG kit: Tilta Nucleus-M II Wireless Lens Control System Ultimate Kit (WLC-T06) — FIZ hand unit, left + right hand grips, two motors, 0.5 / 0.8 MOD gears, 15mm + 19mm rod mounts, cables, marking disks, monitor / baby-pin mounts, hard case.

This is the Nucleus-M II, not the Nano II. The M II FIZ unit has a 2.4" color touchscreen, detachable handwheel, electronic marking disk, and NP-F550 power. Nano II is a smaller 1.6" wheel — different kit.

Four channels: Focus, Iris, Zoom, and a fourth motor on Tilta Mirage VND. Ultimate Kit includes two motors — run focus + iris on VP-1 primes; add a motor if you need zoom or ND on the same shot.

Motors: ~195 g each, 0.48 Nm at 14.8 V, 0.02 s PID 2.0 response, color LED by function. Power 7.2–24 V via included P-Tap / D-Tap to 7-pin; daisy-chain extra motors with 7-pin cables. No power switch — they draw current whenever D-Tap is live (auto-calibrate ~3 s after power). Prefer camera-switched D-Tap so motors sleep with the body.

Controllers: FIZ hand unit and each grip take one NP-F550 / NP-F570 (not included — 8–12 h typical). Bring charged L-series for the unit and both grips.`,
    tips: [
      "VP-1 cine gears are 0.8 MOD — use the 0.8 gears; 0.5 MOD is for stills rings",
      "Mount motors and cables before RS 4 Pro balance — then Auto Tune",
      "Do not assign the same motor to FIZ and a grip at once — they fight",
    ],
    tables: [
      {
        headers: ["In the Ultimate Kit", "Qty", "On-set use"],
        rows: [
          ["Nucleus-M II motors", "2", "Typical: focus + iris on VP-1"],
          ["0.8 MOD motor gears", "2", "Cinema lenses (VP-1)"],
          ["0.5 MOD motor gear", "1", "Stills / photo lenses with finer pitch"],
          ["15mm rod mounts", "2", "FX6 / FX3 / FX30 cages, RS 4 Pro"],
          ["19mm rod mounts", "2", "Studio 19mm bridgeplate"],
          ["7-pin motor cables", "30 cm + 50 cm", "Daisy-chain second motor"],
          ["P-Tap to 7-pin power", "70 cm", "Motor power from camera / V-mount D-Tap"],
          ["FIZ hand unit", "1", "AC / remote pulls; C-stand via baby pin"],
          ["Hand grips L + R", "1 + 1", "Shoulder / gimbal; zoom module on one grip"],
          ["ARRI rosette adapters", "2", "Rosette cages, gimbal handles"],
          ["Marking disks + e-disk", "5 + 1", "Paper disks or electronic focus scale"],
          ["Monitor bracket + baby pin", "1 + 1", "Wireless RX next to the FIZ"],
        ],
      },
      {
        headers: ["Motor LED", "Channel"],
        rows: [
          ["Purple", "Focus"],
          ["Green", "Iris"],
          ["Blue", "Zoom"],
          ["Yellow", "ND (Mirage VND)"],
        ],
      },
    ],
  },
  {
    id: "nucleus-m2-setup",
    category: "movement",
    title: "Nucleus-M II — mount, pair, calibrate",
    summary:
      "Rods → mesh 0.8 gear → D-Tap power → CAL → map VP-1 → A/B marks. Handles need FIZ set Inactive.",
    keywords: [
      "calibrate",
      "CAL",
      "pair",
      "D-Tap",
      "A/B",
      "lens mapping",
      "handles",
    ],
    body: `## Mount

1. 15mm rods on the cage or matte-box rods. Clamps open fully — no need to strip the matte box.
2. Mesh the 0.8 MOD gear so teeth fully engage the VP-1 focus (or iris) gear — not riding the edge.
3. Default motor direction is clockwise from the operator side. If the motor is on the far side of the lens, reverse direction in the motor / FIZ menu.
4. Power: D-Tap → first motor; 7-pin → second motor. Confirm 7.2–24 V. Strain-relief on gimbal.

## Power on and calibrate (cine / VP-1)

Hold REC on the FIZ to power on. Motors auto-calibrate a few seconds after D-Tap (disable in menu if you need to mesh first).

Hard stops (VP-1): hold CAL on the FIZ until calibrate options appear — all motors or one by number. The motor runs to both ends and sets range.

Stills lenses without hard stops: Function menu → manual / force calibrate. Map min/max by hand. Settings persist after power-down.

## Lens mapping (do this once per VP-1)

Menu → Lens → add brand Sirui, series VP-1, focal length. Map focus (and iris if motored). Save. Up to 128 presets. Recall after a lens swap instead of retyping distances.

A/B marks: hold MARK, pull to the other end, release. White bar on the electronic disk. Hold DEL to clear.

Handwheel damping: set resistance so a 270° VP-1 throw feels controllable. Smoothness on the motor: start ~1–20% so starts/stops are not snappy.

## Grips vs FIZ

FIZ is Master when ACTIVE. To use left/right grips: power the grips first, then double-click FUNC on the FIZ to set Inactive (slave). One motor = one controller. Tripod grip + camera grip on the same axis will glitch the motor.

Zoom rocker on the grip (or FIZ zoom toggle) can be assigned to iris if you only have two motors and want a smoother iris than the side slider.

## Camera run/stop and settings

Optional 7-pin run/stop cables (sold separately) from a motor to the camera R/S or USB-C. Sony FX6 is supported with the correct cable; FX3 / FX30 often use USB-C / Multi depending on the Tilta SKU — confirm the cable in the case before the shoot.

Bluetooth / cable camera control (ISO, WB, shutter) varies by body and firmware. Treat it as a convenience, not a replacement for locking camera settings in the look recipe.

DJI RS 4 Pro: FIZ can drive DJI Focus motors through Tilta’s Wireless Receiver Module for Ronin (optional). If you only have Nucleus motors on the gimbal, skip the DJI motor.

## Pre-roll

1. D-Tap live, motors CAL’d for this lens
2. Correct VP-1 preset loaded
3. A/B if you are racking
4. FIZ Active or grips Inactive — not both on one axis
5. Cables clear of RS 4 Pro motors
6. Rebalance + Auto Tune if anything was added
7. 5-second pull test on the monitor`,
    tips: [
      "If control is stuck on the grips: FUNC to Active, or factory reset the FIZ as last resort",
      "Keep torque Low unless a stiff stills ring needs more — VP-1 does not",
      "Firmware: USB-C on the FIZ — update before a show day, not on set",
    ],
    tables: [
      {
        headers: ["FIZ control", "Does"],
        rows: [
          ["Handwheel", "Focus (or reassigned axis)"],
          ["Side slider", "Iris or ND"],
          ["Zoom toggle", "Zoom — or iris if you prefer it to the slider"],
          ["REC (short)", "Run/stop on compatible cameras"],
          ["REC (hold)", "Power FIZ on/off"],
          ["CAL (hold)", "Calibrate motors"],
          ["MARK / DEL", "Set / clear A-B range"],
          ["FUNC (double)", "Active ↔ Inactive (handles take over)"],
        ],
      },
    ],
  },
];
