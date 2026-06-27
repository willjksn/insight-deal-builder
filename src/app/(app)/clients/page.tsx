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
import { canManageClients } from "@/lib/utils/permissions";
import { Client } from "@/lib/types";
import { SEED_CLIENT } from "@/lib/constants/presets";
import { Trash2 } from "lucide-react";

const emptyClient = {
  businessName: "", contactName: "", email: "", phone: "", address: "", website: "", socialHandle: "",
  authorizedSignerName: "", authorizedSignerTitle: "", billingContact: "", notes: "",
};

export default function ClientsPage() {
  const { data, loading, refresh } = useCollection<Client>("clients");
  const { create, update, remove, saving } = useMutations("clients");
  const { appUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState("");

  const filtered = data.filter((c) =>
    !search || c.businessName.toLowerCase().includes(search.toLowerCase()) || c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await update(editingId, form);
    else await create(form);
    setShowForm(false);
    refresh();
  };

  const seedClient = async () => {
    if (!data.some((c) => c.businessName === SEED_CLIENT.businessName)) await create(SEED_CLIENT);
    refresh();
  };

  return (
    <div>
      <PageHeader title="Clients" subtitle="Client profiles for project and client agreements" action={
        <div className="flex gap-2 flex-wrap">
          {data.length === 0 && canManageClients(appUser) && <Button size="touch" variant="outline" onClick={seedClient}>Load Demo Client</Button>}
          {canManageClients(appUser) && (
            <Button size="touch" onClick={() => { setEditingId(null); setForm(emptyClient); setShowForm(true); }}>Add Client</Button>
          )}
        </div>
      } />

      <div className="mb-4"><Input label="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} touch placeholder="Search by name..." /></div>

      {showForm && (
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold">{editingId ? "Edit" : "New"} Client</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required touch />
              <Input label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} touch />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required touch />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} touch />
              <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} touch />
              <Input label="Social Handle" value={form.socialHandle} onChange={(e) => setForm({ ...form, socialHandle: e.target.value })} touch />
              <Input label="Authorized Signer" value={form.authorizedSignerName} onChange={(e) => setForm({ ...form, authorizedSignerName: e.target.value })} touch />
              <Input label="Signer Title" value={form.authorizedSignerTitle} onChange={(e) => setForm({ ...form, authorizedSignerTitle: e.target.value })} touch />
              <Input label="Billing Contact" value={form.billingContact} onChange={(e) => setForm({ ...form, billingContact: e.target.value })} touch />
              <div className="md:col-span-2"><Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} touch /></div>
              <div className="md:col-span-2"><Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} touch /></div>
              <div className="md:col-span-2 flex gap-3"><Button type="submit" size="touch" disabled={saving}>Save</Button><Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner className="py-20" /> : filtered.length === 0 ? (
        <EmptyState title="No clients yet" description="Add client profiles for agreements." actionLabel="Add Client" actionHref="#" />
      ) : (
        <DataTable headers={["Business", "Contact", "Email", "Actions"]}>
          {filtered.map((c) => (
            <DataRow key={c.id} cells={[c.businessName, c.contactName, c.email,
              <div key="a" className="flex gap-2">
                {canManageClients(appUser) && (
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(c.id); setForm({ businessName: c.businessName, contactName: c.contactName, email: c.email, phone: c.phone || "", address: c.address || "", website: c.website || "", socialHandle: c.socialHandle || "", authorizedSignerName: c.authorizedSignerName || "", authorizedSignerTitle: c.authorizedSignerTitle || "", billingContact: c.billingContact || "", notes: c.notes || "" }); setShowForm(true); }}>Edit</Button>
                )}
                {appUser && canManageClients(appUser) && <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await remove(c.id); refresh(); } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
              </div>,
            ]} />
          ))}
        </DataTable>
      )}
    </div>
  );
}
