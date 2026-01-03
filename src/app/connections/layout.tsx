import DashboardLayout from '../dashboard/layout';

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

