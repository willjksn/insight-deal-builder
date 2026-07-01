"use client";

import { CrewPrintoutPacket } from "@/lib/production/crewPacketTypes";
import { APP_NAME } from "@/lib/brand";

function PageBreak({ screen }: { screen?: boolean }) {
  if (screen) {
    return <hr className="my-10 border-slate-200" aria-hidden />;
  }
  return <div className="crew-packet-page-break" aria-hidden />;
}

function CoverPage({ packet }: { packet: CrewPrintoutPacket }) {
  return (
    <section id="crew-packet-cover" className="crew-packet-page mb-8 scroll-mt-24">
      <header className="border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-tight">{packet.title}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-700">{packet.subtitle}</p>
      </header>
      {packet.premise !== "—" && (
        <p className="mb-4 text-sm leading-relaxed">
          <strong>Premise:</strong> {packet.premise}
        </p>
      )}
      {packet.primaryLocations.length > 0 && (
        <p className="mb-4 text-sm">
          <strong>Primary locations:</strong> {packet.primaryLocations.join(", ")}
        </p>
      )}
      {packet.visualTone !== "—" && (
        <p className="mb-6 text-sm">
          <strong>Visual tone:</strong> {packet.visualTone}
        </p>
      )}
      {packet.beats.length > 0 && (
        <>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            Quick script beats
          </h2>
          <table className="mb-4 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-400">
                <th className="py-1.5 pr-3 w-32">Beat</th>
                <th className="py-1.5">What happens</th>
              </tr>
            </thead>
            <tbody>
              {packet.beats.map((beat, i) => (
                <tr key={i} className="border-b border-slate-200 align-top">
                  <td className="py-1.5 pr-3 font-medium">{beat.beat}</td>
                  <td className="py-1.5">{beat.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function MasterShotList({ packet }: { packet: CrewPrintoutPacket }) {
  return (
    <section id="crew-packet-master" className="crew-packet-page mb-8 scroll-mt-24">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Master shot list</h2>
      {packet.masterShots.length === 0 ? (
        <p className="text-sm text-slate-500">No shots in this packet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-[10px] leading-snug">
          <thead>
            <tr className="border-b border-slate-400 text-[9px] uppercase">
              <th className="py-1 pr-2 w-6">#</th>
              <th className="py-1 pr-2 w-20">Location</th>
              <th className="py-1 pr-2 w-24">Shot</th>
              <th className="py-1 pr-2">Action</th>
              <th className="py-1 w-28">Lighting notes</th>
            </tr>
          </thead>
          <tbody>
            {packet.masterShots.map((shot) => (
              <tr key={shot.shotNumber} className="border-b border-slate-200 align-top">
                <td className="py-1 pr-2">{shot.shotNumber}</td>
                <td className="py-1 pr-2">{shot.location}</td>
                <td className="py-1 pr-2">{shot.shotLabel}</td>
                <td className="py-1 pr-2">{shot.action}</td>
                <td className="py-1">{shot.lightingNotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LightingSection({ packet, screen }: { packet: CrewPrintoutPacket; screen?: boolean }) {
  if (!packet.lightingTargets.length) return null;
  return (
    <>
      <PageBreak screen={screen} />
      <section id="crew-packet-lighting" className="crew-packet-page mb-8 scroll-mt-24">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Lighting targets</h2>
        <table className="w-full border-collapse text-left text-[10px] leading-snug">
          <thead>
            <tr className="border-b border-slate-400 text-[9px] uppercase">
              <th className="py-1 pr-2 w-28">Setup</th>
              <th className="py-1 pr-2 w-32">How to meter</th>
              <th className="py-1 pr-2 w-24">Target</th>
              <th className="py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {packet.lightingTargets.map((row, i) => (
              <tr key={i} className="border-b border-slate-200 align-top">
                <td className="py-1 pr-2">{row.setup}</td>
                <td className="py-1 pr-2">{row.howToMeter}</td>
                <td className="py-1 pr-2">{row.target}</td>
                <td className="py-1">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function RoleSection({ section }: { section: CrewPrintoutPacket["roleSections"][0] }) {
  return (
    <section
      id={`crew-packet-role-${section.roleId}`}
      className="crew-packet-page mb-8 scroll-mt-24"
    >
      <header className="border-b border-slate-800 pb-2 mb-4">
        <h2 className="text-sm font-bold">{section.title}</h2>
      </header>

      <div className="mb-4">
        <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Role focus
        </h3>
        <ul className="list-disc pl-4 text-xs leading-relaxed">
          {section.roleFocus.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          On-set checklist
        </h3>
        <ul className="text-xs leading-relaxed">
          {section.onSetChecklist.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="inline-block h-3 w-3 shrink-0 border border-slate-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Role shot priorities
        </h3>
        {section.shotPriorities.length === 0 ? (
          <p className="text-xs text-slate-500">No priority shots assigned.</p>
        ) : (
          <table className="w-full border-collapse text-left text-[10px] leading-snug">
            <thead>
              <tr className="border-b border-slate-400 text-[9px] uppercase">
                <th className="py-1 pr-2 w-6">#</th>
                <th className="py-1 pr-2 w-20">Location</th>
                <th className="py-1 pr-2 w-24">Shot</th>
                <th className="py-1 pr-2">Action</th>
                <th className="py-1 w-24">Role note</th>
              </tr>
            </thead>
            <tbody>
              {section.shotPriorities.map((shot) => (
                <tr key={shot.shotNumber} className="border-b border-slate-200 align-top">
                  <td className="py-1 pr-2">{shot.shotNumber}</td>
                  <td className="py-1 pr-2">{shot.location}</td>
                  <td className="py-1 pr-2">{shot.shotLabel}</td>
                  <td className="py-1 pr-2">{shot.action}</td>
                  <td className="py-1">{shot.roleNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function CrewPacketPrintView({
  packet,
  mode = "print",
}: {
  packet: CrewPrintoutPacket;
  mode?: "screen" | "print";
}) {
  const screen = mode === "screen";

  return (
    <div
      className={
        screen
          ? "crew-packet-screen text-slate-900 text-sm"
          : "crew-packet-print text-slate-900 text-sm"
      }
    >
      <style>{`
        @media print {
          .crew-packet-page-break {
            break-before: page;
            page-break-before: always;
          }
          .crew-packet-page {
            break-inside: avoid-page;
          }
        }
      `}</style>

      <CoverPage packet={packet} />
      <PageBreak screen={screen} />
      <MasterShotList packet={packet} />
      <LightingSection packet={packet} screen={screen} />
      {packet.roleSections.map((section) => (
        <div key={section.roleId}>
          <PageBreak screen={screen} />
          <RoleSection section={section} />
        </div>
      ))}

      <footer className="mt-8 border-t border-slate-300 pt-2 text-[9px] text-slate-500">
        Generated {new Date(packet.generatedAt).toLocaleString()} · {APP_NAME}
      </footer>
    </div>
  );
}

export function scrollToCrewPacketSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
