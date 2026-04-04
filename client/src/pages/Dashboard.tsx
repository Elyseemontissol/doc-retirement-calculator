import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Briefcase,
  Clock,
  UserCheck,
  CalendarClock,
  CalendarRange,
  AlertCircle,
  RefreshCw,
  Calculator,
  FileText,
  GraduationCap,
  FolderOpen,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { reports, cases as casesApi, employees as employeesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { DashboardReport, RetirementCase, CaseStatus, Employee } from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ['#5b7faf', '#d4a422', '#3b82f6', '#10b981', '#f59e0b'];

const SYSTEM_LABELS: Record<string, string> = {
  CSRS: 'CSRS',
  'CSRS-Offset': 'CSRS-Offset',
  FERS: 'FERS',
  'FERS-RAE': 'FERS-RAE',
  'FERS-FRAE': 'FERS-FRAE',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-primary',
  under_review: 'badge-warning',
  approved: 'badge-success',
  processed: 'badge-accent',
  closed: 'badge-neutral',
};

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
//  Skeleton helpers
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton h-3 w-20 mb-2" />
          <div className="skeleton h-7 w-14" />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-base font-semibold text-primary-800">{title}</h3>
      </div>
      <div className="card-body">
        <div className="skeleton h-64 w-full rounded-md" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-base font-semibold text-primary-800">Recent Cases</h3>
      </div>
      <div className="card-body space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="stat-card dash-stat-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Dashboard component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Employee Dashboard (for employee role)
// ---------------------------------------------------------------------------

function EmployeeDashboard({ user }: { user: { firstName: string; lastName: string; employeeId?: string } }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [myCases, setMyCases] = useState<RetirementCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const promises: Promise<unknown>[] = [casesApi.list({ limit: 10 })];
        if (user.employeeId) {
          promises.push(employeesApi.getById(user.employeeId));
        }
        const results = await Promise.all(promises);
        if (!cancelled) {
          const casesData = results[0] as { data: RetirementCase[] };
          setMyCases(casesData.data);
          if (results[1]) setEmployee(results[1] as Employee);
        }
      } catch {
        // Silently handle — show what we can
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [user.employeeId]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading your profile...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user.firstName}</h1>
          <p className="page-subtitle">
            Your federal retirement benefits dashboard
          </p>
        </div>
      </div>

      {/* Employee summary */}
      {employee && (
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-800 text-white font-bold text-lg">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-primary-800">{user.firstName} {user.lastName}</h2>
                <p className="text-sm text-neutral-500">{employee.email}</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wider">Retirement Plan</p>
                    <p className="font-semibold text-primary-700">{employee.retirementPlan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wider">Grade / Step</p>
                    <p className="font-semibold">{employee.payPlan}-{employee.grade}/{employee.step}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wider">Current Salary</p>
                    <p className="font-semibold">${employee.currentSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wider">Service Date</p>
                    <p className="font-semibold">{format(new Date(employee.serviceComputationDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h3 className="text-base font-semibold text-primary-800 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link to="/calculator" className="card hover:shadow-md transition-shadow no-underline">
          <div className="card-body flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Calculator className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <p className="font-semibold text-primary-800">Calculate Benefits</p>
              <p className="text-xs text-neutral-500">Estimate your retirement</p>
            </div>
          </div>
        </Link>
        <Link to="/cases" className="card hover:shadow-md transition-shadow no-underline">
          <div className="card-body flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
              <FolderOpen className="h-5 w-5 text-accent-700" />
            </div>
            <div>
              <p className="font-semibold text-primary-800">My Cases</p>
              <p className="text-xs text-neutral-500">View retirement cases</p>
            </div>
          </div>
        </Link>
        <Link to="/forms" className="card hover:shadow-md transition-shadow no-underline">
          <div className="card-body flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-primary-800">Forms Center</p>
              <p className="text-xs text-neutral-500">Generate OPM forms</p>
            </div>
          </div>
        </Link>
        <Link to="/education" className="card hover:shadow-md transition-shadow no-underline">
          <div className="card-body flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100">
              <GraduationCap className="h-5 w-5 text-success-700" />
            </div>
            <div>
              <p className="font-semibold text-primary-800">Learn</p>
              <p className="text-xs text-neutral-500">Education & resources</p>
            </div>
          </div>
        </Link>
      </div>

      {/* My Cases */}
      {myCases.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold text-primary-800">My Cases</h3>
            <Link to="/cases" className="btn-secondary btn-sm no-underline">View All</Link>
          </div>
          <div className="table-wrapper border-0 rounded-none rounded-b-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Retirement Date</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {myCases.map((rc) => (
                  <tr key={rc.id}>
                    <td>
                      <Link to={`/cases/${rc.id}`} className="font-medium text-primary-700 no-underline hover:underline">
                        {rc.caseNumber}
                      </Link>
                    </td>
                    <td className="capitalize">{rc.type.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={STATUS_BADGE[rc.status as CaseStatus] ?? 'badge-neutral'}>
                        {statusLabel(rc.status)}
                      </span>
                    </td>
                    <td>{format(new Date(rc.retirementDate), 'MMM d, yyyy')}</td>
                    <td>{format(new Date(rc.createdAt), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {myCases.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-10">
            <Shield className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No retirement cases yet.</p>
            <Link to="/calculator" className="btn-primary mt-4 inline-flex no-underline">
              Start a Benefits Calculation
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Admin/HR Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';

  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [recentCases, setRecentCases] = useState<RetirementCase[]>([]);
  const [loading, setLoading] = useState(!isEmployee);
  const [error, setError] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Animate stat cards, charts, and table rows when data loads
  useEffect(() => {
    if (!dashboard || !dashboardRef.current) return;
    const ctx = gsap.context(() => {
      // Stat cards stagger in from bottom
      gsap.from('.dash-stat-card', {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.4,
        ease: 'power2.out',
      });
      // Charts fade in after stat cards
      gsap.from('.dash-chart', {
        opacity: 0,
        y: 15,
        stagger: 0.12,
        duration: 0.5,
        delay: 0.35,
        ease: 'power2.out',
      });
      // Table rows stagger in
      gsap.from('.dash-table-row', {
        opacity: 0,
        y: 10,
        stagger: 0.05,
        duration: 0.3,
        delay: 0.5,
        ease: 'power2.out',
      });
    }, dashboardRef);
    return () => ctx.revert();
  }, [dashboard]);

  useEffect(() => {
    if (isEmployee) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [dashboardData, casesData] = await Promise.all([
          reports.dashboard(),
          casesApi.list({ limit: 10 }),
        ]);
        if (!cancelled) {
          setDashboard(dashboardData);
          setRecentCases(casesData.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load dashboard data. Please try again.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isEmployee]);

  // Employee role gets a different dashboard
  if (isEmployee && user) {
    return <EmployeeDashboard user={user} />;
  }

  // -- Derived chart data --
  const casesByStatusData = dashboard
    ? Object.entries(dashboard.casesByStatus).map(([status, count]) => ({
        name: statusLabel(status),
        count,
      }))
    : [];

  const retirementSystemData = dashboard
    ? Object.entries(dashboard.retirementSystems).map(([system, count]) => ({
        name: SYSTEM_LABELS[system] ?? system,
        value: count,
      }))
    : [];

  // -- Error state --
  if (error) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Federal Retirement Benefits Overview</p>
          </div>
        </div>
        <div className="alert-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error loading dashboard</p>
            <p className="mt-1">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary btn-sm ml-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -- Loading state --
  if (loading || !dashboard) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Federal Retirement Benefits Overview</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
          <ChartSkeleton title="Cases by Status" />
          <ChartSkeleton title="Employees by Retirement System" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div ref={dashboardRef}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.firstName ?? 'User'}. Here is your federal retirement benefits
            overview.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatCard
          icon={<Users className="h-5 w-5 text-primary-700" />}
          label="Total Employees"
          value={dashboard.overview.totalEmployees}
          color="bg-primary-100"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-accent-700" />}
          label="Active Cases"
          value={dashboard.overview.activeCases}
          color="bg-accent-100"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-yellow-700" />}
          label="Pending Review"
          value={dashboard.overview.pendingReview}
          color="bg-yellow-100"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5 text-success-700" />}
          label="Recent Retirements"
          value={dashboard.overview.closedThisYear}
          color="bg-success-100"
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5 text-blue-700" />}
          label="Eligible Within 1 Year"
          value={dashboard.eligibility.eligibleWithin1Year}
          color="bg-blue-100"
        />
        <StatCard
          icon={<CalendarRange className="h-5 w-5 text-purple-700" />}
          label="Eligible Within 5 Years"
          value={dashboard.eligibility.eligibleWithin5Years}
          color="bg-purple-100"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Cases by Status Bar Chart */}
        <div className="card dash-chart">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">Cases by Status</h3>
          </div>
          <div className="card-body">
            {casesByStatusData.length > 0 ? (
              <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={casesByStatusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="chart-axis" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="chart-axis" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                      border: '1px solid var(--chart-tooltip-border, #e5e7eb)',
                      color: 'var(--chart-tooltip-text, #1f2937)',
                    }}
                    labelStyle={{ color: 'var(--chart-tooltip-text, #1f2937)' }}
                  />
                  <Bar dataKey="count" name="Cases" fill="var(--chart-bar-fill, #1e3a5f)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">No case data available.</p>
            )}
          </div>
        </div>

        {/* Retirement System Pie Chart */}
        <div className="card dash-chart">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">
              Employees by Retirement System
            </h3>
          </div>
          <div className="card-body">
            {retirementSystemData.length > 0 ? (
              <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={retirementSystemData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine
                  >
                    {retirementSystemData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                      border: '1px solid var(--chart-tooltip-border, #e5e7eb)',
                      color: 'var(--chart-tooltip-text, #1f2937)',
                    }}
                    labelStyle={{ color: 'var(--chart-tooltip-text, #1f2937)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">
                No retirement system data available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Cases Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-base font-semibold text-primary-800">Recent Cases</h3>
          <Link to="/cases" className="btn-secondary btn-sm no-underline">
            View All Cases
          </Link>
        </div>
        <div className="table-wrapper border-0 rounded-none rounded-b-lg">
          {recentCases.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {recentCases.map((rc) => (
                  <tr key={rc.id} className="dash-table-row">
                    <td>
                      <Link
                        to={`/cases/${rc.id}`}
                        className="font-medium text-primary-700 no-underline hover:underline"
                      >
                        {rc.caseNumber}
                      </Link>
                    </td>
                    <td>{rc.employeeId}</td>
                    <td className="capitalize">{rc.type.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={STATUS_BADGE[rc.status as CaseStatus] ?? 'badge-neutral'}>
                        {statusLabel(rc.status)}
                      </span>
                    </td>
                    <td>{format(new Date(rc.createdAt), 'MMM d, yyyy')}</td>
                    <td>{rc.assignedSpecialistId ?? <span className="text-neutral-400">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-400 py-8 text-center">No recent cases found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
