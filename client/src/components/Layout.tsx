import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calculator,
  FolderOpen,
  FileText,
  GraduationCap,
  BarChart3,
  Menu,
  X,
  LogOut,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { UserRole } from '../types';

// ---------------------------------------------------------------------------
//  Navigation items
// ---------------------------------------------------------------------------

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['hr_specialist', 'admin'] },
  { to: '/calculator', label: 'Calculator', icon: Calculator },
  { to: '/cases', label: 'Cases', icon: FolderOpen },
  { to: '/forms', label: 'Forms', icon: FileText },
  { to: '/education', label: 'Education', icon: GraduationCap },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['hr_specialist', 'admin'] },
];

// ---------------------------------------------------------------------------
//  Role badge helper
// ---------------------------------------------------------------------------

function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'badge-danger';
    case 'hr_specialist':
      return 'badge-accent';
    default:
      return 'badge-primary';
  }
}

function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'hr_specialist':
      return 'HR Specialist';
    default:
      return 'Employee';
  }
}

// ---------------------------------------------------------------------------
//  Layout component
// ---------------------------------------------------------------------------

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  // Shared link renderer
  const renderNavLinks = (closeSidebar?: () => void) =>
    visibleNav.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={closeSidebar}
          className={({ isActive }) =>
            isActive ? 'nav-link-active' : 'nav-link'
          }
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      );
    });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      {/* ---------------------------------------------------------------- */}
      {/*  Top navigation bar                                              */}
      {/* ---------------------------------------------------------------- */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between bg-primary-800 dark:bg-neutral-950 px-4 text-white shadow-md lg:px-6">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-primary-700 lg:hidden"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent-400" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide">
                Federal Retirement Benefits Calculator
              </p>
              <p className="text-xs text-primary-200">U.S. Department of Commerce</p>
            </div>
          </div>
        </div>

        {/* Right: user info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-2 text-primary-200 hover:bg-primary-700 hover:text-white transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary-200 hover:bg-primary-700 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* -------------------------------------------------------------- */}
        {/*  Sidebar (desktop)                                              */}
        {/* -------------------------------------------------------------- */}
        <aside className="hidden w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 lg:flex lg:flex-col">
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
            {renderNavLinks()}
          </nav>
        </aside>

        {/* -------------------------------------------------------------- */}
        {/*  Sidebar overlay (mobile)                                       */}
        {/* -------------------------------------------------------------- */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-20 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-white dark:bg-neutral-800 pt-16 shadow-lg lg:hidden">
              <nav className="space-y-1 px-3 py-4">
                {renderNavLinks(() => setSidebarOpen(false))}
              </nav>
            </aside>
          </>
        )}

        {/* -------------------------------------------------------------- */}
        {/*  Main content                                                   */}
        {/* -------------------------------------------------------------- */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-3">
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              U.S. Department of Commerce &mdash; Federal Retirement Benefits Calculator
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
