"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PackageCustomPayout, PackageDeliverable, ProjectType, ServicePackage, ShootType } from "@/lib/types";
import { PROJECT_TYPES, SHOOT_TYPES, SERVICE_PACKAGE_PRESETS, CREW_ROLES } from "@/lib/constants/presets";
import { EMPTY_SERVICE_PACKAGE, estimatePackageFixedTotal, presetToServicePackage } from "@/lib/agreement/packages";
import { Trash2, Plus } from "lucide-react";

type PackageForm = Omit<ServicePackage, "id" | "createdAt" | "updatedAt">;

export default function PackagesPage() {
  const { data, loading, refresh } = useCollection<ServicePackage>("servicePackages");
  const { create, update, remove, saving } = useMutations("servicePackages");
  const { appUser } = useAuth();
  const canEdit = canManageProjects(appUser);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(EMPTY_SERVICE_PACKAGE);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_SERVICE_PACKAGE);
    setShowForm(true);
  };

  const openEdit = (pkg: ServicePackage) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      price: pkg.price,
      projectType: pkg.projectType,
      shootType: pkg.shootType,
      notes: pkg.notes,
      deliverables: pkg.deliverables.length ? pkg.deliverables : [{ name: "Edited reels", quantity: 1 }],
      insightFeePercentage: pkg.insightFeePercentage ?? 40,
      aveFeePercentage: pkg.aveFeePercentage ?? 0,
      assistantFeeAmount: pkg.assistantFeeAmount ?? 0,
      talentFeeAmount: pkg.talentFeeAmount ?? 0,
      editorFeeAmount: pkg.editorFeeAmount ?? 0,
      expensesAmount: pkg.expensesAmount ?? 0,
      filmFundReserveAmount: pkg.filmFundReserveAmount ?? 0,
      insightGearUsed: pkg.insightGearUsed ?? true,
      active: pkg.active !== false,
      customPayouts: pkg.customPayouts ?? [],
    });
    setShowForm(true);
  };

  const updateDeliverable = (index: number, patch: Partial<PackageDeliverable>) => {
    const deliverables = form.deliverables.map((d, i) => (i === index ? { ...d, ...patch } : d));
    setForm({ ...form, deliverables });
  };

  const addDeliverable = () => {
    setForm({ ...form, deliverables: [...form.deliverables, { name: "", quantity: 1 }] });
  };

  const removeDeliverable = (index: number) => {
    setForm({ ...form, deliverables: form.deliverables.filter((_, i) => i !== index) });
  };

  const updateCustomPayout = (index: number, patch: Partial<PackageCustomPayout>) => {
    const customPayouts = form.customPayouts!.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setForm({ ...form, customPayouts });
  };

  const addCustomPayout = () => {
    setForm({
      ...form,
      customPayouts: [...(form.customPayouts ?? []), { name: "", role: "Production Assistant", amount: 0 }],
    });
  };

  const removeCustomPayout = (index: number) => {
    setForm({ ...form, customPayouts: (form.customPayouts ?? []).filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      deliverables: form.deliverables.filter((d) => d.name.trim()),
    };
    if (editingId) await update(editingId, payload);
    else await create(payload);
    setShowForm(false);
    refresh();
  };

  const loadDefaults = async () => {
    for (const preset of SERVICE_PACKAGE_PRESETS) {
      if (data.some((d) => d.name === preset.name)) continue;
      await create(presetToServicePackage(preset));
    }
    refresh();
  };

  const aveRemainder = form.price - estimatePackageFixedTotal(form);

  return (
    <div>
      <PageHeader
        title="Service Packages"
        subtitle="Define pricing, deliverables, and default payout splits for the quote wizard"
        action={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              {data.length === 0 && (
                <Button size="touch" variant="outline" onClick={loadDefaults}>
                  Load Standard Packages
                </Button>
              )}
              <Button size="touch" onClick={openCreate}>
                Add Package
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="mb-6">
          <InfoCallout variant="sky">
            You can view packages here. Ask an IMG admin with Manage projects permission to add or
            edit packages.
          </InfoCallout>
        </div>
      )}

      {showForm && canEdit && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">{editingId ? "Edit" : "New"} Package</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Package name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  touch
                />
                <Input
                  label="Price ($)"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  required
                  touch
                />
                <Select
                  label="Project type"
                  value={form.projectType}
                  onChange={(e) =>
                    setForm({ ...form, projectType: e.target.value as ProjectType })
                  }
                  options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
                  touch
                />
                <Select
                  label="Shoot type"
                  value={form.shootType || "Photo + Video"}
                  onChange={(e) =>
                    setForm({ ...form, shootType: e.target.value as ShootType })
                  }
                  options={SHOOT_TYPES.map((t) => ({ value: t, label: t }))}
                  touch
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Deliverables</p>
                  <Button type="button" size="sm" variant="outline" onClick={addDeliverable}>
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.deliverables.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        label={i === 0 ? "Item" : undefined}
                        value={d.name}
                        onChange={(e) => updateDeliverable(i, { name: e.target.value })}
                        placeholder="e.g. Edited reels"
                        touch
                      />
                      <Input
                        label={i === 0 ? "Qty" : undefined}
                        type="number"
                        min={1}
                        className="w-24"
                        value={d.quantity}
                        onChange={(e) => updateDeliverable(i, { quantity: Number(e.target.value) })}
                        touch
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-end"
                        onClick={() => removeDeliverable(i)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Default payout splits (internal agreements)
                </p>
                <p className="mb-3 text-xs text-slate-500">
                  Standard fields cover most internal splits (Insight, assistant, talent, editor,
                  expenses, film fund). Use custom lines for one-off roles like BTS, audio, or
                  gaffer — remaining balance after all amounts goes to the production partner.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Insight fee %"
                    type="number"
                    min={0}
                    max={100}
                    value={form.insightFeePercentage ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, insightFeePercentage: Number(e.target.value) })
                    }
                    touch
                  />
                  <Input
                    label="Assistant $"
                    type="number"
                    min={0}
                    value={form.assistantFeeAmount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, assistantFeeAmount: Number(e.target.value) })
                    }
                    touch
                  />
                  <Input
                    label="Talent $"
                    type="number"
                    min={0}
                    value={form.talentFeeAmount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, talentFeeAmount: Number(e.target.value) })
                    }
                    touch
                  />
                  <Input
                    label="Editor $"
                    type="number"
                    min={0}
                    value={form.editorFeeAmount ?? ""}
                    onChange={(e) => setForm({ ...form, editorFeeAmount: Number(e.target.value) })}
                    touch
                  />
                  <Input
                    label="Expenses $"
                    type="number"
                    min={0}
                    value={form.expensesAmount ?? ""}
                    onChange={(e) => setForm({ ...form, expensesAmount: Number(e.target.value) })}
                    touch
                  />
                  <Input
                    label="Film fund $"
                    type="number"
                    min={0}
                    value={form.filmFundReserveAmount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, filmFundReserveAmount: Number(e.target.value) })
                    }
                    touch
                  />
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.insightGearUsed ?? true}
                      onChange={(e) => setForm({ ...form, insightGearUsed: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Insight gear used (affects default Insight producer %)
                  </label>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Custom payout lines</p>
                    <Button type="button" size="sm" variant="outline" onClick={addCustomPayout}>
                      <Plus className="mr-1 h-3 w-3" /> Add custom
                    </Button>
                  </div>
                  {(form.customPayouts ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Optional — add crew or contractor lines not covered above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(form.customPayouts ?? []).map((p, i) => (
                        <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_6rem_auto]">
                          <Input
                            label={i === 0 ? "Name / company" : undefined}
                            value={p.name}
                            onChange={(e) => updateCustomPayout(i, { name: e.target.value })}
                            placeholder="e.g. Mike — Audio"
                            touch
                          />
                          <Select
                            label={i === 0 ? "Role" : undefined}
                            value={p.role}
                            onChange={(e) => updateCustomPayout(i, { role: e.target.value })}
                            options={CREW_ROLES.map((r) => ({ value: r, label: r }))}
                            touch
                          />
                          <Input
                            label={i === 0 ? "Amount $" : undefined}
                            type="number"
                            min={0}
                            value={p.amount || ""}
                            onChange={(e) => updateCustomPayout(i, { amount: Number(e.target.value) })}
                            touch
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-end"
                            onClick={() => removeCustomPayout(i)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  Estimated partner remainder:{" "}
                  <span className="font-semibold text-violet-700">
                    ${Math.max(0, aveRemainder).toLocaleString()}
                  </span>
                </p>
              </div>

              <Textarea
                label="Notes"
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                touch
              />

              <div className="flex gap-3">
                <Button type="submit" size="touch" disabled={saving}>
                  Save Package
                </Button>
                <Button type="button" variant="outline" size="touch" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : data.length === 0 ? (
        <EmptyState
          title="No packages yet"
          description="Load the standard Insight packages or create your own with custom pricing and payout splits."
          actionLabel={canEdit ? "Load Standard Packages" : undefined}
          actionHref="#"
        />
      ) : (
        <DataTable
          headers={["Package", "Price", "Insight %", "Deliverables", "Actions"]}
        >
          {data.map((pkg) => (
            <DataRow
              key={pkg.id}
              cells={[
                <div key="n">
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-xs text-slate-500">{pkg.projectType}</p>
                </div>,
                `$${pkg.price.toLocaleString()}`,
                `${pkg.insightFeePercentage ?? 40}%`,
                `${pkg.deliverables.length} items`,
                canEdit ? (
                  <div key="a" className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(pkg)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Delete "${pkg.name}"?`)) {
                          await remove(pkg.id);
                          refresh();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <Badge key="v" variant="default">
                    View only
                  </Badge>
                ),
              ]}
            />
          ))}
        </DataTable>
      )}

      <p className="mt-6 text-sm text-slate-500">
        Packages are applied in the{" "}
        <Link href="/agreements/new" className="font-medium text-sky-700 underline underline-offset-2">
          new agreement wizard
        </Link>{" "}
        — selecting one auto-fills fee, deliverables, payment terms, and payout splits.
      </p>
    </div>
  );
}
