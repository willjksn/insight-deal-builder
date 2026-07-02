"use client";

import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import {
  downloadProductionPackPdf,
  downloadScreenplayPdf,
  downloadScreenplayText,
} from "@/lib/screenplay/exportPdf";
import { validateScreenplay } from "@/lib/screenplay/validate";

export function ScreenplayExportMenu({
  script,
  showNotes,
  showPageOneNumber,
}: {
  script: ScriptDocument;
  showNotes: boolean;
  showPageOneNumber: boolean;
}) {
  const validation = validateScreenplay(script, { includeNotes: showNotes });

  const exportPdf = () => {
    if (!validation.valid) {
      window.alert(validation.issues.map((issue) => issue.message).join("\n"));
      return;
    }
    downloadScreenplayPdf(script, { includeNotes: showNotes, showPageOneNumber });
  };

  const exportText = () => {
    downloadScreenplayText(script, { includeNotes: showNotes });
  };

  const exportProductionPack = () => {
    downloadProductionPackPdf(script);
  };

  const printPreview = () => {
    window.print();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={exportPdf}>
          <Download className="mr-1.5 h-4 w-4" />
          PDF screenplay
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={exportText}>
          <FileText className="mr-1.5 h-4 w-4" />
          Plain text
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={exportProductionPack}>
          <Download className="mr-1.5 h-4 w-4" />
          Production pack PDF
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={printPreview}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print preview
        </Button>
      </div>

      {!validation.valid ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Fix these before PDF export:</p>
          <ul className="mt-1 list-disc pl-5">
            {validation.issues.slice(0, 5).map((issue) => (
              <li key={`${issue.code}-${issue.elementId ?? issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
