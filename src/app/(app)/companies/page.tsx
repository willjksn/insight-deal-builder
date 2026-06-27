"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canManageCompanies } from "@/lib/utils/permissions";
import { Company } from "@/lib/types";
import { SEED_COMPANIES } from "@/lib/constants/presets";
import { Trash2 } from "lucide-react";

const emptyCompany: Omit<Company, "id" | "createdAt" | "updatedAt"> = {
  legalName: "",
  displayName: "",
  authorizedSignerName: "",
  authorizedSignerTitle: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  defaultRole: "",
  defaultProducerPercentage: undefined,
  defaultEquipmentTerms: "",
  notes: "",
};

export default function CompaniesPage() {
  const { data, loading, refresh } = useCollection<Company>("companies");
  const { create, update, remove, saving } = useMutations("companies");
  const { appUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCompany);

  const openCreate = () => { setEditingId(null); setForm(emptyCompany); setShowForm(true); };
  const openEdit = (c: Company) => {
    setEditingId(c.id);
    setForm({ legalName: c.legalName, displayName: c.displayName, authorizedSignerName: c.authorizedSignerName, authorizedSignerTitle: c.authorizedSignerTitle, address: c.address, phone: c.phone, email: c.email, website: c.website, defaultRole: c.defaultRole, defaultProducerPercentage: c.defaultProducerPercentage, defaultEquipmentTerms: c.defaultEquipmentTerms, notes: c.notes, logoUrl: c.logoUrl });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await update(editingId, form);
    else await create(form);
    setShowForm(false);
    refresh();
  };

  const seedCompanies = async () => {
    for (const c of SEED_COMPANIES) {
      if (!data.some((d) => d.legalName === c.legalName)) await create(c);
    }
    refresh();
  };

  return (
    <div>
      <PageHeader title="Companies" subtitle="Insight Media Group LLC and production partners" action={
        <div className="flex gap-2 flex-wrap">
          {!data.some((c) => c.legalName === "Insight Media Group LLC") && canManageCompanies(appUser) && (
            <Button size="touch" variant="outline" onClick={seedCompanies}>Load Default Company</Button>
          )}
          {canManageCompanies(appUser) && (
            <Button size="touch" onClick={openCreate}>Add Company</Button>
          )}
        </div>
      } />

      {showForm && (
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold">{editingId ? "Edit" : "New"} Company</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input label="Legal Name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required touch />
              <Input label="Display Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required touch />
              <Input label="Authorized Signer" value={form.authorizedSignerName} onChange={(e) => setForm({ ...form, authorizedSignerName: e.target.value })} touch />
              <Input label="Signer Title" value={form.authorizedSignerTitle} onChange={(e) => setForm({ ...form, authorizedSignerTitle: e.target.value })} touch />
              <Input label="Default Role" value={form.defaultRole || ""} onChange={(e) => setForm({ ...form, defaultRole: e.target.value })} touch />
              <Input label="Default Producer %" type="number" value={form.defaultProducerPercentage ?? ""} onChange={(e) => setForm({ ...form, defaultProducerPercentage: Number(e.target.value) })} touch />
              <Input label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} touch />
              <Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} touch />
              <Input label="Website" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} touch />
              <Input label="Logo URL" value={form.logoUrl || ""} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} touch />
              <div className="md:col-span-2"><Input label="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} touch /></div>
              <div className="md:col-span-2"><Textarea label="Default Equipment Terms" value={form.defaultEquipmentTerms || ""} onChange={(e) => setForm({ ...form, defaultEquipmentTerms: e.target.value })} touch /></div>
              <div className="md:col-span-2"><Textarea label="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} touch /></div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" size="touch" disabled={saving}>Save</Button>
                <Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner className="py-20" /> : data.length === 0 ? (
        <EmptyState title="No companies yet" description="Load Insight Media Group LLC, then add production partners." actionLabel="Load Default Company" actionHref="#" />
      ) : (
        <DataTable headers={["Display Name", "Legal Name", "Signer", "Producer %", "Actions"]}>
          {data.map((c) => (
            <DataRow key={c.id} cells={[c.displayName, c.legalName, c.authorizedSignerName || "—", c.defaultProducerPercentage ? `${c.defaultProducerPercentage}%` : "—",
              <div key="a" className="flex gap-2">
                {canManageCompanies(appUser) && (
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                )}
                {appUser && canManageCompanies(appUser) && <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await remove(c.id); refresh(); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
              </div>,
            ]} />
          ))}
        </DataTable>
      )}
    </div>
  );
}
