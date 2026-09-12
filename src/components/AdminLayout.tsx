/**
 * components/AdminLayout.tsx
 * --------------------------
 * Dedicated, focused administration console layout.
 * Completely isolates admin workflow from buyer/seller marketplace navigation.
 */

import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ShoppingCart,
  ShieldAlert,
  Users,
  ShieldCheck,
  UserCheck,
  Package,
  Layers,
  CreditCard,
  Truck,
  BarChart3,
  FileText,
  Settings,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '@/services/adminService';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Shield;
  badge?: string;
  isComingSoon?: boolean;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const ADMIN_NAVIGATION: NavGroup[] = [
  {
    groupTitle: 'ADMIN CONSOLE',
    items: [
      { path: '/admin', label: 'Admin Overview', icon: LayoutDashboard },
      { path: '/admin/orders', label: 'Order Management', icon: ShoppingCart },
      { path: '/admin/disputes', label: 'Dispute Center', icon: ShieldAlert },
      { path: '/admin/users', label: 'User Directory', icon: Users },
    ],
  },
  {
    groupTitle: 'PLATFORM OPERATIONS',
    items: [
      { path: '/admin/sellers', label: 'Seller Verification', icon: ShieldCheck },
      { path: '/admin/buyers', label: 'Buyer Management', icon: UserCheck },
      { path: '/admin/listings', label: 'Listing Management', icon: Package },
      { path: '/admin/inventory', label: 'Inventory Overview', icon: Layers },
      { path: '/admin/payments', label: 'Payment Monitoring', icon: CreditCard },
      { path: '/admin/fulfillment', label: 'Fulfillment Monitoring', icon: Truck },
    ],
  },
  {
    groupTitle: 'INSIGHTS & SYSTEM',
    items: [
      { path: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
      { path: '/admin/activity-logs', label: 'Activity Logs', icon: FileText },
      { path: '/admin/settings', label: 'System Settings', icon: Settings },
      { path: '#', label: 'Reports', icon: Clock, badge: 'Soon', isComingSoon: true },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Quick platform badges (open disputes count)
  const { data: statsData } = useQuery({
    queryKey: ['admin_quick_stats'],
    queryFn: async () => {
      const res = await getAdminStats();
      return res.data?.stats;
    },
    staleTime: 1000 * 30,
  });

  const openDisputesCount = statsData?.disputes?.open ?? 0;

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Determine page title from active route
  const currentTitle = (() => {
    for (const group of ADMIN_NAVIGATION) {
      for (const item of group.items) {
        if (item.path !== '#' && location.pathname === item.path) {
          return { group: group.groupTitle, label: item.label };
        }
      }
    }
    if (location.pathname.startsWith('/admin/orders/')) {
      return { group: 'ADMIN CONSOLE', label: 'Order Inspection' };
    }
    return { group: 'ADMINISTRATION', label: 'Operations Console' };
  })();

  const renderNavLinks = (closeMobile?: boolean) => (
    <div className="space-y-6">
      {ADMIN_NAVIGATION.map((group) => (
        <div key={group.groupTitle} className="space-y-1.5">
          <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase">
            {group.groupTitle}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.path !== '#' && location.pathname === item.path;
              const Icon = item.icon;

              if (item.isComingSoon) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground/50 cursor-not-allowed select-none"
                    title="Feature in development"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground/40" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => closeMobile && setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary shadow-xs'
                      : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.path === '/admin/disputes' && openDisputesCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      {openDisputesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground selection:bg-primary/20">
      {/* ========================================================================= */}
      {/* 1. DESKTOP ADMIN SIDEBAR                                                  */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-card/95 backdrop-blur-md border-r border-border flex-shrink-0 h-screen sticky top-0 z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 border-b border-border/80 gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-primary/20 flex-shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground tracking-tight truncate">
                Rubbish Revamp
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                Admin Console
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {renderNavLinks(false)}
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-border/80 bg-secondary/30">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/80 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.full_name || 'System Admin'}
                </p>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {user?.email || 'admin@rubbishrevamp.dev'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Log Out of Admin Console"
              className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE SIDEBAR DRAWER                                                  */}
      {/* ========================================================================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card border-r border-border h-full z-50">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground">Rubbish Revamp</span>
                  <span className="block text-[10px] font-mono text-primary uppercase font-bold">Admin Console</span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {renderNavLinks(true)}
            </div>

            <div className="p-4 border-t border-border bg-secondary/30">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-600/10 text-rose-600 hover:bg-rose-600/20 text-xs font-semibold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE AREA                                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Admin Top Bar */}
        <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-card/70 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
              aria-label="Open Admin Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{currentTitle.group}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-semibold truncate">{currentTitle.label}</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate hidden sm:block">
                {currentTitle.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Operational Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational Console</span>
            </div>

            {/* Platform Quick Switch: Back to Marketplace View if desired */}
            <Link
              to="/marketplace"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/70 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Preview Buyer/Seller Marketplace"
            >
              <span>Marketplace</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />

            {/* Admin Avatar Menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/70 transition-colors focus:outline-hidden"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl p-2 z-40 animate-scale-in text-xs">
                    <div className="px-3 py-2 border-b border-border/60 mb-1">
                      <p className="font-semibold text-foreground truncate">{user?.full_name || 'System Admin'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        Administrator
                      </span>
                    </div>

                    <Link
                      to="/admin/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/60 text-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>System Settings</span>
                    </Link>

                    <Link
                      to="/admin/activity-logs"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/60 text-foreground transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>Activity Logs</span>
                    </Link>

                    <div className="border-t border-border/60 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors font-medium text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
