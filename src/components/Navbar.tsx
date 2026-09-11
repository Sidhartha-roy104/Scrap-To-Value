import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUser } from '@/services/userService';
import { 
  Menu, 
  X, 
  LayoutDashboard,
  Store,
  BarChart3,
  Leaf,
  LogOut,
  UserCircle,
  ArrowLeft
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/marketplace', label: 'Marketplace', icon: Store },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/green-score', label: 'Green Score', icon: Leaf },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = location.pathname !== '/dashboard' && location.pathname !== '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: user?.full_name || null,
    avatar_url: user?.avatar_url || null,
  });

  useEffect(() => {
    let isMounted = true;

    if (user) {
      // Sync immediately with context user state
      setProfile({
        display_name: user.full_name || null,
        avatar_url: user.avatar_url || null,
      });

      // Fetch fresh profile from Express + MySQL (/api/users/me)
      getCurrentUser()
        .then((userData) => {
          if (isMounted && userData) {
            setProfile({
              display_name: userData.full_name || null,
              avatar_url: userData.avatar_url || null,
            });
          }
        })
        .catch((err) => {
          // Keep existing context state if request fails; do not crash Navbar
          console.warn('[Navbar] Could not fetch profile from /api/users/me:', err.message);
        });
    } else {
      setProfile({ display_name: null, avatar_url: null });
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayName = profile.display_name || user?.full_name || '';
  const initials = displayName
    ? displayName.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() || 'U');

  return (
    <header className="sticky top-0 z-40 h-16 bg-card border-b border-border">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Back Button */}
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="hidden lg:flex items-center gap-1.5 p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {/* Mobile: Back or Menu Button */}
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>

        {/* Mobile Logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2">
          <img src="/logo.png" alt="Rubbish Revamp" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-foreground">Rubbish Revamp</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationDropdown />

          {/* User Avatar with dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{initials}</span>
                </div>
              )}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl border border-border shadow-lg z-50 py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{displayName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    My Profile
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-card border-b border-border shadow-lg animate-fade-in z-50">
          <nav className="p-4 space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
