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
import { Badge } from "@/components/ui/Badge";
import { InfoCallout } from "@/components/ui/PageSection";
import { useCollection } from "@/hooks/useCollection";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import { canManageProjects } from "@/lib/utils/permissions";
import { LocationCatalogItem, LocationCatalogPropPreset } from "@/lib/types";
import { LOCATION_CATALOG_PRESETS } from "@/lib/constants/presets";
import { Plus, Trash2 } from "lucide-react";

type CatalogForm = Omit<LocationCatalogItem, "id" | "createdAt" | "updatedAt">;

const EMPTY_FORM: CatalogForm = {
  propertyName: "",
  propertyAddress: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  locationFee: 0,
  locationFeeType: "flat",
  defaultPermittedUse: "",
  defaultRestrictions: "",
  insuranceRequired: true,
  insuranceNotes: "",
  propPresets: [],
  notes: "",
  active: true,
};

function emptyProp(): LocationCatalogPropPreset {
  return { id: crypto.randomUUID(), name: "", dailyRate: 0 };
}

export default function LocationCatalogPage() {
  const { data, loading, refresh } = useCollection<LocationCatalogItem>("locationCatalog");
  const { create, update, remove, saving } = useMutations("locationCatalog");
  const { appUser } = useAuth();
  const canEdit = canManageProjects(appUser);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: LocationCatalogItem) => {
    setEditingId(item.id);
    setForm({
      propertyName: item.propertyName,
      propertyAddress: item.propertyAddress || "",
      contactName: item.contactName || "",
      contactEmail: item.contactEmail || "",
      contactPhone: item.contactPhone || "",
      locationFee: item.locationFee,
      locationFeeType: item.locationFeeType,
      defaultPermittedUse: item.defaultPermittedUse || "",
      defaultRestrictions: item.defaultRestrictions || "",
      insuranceRequired: item.insuranceRequired !== false,
      insuranceNotes: item.insuranceNotes || "",
      propPresets: item.propPresets || [],
      notes: item.notes || "",
      active: item.active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      propertyAddress: form.propertyAddress || undefined,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      defaultPermittedUse: form.defaultPermittedUse || undefined,
      defaultRestrictions: form.defaultRestrictions || undefined,
      insuranceNotes: form.insuranceNotes || undefined,
      notes: form.notes || undefined,
      propPresets: form.propPresets?.filter((p) => p.name.trim()).length ? form.propPresets : undefined,
    };
    if (editingId) await update(editingId, payload);
    else await create(payload);
    setShowForm(false);
    refresh();
  };

  const loadDefaults = async () => {
    for (const preset of LOCATION_CATALOG_PRESETS) {
      if (data.some((d) => d.propertyName === preset.propertyName)) continue;
      await create(preset);
    }
    refresh();
  };

  const updateProp = (index: number, patch: Partial<LocationCatalogPropPreset>) => {
    const propPresets = (form.propPresets || []).map((p, i) => (i === index ? { ...p, ...patch } : p));
    setForm({ ...form, propPresets });
  };

  return (
    <div>
      <PageHeader
        title="Location Catalog"
        subtitle="Saved film locations and prop presets — fees feed location & prop agreements"
        action={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadDefaults} disabled={saving}>
                Load Starter Locations
              </Button>
              <Button onClick={openCreate}>Add Location</Button>
            </div>
          )
        }
      />

      <div className="mb-6">
        <InfoCallout variant="sky">
          Store locations you shoot at often with default fees, permitted use language, and reusable prop line items.
          When you create a Location & Prop agreement, pick from this catalog to prefill the wizard.
        </InfoCallout>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">{editingId ? "Edit Location" : "New Location"}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input label="Property name" value={form.propertyName} onChange={(e) => setForm({ ...form, propertyName: e.target.value })} required touch />
              <Input label="Address" value={form.propertyAddress || ""} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} touch />
              <Input label="Contact name" value={form.contactName || ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} touch />
              <Input label="Contact email" value={form.contactEmail || ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} touch />
              <Input label="Contact phone" value={form.contactPhone || ""} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} touch />
              <Select
                label="Location fee type"
                value={form.locationFeeType}
                onChange={(e) => setForm({ ...form, locationFeeType: e.target.value as "flat" | "day" })}
                options={[
                  { value: "flat", label: "Flat fee" },
                  { value: "day", label: "Per day" },
                ]}
                touch
              />
              <Input label="Location fee ($)" type="number" min={0} step={0.01} value={form.locationFee} onChange={(e) => setForm({ ...form, locationFee: Number(e.target.value) })} required touch />
              <Textarea label="Default permitted use" value={form.defaultPermittedUse || ""} onChange={(e) => setForm({ ...form, defaultPermittedUse: e.target.value })} className="md:col-span-2" touch />
              <Textarea label="Default restrictions" value={form.defaultRestrictions || ""} onChange={(e) => setForm({ ...form, defaultRestrictions: e.target.value })} className="md:col-span-2" touch />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={form.insuranceRequired !== false} onChange={(e) => setForm({ ...form, insuranceRequired: e.target.checked })} className="h-5 w-5" />
                Insurance certificate required
              </label>
              <Textarea label="Insurance notes" value={form.insuranceNotes || ""} onChange={(e) => setForm({ ...form, insuranceNotes: e.target.value })} className="md:col-span-2" touch />
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Default prop presets</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, propPresets: [...(form.propPresets || []), emptyProp()] })}>
                    <Plus className="mr-2 h-4 w-4" /> Add prop
                  </Button>
                </div>
                {(form.propPresets || []).map((prop, index) => (
                  <div key={prop.id} className="grid gap-3 md:grid-cols-[1fr_8rem_auto]">
                    <Input label={index === 0 ? "Prop name" : undefined} value={prop.name} onChange={(e) => updateProp(index, { name: e.target.value })} touch />
                    <Input label={index === 0 ? "$/day" : undefined} type="number" min={0} value={prop.dailyRate} onChange={(e) => updateProp(index, { dailyRate: Number(e.target.value) })} touch />
                    <Button type="button" size="sm" variant="ghost" className="self-end text-red-600" onClick={() => setForm({ ...form, propPresets: form.propPresets?.filter((_, i) => i !== index) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Textarea label="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-2" />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-5 w-5" />
                Active (available in location agreements)
              </label>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>{editingId ? "Save" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : data.length === 0 ? (
        <EmptyState
          title="No locations in catalog"
          description="Load starter locations or add your first property."
          actionLabel={canEdit ? "Add Location" : undefined}
          onAction={canEdit ? openCreate : undefined}
        />
      ) : (
        <DataTable headers={["Location", "Fee", "Props", "Status", "Actions"]}>
          {data.map((item) => (
            <DataRow
              key={item.id}
              cells={[
                <span key="n" className="font-medium">{item.propertyName}{item.propertyAddress ? ` · ${item.propertyAddress}` : ""}</span>,
                `$${item.locationFee.toLocaleString()}${item.locationFeeType === "day" ? "/day" : ""}`,
                item.propPresets?.length ? `${item.propPresets.length} preset(s)` : "—",
                <Badge key="s" variant={item.active !== false ? "success" : "default"}>{item.active !== false ? "Active" : "Inactive"}</Badge>,
                canEdit ? (
                  <div key="a" className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete this location?")) { await remove(item.id); refresh(); } }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : "—",
              ]}
            />
          ))}
        </DataTable>
      )}
    </div>
  );
}
