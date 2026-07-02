import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PaySuccessContent } from "@/components/stripe/PaySuccessContent";

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
      <PaySuccessContent />
    </Suspense>
  );
}
