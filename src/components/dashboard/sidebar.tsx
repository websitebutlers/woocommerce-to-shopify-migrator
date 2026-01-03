"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FolderOpen,
  Settings,
  ArrowLeftRight,
  BookOpen,
  Ticket,
  MessageSquare,
  FileText,
  Newspaper,
  Search,
  RefreshCw,
  UserPlus,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Collections', href: '/collections', icon: FolderOpen },
  { name: 'Coupons', href: '/coupons', icon: Ticket },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
  { name: 'Pages', href: '/pages-migration', icon: FileText },
  { name: 'Blog Posts', href: '/blog-posts', icon: Newspaper },
  { name: 'Shipping', href: '/shipping', icon: Truck },
];

const tools = [
  { name: 'Product Audit', href: '/product-audit', icon: Search },
  { name: 'Collections Audit', href: '/collections-audit', icon: FolderOpen },
  { name: 'Inventory Sync', href: '/inventory-sync', icon: RefreshCw },
  { name: 'Customer Sync', href: '/customer-sync', icon: UserPlus },
  { name: 'Order Sync', href: '/order-sync', icon: ShoppingBag },
  { name: 'Blog Post Sync', href: '/blog-post-sync', icon: Newspaper },
];

const settings = [
  { name: 'Connections', href: '/connections', icon: Settings },
];

const help = [
  { name: 'Documentation', href: '/documentation', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <ArrowLeftRight className="h-6 w-6" />
          <span className="text-lg">WC ↔ Shopify</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {tools.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {settings.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {help.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Migration Tool v1.0.0
        </p>
      </div>
    </div>
  );
}

