"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { DataTable, DataRow } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAgreements } from "@/hooks/useAgreements";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCreateQuotes,
  canDeleteQuotes,
  canDownloadPdf,
  canSignQuotes,
  canEditQuotes,
} from "@/lib/utils/permissions";
import { canOpenInWizard } from "@/lib/agreement/lifecycle";
import { downloadAgreementPdf } from "@/lib/pdf/generateAgreementPdf";
import { Trash2, Download, PenLine, Pencil } from "lucide-react";

function AgreementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, refresh, error } = useAgreements();
  const { remove } = useMutations("agreements");
  const { appUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "");
    setTypeFilter(searchParams.get("type") || "");
  }, [searchParams]);

  const updateFilters = (status: string, type: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const qs = params.toString();
    router.replace(qs ? `/agreements?${qs}` : "/agreements");
  };

  const filtered = data.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (typeFilter && a.agreementType !== typeFilter) return false;
    return true;
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case "signed": case "completed": return "success" as const;
      case "partially_signed": case "ready_for_signature": return "warning" as const;
      case "void": return "danger" as const;
      default: return "default" as const;
    }
  };

  return (
    <div>
      <PageHeader
        title="Agreements"
        subtitle="Internal collaboration and client project agreements"
        actionLabel={canCreateQuotes(appUser) ? "New Agreement" : undefined}
        actionHref={canCreateQuotes(appUser) ? "/agreements/new" : undefined}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Select
          label="Filter by status"
          value={statusFilter}
          onChange={(e) => updateFilters(e.target.value, typeFilter)}
          options={[
            { value: "", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "ready_for_signature", label: "Ready for Signature" },
            { value: "partially_signed", label: "Partially Signed" },
            { value: "signed", label: "Signed" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
            { value: "void", label: "Void" },
          ]}
          touch
        />
        <Select
          label="Filter by type"
          value={typeFilter}
          onChange={(e) => updateFilters(statusFilter, e.target.value)}
          options={[
            { value: "", label: "All types" },
            { value: "internal_collaboration", label: "Internal" },
            { value: "client_project", label: "Client" },
            { value: "equipment_rental", label: "Equipment Rental" },
            { value: "talent_agreement", label: "Talent Agreement" },
            { value: "contractor_agreement", label: "Contractor Agreement" },
            { value: "location_agreement", label: "Location & Prop" },
          ]}
          touch
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{error}</p>
      )}

      {loading ? <LoadingSpinner className="py-20" /> : filtered.length === 0 ? (
        <EmptyState title="No agreements yet" description="Create internal or client agreements." actionLabel="New Agreement" actionHref="/agreements/new" />
      ) : (
        <DataTable headers={["Title", "Type", "Project", "Status", "Actions"]}>
          {filtered.map((a) => (
            <DataRow key={a.id} href={`/agreements/${a.id}`} actionCellIndex={4} cells={[
              a.title,
              <span key="t" className="capitalize">{a.agreementType.replace(/_/g, " ")}</span>,
              a.projectDetails?.projectName || "—",
              <Badge key="s" variant={statusVariant(a.status)}>{a.status.replace(/_/g, " ")}</Badge>,
              <div key="a" className="flex gap-1">
                {canEditQuotes(appUser) && canOpenInWizard(a.status) && (
                  <Link href={`/agreements/new?id=${a.id}`} title="Edit draft">
                    <Button size="sm" variant="outline" aria-label="Edit draft" title="Edit draft">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {canSignQuotes(appUser) && (
                  <Link href={`/agreements/${a.id}/sign`} title="Sign">
                    <Button size="sm" variant="outline" aria-label="Sign" title="Sign">
                      <PenLine className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {canDownloadPdf(appUser) && (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Download PDF"
                    title="Download PDF"
                    onClick={() => downloadAgreementPdf(a)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canDeleteQuotes(appUser) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete"
                    title="Delete"
                    onClick={async () => {
                      if (confirm("Delete?")) {
                        await remove(a.id);
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

export default function AgreementsPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-20" />}>
      <AgreementsContent />
    </Suspense>
  );
}
