"use client";

import { cn } from "@/lib/utils/cn";

/** Master signal flow — FX3/FX30/F8n + TC-1 + mics */
export function ProductionSoundSignalFlow() {
  return (
    <div className="my-4 space-y-4" aria-label="Production sound signal flow diagram">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Picture + timecode</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FlowCard label="Sony FX3" sub="Main camera" outputs={["Deity TC-1 → FX3", "Timecode-sync picture", "MKE400 scratch audio"]} />
          <FlowCard label="Sony FX30" sub="DJI RS4 Pro / gimbal" outputs={["Deity TC-1 → FX30", "Timecode-sync picture", "Scratch audio optional"]} />
        </div>
      </div>
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Master audio — Zoom F8n Pro</p>
        <div className="space-y-2 text-sm text-slate-700">
          <Row from="Deity TC-1 (F8N)" to="F8n Pro TIME CODE IN" kind="tc" />
          <Row from="Sennheiser MKE600 (boom)" to="Input 1 — BOOM" kind="audio" />
          <Row from="THEOS Receiver Out A" to="Input 2 — LAV-A" kind="audio" />
          <Row from="THEOS Receiver Out B" to="Input 3 — LAV-B" kind="audio" />
          <Row from="DJI Receiver L" to="Input 4 — DJI-A" kind="audio" />
          <Row from="DJI Receiver R" to="Input 5 — DJI-B" kind="audio" />
          <Row from="Plant / utility mic" to="Inputs 6–8 — PLANT / SPARE" kind="audio" />
        </div>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        Camera microphones are not the primary dialogue source. Final dialogue is recorded on the Zoom F8n Pro and
        synchronized in post using timecode.
      </p>
    </div>
  );
}

/** Top-down sound bag layout */
export function ProductionSoundBagLayout() {
  const zones = [
    { id: "theos", label: "THEOS RX", className: "col-span-1 row-span-1 bg-sky-100 border-sky-300" },
    { id: "f8n", label: "F8N PRO", className: "col-span-2 row-span-2 bg-violet-100 border-violet-400 text-base font-bold" },
    { id: "power", label: "POWER", className: "col-span-1 row-span-1 bg-amber-100 border-amber-300" },
    { id: "lav", label: "LAV KIT", className: "col-span-1 row-span-1 bg-emerald-50 border-emerald-200 text-[10px]" },
    { id: "spares", label: "SPARES", className: "col-span-1 row-span-1 bg-slate-100 border-slate-300 text-[10px]" },
    { id: "media", label: "MEDIA", className: "col-span-1 row-span-1 bg-slate-100 border-slate-300 text-[10px]" },
  ];
  return (
    <div className="my-4" aria-label="Sound bag layout diagram">
      <p className="mb-2 text-xs text-slate-500">Top-down bag layout — operator view</p>
      <div className="grid grid-cols-4 grid-rows-3 gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-3">
        {zones.map((z) => (
          <div
            key={z.id}
            className={cn(
              "flex min-h-[52px] items-center justify-center rounded-lg border-2 px-1 text-center text-xs font-semibold text-slate-800",
              z.className
            )}
          >
            {z.label}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge label="TC — F8N" note="Rear / upper exterior" />
        <Badge label="HEADPHONES" note="Operator side — avoid crossing antennas" />
      </div>
      <ul className="mt-3 space-y-1 text-xs text-slate-600">
        <li>• Front pocket: lav mounts, tape, wind protection, sound reports, sharpies</li>
        <li>• Side pocket: spare batteries, USB-C, backup XLR, TC cables, spare media</li>
        <li>• Keep RF antennas upright; separate power from receiver where practical</li>
      </ul>
    </div>
  );
}

/** Cable routing — audio / timecode / power */
export function ProductionSoundCableRouting() {
  return (
    <div className="my-4 space-y-3" aria-label="Cable routing diagram">
      <CableGroup title="Audio signal" color="border-sky-300 bg-sky-50" lines={[
        "MKE600 → F8n Input 1",
        "THEOS Out A → F8n Input 2",
        "THEOS Out B → F8n Input 3",
        "DJI L → F8n Input 4 · DJI R → F8n Input 5",
        "Plant mic → F8n Input 6",
      ]} />
      <CableGroup title="Timecode" color="border-violet-300 bg-violet-50" lines={[
        "TC-1 FX3 → FX3 timecode input (Sony-compatible adapter)",
        "TC-1 FX30 → FX30 timecode input (verify adapter for your firmware)",
        "TC-1 F8N → F8n Pro TIME CODE IN",
      ]} />
      <CableGroup title="Power" color="border-amber-300 bg-amber-50" lines={[
        "Primary bag battery → F8n Pro DC input",
        "THEOS receiver → supported battery / approved external power",
        "TC-1 → internal battery; USB-C charge between days",
      ]} />
      <p className="text-xs text-slate-500">
        Do not bundle timecode, audio, and power as one tight group. Use hook-and-loop ties and strain relief at every
        connection. Short jumpers: 12–18 in at bag; verify THEOS output connector before ordering cables.
      </p>
    </div>
  );
}

function FlowCard({ label, sub, outputs }: { label: string; sub: string; outputs: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-500">{sub}</p>
      <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
        {outputs.map((o) => (
          <li key={o}>→ {o}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ from, to, kind }: { from: string; to: string; kind: "audio" | "tc" | "power" }) {
  const dot =
    kind === "tc" ? "bg-violet-500" : kind === "power" ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
      <span className="font-medium text-slate-800">{from}</span>
      <span className="text-slate-400">→</span>
      <span className="text-slate-700">{to}</span>
    </div>
  );
}

function Badge({ label, note }: { label: string; note: string }) {
  return (
    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">
      {label} <span className="font-normal text-slate-500">({note})</span>
    </span>
  );
}

function CableGroup({ title, color, lines }: { title: string; color: string; lines: string[] }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", color)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
        {lines.map((l) => (
          <li key={l}>• {l}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProductionSoundSectionExtras({ sectionId }: { sectionId: string }) {
  if (sectionId === "production-sound-home") return <ProductionSoundSignalFlow />;
  if (sectionId === "production-sound-bag-layout") return <ProductionSoundBagLayout />;
  if (sectionId === "production-sound-signal-flow") return <ProductionSoundSignalFlow />;
  if (sectionId === "production-sound-cables") return <ProductionSoundCableRouting />;
  return null;
}
