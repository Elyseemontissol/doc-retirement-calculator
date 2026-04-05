import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Printer,
  Eye,
  FilePlus,
  ClipboardList,
  CheckCircle2,
  PenLine,
  FileCheck,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { forms, employees } from '../services/api';
import type { GeneratedForm, FormType, Employee } from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-neutral',
  completed: 'badge-success',
  signed: 'badge-accent',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <PenLine className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  signed: <FileCheck className="h-3.5 w-3.5" />,
};

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ---------------------------------------------------------------------------
//  Form data section labels (for preview)
// ---------------------------------------------------------------------------

const SECTION_KEYS: Record<string, string[]> = {
  'Employee Information': [
    'employeeName', 'firstName', 'lastName', 'dateOfBirth', 'ssn', 'email',
    'maritalStatus', 'numberOfDependents', 'address', 'phone', 'agencyCode',
    'organizationCode',
  ],
  'Service Information': [
    'payPlan', 'grade', 'step', 'currentSalary', 'serviceComputationDate',
    'retirementPlan', 'yearsOfService', 'monthsOfService', 'sickLeaveHours',
    'annualLeaveHours', 'localityPayArea',
  ],
  'Retirement Information': [
    'retirementDate', 'retirementType', 'highThreeAverage', 'grossAnnuity',
    'netAnnuity', 'monthlyAnnuity', 'fersSupplement', 'estimatedSSA',
  ],
  'Benefits Elections': [
    'survivorBenefitOption', 'survivorBenefitReduction', 'fegliBasicLife',
    'fegliOptionA', 'fegliOptionB', 'fegliOptionC', 'tspBalance',
    'tspWithdrawalOption', 'tspMonthlyIncome',
  ],
  'Signatures': [
    'employeeSignature', 'employeeSignatureDate', 'supervisorSignature',
    'supervisorSignatureDate', 'hrSpecialistSignature', 'hrSpecialistSignatureDate',
  ],
};

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

// ---------------------------------------------------------------------------
//  Skeleton helpers
// ---------------------------------------------------------------------------

function FormCardSkeleton() {
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-3/4" />
        <div className="flex gap-2 mt-2">
          <div className="skeleton h-5 w-12 rounded-full" />
          <div className="skeleton h-5 w-12 rounded-full" />
        </div>
        <div className="skeleton h-9 w-full rounded-md mt-2" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      <td><div className="skeleton h-4 w-16" /></td>
      <td><div className="skeleton h-4 w-32" /></td>
      <td><div className="skeleton h-4 w-24" /></td>
      <td><div className="skeleton h-4 w-16" /></td>
      <td><div className="skeleton h-4 w-20" /></td>
      <td><div className="skeleton h-4 w-12" /></td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
//  Main Component
// ---------------------------------------------------------------------------

export default function FormsCenter() {
  // Data state
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [generatedForms, setGeneratedForms] = useState<GeneratedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate modal state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Preview panel state
  const [previewForm, setPreviewForm] = useState<GeneratedForm | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // -------------------------------------------------------------------------
  //  Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types = await forms.getTypes();
      setFormTypes(Array.isArray(types) ? types : []);
    } catch {
      setError('Failed to load form types. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Employee search with debounce
  useEffect(() => {
    if (employeeSearch.length < 2) {
      setEmployeeResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchingEmployees(true);
      try {
        const result = await employees.list({ search: employeeSearch, limit: 10 });
        setEmployeeResults(result.data);
      } catch {
        setEmployeeResults([]);
      } finally {
        setSearchingEmployees(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [employeeSearch]);

  // -------------------------------------------------------------------------
  //  Handlers
  // -------------------------------------------------------------------------

  function openGenerate(ft: FormType) {
    setSelectedFormType(ft);
    setEmployeeSearch('');
    setEmployeeResults([]);
    setSelectedEmployee(null);
    setGenerateError(null);
    setGenerateOpen(true);
  }

  function closeGenerate() {
    setGenerateOpen(false);
    setSelectedFormType(null);
    setSelectedEmployee(null);
    setGenerateError(null);
  }

  async function handleGenerate() {
    if (!selectedFormType || !selectedEmployee) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await forms.generate({
        formNumber: selectedFormType.formNumber,
        employeeId: selectedEmployee.id,
      });
      setGeneratedForms((prev) => [result, ...prev]);
      closeGenerate();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setGenerateError(
        axiosErr?.response?.data?.error || (err instanceof Error ? err.message : 'Failed to generate form. Please try again.'),
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleViewForm(formId: string) {
    setLoadingPreview(true);
    try {
      const result = await forms.getById(formId);
      setPreviewForm(result);
    } catch {
      setPreviewForm(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  // -------------------------------------------------------------------------
  //  Organize form data into sections for preview
  // -------------------------------------------------------------------------

  function organizeFormData(data: Record<string, unknown>) {
    const assigned = new Set<string>();
    const sections: { title: string; fields: [string, unknown][] }[] = [];

    for (const [sectionTitle, keys] of Object.entries(SECTION_KEYS)) {
      const fields: [string, unknown][] = [];
      for (const key of keys) {
        if (key in data) {
          fields.push([key, data[key]]);
          assigned.add(key);
        }
      }
      if (fields.length > 0) {
        sections.push({ title: sectionTitle, fields });
      }
    }

    // Remaining fields
    const remaining: [string, unknown][] = [];
    for (const [key, value] of Object.entries(data)) {
      if (!assigned.has(key)) {
        remaining.push([key, value]);
      }
    }
    if (remaining.length > 0) {
      sections.push({ title: 'Additional Information', fields: remaining });
    }

    return sections;
  }

  // -------------------------------------------------------------------------
  //  Error state
  // -------------------------------------------------------------------------

  if (error && !loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Forms Center</h1>
            <p className="page-subtitle">Generate and manage OPM retirement forms</p>
          </div>
        </div>
        <div className="alert-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error loading forms</p>
            <p className="mt-1">{error}</p>
          </div>
          <button onClick={fetchData} className="btn-secondary btn-sm ml-auto">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  //  Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Forms Center</h1>
          <p className="page-subtitle">Generate and manage OPM retirement forms</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">
            {formTypes.length} form type{formTypes.length !== 1 ? 's' : ''} available
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/*  Available Forms                                                   */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-primary-700" />
          <h2 className="text-lg font-semibold text-primary-800">Available Forms</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FormCardSkeleton key={i} />
            ))}
          </div>
        ) : formTypes.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No form types available at this time.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formTypes.map((ft) => (
              <div key={ft.formNumber} className="card hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl font-bold text-primary-800">{ft.formNumber}</span>
                    <FileText className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-700 mb-1">{ft.formName}</h3>
                  <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{ft.description}</p>
                  {'applicableSystems' in ft && Array.isArray((ft as any).applicableSystems) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(ft as any).applicableSystems.map((sys: string) => (
                        <span key={sys} className="badge-primary text-xs">
                          {sys}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => openGenerate(ft)}
                    className="btn-primary w-full text-sm"
                  >
                    <FilePlus className="h-4 w-4" />
                    Generate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Generated Forms History                                           */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="h-5 w-5 text-primary-700" />
          <h2 className="text-lg font-semibold text-primary-800">Generated Forms</h2>
        </div>

        <div className="card">
          <div className="table-wrapper border-0 rounded-none rounded-b-lg">
            {loading ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Form #</th>
                    <th>Form Name</th>
                    <th>Status</th>
                    <th>Date Generated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            ) : generatedForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm">No forms generated yet.</p>
                <p className="text-neutral-400 text-xs mt-1">
                  Select a form type above and click Generate to get started.
                </p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Form #</th>
                    <th>Form Name</th>
                    <th>Status</th>
                    <th>Date Generated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedForms.map((gf) => (
                    <tr key={gf.id}>
                      <td className="font-medium text-primary-700">{gf.formNumber}</td>
                      <td>{gf.formName}</td>
                      <td>
                        <span className={`${STATUS_BADGE[gf.status] ?? 'badge-neutral'} inline-flex items-center gap-1`}>
                          {STATUS_ICON[gf.status]}
                          {statusLabel(gf.status)}
                        </span>
                      </td>
                      <td className="text-sm text-neutral-600">
                        {format(new Date(gf.generatedAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td>
                        <button
                          onClick={() => handleViewForm(gf.id)}
                          className="btn-ghost btn-sm"
                          disabled={loadingPreview}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Generate Form Modal                                               */}
      {/* ----------------------------------------------------------------- */}
      {generateOpen && selectedFormType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeGenerate}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div>
                <h3 className="text-lg font-semibold text-primary-800">Generate Form</h3>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {selectedFormType.formNumber} - {selectedFormType.formName}
                </p>
              </div>
              <button onClick={closeGenerate} className="btn-ghost btn-sm p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary-800">
                      {selectedFormType.formNumber}
                    </p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      {selectedFormType.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Search */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Select Employee
                </label>

                {selectedEmployee ? (
                  <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {selectedEmployee.retirementPlan} &middot; {selectedEmployee.agencyCode}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployee(null);
                        setEmployeeSearch('');
                      }}
                      className="btn-ghost btn-sm p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      className="form-input pl-9"
                      placeholder="Search by name or ID..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />
                    {searchingEmployees && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 animate-spin" />
                    )}

                    {/* Dropdown */}
                    {employeeResults.length > 0 && !selectedEmployee && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {employeeResults.map((emp) => (
                          <button
                            key={emp.id}
                            className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors border-b border-neutral-100 last:border-0"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEmployeeSearch('');
                              setEmployeeResults([]);
                            }}
                          >
                            <p className="text-sm font-medium text-neutral-800">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {emp.retirementPlan} &middot; Grade {emp.grade} &middot; {emp.agencyCode}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {employeeSearch.length >= 2 &&
                      !searchingEmployees &&
                      employeeResults.length === 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg p-4 text-center">
                          <p className="text-sm text-neutral-500">No employees found.</p>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {generateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{generateError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
              <button onClick={closeGenerate} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="btn-primary"
                disabled={!selectedEmployee || generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FilePlus className="h-4 w-4" />
                    Generate Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/*  Form Preview Panel                                                */}
      {/* ----------------------------------------------------------------- */}
      {(previewForm || loadingPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!loadingPreview) setPreviewForm(null);
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
                <p className="text-sm text-neutral-500">Loading form preview...</p>
              </div>
            ) : previewForm ? (
              <>
                {/* Preview Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-50 rounded-t-xl">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-primary-800">
                        {previewForm.formNumber}
                      </h3>
                      <span className={`${STATUS_BADGE[previewForm.status] ?? 'badge-neutral'} inline-flex items-center gap-1`}>
                        {STATUS_ICON[previewForm.status]}
                        {statusLabel(previewForm.status)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{previewForm.formName}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Generated {format(new Date(previewForm.generatedAt), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreviewForm(null)}
                    className="btn-ghost btn-sm p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Preview Body */}
                <div className="p-6">
                  {previewForm.data && Object.keys(previewForm.data).length > 0 ? (
                    <div className="space-y-6">
                      {organizeFormData(previewForm.data).map((section) => (
                        <div key={section.title}>
                          <h4 className="text-sm font-semibold text-primary-700 uppercase tracking-wide border-b border-primary-100 pb-2 mb-3">
                            {section.title}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {section.fields.map(([key, value]) => (
                              <div key={key} className="flex flex-col py-1">
                                <span className="text-xs text-neutral-500">
                                  {formatFieldLabel(key)}
                                </span>
                                <span className="text-sm font-medium text-neutral-800">
                                  {formatFieldValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                      <p className="text-neutral-500 text-sm">No form data available.</p>
                    </div>
                  )}
                </div>

                {/* Preview Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
                  <button
                    onClick={() => window.print()}
                    className="btn-secondary"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setPreviewForm(null)}
                    className="btn-primary"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
