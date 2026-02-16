import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  DollarSign,
  Settings,
  ChevronLeft,
  Building2,
  Truck,
  FileText,
  UserCog,
  ClipboardList,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Sales', href: '/sales', icon: TrendingUp },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Finance', href: '/finance', icon: DollarSign },
  // { label: 'HR', href: '/hr', icon: UserCog },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { currentTenant, sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center overflow-hidden">
              {currentTenant?.settings?.logoUrl ? (
                <img 
                  src={currentTenant.settings.logoUrl} 
                  alt={currentTenant.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-accent-foreground truncate max-w-[140px]">
                {currentTenant?.name || 'Business'}
              </span>
              <span className="text-xs text-sidebar-foreground capitalize">
                {currentTenant?.type?.replace(/_/g, ' ') || currentTenant?.subscriptionPlan?.toLowerCase() || 'Business'}
              </span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto overflow-hidden">
             {currentTenant?.settings?.logoUrl ? (
                <img 
                  src={currentTenant.settings.logoUrl} 
                  alt={currentTenant.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
              )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "active"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer with Theme Toggle and Collapse */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Theme Toggle */}
        <div className={cn(
          "flex",
          sidebarCollapsed ? "justify-center" : "justify-start px-2"
        )}>
          <ThemeToggle />
        </div>
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "w-full justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
            !sidebarCollapsed && "justify-start"
          )}
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            sidebarCollapsed && "rotate-180"
          )} />
          {!sidebarCollapsed && <span className="ml-2 text-sm">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
