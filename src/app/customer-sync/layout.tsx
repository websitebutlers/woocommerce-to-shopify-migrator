import DashboardLayout from '../dashboard/layout';

export default function CustomerSyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

