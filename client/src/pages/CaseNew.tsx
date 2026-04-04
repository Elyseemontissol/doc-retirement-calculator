import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, User, Calendar, FileText, Loader2 } from 'lucide-react';
import { employees as employeesApi, cases as casesApi } from '../services/api';
import type { Employee, CaseType } from '../types';

const CASE_TYPES: { value: CaseType; label: string; description: string }[] = [
  { value: 'voluntary', label: 'Voluntary', description: 'Standard optional retirement' },
  { value: 'early', label: 'Early', description: 'Early optional retirement (VERA)' },
  { value: 'disability', label: 'Disability', description: 'Disability retirement' },
  { value: 'deferred', label: 'Deferred', description: 'Deferred retirement annuity' },
  { value: 'MRA+10', label: 'MRA+10', description: 'Minimum Retirement Age with 10+ years' },
  { value: 'discontinued', label: 'Discontinued', description: 'Discontinued service retirement' },
];

export default function CaseNew() {
  const navigate = useNavigate();

  // Employee search state
  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [caseType, setCaseType] = useState<CaseType | ''>('');
  const [retirementDate, setRetirementDate] = useState('');
  const [notes, setNotes] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Employee search with debounce
  useEffect(() => {
    if (!empSearch || empSearch.length < 2) {
      setEmpResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setEmpLoading(true);
      try {
        const result = await employeesApi.list({ search: empSearch, limit: 10 });
        setEmpResults(result.data);
        setShowDropdown(true);
      } catch {
        setEmpResults([]);
      } finally {
        setEmpLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [empSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectEmployee(emp: Employee) {
    setSelectedEmployee(emp);
    setEmpSearch('');
    setShowDropdown(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.employee;
      return next;
    });
  }

  function clearEmployee() {
    setSelectedEmployee(null);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedEmployee) errs.employee = 'Please select an employee.';
    if (!caseType) errs.type = 'Please select a retirement type.';
    if (!retirementDate) errs.date = 'Please enter a planned retirement date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const newCase = await casesApi.create({
        employeeId: selectedEmployee!.id,
        type: caseType as CaseType,
        retirementDate,
      });

      // Add initial note if provided
      if (notes.trim()) {
        await casesApi.addNote(newCase.id, { content: notes.trim() });
      }

      navigate(`/cases/${newCase.id}`);
    } catch (err: any) {
      setErrors({
        submit: err?.response?.data?.error || 'Failed to create case. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/cases" className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="page-title">Create New Retirement Case</h1>
            <p className="page-subtitle">Initiate a retirement case for an employee</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        <div className="card">
          <div className="card-body space-y-6">
            {/* Employee search */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Employee <span className="text-red-500">*</span>
              </label>

              {selectedEmployee ? (
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-200 text-sm font-bold text-primary-700">
                        {selectedEmployee.firstName[0]}
                        {selectedEmployee.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {selectedEmployee.lastName}, {selectedEmployee.firstName}
                        </p>
                        <p className="text-sm text-neutral-500">{selectedEmployee.email}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-500">
                          <span>
                            {selectedEmployee.payPlan}-{selectedEmployee.grade}/{selectedEmployee.step}
                          </span>
                          <span className="text-neutral-300">|</span>
                          <span>{selectedEmployee.retirementPlan}</span>
                          <span className="text-neutral-300">|</span>
                          <span>SCD: {selectedEmployee.serviceComputationDate}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearEmployee}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className={`form-input pl-10 ${errors.employee ? 'border-red-500' : ''}`}
                  />
                  {empLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
                  )}

                  {showDropdown && empResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
                      {empResults.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => selectEmployee(emp)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <User className="h-4 w-4 text-neutral-400" />
                          <div>
                            <p className="text-sm font-medium text-neutral-900">
                              {emp.lastName}, {emp.firstName}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {emp.email} &middot; {emp.retirementPlan}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showDropdown && empResults.length === 0 && !empLoading && empSearch.length >= 2 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 shadow-lg">
                      No employees found for &ldquo;{empSearch}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {errors.employee && (
                <p className="mt-1 text-sm text-red-600">{errors.employee}</p>
              )}
            </div>

            {/* Retirement type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Retirement Type <span className="text-red-500">*</span>
              </label>
              <select
                value={caseType}
                onChange={(e) => {
                  setCaseType(e.target.value as CaseType);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.type;
                    return next;
                  });
                }}
                className={`form-select ${errors.type ? 'border-red-500' : ''}`}
              >
                <option value="">Select retirement type...</option>
                {CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} &mdash; {t.description}
                  </option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
            </div>

            {/* Retirement date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Planned Retirement Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="date"
                  value={retirementDate}
                  onChange={(e) => {
                    setRetirementDate(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.date;
                      return next;
                    });
                  }}
                  className={`form-input pl-10 ${errors.date ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            </div>

            {/* Initial notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Initial Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add any initial notes or context for this case..."
                className="form-textarea"
              />
              <p className="mt-1 text-xs text-neutral-400">
                Optional. These notes will be added to the case timeline.
              </p>
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
              <Link to="/cases" className="btn-secondary">
                Cancel
              </Link>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Create Case
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
