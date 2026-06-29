"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  FileText,
  Film,
  FolderArchive,
  ImagePlus,
  MapPin,
  Music,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { BoardCard, BoardColumn, BoardListRow, BoardScrollArea } from "@/components/production/BoardCard";
import {
  CrewPickerModal,
  PersonDetailModal,
} from "@/components/production/ProductionPersonModals";
import { ScoutSessionsCard } from "@/components/production/ScoutSessionsCard";
import { PersonAvatar } from "@/components/production/PersonAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useAgreements } from "@/hooks/useAgreements";
import { useCollection } from "@/hooks/useCollection";
import { Project, CrewMember } from "@/lib/types";
import { ScoutProject } from "@/lib/scout/types";
import {
  ProductionBoard,
  ProductionDay,
  ProductionInspirationImage,
  ProductionLocationEntry,
  ProductionPerson,
  ProductionPersonGroup,
  ProductionStoryLink,
} from "@/lib/production/types";
import {
  ensureProductionBoard,
  saveProductionBoard,
  subscribeProductionBoardByProject,
} from "@/lib/firebase/productionFirestore";
import { getGearList, getScoutProjectsForLinkedProject } from "@/lib/firebase/scoutFirestore";
import { createEmptyProductionDay } from "@/lib/production/defaults";
import {
  budgetLinesFromAgreement,
  importGearFromAgreement,
  primaryAgreementForProject,
} from "@/lib/production/agreementImport";
import { gearItemsFromScoutList, mergeGearItems } from "@/lib/production/gearImport";
import { musicEmbedUrl } from "@/lib/production/scoutBoardImport";
import { uploadProductionDocument, uploadProductionImage } from "@/lib/production/storage";
import { isInspirationStoryLink } from "@/lib/production/storyLinks";
import { imageFilesFromZip, isImageFile, isZipFile } from "@/lib/production/zipImages";
import { cn } from "@/lib/utils/cn";

interface ProductionBoardClientProps {
  project: Project;
}

export function ProductionBoardClient({ project }: ProductionBoardClientProps) {
  const { user } = useAuth();
  const { data: agreements } = useAgreements();
  const { data: crewCatalog } = useCollection<CrewMember>("crewMembers");
  const [board, setBoard] = useState<ProductionBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoutSessions, setScoutSessions] = useState<ScoutProject[]>([]);
  const [shootDateDismissed, setShootDateDismissed] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEditRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    if (!user?.uid) return;
    let unsub: (() => void) | undefined;
    setLoading(true);
    ensureProductionBoard(project, user.uid)
      .then((loaded) => {
        setBoard(loaded);
        unsub = subscribeProductionBoardByProject(project.id, (remote) => {
          if (!remote || localEditRef.current || savingRef.current) return;
          setBoard(remote);
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load board"))
      .finally(() => setLoading(false));
    getScoutProjectsForLinkedProject(project.id)
      .then(setScoutSessions)
      .catch(() => setScoutSessions([]));
    return () => unsub?.();
  }, [project, user?.uid]);

  const persist = useCallback(
    (next: ProductionBoard, immediate = false) => {
      setBoard(next);
      localEditRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const run = async () => {
        setSaving(true);
        try {
          const { id, createdAt, updatedAt: _updatedAt, ...rest } = next;
          await saveProductionBoard(id, rest);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Save failed");
        } finally {
          setSaving(false);
          localEditRef.current = false;
        }
      };
      if (immediate) void run();
      else saveTimer.current = setTimeout(run, 600);
    },
    []
  );

  const patch = useCallback(
    (partial: Partial<ProductionBoard>) => {
      if (!board) return;
      persist({ ...board, ...partial });
    },
    [board, persist]
  );

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error && !board) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>{error}</p>
        <Link href={`/projects/${project.id}`}>
          <Button className="mt-4" variant="outline">Back to project</Button>
        </Link>
      </div>
    );
  }
  if (!board) return null;

  const primaryAgreement = primaryAgreementForProject(agreements, project.id);
  const budgetLines = primaryAgreement ? budgetLinesFromAgreement(primaryAgreement) : [];
  const dayOne = [...board.productionDays].sort((a, b) => a.dayNumber - b.dayNumber)[0];
  const showShootDateSync =
    !shootDateDismissed &&
    Boolean(project.shootDate?.trim()) &&
    dayOne &&
    dayOne.shootDate !== project.shootDate;

  const cast = board.people.filter((p) => p.group === "cast");
  const productionTeam = board.people.filter((p) => p.group === "production_team");
  const cameraDept = board.people.filter((p) => p.group === "camera_department");
  const bookedLocations = board.locations.filter((l) => l.status === "booked");
  const neededLocations = board.locations.filter((l) => l.status === "needed");

  const patchPeople = (group: ProductionPersonGroup, people: ProductionPerson[]) => {
    patch({
      people: [...board.people.filter((p) => p.group !== group), ...people],
    });
  };

  return (
    <div className="pb-24 lg:relative lg:left-1/2 lg:w-[min(1600px,calc(100vw-17rem))] lg:-translate-x-1/2">
      <PageHeader
        title={board.filmTitle || project.projectName}
        subtitle={`Pre-production board · ${project.clientName || "No client"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saving && (
              <span className="text-sm text-slate-500">Saving…</span>
            )}
            <Link href={`/projects/${project.id}`}>
              <Button size="touch" variant="outline">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Project
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showShootDateSync && dayOne && project.shootDate ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
          <p>
            Project shoot date is <strong>{project.shootDate}</strong>
            {dayOne.shootDate ? ` but Day 1 is ${dayOne.shootDate}` : " but Day 1 has no date"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                patch({
                  productionDays: board.productionDays.map((d) =>
                    d.id === dayOne.id ? { ...d, shootDate: project.shootDate! } : d
                  ),
                });
                setShootDateDismissed(true);
              }}
            >
              Apply to Day 1
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShootDateDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-5 lg:gap-6">
          {/* Column 1 — About + Cast */}
          <BoardColumn>
            <AboutCard board={board} onPatch={patch} />
            <PeopleListCard
              title="Cast"
              group="cast"
              people={cast}
              crewCatalog={crewCatalog}
              onChange={(people) => patchPeople("cast", people)}
              onPhoto={(personId, file) =>
                handlePersonPhoto(board, personId, file, project.id, persist)
              }
            />
          </BoardColumn>

          {/* Column 2 — Production + Camera */}
          <BoardColumn>
            <PeopleListCard
              title="Production team"
              group="production_team"
              people={productionTeam}
              crewCatalog={crewCatalog}
              onChange={(people) => patchPeople("production_team", people)}
              onPhoto={(personId, file) =>
                handlePersonPhoto(board, personId, file, project.id, persist)
              }
            />
            <PeopleListCard
              title="Camera department"
              group="camera_department"
              people={cameraDept}
              crewCatalog={crewCatalog}
              onChange={(people) => patchPeople("camera_department", people)}
              onPhoto={(personId, file) =>
                handlePersonPhoto(board, personId, file, project.id, persist)
              }
            />
          </BoardColumn>

          {/* Column 3 — Story + Inspiration */}
          <BoardColumn>
            <StoryCard
              projectId={project.id}
              links={board.storyLinks}
              scriptFountain={board.scriptFountain}
              scriptSessionId={board.scriptSessionId}
              onChange={(storyLinks) => patch({ storyLinks })}
            />
            <BoardCard
              title="Shot inspiration"
              collapsible
              defaultOpen={false}
              summary={
                board.inspirationImages.length
                  ? `${board.inspirationImages.length} image${board.inspirationImages.length === 1 ? "" : "s"}`
                  : "Upload images or ZIP"
              }
              bodyClassName="p-3"
            >
              <InspirationEditor
                compact
                projectId={project.id}
                images={board.inspirationImages}
                onChange={(inspirationImages) => patch({ inspirationImages })}
              />
            </BoardCard>
          </BoardColumn>

          {/* Column 4 — Filming + Gear */}
          <BoardColumn>
            <FilmingCard
              projectId={project.id}
              projectTotalFee={project.totalProjectFee}
              projectClientName={project.clientName}
              days={board.productionDays}
              filmingNotes={board.filmingNotes ?? ""}
              musicLink={board.musicLink ?? ""}
              budgetLink={board.budgetLink ?? ""}
              budgetLines={budgetLines}
              agreementTitle={primaryAgreement?.title}
              onChangeDays={(productionDays) => patch({ productionDays })}
              onChangeNotes={(filmingNotes) => patch({ filmingNotes })}
              onChangeMusicLink={(musicLink) => patch({ musicLink })}
              onChangeBudgetLink={(budgetLink) => patch({ budgetLink })}
            />
            <ScoutSessionsCard scoutSessions={scoutSessions} board={board} onPatch={patch} />
            <GearCard
              userId={user?.uid}
              items={board.gearItems}
              notes={board.gearNotes ?? ""}
              hasAgreement={Boolean(primaryAgreement)}
              onImportFromAgreement={
                primaryAgreement
                  ? () =>
                      patch({
                        gearItems: importGearFromAgreement(board.gearItems, primaryAgreement),
                      })
                  : undefined
              }
              onChange={(gearItems, gearNotes) => patch({ gearItems, gearNotes })}
            />
          </BoardColumn>

          {/* Column 5 — Locations */}
          <BoardColumn>
            <LocationsCard
              title="Locations"
              locations={bookedLocations}
              projectId={project.id}
              status="booked"
              onChange={(nextBooked) =>
                patch({ locations: [...nextBooked, ...neededLocations] })
              }
            />
            <LocationsCard
              title="Locations still needed"
              locations={neededLocations}
              projectId={project.id}
              status="needed"
              onChange={(nextNeeded) =>
                patch({ locations: [...bookedLocations, ...nextNeeded] })
              }
            />
          </BoardColumn>
      </div>
    </div>
  );
}

async function handlePersonPhoto(
  board: ProductionBoard,
  personId: string,
  file: File,
  projectId: string,
  persist: (b: ProductionBoard, immediate?: boolean) => void
) {
  const person = board.people.find((p) => p.id === personId);
  if (!person) return;
  const { storageUrl, storagePath } = await uploadProductionImage(
    projectId,
    "people",
    personId,
    file
  );
  persist(
    {
      ...board,
      people: board.people.map((p) =>
        p.id === personId ? { ...p, photoUrl: storageUrl, storagePath } : p
      ),
    },
    true
  );
}

function AboutCard({
  board,
  onPatch,
}: {
  board: ProductionBoard;
  onPatch: (partial: Partial<ProductionBoard>) => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const inlineField =
    "w-full min-w-0 border-0 bg-transparent placeholder:text-slate-400 focus:outline-none focus:ring-0 break-words";

  const resizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    resizeTitle();
  }, [board.filmTitle, resizeTitle]);

  return (
    <BoardCard title="About the film" bodyClassName="space-y-3 px-4 py-4">
      <textarea
        ref={titleRef}
        value={board.filmTitle ?? ""}
        onChange={(e) => {
          onPatch({ filmTitle: e.target.value });
          resizeTitle();
        }}
        placeholder="Film title"
        rows={1}
        className={cn(
          inlineField,
          "resize-none overflow-hidden text-lg font-serif font-bold leading-snug text-slate-900 xl:text-xl"
        )}
      />
      <textarea
        value={board.logline ?? ""}
        onChange={(e) => onPatch({ logline: e.target.value })}
        placeholder="Synopsis / logline"
        rows={4}
        className={cn(
          inlineField,
          "resize-y min-h-[5rem] text-sm leading-relaxed text-slate-700"
        )}
      />
      <dl className="space-y-3 border-t border-slate-100 pt-3">
        <MetaField
          label="Ideal run time"
          value={board.idealRuntime ?? ""}
          onChange={(idealRuntime) => onPatch({ idealRuntime })}
          placeholder="10–15 minutes"
        />
        <MetaField
          label="Look and feel"
          value={board.lookAndFeel ?? ""}
          onChange={(lookAndFeel) => onPatch({ lookAndFeel })}
          placeholder="Coming-of-age rom-com"
        />
        <MetaField
          label="References"
          value={board.references ?? ""}
          onChange={(references) => onPatch({ references })}
          placeholder="A24, Insecure, …"
        />
      </dl>
    </BoardCard>
  );
}

function MetaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-snug">
        {label}
      </dt>
      <dd className="mt-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 border-0 bg-transparent text-sm leading-snug text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />
      </dd>
    </div>
  );
}

function AddPersonMenu({
  hasCrewCatalog,
  onAddFromCrew,
  onAddManual,
}: {
  hasCrewCatalog: boolean;
  onAddFromCrew: () => void;
  onAddManual: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!hasCrewCatalog) {
    return (
      <button
        type="button"
        onClick={onAddManual}
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="Add person"
        aria-label="Add person"
      >
        <Plus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="Add person"
        aria-label="Add person"
        aria-expanded={open}
      >
        <Plus className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onAddFromCrew();
              setOpen(false);
            }}
          >
            From crew catalog
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onAddManual();
              setOpen(false);
            }}
          >
            Add manually
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PeopleListCard({
  title,
  group,
  people,
  crewCatalog,
  onChange,
  onPhoto,
}: {
  title: string;
  group: ProductionPersonGroup;
  people: ProductionPerson[];
  crewCatalog: CrewMember[];
  onChange: (people: ProductionPerson[]) => void;
  onPhoto: (personId: string, file: File) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null);
  const sorted = [...people].sort((a, b) => a.sortOrder - b.sortOrder);
  const detailPerson = detailPersonId
    ? people.find((p) => p.id === detailPersonId) ?? null
    : null;
  const detailCrew = detailPerson?.crewMemberId
    ? crewCatalog.find((c) => c.id === detailPerson.crewMemberId)
    : undefined;

  const addPerson = (fromCrew?: CrewMember) => {
    const person: ProductionPerson = {
      id: crypto.randomUUID(),
      group,
      name: fromCrew?.name ?? "",
      role: fromCrew?.defaultRole ?? "",
      sortOrder: people.length,
    };
    if (fromCrew?.email) person.email = fromCrew.email;
    if (fromCrew?.phone) person.phone = fromCrew.phone;
    if (fromCrew?.id) person.crewMemberId = fromCrew.id;
    onChange([...people, person]);
    setDetailPersonId(person.id);
  };

  const update = (id: string, patch: Partial<ProductionPerson>) => {
    onChange(people.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const usedCrewIds = people.map((p) => p.crewMemberId).filter(Boolean) as string[];

  return (
    <>
      <BoardCard
        title={title}
        collapsible
        defaultOpen
        summary={
          sorted.length
            ? `${sorted.length} ${sorted.length === 1 ? "person" : "people"}`
            : "No one added yet"
        }
        action={
          <AddPersonMenu
            hasCrewCatalog={crewCatalog.length > 0}
            onAddFromCrew={() => setPickerOpen(true)}
            onAddManual={() => addPerson()}
          />
        }
        bodyClassName="p-0"
      >
        <BoardScrollArea className="max-h-[360px]">
          {sorted.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-slate-500">No one added yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  group={group}
                  onOpen={() => setDetailPersonId(person.id)}
                  onRemove={() => onChange(people.filter((p) => p.id !== person.id))}
                />
              ))}
            </ul>
          )}
        </BoardScrollArea>
      </BoardCard>

      {pickerOpen && (
        <CrewPickerModal
          crewCatalog={crewCatalog}
          excludeCrewIds={usedCrewIds}
          onSelect={(member) => addPerson(member)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {detailPerson && (
        <PersonDetailModal
          person={detailPerson}
          crewMember={detailCrew}
          group={group}
          onUpdate={(patch) => update(detailPerson.id, patch)}
          onRemove={() => onChange(people.filter((p) => p.id !== detailPerson.id))}
          onPhoto={(file) => onPhoto(detailPerson.id, file)}
          onClose={() => setDetailPersonId(null)}
        />
      )}
    </>
  );
}

function PersonRow({
  person,
  group,
  onOpen,
  onRemove,
}: {
  person: ProductionPerson;
  group: ProductionPersonGroup;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const displayRole = person.role?.trim();

  return (
    <li className="group">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <PersonAvatar person={person} group={group} />
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left rounded-md py-0.5 hover:bg-slate-50"
        >
          <span className="block truncate text-sm font-medium text-slate-900">
            {person.name || "Unnamed"}
            {displayRole ? ` (${displayRole})` : ""}
          </span>
          {(person.callTime || person.phone) && (
            <span className="block truncate text-xs text-slate-500">
              {[person.callTime, person.phone].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          title="View details"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded p-1 text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

const STORY_ICONS: Record<string, typeof FileText> = {
  "character breakdown": Users,
  storyboard: Clapperboard,
  script: FileText,
  treatment: Film,
};

function storyIconForLabel(label: string) {
  const key = label.toLowerCase();
  for (const [fragment, Icon] of Object.entries(STORY_ICONS)) {
    if (key.includes(fragment)) return Icon;
  }
  return FileText;
}

function storyLinkSummary(link: ProductionStoryLink): string {
  if (link.fileName?.trim()) return link.fileName.trim();
  if (link.fileUrl?.trim()) return "File attached";
  if (link.url?.trim()) return storyHostLabel(link.url);
  return "No file yet";
}

function storyHostLabel(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return url.trim().slice(0, 36);
  }
}

function StoryCard({
  projectId,
  links,
  scriptFountain,
  scriptSessionId,
  onChange,
}: {
  projectId: string;
  links: ProductionStoryLink[];
  scriptFountain?: string;
  scriptSessionId?: string;
  onChange: (links: ProductionStoryLink[]) => void;
}) {
  const sorted = [...links]
    .filter((link) => !isInspirationStoryLink(link.label))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const attachedCount = sorted.filter((l) => l.fileUrl || l.url?.trim()).length;
  const cardSummary =
    attachedCount > 0
      ? `${attachedCount} of ${sorted.length} linked`
      : `${sorted.length} items`;

  const updateLink = (id: string, patch: Partial<ProductionStoryLink>) => {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <BoardCard
      title="Story"
      collapsible
      defaultOpen
      summary={cardSummary}
      action={
        <button
          type="button"
          onClick={() =>
            onChange([
              ...links,
              { id: crypto.randomUUID(), label: "Link", sortOrder: links.length },
            ])
          }
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Add story link"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
      bodyClassName="p-0"
    >
      {scriptFountain ? (
        <div className="border-b border-slate-100 px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              AI script
            </p>
            {scriptSessionId ? (
              <Link
                href={`/script-writer/${scriptSessionId}`}
                className="text-xs font-medium text-sky-700 hover:underline"
              >
                Open in script writer
              </Link>
            ) : null}
          </div>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700">
            {scriptFountain}
          </pre>
        </div>
      ) : null}
      <ul className="divide-y divide-slate-100">
        {sorted.map((link) => (
          <StoryLinkRow
            key={link.id}
            link={link}
            projectId={projectId}
            onUpdate={(patch) => updateLink(link.id, patch)}
            onRemove={() => onChange(links.filter((l) => l.id !== link.id))}
            canRemove={sorted.length > 1}
          />
        ))}
      </ul>
    </BoardCard>
  );
}

function StoryLinkRow({
  link,
  projectId,
  onUpdate,
  onRemove,
  canRemove,
}: {
  link: ProductionStoryLink;
  projectId: string;
  onUpdate: (patch: Partial<ProductionStoryLink>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const Icon = storyIconForLabel(link.label);
  const openHref = link.fileUrl?.trim() || link.url?.trim();

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const { storageUrl, storagePath, fileName } = await uploadProductionDocument(
        projectId,
        "story",
        link.id,
        file
      );
      onUpdate({ fileUrl: storageUrl, storagePath, fileName });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <BoardListRow
      icon={<Icon className="h-4 w-4" />}
      iconClassName="bg-sky-100 text-sky-800"
      label={link.label}
      summary={storyLinkSummary(link)}
      trailing={
        <>
          {openHref ? (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sky-600 hover:text-sky-800"
              title="Open"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              className="shrink-0 text-slate-300 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-2">
        <input
          value={link.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
        <input
          value={link.url ?? ""}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="Paste Google Drive, Dropbox, or web link"
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="h-8 text-xs"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : link.fileUrl ? "Replace file" : "Upload file"}
          </Button>
          {link.fileUrl ? (
            <>
              <span className="min-w-0 truncate text-xs text-slate-600">
                {link.fileName ?? "Uploaded file"}
              </span>
              <button
                type="button"
                className="text-xs text-red-500 hover:underline"
                onClick={() =>
                  onUpdate({
                    fileUrl: "",
                    storagePath: "",
                    fileName: "",
                  })
                }
              >
                Remove file
              </button>
            </>
          ) : null}
        </div>
        <p className="text-[11px] text-slate-500">
          PDF, Word, text, or images — script, breakdowns, storyboard pages.
        </p>
        {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.fdx,.fountain,image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </BoardListRow>
  );
}

function InspirationEditor({
  projectId,
  images,
  onChange,
  compact,
}: {
  projectId: string;
  images: ProductionInspirationImage[];
  onChange: (images: ProductionInspirationImage[]) => void;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    filePct: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploading = uploadProgress !== null;
  const busy = uploading || extracting;

  const overallPct =
    uploadProgress && uploadProgress.total > 0
      ? ((uploadProgress.current - 1 + uploadProgress.filePct / 100) / uploadProgress.total) * 100
      : 0;

  const addFromUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange([
      ...images,
      {
        id: crypto.randomUUID(),
        imageUrl: url,
        sourceUrl: url,
        sortOrder: images.length,
      },
    ]);
    setUrlInput("");
  };

  const uploadMany = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(isImageFile);
    if (!files.length) {
      setUploadError("No image files selected.");
      return;
    }

    setUploadError(null);
    setUploadProgress({ current: 1, total: files.length, filePct: 0 });

    const accumulated = [...images];
    let sortOrder = images.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length, filePct: 0 });
      try {
        const id = crypto.randomUUID();
        const { storageUrl, storagePath } = await uploadProductionImage(
          projectId,
          "inspiration",
          id,
          file,
          (pct) => setUploadProgress({ current: i + 1, total: files.length, filePct: pct })
        );
        accumulated.push({
          id,
          imageUrl: storageUrl,
          storagePath,
          caption: file.name.replace(/\.[^.]+$/, ""),
          sortOrder: sortOrder++,
        });
        onChange([...accumulated]);
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? `${err.message} (stopped after ${i} of ${files.length})`
            : `Upload failed (stopped after ${i} of ${files.length})`
        );
        setUploadProgress(null);
        return;
      }
    }

    setUploadProgress(null);
  };

  const processSelection = async (list: FileList) => {
    setUploadError(null);
    const toUpload: File[] = [];

    for (const file of Array.from(list)) {
      if (isZipFile(file)) {
        setExtracting(true);
        try {
          const extracted = await imageFilesFromZip(file);
          if (!extracted.length) {
            setUploadError(`No images found in ${file.name}.`);
            return;
          }
          toUpload.push(...extracted);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "Could not read ZIP file");
          return;
        } finally {
          setExtracting(false);
        }
      } else if (isImageFile(file)) {
        toUpload.push(file);
      }
    }

    if (!toUpload.length) {
      setUploadError("No image files selected.");
      return;
    }

    await uploadMany(toUpload);
  };

  return (
    <div>
      <div className={cn("mb-3 flex flex-wrap gap-1.5", compact && "gap-1")}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={compact ? "h-8 px-2 text-xs" : undefined}
        >
          <ImagePlus className={cn("mr-1 h-3.5 w-3.5", !compact && "mr-1.5 h-4 w-4")} />
          Images
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => zipRef.current?.click()}
          className={compact ? "h-8 px-2 text-xs" : undefined}
        >
          <FolderArchive className="h-3.5 w-3.5 mr-1" />
          ZIP
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) void processSelection(list);
            e.target.value = "";
          }}
        />
        <input
          ref={zipRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="hidden"
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) void processSelection(list);
            e.target.value = "";
          }}
        />
        {!compact && (
          <>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste direct image URL (optional)"
              className="max-w-md"
              disabled={busy}
            />
            <Button type="button" size="sm" onClick={addFromUrl} disabled={!urlInput.trim() || busy}>
              Add URL
            </Button>
          </>
        )}
      </div>

      {extracting && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3">
          <p className="text-sm font-medium text-violet-900">Extracting images from ZIP…</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-200/80">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-sky-900">
              Uploading {uploadProgress.current} of {uploadProgress.total}
            </span>
            <span className="text-sky-700 tabular-nums">{Math.round(overallPct)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sky-200/80">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-150 ease-out"
              style={{ width: `${Math.min(100, overallPct)}%` }}
            />
          </div>
        </div>
      )}

      {uploadError && (
        <p className="mb-4 text-sm text-red-600">{uploadError}</p>
      )}

      <BoardScrollArea className={compact ? "max-h-56" : undefined}>
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3")}>
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onChange(images.filter((i) => i.id !== img.id))}
            >
              <Trash2 className="h-3 w-3" />
            </button>
            {!compact && (
              <input
                className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 border-0 outline-none placeholder:text-white/60"
                placeholder="Caption"
                value={img.caption ?? ""}
                onChange={(e) =>
                  onChange(
                    images.map((i) => (i.id === img.id ? { ...i, caption: e.target.value } : i))
                  )
                }
              />
            )}
          </div>
        ))}
        </div>
      </BoardScrollArea>
      {images.length === 0 && !busy && (
        <p className="text-xs text-slate-500">
          ShotDeck ZIP or multi-image upload.
        </p>
      )}
    </div>
  );
}

function GearCard({
  userId,
  items,
  notes,
  onChange,
  hasAgreement,
  onImportFromAgreement,
}: {
  userId?: string;
  items: string[];
  notes: string;
  onChange: (items: string[], notes: string) => void;
  hasAgreement?: boolean;
  onImportFromAgreement?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const addItem = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...items, next], notes);
    setDraft("");
  };

  const importFromScout = async () => {
    if (!userId) return;
    setImportError(null);
    setImporting(true);
    try {
      const list = await getGearList(userId);
      if (!list) {
        setImportError("No Scout gear list yet. Add gear in Settings → Scout gear.");
        return;
      }
      const incoming = gearItemsFromScoutList(list);
      if (!incoming.length) {
        setImportError("Your Scout gear list is empty.");
        return;
      }
      onChange(mergeGearItems(items, incoming), notes);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not import gear");
    } finally {
      setImporting(false);
    }
  };

  const summary = items.length
    ? `${items.length} item${items.length === 1 ? "" : "s"}`
    : "Tap to add gear";

  return (
    <BoardCard
      title="Gearlist"
      collapsible
      defaultOpen={false}
      summary={summary}
      action={
        <Link
          href="/settings/scout-gear"
          className="text-[11px] font-medium text-sky-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Scout gear
        </Link>
      }
      bodyClassName="p-3"
    >
      <div className="space-y-3">
        {items.length > 0 ? (
          <BoardScrollArea className="max-h-52">
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {items.map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-start gap-2.5 px-3 py-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 bg-white" />
                  <span className="min-w-0 flex-1 text-sm text-slate-800">{item}</span>
                  <button
                    type="button"
                    className="shrink-0 text-slate-300 hover:text-red-500"
                    onClick={() => onChange(items.filter((_, j) => j !== i), notes)}
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </BoardScrollArea>
        ) : (
          <p className="text-sm text-slate-500">No gear listed yet. Add items below or import from Scout.</p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add gear item…"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addItem}
              disabled={!draft.trim()}
              className="shrink-0 px-2.5"
              aria-label="Add gear item"
              title="Add gear item"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={importing || !userId}
            onClick={() => void importFromScout()}
            className="w-full text-xs"
          >
            {importing ? "Importing…" : "Import from Scout gear"}
          </Button>
          {hasAgreement && onImportFromAgreement ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onImportFromAgreement}
              className="w-full text-xs"
            >
              Import from agreement
            </Button>
          ) : null}
          {importError ? <p className="text-xs text-red-600">{importError}</p> : null}
        </div>

        <textarea
          value={notes}
          onChange={(e) => onChange(items, e.target.value)}
          placeholder="Gear notes (rentals, who brings what, etc.)"
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        />
      </div>
    </BoardCard>
  );
}

function LocationsCard({
  title,
  locations,
  projectId,
  onChange,
  onAdd,
  status = "booked",
}: {
  title: string;
  locations: ProductionLocationEntry[];
  projectId: string;
  onChange: (locations: ProductionLocationEntry[]) => void;
  onAdd?: () => void;
  status?: ProductionLocationEntry["status"];
}) {
  const update = (id: string, patch: Partial<ProductionLocationEntry>) => {
    onChange(locations.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <BoardCard
      title={title}
      action={
        <button
          type="button"
          onClick={() =>
            onAdd?.() ??
            onChange([...locations, { id: crypto.randomUUID(), name: "", status }])
          }
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
      bodyClassName="p-0"
    >
      {locations.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500">None listed.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {locations.map((loc) => (
            <LocationRow
              key={loc.id}
              loc={loc}
              projectId={projectId}
              onUpdate={(patch) => update(loc.id, patch)}
              onRemove={() => onChange(locations.filter((l) => l.id !== loc.id))}
            />
          ))}
        </ul>
      )}
    </BoardCard>
  );
}

function LocationRow({
  loc,
  projectId,
  onUpdate,
  onRemove,
}: {
  loc: ProductionLocationEntry;
  projectId: string;
  onUpdate: (patch: Partial<ProductionLocationEntry>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-100 text-sky-800"
        >
          {loc.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loc.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const { storageUrl, storagePath } = await uploadProductionImage(
              projectId,
              "locations",
              loc.id,
              file
            );
            onUpdate({ photoUrl: storageUrl, storagePath });
            e.target.value = "";
          }}
        />
        <input
          value={loc.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Location name"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="space-y-2 border-t border-slate-50 bg-slate-50/60 px-3 py-2.5">
          <Input
            value={loc.address ?? ""}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="Address"
            className="text-xs"
          />
          <Input
            value={loc.parkingNotes ?? ""}
            onChange={(e) => onUpdate({ parkingNotes: e.target.value })}
            placeholder="Parking / access"
            className="text-xs"
          />
          <Textarea
            value={loc.notes ?? ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className="text-xs"
          />
        </div>
      )}
    </li>
  );
}

function FilmingCard({
  projectId,
  projectTotalFee,
  projectClientName,
  days,
  filmingNotes,
  musicLink,
  budgetLink,
  budgetLines,
  agreementTitle,
  onChangeDays,
  onChangeNotes,
  onChangeMusicLink,
  onChangeBudgetLink,
}: {
  projectId: string;
  projectTotalFee: number;
  projectClientName?: string;
  days: ProductionDay[];
  filmingNotes: string;
  musicLink: string;
  budgetLink: string;
  budgetLines: { label: string; amount?: number }[];
  agreementTitle?: string;
  onChangeDays: (days: ProductionDay[]) => void;
  onChangeNotes: (notes: string) => void;
  onChangeMusicLink: (url: string) => void;
  onChangeBudgetLink: (url: string) => void;
}) {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const musicEmbed = musicEmbedUrl(musicLink);

  const addDay = () => {
    onChangeDays([...days, createEmptyProductionDay(days.length + 1)]);
  };

  const formattedFee =
    typeof projectTotalFee === "number" && Number.isFinite(projectTotalFee)
      ? `$${projectTotalFee.toLocaleString()}`
      : "—";

  const budgetSummary = [formattedFee, projectClientName].filter(Boolean).join(" · ");
  const musicSummary = musicLink.trim()
    ? tryHostLabel(musicLink)
    : "No link yet";

  return (
    <>
      <BoardCard
        title="Filming"
        bodyClassName="p-0"
        collapsible
        defaultOpen
        summary={`${sorted.length} day${sorted.length === 1 ? "" : "s"} · ${formattedFee}`}
      >
        <ul className="divide-y divide-slate-100">
          {sorted.map((day) => (
            <li key={day.id}>
              <Link
                href={`/projects/${projectId}/production/days/${day.id}`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-800 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">Call sheet — Day {day.dayNumber}</span>
                  {day.shootDate ? (
                    <p className="truncate text-xs text-slate-500">{day.shootDate}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
          {sorted.map((day) => (
            <li key={`shots-${day.id}`}>
              <Link
                href={`/projects/${projectId}/production/days/${day.id}#shots`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-800 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
                  <Clapperboard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium">Shot list / schedule — Day {day.dayNumber}</span>
                  <p className="truncate text-xs text-slate-500">
                    {day.shots.length} shots · {day.schedule.length} schedule blocks
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
          <BoardListRow
            icon={<Music className="h-4 w-4" />}
            iconClassName="bg-sky-100 text-sky-800"
            label="Music"
            summary={musicSummary}
            trailing={
              musicLink.trim() ? (
                <a
                  href={musicLink.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sky-600 hover:text-sky-800"
                  title="Open link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null
            }
          >
            <input
              value={musicLink}
              onChange={(e) => onChangeMusicLink(e.target.value)}
              placeholder="Spotify, Drive, or cue sheet URL"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
            {musicEmbed ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                <iframe
                  src={musicEmbed}
                  title="Music preview"
                  className="h-20 w-full"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
            ) : null}
          </BoardListRow>
          <BoardListRow
            icon={<Banknote className="h-4 w-4" />}
            iconClassName="bg-sky-100 text-sky-800"
            label="Budget"
            summary={budgetSummary}
            trailing={
              budgetLink.trim() ? (
                <a
                  href={budgetLink.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sky-600 hover:text-sky-800"
                  title="Open external budget doc"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null
            }
          >
            <div className="space-y-2">
              <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800/80">
                  Project fee
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formattedFee}</p>
                {projectClientName ? (
                  <p className="mt-0.5 truncate text-xs text-slate-600">{projectClientName}</p>
                ) : null}
                <Link
                  href={`/projects/${projectId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                >
                  View project & agreements
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {budgetLines.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Agreement breakdown{agreementTitle ? ` · ${agreementTitle}` : ""}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {budgetLines.map((line) => (
                      <li key={line.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-700">{line.label}</span>
                        <span className="font-medium tabular-nums text-slate-900">
                          {typeof line.amount === "number"
                            ? `$${line.amount.toLocaleString()}`
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <input
                value={budgetLink}
                onChange={(e) => onChangeBudgetLink(e.target.value)}
                placeholder="Optional: external budget sheet or PDF URL"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
          </BoardListRow>
          <BoardListRow
            icon={<Calendar className="h-4 w-4" />}
            iconClassName="bg-slate-100 text-slate-600"
            label="Manage production days"
            summary={`${sorted.length} day${sorted.length === 1 ? "" : "s"}`}
          >
            <div className="space-y-2">
              {sorted.map((day) => (
                <div key={day.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">Day {day.dayNumber}</p>
                      <input
                        value={day.title}
                        onChange={(e) =>
                          onChangeDays(
                            days.map((d) => (d.id === day.id ? { ...d, title: e.target.value } : d))
                          )
                        }
                        className="w-full border-0 bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                      />
                    </div>
                    <Link href={`/projects/${projectId}/production/days/${day.id}`}>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                        Call sheet
                      </Button>
                    </Link>
                  </div>
                  <input
                    type="date"
                    value={day.shootDate ?? ""}
                    onChange={(e) =>
                      onChangeDays(
                        days.map((d) => (d.id === day.id ? { ...d, shootDate: e.target.value } : d))
                      )
                    }
                    className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {day.shots.length} shots · {day.schedule.length} blocks
                  </p>
                  {sorted.length > 1 ? (
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] text-red-500 hover:underline"
                      onClick={() =>
                        onChangeDays(
                          days
                            .filter((d) => d.id !== day.id)
                            .sort((a, b) => a.dayNumber - b.dayNumber)
                            .map((d, index) => ({ ...d, dayNumber: index + 1 }))
                        )
                      }
                    >
                      Remove day
                    </button>
                  ) : null}
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={addDay}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add production day
              </Button>
              <textarea
                value={filmingNotes}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="Filming notes"
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
          </BoardListRow>
        </ul>
      </BoardCard>
    </>
  );
}

function tryHostLabel(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return url.trim().slice(0, 40);
  }
}
