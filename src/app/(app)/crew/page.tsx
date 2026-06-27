"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCrew } from "@/lib/utils/permissions";
import { CREW_ROLES } from "@/lib/constants/presets";
import { CrewMember } from "@/lib/types";
import { Trash2 } from "lucide-react";

const emptyCrew: Omit<CrewMember, "id" | "createdAt" | "updatedAt"> = { name: "", email: "", phone: "", defaultRole: "", defaultRate: undefined, rateType: "flat", signatureRequired: true, initialsRequired: false, notes: "" };

export default function CrewPage() {
  const { data, loading, refresh } = useCollection<CrewMember>("crewMembers");
  const { create, update, remove, saving } = useMutations("crewMembers");
  const { appUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCrew);
  const [search, setSearch] = useState("");

  const filtered = data.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Crew" subtitle="Assistants, creators, talent, and contractors" action={canManageCrew(appUser) ? <Button size="touch" onClick={() => { setEditingId(null); setForm(emptyCrew); setShowForm(true); }}>Add Crew Member</Button> : undefined} />
      <div className="mb-4"><Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} touch /></div>

      {showForm && (
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold">{editingId ? "Edit" : "New"} Crew Member</h2></CardHeader>
          <CardBody>
            <form onSubmit={async (e) => { e.preventDefault(); if (editingId) await update(editingId, form); else await create(form); setShowForm(false); refresh(); }} className="grid gap-4 md:grid-cols-2">
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required touch />
              <Select label="Default Role" value={form.defaultRole || ""} onChange={(e) => setForm({ ...form, defaultRole: e.target.value })} options={[{ value: "", label: "Select..." }, ...CREW_ROLES.map((r) => ({ value: r, label: r }))]} touch />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} touch />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} touch />
              <Input label="Default Rate" type="number" value={form.defaultRate ?? ""} onChange={(e) => setForm({ ...form, defaultRate: Number(e.target.value) })} touch />
              <Select label="Rate Type" value={form.rateType || "flat"} onChange={(e) => setForm({ ...form, rateType: e.target.value as CrewMember["rateType"] })} options={[{ value: "flat", label: "Flat" }, { value: "hourly", label: "Hourly" }, { value: "day", label: "Day" }, { value: "percentage", label: "Percentage" }]} touch />
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.signatureRequired} onChange={(e) => setForm({ ...form, signatureRequired: e.target.checked })} className="h-5 w-5" /> Signature required</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.initialsRequired} onChange={(e) => setForm({ ...form, initialsRequired: e.target.checked })} className="h-5 w-5" /> Initials required</label>
              <div className="md:col-span-2"><Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} touch /></div>
              <div className="md:col-span-2 flex gap-3"><Button type="submit" size="touch" disabled={saving}>Save</Button><Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner className="py-20" /> : filtered.length === 0 ? (
        <EmptyState title="No crew members yet" description="Add crew for internal agreements." actionLabel="Add Crew Member" actionHref="#" />
      ) : (
        <DataTable headers={["Name", "Role", "Rate", "Actions"]}>
          {filtered.map((m) => (
            <DataRow key={m.id} cells={[m.name, m.defaultRole || "—", m.defaultRate ? `$${m.defaultRate}` : "—",
              <div key="a" className="flex gap-2">
                {canManageCrew(appUser) && (
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(m.id); setForm({ name: m.name, email: m.email || "", phone: m.phone || "", defaultRole: m.defaultRole || "", defaultRate: m.defaultRate, rateType: m.rateType || "flat", signatureRequired: m.signatureRequired ?? true, initialsRequired: m.initialsRequired ?? false, notes: m.notes || "" }); setShowForm(true); }}>Edit</Button>
                )}
                {appUser && canManageCrew(appUser) && <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await remove(m.id); refresh(); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
              </div>,
            ]} />
          ))}
        </DataTable>
      )}
    </div>
  );
}
