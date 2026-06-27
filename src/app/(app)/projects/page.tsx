"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canManageProjects } from "@/lib/utils/permissions";
import { formatDate } from "@/lib/utils/format";
import { PROJECT_TYPES, SHOOT_TYPES, SEED_PROJECT } from "@/lib/constants/presets";
import { Client, Project, ProjectStatus } from "@/lib/types";
import { Trash2, FileText } from "lucide-react";

const emptyProject: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
  projectName: "", clientId: "", clientName: "", agreementType: "client_project",
  projectType: "Business Brand Package", shootType: "Photo + Video",
  totalProjectFee: 0, shootDate: "", deliveryDate: "", location: "", status: "draft",
};

export default function ProjectsPage() {
  const { data, loading, refresh } = useCollection<Project>("projects");
  const { data: clients } = useCollection<Client>("clients");
  const { create, update, remove, saving } = useMutations("projects");
  const { appUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);

  const seedProject = async () => {
    const client = clients.find((c) => c.businessName === "Demo Fitness Studio");
    await create({ ...SEED_PROJECT, clientId: client?.id, clientName: client?.businessName || "Demo Fitness Studio" });
    refresh();
  };

  return (
    <div>
      <PageHeader title="Projects" subtitle="Video/photo production projects" action={
        <div className="flex gap-2 flex-wrap">
          {data.length === 0 && canManageProjects(appUser) && <Button size="touch" variant="outline" onClick={seedProject}>Load Demo Project</Button>}
          {canManageProjects(appUser) && (
            <Button size="touch" onClick={() => { setEditingId(null); setForm(emptyProject); setShowForm(true); }}>New Project</Button>
          )}
        </div>
      } />

      {showForm && (
        <Card className="mb-6"><CardHeader><h2 className="text-lg font-semibold">{editingId ? "Edit" : "New"} Project</h2></CardHeader>
          <CardBody>
            <form onSubmit={async (e) => { e.preventDefault(); if (editingId) await update(editingId, form); else await create(form); setShowForm(false); refresh(); }} className="grid gap-4 md:grid-cols-2">
              <Input label="Project Name" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required touch />
              <Select label="Client" value={form.clientId || ""} onChange={(e) => { const c = clients.find((x) => x.id === e.target.value); setForm({ ...form, clientId: e.target.value, clientName: c?.businessName || "" }); }} options={[{ value: "", label: "Select..." }, ...clients.map((c) => ({ value: c.id, label: c.businessName }))]} touch />
              <Select label="Agreement Type" value={form.agreementType} onChange={(e) => setForm({ ...form, agreementType: e.target.value as Project["agreementType"] })} options={[{ value: "client_project", label: "Client Project" }, { value: "internal_collaboration", label: "Internal Collaboration" }]} touch />
              <Select label="Project Type" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as Project["projectType"] })} options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))} touch />
              <Select label="Shoot Type" value={form.shootType} onChange={(e) => setForm({ ...form, shootType: e.target.value as Project["shootType"] })} options={SHOOT_TYPES.map((t) => ({ value: t, label: t }))} touch />
              <Input label="Total Fee" type="number" value={form.totalProjectFee} onChange={(e) => setForm({ ...form, totalProjectFee: Number(e.target.value) })} touch />
              <Input label="Shoot Date" type="date" value={form.shootDate} onChange={(e) => setForm({ ...form, shootDate: e.target.value })} touch />
              <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} touch />
              <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} touch />
              <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })} options={[{ value: "draft", label: "Draft" }, { value: "ready_for_signature", label: "Ready for Signature" }, { value: "signed", label: "Signed" }, { value: "completed", label: "Completed" }, { value: "archived", label: "Archived" }]} touch />
              <div className="md:col-span-2 flex gap-3"><Button type="submit" size="touch" disabled={saving}>Save</Button><Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner className="py-20" /> : data.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to start building agreements." actionLabel="New Project" actionHref="#" />
      ) : (
        <DataTable headers={["Project", "Client", "Type", "Fee", "Status", "Actions"]}>
          {data.map((p) => (
            <DataRow key={p.id} href={`/projects/${p.id}`} actionCellIndex={5} cells={[
              p.projectName, p.clientName || "—", p.projectType,
              `$${p.totalProjectFee.toLocaleString()}`,
              <Badge key="s">{p.status.replace(/_/g, " ")}</Badge>,
              <div key="a" className="flex gap-2">
                {canManageProjects(appUser) && (
                  <>
                    <Link href={`/agreements/new?projectId=${p.id}`}><Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" />Agreement</Button></Link>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(p.id); setForm({ projectName: p.projectName, clientId: p.clientId, clientName: p.clientName, agreementType: p.agreementType, projectType: p.projectType, shootType: p.shootType, totalProjectFee: p.totalProjectFee, shootDate: p.shootDate || "", deliveryDate: p.deliveryDate || "", location: p.location || "", status: p.status }); setShowForm(true); }}>Edit</Button>
                  </>
                )}
                {appUser && canManageProjects(appUser) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete project"
                    title="Delete project"
                    onClick={async () => {
                      if (confirm("Delete?")) {
                        await remove(p.id);
                        refresh();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>,
            ]} />
          ))}
        </DataTable>
      )}
    </div>
  );
}
