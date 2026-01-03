import DashboardLayout from '../dashboard/layout';

export default function ProductAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

