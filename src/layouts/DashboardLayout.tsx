import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  Calculator,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  MinusCircle,
  PlayCircle,
  PlusCircle,
  Receipt,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.tsx';

interface NavSection {
  label: string;
  items: Array<{
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
  }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Organization',
    items: [
      { to: '/employees', label: 'Employees', icon: Users },
      { to: '/departments', label: 'Departments', icon: Building2 },
      { to: '/designations', label: 'Designations', icon: Briefcase },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    ],
  },
  {
    label: 'Compensation',
    items: [
      { to: '/salary-structures', label: 'Salary Structures', icon: Calculator },
      { to: '/allowances', label: 'Allowances', icon: PlusCircle },
      { to: '/deductions', label: 'Deductions', icon: MinusCircle },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/payroll', label: 'Payroll Ledger', icon: Receipt, end: true },
      { to: '/payroll/generate', label: 'Generate Payroll', icon: PlayCircle },
    ],
  },
  {
    label: 'SQL Reports',
    items: [
      { to: '/reports', label: 'Reports Overview', icon: BarChart3, end: true },
      { to: '/reports/department-salary', label: 'Department Salary', icon: FileSpreadsheet },
      { to: '/reports/employee-salary', label: 'Employee Salary', icon: FileSpreadsheet },
      { to: '/reports/attendance', label: 'Attendance Report', icon: FileSpreadsheet },
      { to: '/reports/monthly-payroll', label: 'Monthly Payroll', icon: FileSpreadsheet },
    ],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Executive Dashboard',
  '/employees': 'Employee Directory',
  '/departments': 'Departments',
  '/designations': 'Designations',
  '/attendance': 'Attendance Tracking',
  '/salary-structures': 'Salary Structures',
  '/allowances': 'Allowance Catalog',
  '/deductions': 'Deduction Catalog',
  '/payroll': 'Payroll Ledger',
  '/payroll/generate': 'Generate Monthly Payroll',
  '/reports': 'Analytics & SQL Reports',
  '/reports/department-salary': 'Department Salary Report',
  '/reports/employee-salary': 'Employee Salary Report',
  '/reports/attendance': 'Attendance Report',
  '/reports/monthly-payroll': 'Monthly Payroll Report',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Payroll Workspace';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <Link
          to="/dashboard"
          className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          Payroll Ledger
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        <div className="truncate font-medium text-slate-200">{user?.fullName || 'Administrator'}</div>
        <div className="truncate text-slate-400">{user?.email}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-full h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="hidden sm:inline">Employee Payroll System</span>
                <span className="hidden sm:inline" aria-hidden="true">/</span>
                <span className="font-semibold text-slate-900 truncate">{pageTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{user?.fullName}</span>
              <span aria-hidden="true">·</span>
              <span>{user?.role || 'ADMIN'}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
