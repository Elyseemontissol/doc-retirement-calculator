import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { employees as employeesApi } from '../services/api';
import type { Employee } from '../types';

const RETIREMENT_PLANS: { value: string; label: string }[] = [
  { value: '', label: 'All Systems' },
  { value: 'CSRS', label: 'CSRS' },
  { value: 'CSRS-Offset', label: 'CSRS-Offset' },
  { value: 'FERS', label: 'FERS' },
  { value: 'FERS-RAE', label: 'FERS-RAE' },
  { value: 'FERS-FRAE', label: 'FERS-FRAE' },
];

const PLAN_BADGE_CLASS: Record<string, string> = {
  CSRS: 'badge-primary',
  'CSRS-Offset': 'badge-accent',
  FERS: 'badge-success',
  'FERS-RAE': 'badge-warning',
  'FERS-FRAE': 'badge-danger',
};

function formatServiceYears(scd: string): string {
  const start = new Date(scd);
  const now = new Date();
  const years = differenceInYears(now, start);
  const months = differenceInMonths(now, start) % 12;
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}yr`;
  return `${years}yr ${months}mo`;
}

const PAGE_SIZE = 15;

export default function EmployeeList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [planFilter, setPlanFilter] = useState(() => searchParams.get('plan') || '');
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const result = await employeesApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        retirementPlan: planFilter || undefined,
      });
      setData(result.data);
      setTotal(result.pagination.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (page > 1) params.page = String(page);
    if (search) params.search = search;
    if (planFilter) params.plan = planFilter;
    setSearchParams(params, { replace: true });
  }, [page, search, planFilter, setSearchParams]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  function handlePlanChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPlanFilter(e.target.value);
    setPage(1);
  }

  // ------------------------------------------------------------------
  //  Skeleton rows for loading state
  // ------------------------------------------------------------------
  function SkeletonRows() {
    return (
      <>
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: 7 }).map((__, j) => (
              <td key={j}>
                <div className="skeleton h-4 w-full max-w-[120px]">&nbsp;</div>
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${total} employee${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-10"
          />
        </form>

        <select
          value={planFilter}
          onChange={handlePlanChange}
          className="form-select w-full sm:w-52"
        >
          {RETIREMENT_PLANS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Grade / Step</th>
              <th>Retirement System</th>
              <th>Service Date</th>
              <th>Years of Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Users className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-500">No employees found</p>
                  <p className="text-xs text-neutral-400">
                    {search || planFilter
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No employee records have been created yet.'}
                  </p>
                </td>
              </tr>
            ) : (
              data.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <Link
                      to={`/employees/${emp.id}`}
                      className="font-medium text-primary-700 hover:text-primary-900"
                    >
                      {emp.lastName}, {emp.firstName}
                    </Link>
                  </td>
                  <td className="text-neutral-500">{emp.email}</td>
                  <td>
                    {emp.payPlan}-{emp.grade}/{emp.step}
                  </td>
                  <td>
                    <span className={PLAN_BADGE_CLASS[emp.retirementPlan] || 'badge-neutral'}>
                      {emp.retirementPlan}
                    </span>
                  </td>
                  <td>{format(new Date(emp.serviceComputationDate), 'MM/dd/yyyy')}</td>
                  <td>{formatServiceYears(emp.serviceComputationDate)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="btn-secondary btn-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary btn-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary btn-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
