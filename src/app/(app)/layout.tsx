import { AppLayout } from "@/components/layout/AppLayout";
import { ReadOnlyNotice } from "@/components/layout/ReadOnlyNotice";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <ReadOnlyNotice />
      {children}
    </AppLayout>
  );
}
