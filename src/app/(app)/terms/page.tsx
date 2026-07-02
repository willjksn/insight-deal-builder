import { SiteLegalDocument } from "@/components/legal/SiteLegalDocument";
import { TERMS_OF_SERVICE } from "@/lib/legal/siteLegalContent";

export default function TermsPage() {
  return <SiteLegalDocument document={TERMS_OF_SERVICE} />;
}
