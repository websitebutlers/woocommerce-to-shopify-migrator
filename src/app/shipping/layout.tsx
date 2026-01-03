import DashboardLayout from '../dashboard/layout';

export default function ShippingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
