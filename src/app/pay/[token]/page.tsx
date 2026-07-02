import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ClientPayPageContent } from "@/components/stripe/ClientPayPageContent";

export default function ClientPayPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
      <ClientPayPageContent />
    </Suspense>
  );
}
