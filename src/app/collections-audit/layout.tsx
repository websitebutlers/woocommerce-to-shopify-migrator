import DashboardLayout from '../dashboard/layout';

export default function CollectionsAuditLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
