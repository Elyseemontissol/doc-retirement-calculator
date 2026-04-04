import { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  TrendingUp,
  DollarSign,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import { reports } from '../services/api';
import type { EligibilityReport, CasesReport, DemographicsReport } from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

type TabKey = 'eligibility' | 'cases' | 'demographics';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'eligibility', label: 'Eligibility' },
  { key: 'cases', label: 'Case Metrics' },
  { key: 'demographics', label: 'Demographics' },
];

const PIE_COLORS = ['#1e3a5f', '#c5a54e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const BAR_COLOR = '#1e3a5f';
const BAR_ACCENT = '#c5a54e';

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

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="card">
        <div className="card-body">
          <div className="skeleton h-64 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Mini Stat Card
// ---------------------------------------------------------------------------

interface MiniStatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function MiniStat({ icon, label, value, color }: MiniStatProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Expandable Employee Section
// ---------------------------------------------------------------------------

interface EligibilitySectionProps {
  title: string;
  badgeClass: string;
  employees: EligibilityReport['employees'];
}

function EligibilitySection({ title, badgeClass, employees }: EligibilitySectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <button
        type="button"
        className="w-full card-header flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-primary-800">{title}</h3>
          <span className={badgeClass}>{employees.length}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
      </button>
      {expanded && (
        <div className="table-wrapper border-0 rounded-none rounded-b-lg">
          {employees.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Retirement System</th>
                  <th>Age</th>
                  <th>Years of Service</th>
                  <th>Earliest Eligible</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.employeeId}>
                    <td className="font-medium">{emp.name}</td>
                    <td>{emp.retirementPlan}</td>
                    <td>{emp.age}</td>
                    <td>{emp.serviceYears.toFixed(1)}</td>
                    <td>{emp.earliestEligibleDate ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-400 py-6 text-center">No employees in this category.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Eligibility Tab
// ---------------------------------------------------------------------------

function EligibilityTab({ data }: { data: EligibilityReport }) {
  const eligibleNow = data.employees.filter((e) => e.eligibleNow);
  const within1Year = data.employees.filter((e) => !e.eligibleNow && e.eligibleWithin1Year);
  const within5Years = data.employees.filter(
    (e) => !e.eligibleNow && !e.eligibleWithin1Year && e.eligibleWithin5Years,
  );

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon={<Users className="h-5 w-5 text-success-700" />}
          label="Eligible Now"
          value={data.summary.eligibleNow}
          color="bg-success-100"
        />
        <MiniStat
          icon={<Clock className="h-5 w-5 text-blue-700" />}
          label="Within 1 Year"
          value={data.summary.eligibleWithin1Year}
          color="bg-blue-100"
        />
        <MiniStat
          icon={<TrendingUp className="h-5 w-5 text-purple-700" />}
          label="Within 5 Years"
          value={data.summary.eligibleWithin5Years}
          color="bg-purple-100"
        />
      </div>

      {/* Export placeholder */}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => alert('Export functionality coming soon.')}
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </button>
      </div>

      {/* Expandable sections */}
      <EligibilitySection
        title="Eligible Now"
        badgeClass="badge-success"
        employees={eligibleNow}
      />
      <EligibilitySection
        title="Within 1 Year"
        badgeClass="badge-primary"
        employees={within1Year}
      />
      <EligibilitySection
        title="Within 5 Years"
        badgeClass="badge-accent"
        employees={within5Years}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Case Metrics Tab
// ---------------------------------------------------------------------------

function CaseMetricsTab({ data }: { data: CasesReport }) {
  const byStatusData = Object.entries(data.byStatus).map(([status, count]) => ({
    name: statusLabel(status),
    value: count,
  }));

  const byMonthData = Object.entries(data.byMonth).map(([month, count]) => ({
    name: month,
    count,
  }));

  const bySpecialistData = Object.entries(data.bySpecialist).map(([name, count]) => ({
    name,
    count,
  }));

  const totalCases = data.total;
  const casesThisMonth = byMonthData.length > 0 ? byMonthData[byMonthData.length - 1].count : 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon={<Briefcase className="h-5 w-5 text-primary-700" />}
          label="Total Cases"
          value={totalCases}
          color="bg-primary-100"
        />
        <MiniStat
          icon={<Clock className="h-5 w-5 text-accent-700" />}
          label="Avg Processing Days"
          value="--"
          color="bg-accent-100"
        />
        <MiniStat
          icon={<BarChart3 className="h-5 w-5 text-success-700" />}
          label="Cases This Month"
          value={casesThisMonth}
          color="bg-success-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cases by Month Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">Cases by Month</h3>
          </div>
          <div className="card-body">
            {byMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byMonthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="count" name="Cases" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">No monthly data available.</p>
            )}
          </div>
        </div>

        {/* Cases by Status Donut Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">Cases by Status</h3>
          </div>
          <div className="card-body">
            {byStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine
                  >
                    {byStatusData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">No status data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Cases by Specialist Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-primary-800">Cases by Specialist</h3>
        </div>
        <div className="table-wrapper border-0 rounded-none rounded-b-lg">
          {bySpecialistData.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Specialist</th>
                  <th>Cases Assigned</th>
                  <th>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {bySpecialistData
                  .sort((a, b) => b.count - a.count)
                  .map((row) => (
                    <tr key={row.name}>
                      <td className="font-medium">{row.name}</td>
                      <td>{row.count}</td>
                      <td>
                        {totalCases > 0 ? ((row.count / totalCases) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-400 py-6 text-center">No specialist data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Demographics Tab
// ---------------------------------------------------------------------------

function DemographicsTab({ data }: { data: DemographicsReport }) {
  const byAgeData = Object.entries(data.ageDistribution).map(([range, count]) => ({
    name: range,
    count,
  }));

  const bySystemData = Object.entries(data.byRetirementPlan).map(([system, count]) => ({
    name: system,
    value: count,
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon={<TrendingUp className="h-5 w-5 text-primary-700" />}
          label="Avg Service Years"
          value={data.averageServiceYears.toFixed(1)}
          color="bg-primary-100"
        />
        <MiniStat
          icon={<DollarSign className="h-5 w-5 text-success-700" />}
          label="Avg Salary"
          value={`$${data.averageSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          color="bg-success-100"
        />
        <MiniStat
          icon={<Users className="h-5 w-5 text-accent-700" />}
          label="Total Employees"
          value={data.totalEmployees}
          color="bg-accent-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Employees by Age Range Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">Employees by Age Range</h3>
          </div>
          <div className="card-body">
            {byAgeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byAgeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="count" name="Employees" fill={BAR_ACCENT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">No age data available.</p>
            )}
          </div>
        </div>

        {/* Employees by Retirement System Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-primary-800">
              Employees by Retirement System
            </h3>
          </div>
          <div className="card-body">
            {bySystemData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bySystemData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine
                  >
                    {bySystemData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-neutral-400 py-12 text-center">
                No retirement system data available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-primary-800">Summary Statistics</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Total Employees
              </p>
              <p className="mt-1 text-lg font-bold text-primary-800">
                {data.totalEmployees.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Avg Years of Service
              </p>
              <p className="mt-1 text-lg font-bold text-primary-800">
                {data.averageServiceYears.toFixed(1)} years
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Avg Salary
              </p>
              <p className="mt-1 text-lg font-bold text-primary-800">
                ${data.averageSalary.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Retirement Systems
              </p>
              <p className="mt-1 text-lg font-bold text-primary-800">
                {Object.keys(data.byRetirementPlan).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Reports page (main)
// ---------------------------------------------------------------------------

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabKey>('eligibility');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eligibilityData, setEligibilityData] = useState<EligibilityReport | null>(null);
  const [casesData, setCasesData] = useState<CasesReport | null>(null);
  const [demographicsData, setDemographicsData] = useState<DemographicsReport | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [elig, cs, demo] = await Promise.all([
        reports.eligibility(),
        reports.cases(),
        reports.demographics(),
      ]);
      setEligibilityData(elig);
      setCasesData(cs);
      setDemographicsData(demo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load report data. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // -- Error state --
  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Reports &amp; Analytics</h1>
        </div>
        <div className="alert-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error loading reports</p>
            <p className="mt-1">{error}</p>
          </div>
          <button onClick={fetchAll} className="btn-secondary btn-sm ml-auto">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Reports &amp; Analytics</h1>
        <button onClick={fetchAll} className="btn-secondary btn-sm" disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-neutral-200">
        <nav className="-mb-px flex gap-6" aria-label="Report tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-700 text-primary-800'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <SectionSkeleton />
      ) : (
        <>
          {activeTab === 'eligibility' && eligibilityData && (
            <EligibilityTab data={eligibilityData} />
          )}
          {activeTab === 'cases' && casesData && <CaseMetricsTab data={casesData} />}
          {activeTab === 'demographics' && demographicsData && (
            <DemographicsTab data={demographicsData} />
          )}
        </>
      )}
    </div>
  );
}
