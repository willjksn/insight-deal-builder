"use client";

import { Agreement, EquipmentRentalLineItem } from "@/lib/types";
import { AgreementPayload } from "@/lib/agreement/lifecycle";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useEquipmentCatalog } from "@/hooks/useEquipmentCatalog";
import {
  calculateRentalSubtotal,
  catalogItemToLineItem,
  createEmptyRentalLineItem,
  recalcRentalLineItem,
  syncRentalPaymentTerms,
} from "@/lib/agreement/equipmentRental";
import { Trash2, Plus } from "lucide-react";

interface EquipmentRentalStepProps {
  agreement: AgreementPayload;
  onChange: (patch: Partial<AgreementPayload>) => void;
}

export function EquipmentRentalStep({ agreement, onChange }: EquipmentRentalStepProps) {
  const { data: catalog, loading } = useEquipmentCatalog();
  const rental = agreement.equipmentRentalDetails!;
  const subtotal = calculateRentalSubtotal(rental.lineItems);

  const updateRental = (patch: Partial<typeof rental>) => {
    const next = { ...rental, ...patch };
    onChange({
      equipmentRentalDetails: next,
      paymentTerms: syncRentalPaymentTerms(next, agreement.paymentTerms),
    });
  };

  const updateLineItem = (index: number, patch: Partial<EquipmentRentalLineItem>) => {
    const lineItems = rental.lineItems.map((item, i) =>
      i === index ? recalcRentalLineItem({ ...item, ...patch }) : item
    );
    updateRental({ lineItems });
  };

  const addFromCatalog = (catalogId: string) => {
    const item = catalog.find((c) => c.id === catalogId);
    if (!item) return;
    const days = rental.rentalStartDate && rental.rentalEndDate ? defaultDays(rental.rentalStartDate, rental.rentalEndDate) : 1;
    updateRental({ lineItems: [...rental.lineItems, catalogItemToLineItem(item, days)] });
  };

  const addBlankLine = () => {
    updateRental({ lineItems: [...rental.lineItems, createEmptyRentalLineItem()] });
  };

  const removeLine = (index: number) => {
    updateRental({ lineItems: rental.lineItems.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          label="Add from catalog"
          value=""
          onChange={(e) => {
            if (e.target.value) addFromCatalog(e.target.value);
          }}
          options={[
            { value: "", label: loading ? "Loading catalog…" : "Select equipment…" },
            ...catalog.map((c) => ({
              value: c.id,
              label: `${c.name} ($${c.dailyRate}/day)`,
            })),
          ]}
          touch
        />
        <div className="flex items-end">
          <Button type="button" variant="outline" size="touch" onClick={addBlankLine}>
            <Plus className="mr-2 h-4 w-4" /> Custom line
          </Button>
        </div>
      </div>

      {rental.lineItems.length === 0 ? (
        <p className="text-sm text-slate-500">Add equipment from your catalog or create a custom line item.</p>
      ) : (
        rental.lineItems.map((item, i) => (
          <Card key={item.id}>
            <CardBody className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <Input label="Item" value={item.name} onChange={(e) => updateLineItem(i, { name: e.target.value })} touch />
              </div>
              <Input label="Qty" type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(i, { quantity: Number(e.target.value) })} touch />
              <Input label="$/Day" type="number" min={0} step={0.01} value={item.dailyRate} onChange={(e) => updateLineItem(i, { dailyRate: Number(e.target.value) })} touch />
              <Input label="Days" type="number" min={1} value={item.days} onChange={(e) => updateLineItem(i, { days: Number(e.target.value) })} touch />
              <Input label="Line Total" value={`$${item.lineTotal.toLocaleString()}`} readOnly touch />
              <Input label="Serial #" value={item.serialNumber || ""} onChange={(e) => updateLineItem(i, { serialNumber: e.target.value })} touch />
              <Input label="Replacement $" type="number" min={0} value={item.replacementValue ?? ""} onChange={(e) => updateLineItem(i, { replacementValue: Number(e.target.value) })} touch />
              <Input label="Condition out" value={item.conditionOut || ""} onChange={(e) => updateLineItem(i, { conditionOut: e.target.value })} touch />
              <div className="md:col-span-2 flex items-end">
                <Button type="button" variant="ghost" onClick={() => removeLine(i)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))
      )}

      <Card>
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Input label="Deposit ($)" type="number" min={0} value={rental.depositAmount ?? ""} onChange={(e) => updateRental({ depositAmount: Number(e.target.value) })} touch />
          <Input label="Late fee ($/day)" type="number" min={0} value={rental.lateFeePerDay ?? ""} onChange={(e) => updateRental({ lateFeePerDay: Number(e.target.value) })} touch />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={!!rental.insuranceRequired} onChange={(e) => updateRental({ insuranceRequired: e.target.checked })} className="h-5 w-5" />
            Renter must provide insurance
          </label>
          <div className="md:col-span-2">
            <Textarea label="Insurance notes" value={rental.renterInsuranceNotes || ""} onChange={(e) => updateRental({ renterInsuranceNotes: e.target.value })} touch />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Care & responsibility notes" value={rental.responsibilityNotes || ""} onChange={(e) => updateRental({ responsibilityNotes: e.target.value })} touch />
          </div>
          <p className="md:col-span-2 text-lg font-semibold">Rental subtotal: ${subtotal.toLocaleString()}</p>
        </CardBody>
      </Card>
    </div>
  );
}

function defaultDays(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}
