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
import { EquipmentCatalogItem } from "@/lib/types";
import { EQUIPMENT_CATALOG_PRESETS } from "@/lib/constants/presets";
import { Trash2 } from "lucide-react";

const CATEGORIES = ["Camera", "Lens", "Lighting", "Audio", "Support", "Grip", "Monitor", "Other"];

type CatalogForm = Omit<EquipmentCatalogItem, "id" | "createdAt" | "updatedAt">;

const EMPTY_FORM: CatalogForm = {
  name: "",
  category: "Camera",
  brand: "",
  model: "",
  serialNumber: "",
  replacementValue: 0,
  dailyRate: 0,
  weeklyRate: 0,
  notes: "",
  active: true,
};

export default function EquipmentCatalogPage() {
  const { data, loading, refresh } = useCollection<EquipmentCatalogItem>("equipmentCatalog");
  const { create, update, remove, saving } = useMutations("equipmentCatalog");
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

  const openEdit = (item: EquipmentCatalogItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      model: item.model || "",
      serialNumber: item.serialNumber || "",
      replacementValue: item.replacementValue ?? 0,
      dailyRate: item.dailyRate,
      weeklyRate: item.weeklyRate ?? 0,
      notes: item.notes || "",
      active: item.active !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      weeklyRate: form.weeklyRate || undefined,
      notes: form.notes || undefined,
    };
    if (editingId) await update(editingId, payload);
    else await create(payload);
    setShowForm(false);
    refresh();
  };

  const loadDefaults = async () => {
    for (const preset of EQUIPMENT_CATALOG_PRESETS) {
      if (data.some((d) => d.name === preset.name)) continue;
      await create(preset);
    }
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Equipment Catalog"
        subtitle="Master list of Insight Media Group gear — daily rates feed equipment rental agreements"
        action={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={loadDefaults} disabled={saving}>
                Load Starter Catalog
              </Button>
              <Button onClick={openCreate}>Add Item</Button>
            </div>
          )
        }
      />

      <div className="mb-6">
        <InfoCallout variant="sky">
          Add your real gear, serial numbers, and daily rental rates here. When you create an Equipment Rental
          agreement, you pick items from this catalog and line totals calculate automatically. Gemini pricing
          suggestions can plug in here later.
        </InfoCallout>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">{editingId ? "Edit Item" : "New Catalog Item"}</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input label="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required touch />
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} touch />
              <Input label="Brand" value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} touch />
              <Input label="Model" value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} touch />
              <Input label="Serial Number" value={form.serialNumber || ""} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} touch />
              <Input label="Daily Rate ($)" type="number" min={0} step={0.01} value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })} required touch />
              <Input label="Weekly Rate ($)" type="number" min={0} step={0.01} value={form.weeklyRate ?? ""} onChange={(e) => setForm({ ...form, weeklyRate: Number(e.target.value) })} touch />
              <Input label="Replacement Value ($)" type="number" min={0} step={0.01} value={form.replacementValue ?? ""} onChange={(e) => setForm({ ...form, replacementValue: Number(e.target.value) })} touch />
              <div className="md:col-span-2">
                <Textarea label="Notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-5 w-5" />
                Active (available for rental agreements)
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
          title="No equipment in catalog"
          description="Load the starter catalog or add your first item."
          actionLabel={canEdit ? "Add Item" : undefined}
          onAction={canEdit ? openCreate : undefined}
        />
      ) : (
        <DataTable headers={["Item", "Category", "Daily Rate", "Replacement", "Status", "Actions"]}>
          {data.map((item) => (
            <DataRow
              key={item.id}
              cells={[
                <span key="n" className="font-medium">{item.name}{item.serialNumber ? ` · ${item.serialNumber}` : ""}</span>,
                item.category,
                `$${item.dailyRate.toLocaleString()}/day`,
                item.replacementValue ? `$${item.replacementValue.toLocaleString()}` : "—",
                <Badge key="s" variant={item.active !== false ? "success" : "default"}>{item.active !== false ? "Active" : "Inactive"}</Badge>,
                canEdit ? (
                  <div key="a" className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete this item?")) { await remove(item.id); refresh(); } }}>
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
