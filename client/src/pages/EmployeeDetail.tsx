import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Briefcase,
  DollarSign,
  PiggyBank,
  Shield,
  Calculator,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  employees as employeesApi,
  calculations as calculationsApi,
  cases as casesApi,
} from '../services/api';
import type {
  Employee,
  ServicePeriod,
  SalaryRecord,
  CalculationResult,
  RetirementCase,
} from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const PLAN_BADGE: Record<string, string> = {
  CSRS: 'badge-primary',
  'CSRS-Offset': 'badge-accent',
  FERS: 'badge-success',
  'FERS-RAE': 'badge-warning',
  'FERS-FRAE': 'badge-danger',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-primary',
  under_review: 'badge-warning',
  approved: 'badge-success',
  processed: 'badge-accent',
  closed: 'badge-danger',
};

const PIE_COLORS = ['#1e3a5f', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type TabKey = 'service' | 'salary' | 'tsp' | 'fegli' | 'calculations' | 'cases';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'service', label: 'Service History', icon: Briefcase },
  { key: 'salary', label: 'Salary History', icon: DollarSign },
  { key: 'tsp', label: 'TSP Account', icon: PiggyBank },
  { key: 'fegli', label: 'FEGLI', icon: Shield },
  { key: 'calculations', label: 'Calculations', icon: Calculator },
  { key: 'cases', label: 'Cases', icon: FolderOpen },
];

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function serviceLabel(scd: string): string {
  const start = new Date(scd);
  const now = new Date();
  const y = differenceInYears(now, start);
  const m = differenceInMonths(now, start) % 12;
  return `${y} years, ${m} months`;
}

function totalCreditableService(periods: ServicePeriod[]): string {
  let totalMonths = 0;
  for (const p of periods) {
    if (!p.isCreditable) continue;
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date();
    totalMonths += differenceInMonths(end, start);
  }
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return `${y} years, ${m} months`;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServicePeriod[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [calcs, setCalcs] = useState<CalculationResult[]>([]);
  const [empCases, setEmpCases] = useState<RetirementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('service');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [emp, svc, sal, c, cs] = await Promise.all([
        employeesApi.getById(id),
        employeesApi.getServiceHistory(id),
        employeesApi.getSalaryHistory(id),
        calculationsApi.getByEmployee(id),
        casesApi.list({ employeeId: id } as any),
      ]);
      setEmployee(emp);
      setServiceHistory(svc);
      setSalaryHistory(sal);
      setCalcs(c);
      setEmpCases(cs.data);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    if (!id) return;
    setSyncing(true);
    try {
      await employeesApi.syncNFC(id);
      await load();
    } finally {
      setSyncing(false);
    }
  }

  // ------------------------------------------------------------------
  //  Loading / not found
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-neutral-500">Employee not found.</p>
        <button onClick={() => navigate('/employees')} className="btn-secondary mt-4">
          Back to Directory
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  //  Derived data
  // ------------------------------------------------------------------
  const fullName = `${employee.firstName} ${employee.lastName}`;

  // Salary chart data
  const salaryChartData = [...salaryHistory]
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())
    .map((s) => ({
      date: format(new Date(s.effectiveDate), 'MMM yyyy'),
      basicPay: s.basicPay,
      totalPay: s.totalPay,
    }));

  // TSP fund allocation for pie chart
  const tsp = employee.tspAccount;
  const fundData = [
    { name: 'G Fund', value: tsp.funds.gFund },
    { name: 'F Fund', value: tsp.funds.fFund },
    { name: 'C Fund', value: tsp.funds.cFund },
    { name: 'S Fund', value: tsp.funds.sFund },
    { name: 'I Fund', value: tsp.funds.iFund },
    ...tsp.funds.lFunds.map((l) => ({ name: l.name, value: l.percentage })),
  ].filter((f) => f.value > 0);

  // ------------------------------------------------------------------
  //  Tab content renderers
  // ------------------------------------------------------------------

  function renderServiceHistory() {
    return (
      <div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Agency</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Service Type</th>
                <th>Coverage</th>
                <th>Creditable</th>
              </tr>
            </thead>
            <tbody>
              {serviceHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No service history records.
                  </td>
                </tr>
              ) : (
                serviceHistory.map((sp) => (
                  <tr key={sp.id}>
                    <td className="font-medium">{sp.agencyName}</td>
                    <td>{format(new Date(sp.startDate), 'MM/dd/yyyy')}</td>
                    <td>{sp.endDate ? format(new Date(sp.endDate), 'MM/dd/yyyy') : 'Present'}</td>
                    <td className="capitalize">{sp.serviceType}</td>
                    <td>{sp.retirementCoverage}</td>
                    <td>
                      {sp.isCreditable ? (
                        <span className="badge-success">
                          <CheckCircle2 className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="badge-danger">
                          <XCircle className="h-3 w-3" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {serviceHistory.length > 0 && (
          <div className="mt-4 card px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-600">Total Creditable Service</span>
            <span className="text-sm font-bold text-primary-800">
              {totalCreditableService(serviceHistory)}
            </span>
          </div>
        )}
      </div>
    );
  }

  function renderSalaryHistory() {
    return (
      <div className="space-y-6">
        {salaryChartData.length > 1 && (
          <div className="card card-body">
            <h3 className="mb-4 text-base font-semibold text-neutral-700">Salary Progression</h3>
            <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salaryChartData}>
                <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="basicPay" stroke="var(--chart-bar-fill, #1e3a5f)" name="Basic Pay" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalPay" stroke="#10b981" name="Total Pay" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>Basic Pay</th>
                <th>Locality Adjustment</th>
                <th>Total Pay</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-400">
                    No salary history records.
                  </td>
                </tr>
              ) : (
                [...salaryHistory]
                  .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                  .map((s, i) => (
                    <tr key={i}>
                      <td>{format(new Date(s.effectiveDate), 'MM/dd/yyyy')}</td>
                      <td>{money(s.basicPay)}</td>
                      <td>{money(s.localityAdjustment)}</td>
                      <td className="font-medium">{money(s.totalPay)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderTSP() {
    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="stat-card">
            <p className="stat-label">Total Balance</p>
            <p className="stat-value text-xl">{money(tsp.accountBalance)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Traditional</p>
            <p className="stat-value text-xl">{money(tsp.traditionalBalance)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Roth</p>
            <p className="stat-value text-xl">{money(tsp.rothBalance)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Contribution %</p>
            <p className="stat-value text-xl">{pct(tsp.contributionPercentage)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Loan Balance</p>
            <p className="stat-value text-xl">{money(tsp.loanBalance)}</p>
          </div>
        </div>

        {/* Pie chart */}
        {fundData.length > 0 && (
          <div className="card card-body">
            <h3 className="mb-4 text-base font-semibold text-neutral-700">Fund Allocation</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fundData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }: { name: string; value: number }) => `${name} (${pct(value)})`}
                >
                  {fundData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => pct(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Contribution details */}
        <div className="card card-body">
          <h3 className="mb-3 text-base font-semibold text-neutral-700">Contribution Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">Employee Contribution</p>
              <p className="text-lg font-bold text-primary-800">{pct(tsp.contributionPercentage)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">Agency Match</p>
              <p className="text-lg font-bold text-primary-800">{pct(tsp.agencyMatchPercentage)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500">Outstanding Loan</p>
              <p className="text-lg font-bold text-primary-800">{money(tsp.loanBalance)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderFEGLI() {
    const fegli = employee!.fegliEnrollment;
    const salary = employee!.currentSalary;
    // BIA = salary rounded up to next $1,000 + $2,000
    const bia = Math.ceil(salary / 1000) * 1000 + 2000;

    // Rough monthly premium estimate (simplified)
    const basicPremium = fegli.basicLife ? (bia / 1000) * 0.15 : 0;
    const optAPremium = fegli.optionA ? 0.65 : 0;
    const optBPremium = fegli.optionB ? fegli.optionBMultiple * (salary / 1000) * 0.065 : 0;
    const optCPremium = fegli.optionC ? fegli.optionCMultiple * 2.3 : 0;
    const totalPremium = basicPremium + optAPremium + optBPremium + optCPremium;

    return (
      <div className="space-y-6">
        <div className="card card-body">
          <h3 className="mb-4 text-base font-semibold text-neutral-700">FEGLI Coverage Summary</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Basic */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-700">Basic Life Insurance</h4>
                {fegli.basicLife ? (
                  <span className="badge-success"><CheckCircle2 className="h-3 w-3" /> Enrolled</span>
                ) : (
                  <span className="badge-danger"><XCircle className="h-3 w-3" /> Not Enrolled</span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                Coverage Amount (BIA): <span className="font-semibold text-neutral-800">{money(bia)}</span>
              </p>
            </div>

            {/* Option A */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-700">Option A - Standard</h4>
                {fegli.optionA ? (
                  <span className="badge-success"><CheckCircle2 className="h-3 w-3" /> Enrolled</span>
                ) : (
                  <span className="badge-danger"><XCircle className="h-3 w-3" /> Not Enrolled</span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                Coverage: <span className="font-semibold text-neutral-800">$10,000</span>
              </p>
            </div>

            {/* Option B */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-700">Option B - Additional</h4>
                {fegli.optionB ? (
                  <span className="badge-success"><CheckCircle2 className="h-3 w-3" /> Enrolled</span>
                ) : (
                  <span className="badge-danger"><XCircle className="h-3 w-3" /> Not Enrolled</span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                Multiple: <span className="font-semibold text-neutral-800">{fegli.optionBMultiple}x</span>
                {' | '}
                Coverage: <span className="font-semibold text-neutral-800">{money(salary * fegli.optionBMultiple)}</span>
              </p>
            </div>

            {/* Option C */}
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-neutral-700">Option C - Family</h4>
                {fegli.optionC ? (
                  <span className="badge-success"><CheckCircle2 className="h-3 w-3" /> Enrolled</span>
                ) : (
                  <span className="badge-danger"><XCircle className="h-3 w-3" /> Not Enrolled</span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                Multiple: <span className="font-semibold text-neutral-800">{fegli.optionCMultiple}x</span>
                {' | '}
                Spouse: <span className="font-semibold text-neutral-800">{money(5000 * fegli.optionCMultiple)}</span>
                {', '}
                Child: <span className="font-semibold text-neutral-800">{money(2500 * fegli.optionCMultiple)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <p className="stat-label">Estimated Total Monthly Premium</p>
          <p className="stat-value">{money(totalPremium)}</p>
          <p className="text-xs text-neutral-400 mt-1">Approximate; actual premiums depend on age band.</p>
        </div>
      </div>
    );
  }

  function renderCalculations() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-700">Past Calculations</h3>
          <Link to={`/calculator?employeeId=${id}`} className="btn-primary btn-sm">
            Run New Calculation
          </Link>
        </div>

        {calcs.length === 0 ? (
          <div className="card card-body text-center py-12">
            <Calculator className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm text-neutral-500">No calculations have been run for this employee.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Retirement Type</th>
                  <th>Retirement Date</th>
                  <th>Monthly Annuity</th>
                  <th>Total Monthly Income</th>
                </tr>
              </thead>
              <tbody>
                {calcs.map((c) => (
                  <tr key={c.id}>
                    <td>{format(new Date(c.calculatedAt), 'MM/dd/yyyy')}</td>
                    <td className="capitalize">{c.retirementType.replace(/_/g, ' ')}</td>
                    <td>{format(new Date(c.retirementDate), 'MM/dd/yyyy')}</td>
                    <td className="font-medium">{money(c.monthlyNetAnnuity)}</td>
                    <td className="font-bold text-primary-800">{money(c.totalMonthlyIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderCases() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-700">Retirement Cases</h3>
          <Link to={`/cases/new?employeeId=${id}`} className="btn-primary btn-sm">
            Create New Case
          </Link>
        </div>

        {empCases.length === 0 ? (
          <div className="card card-body text-center py-12">
            <FolderOpen className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm text-neutral-500">No retirement cases for this employee.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Assigned Specialist</th>
                </tr>
              </thead>
              <tbody>
                {empCases.map((rc) => (
                  <tr key={rc.id}>
                    <td>
                      <Link to={`/cases/${rc.id}`} className="font-medium text-primary-700 hover:text-primary-900">
                        {rc.caseNumber}
                      </Link>
                    </td>
                    <td className="capitalize">{rc.type.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={STATUS_BADGE[rc.status] || 'badge-neutral'}>
                        {rc.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{format(new Date(rc.createdAt), 'MM/dd/yyyy')}</td>
                    <td>{rc.assignedSpecialistId || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const TAB_RENDERERS: Record<TabKey, () => JSX.Element> = {
    service: renderServiceHistory,
    salary: renderSalaryHistory,
    tsp: renderTSP,
    fegli: renderFEGLI,
    calculations: renderCalculations,
    cases: renderCases,
  };

  // ------------------------------------------------------------------
  //  Main render
  // ------------------------------------------------------------------
  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate('/employees')}
        className="btn-ghost btn-sm mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employee Directory
      </button>

      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">{fullName}</h1>
          <span className={PLAN_BADGE[employee.retirementPlan] || 'badge-neutral'}>
            {employee.retirementPlan}
          </span>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-accent">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync with NFC'}
        </button>
      </div>

      {/* Overview card */}
      <div className="card card-body mb-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Overview</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Personal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Personal</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Date of Birth</dt>
                <dd className="font-medium">{format(new Date(employee.dateOfBirth), 'MM/dd/yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Email</dt>
                <dd className="font-medium">{employee.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Marital Status</dt>
                <dd className="font-medium capitalize">{employee.maritalStatus}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Dependents</dt>
                <dd className="font-medium">{employee.numberOfDependents}</dd>
              </div>
            </dl>
          </div>

          {/* Position */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Position</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Agency</dt>
                <dd className="font-medium">{employee.agencyCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Org Code</dt>
                <dd className="font-medium">{employee.organizationCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Pay Plan / Grade / Step</dt>
                <dd className="font-medium">{employee.payPlan}-{employee.grade}/{employee.step}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Salary</dt>
                <dd className="font-medium">{money(employee.currentSalary)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Locality</dt>
                <dd className="font-medium">{employee.localityPayArea}</dd>
              </div>
            </dl>
          </div>

          {/* Retirement */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Retirement</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Plan</dt>
                <dd className="font-medium">{employee.retirementPlan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Service Comp. Date</dt>
                <dd className="font-medium">{format(new Date(employee.serviceComputationDate), 'MM/dd/yyyy')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Years of Service</dt>
                <dd className="font-medium">{serviceLabel(employee.serviceComputationDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Sick Leave Hours</dt>
                <dd className="font-medium">{employee.sickLeaveHours.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Annual Leave Hours</dt>
                <dd className="font-medium">{employee.annualLeaveHours.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-neutral-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{TAB_RENDERERS[activeTab]()}</div>
    </div>
  );
}
