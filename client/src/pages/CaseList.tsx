import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  Clock,
  CheckCircle,
  Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { cases as casesApi, employees as employeesApi } from '../services/api';
import type { RetirementCase, CaseStatus } from '../types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'processed', label: 'Processed' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<CaseStatus, string> = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  under_review: 'badge-warning',
  approved: 'badge-success',
  processed: 'badge-accent',
  closed: 'badge-neutral',
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  processed: 'Processed',
  closed: 'Closed',
};

const TYPE_LABEL: Record<string, string> = {
  voluntary: 'Voluntary',
  early: 'Early',
  disability: 'Disability',
  deferred: 'Deferred',
  'MRA+10': 'MRA+10',
  discontinued: 'Discontinued',
};

const PAGE_SIZE = 15;

export default function CaseList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<RetirementCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);

  // Cache employee names for display
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  // Stat counts
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    under_review: 0,
    approved: 0,
    processed: 0,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const result = await casesApi.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setData(result.data);
      setTotal(result.pagination.total);

      // Fetch employee names for all cases
      const uniqueEmpIds = [...new Set(result.data.map((c) => c.employeeId))];
      const nameMap: Record<string, string> = { ...employeeNames };
      const missingIds = uniqueEmpIds.filter((id) => !nameMap[id]);

      if (missingIds.length > 0) {
        const empResults = await Promise.allSettled(
          missingIds.map((id) => employeesApi.getById(id)),
        );
        empResults.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const emp = r.value;
            nameMap[emp.id] = `${emp.lastName}, ${emp.firstName}`;
          } else {
            nameMap[missingIds[i]] = 'Unknown';
          }
        });
        setEmployeeNames(nameMap);
      }
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // Fetch stats on mount (all statuses)
  useEffect(() => {
    async function loadStats() {
      try {
        const [draftRes, reviewRes, approvedRes, processedRes, allRes] = await Promise.all([
          casesApi.list({ status: 'draft', limit: 1 }),
          casesApi.list({ status: 'under_review', limit: 1 }),
          casesApi.list({ status: 'approved', limit: 1 }),
          casesApi.list({ status: 'processed', limit: 1 }),
          casesApi.list({ limit: 1 }),
        ]);
        setStats({
          total: allRes.pagination.total,
          draft: draftRes.pagination.total,
          under_review: reviewRes.pagination.total,
          approved: approvedRes.pagination.total,
          processed: processedRes.pagination.total,
        });
      } catch {
        // Stats are non-critical
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (page > 1) params.page = String(page);
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    setSearchParams(params, { replace: true });
  }, [page, search, statusFilter, setSearchParams]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  // Filter by search locally (case number or employee name)
  const filtered = search
    ? data.filter((c) => {
        const lowerSearch = search.toLowerCase();
        const empName = (employeeNames[c.employeeId] || '').toLowerCase();
        return c.caseNumber.toLowerCase().includes(lowerSearch) || empName.includes(lowerSearch);
      })
    : data;

  function SkeletonRows() {
    return (
      <>
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i}>
            {Array.from({ length: 8 }).map((__, j) => (
              <td key={j}>
                <div className="skeleton h-4 w-full max-w-[120px]">&nbsp;</div>
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Retirement Cases</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${total} case${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link to="/cases/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Case
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-neutral-500">
            <Briefcase className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Total Cases</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.total}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-neutral-400">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Draft</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.draft}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Under Review</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.under_review}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Approved</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.approved}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-purple-600">
            <Archive className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Processed</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.processed}</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by case number or employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-10"
          />
        </form>

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="form-select w-full sm:w-52"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Case #</th>
              <th>Employee</th>
              <th>Type</th>
              <th>Retirement Date</th>
              <th>Status</th>
              <th>Specialist</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Briefcase className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-500">No cases found</p>
                  <p className="text-xs text-neutral-400">
                    {search || statusFilter
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No retirement cases have been created yet.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to={`/cases/${c.id}`}
                      className="font-medium text-primary-700 hover:text-primary-900"
                    >
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="text-neutral-700">
                    {employeeNames[c.employeeId] || 'Loading...'}
                  </td>
                  <td>{TYPE_LABEL[c.type] || c.type}</td>
                  <td>{format(new Date(c.retirementDate), 'MM/dd/yyyy')}</td>
                  <td>
                    <span className={STATUS_BADGE[c.status] || 'badge-neutral'}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                  </td>
                  <td className="text-neutral-500">
                    {c.assignedSpecialistId || '\u2014'}
                  </td>
                  <td className="text-neutral-500">
                    {format(new Date(c.createdAt), 'MM/dd/yyyy')}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/cases/${c.id}`)}
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
