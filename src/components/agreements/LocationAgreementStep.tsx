"use client";

import { AgreementPayload } from "@/lib/agreement/lifecycle";
import {
  calculateLocationAgreementTotal,
  calculateLocationFeeTotal,
  calculatePropsSubtotal,
  createEmptyPropLineItem,
  formatLocationKindLabel,
  recalcPropLineItem,
  syncLocationPaymentTerms,
} from "@/lib/agreement/locationAgreement";
import { LocationAgreementDetails, LocationPropLineItem } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PayeeTaxFields } from "@/components/agreements/PayeeTaxFields";
import { useLocationCatalog } from "@/hooks/useLocationCatalog";
import { catalogItemToLocationDetails } from "@/lib/agreement/locationCatalog";
import { Plus, Trash2 } from "lucide-react";

interface LocationAgreementStepProps {
  agreement: AgreementPayload;
  onChange: (patch: Partial<AgreementPayload>) => void;
}

export function LocationAgreementStep({ agreement, onChange }: LocationAgreementStepProps) {
  const { data: catalog, loading: catalogLoading } = useLocationCatalog();
  const location = agreement.locationAgreementDetails!;
  const total = calculateLocationAgreementTotal(location);

  const updateLocation = (patch: Partial<LocationAgreementDetails>) => {
    const next = { ...location, ...patch };
    onChange({
      locationAgreementDetails: next,
      paymentTerms: syncLocationPaymentTerms(next, agreement.paymentTerms),
    });
  };

  const updatePropItem = (index: number, patch: Partial<LocationPropLineItem>) => {
    const propLineItems = location.propLineItems.map((item, i) =>
      i === index ? recalcPropLineItem({ ...item, ...patch }) : item
    );
    updateLocation({ propLineItems });
  };

  const showLocation = location.agreementKind !== "prop";
  const showProps = location.agreementKind !== "location";

  return (
    <div className="space-y-6">
      {catalog.length > 0 && (
        <Select
          label="Prefill from location catalog"
          value=""
          onChange={(e) => {
            const item = catalog.find((c) => c.id === e.target.value);
            if (!item) return;
            const patch = catalogItemToLocationDetails(item);
            updateLocation({
              ...patch,
              propLineItems:
                patch.propLineItems && patch.propLineItems.length > 0
                  ? patch.propLineItems
                  : location.propLineItems,
            });
          }}
          options={[
            { value: "", label: catalogLoading ? "Loading catalog…" : "Select saved location…" },
            ...catalog.map((c) => ({
              value: c.id,
              label: `${c.propertyName}${c.locationFee ? ` ($${c.locationFee}${c.locationFeeType === "day" ? "/day" : ""})` : ""}`,
            })),
          ]}
          touch
        />
      )}

      <Select
        label="Agreement covers"
        value={location.agreementKind}
        onChange={(e) =>
          updateLocation({ agreementKind: e.target.value as LocationAgreementDetails["agreementKind"] })
        }
        options={[
          { value: "location", label: "Location only" },
          { value: "prop", label: "Prop rental only" },
          { value: "location_and_prop", label: "Location + props" },
        ]}
        touch
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Property / location name" value={location.propertyName} onChange={(e) => updateLocation({ propertyName: e.target.value })} touch />
        <Input label="Address" value={location.propertyAddress || ""} onChange={(e) => updateLocation({ propertyAddress: e.target.value })} touch />
      </div>

      <Textarea label="Permitted use" value={location.permittedUse || ""} onChange={(e) => updateLocation({ permittedUse: e.target.value })} touch />
      <Textarea label="Restrictions" value={location.restrictions || ""} onChange={(e) => updateLocation({ restrictions: e.target.value })} touch />

      {showLocation && (
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-3">
            <h3 className="md:col-span-3 font-semibold">Location fee</h3>
            <Select
              label="Fee type"
              value={location.locationFeeType}
              onChange={(e) => updateLocation({ locationFeeType: e.target.value as "flat" | "day" })}
              options={[
                { value: "flat", label: "Flat fee" },
                { value: "day", label: "Per day" },
              ]}
              touch
            />
            <Input label="Amount ($)" type="number" min={0} value={location.locationFee} onChange={(e) => updateLocation({ locationFee: Number(e.target.value) })} touch />
            {location.locationFeeType === "day" && (
              <Input label="Days" type="number" min={1} value={location.locationDays} onChange={(e) => updateLocation({ locationDays: Number(e.target.value) })} touch />
            )}
            <p className="md:col-span-3 text-sm text-slate-600">
              Location subtotal: ${calculateLocationFeeTotal(location).toLocaleString()}
            </p>
          </CardBody>
        </Card>
      )}

      {showProps && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Prop schedule</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateLocation({ propLineItems: [...location.propLineItems, createEmptyPropLineItem()] })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add prop
            </Button>
          </div>
          {location.propLineItems.length === 0 ? (
            <p className="text-sm text-slate-500">No props listed yet.</p>
          ) : (
            location.propLineItems.map((item, index) => (
              <Card key={item.id}>
                <CardBody className="grid gap-3 md:grid-cols-[1fr_5rem_5rem_5rem_auto]">
                  <Input label={index === 0 ? "Prop name" : undefined} value={item.name} onChange={(e) => updatePropItem(index, { name: e.target.value })} touch />
                  <Input label={index === 0 ? "Qty" : undefined} type="number" min={1} value={item.quantity} onChange={(e) => updatePropItem(index, { quantity: Number(e.target.value) })} touch />
                  <Input label={index === 0 ? "$/day" : undefined} type="number" min={0} value={item.dailyRate} onChange={(e) => updatePropItem(index, { dailyRate: Number(e.target.value) })} touch />
                  <Input label={index === 0 ? "Days" : undefined} type="number" min={1} value={item.days} onChange={(e) => updatePropItem(index, { days: Number(e.target.value) })} touch />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-end text-red-600"
                    onClick={() => updateLocation({ propLineItems: location.propLineItems.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <p className="md:col-span-5 text-xs text-slate-500">Line total: ${item.lineTotal.toLocaleString()}</p>
                </CardBody>
              </Card>
            ))
          )}
          {location.propLineItems.length > 0 && (
            <p className="text-sm font-medium">Props subtotal: ${calculatePropsSubtotal(location.propLineItems).toLocaleString()}</p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={location.insuranceRequired ?? false} onChange={(e) => updateLocation({ insuranceRequired: e.target.checked })} className="h-5 w-5" />
        Insurance certificate required from Producer
      </label>
      {location.insuranceRequired && (
        <Textarea label="Insurance notes" value={location.insuranceNotes || ""} onChange={(e) => updateLocation({ insuranceNotes: e.target.value })} touch />
      )}

      <Card>
        <CardBody>
          <h3 className="mb-4 font-semibold">Owner tax info (for accountant export)</h3>
          <PayeeTaxFields
            tax={location.payeeTax || {}}
            onChange={(payeeTax) => updateLocation({ payeeTax })}
            legalNameLabel="Owner legal name (for 1099)"
          />
        </CardBody>
      </Card>

      <p className="text-lg font-semibold">
        Total: ${total.toLocaleString()} · {formatLocationKindLabel(location.agreementKind)}
      </p>
    </div>
  );
}
