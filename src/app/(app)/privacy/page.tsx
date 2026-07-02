import { SiteLegalDocument } from "@/components/legal/SiteLegalDocument";
import { PRIVACY_POLICY } from "@/lib/legal/siteLegalContent";

export default function PrivacyPage() {
  return <SiteLegalDocument document={PRIVACY_POLICY} />;
}
