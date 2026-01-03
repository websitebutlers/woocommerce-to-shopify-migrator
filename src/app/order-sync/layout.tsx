import DashboardLayout from '../dashboard/layout';

export default function OrderSyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

