import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Play,
  CheckCircle,
  Archive,
  Lock,
  RotateCcw,
  Plus,
  FileText,
  MessageSquare,
  Calculator,
  Shield,
  ChevronDown,
  Loader2,
  Clock,
  Briefcase,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  cases as casesApi,
  employees as employeesApi,
} from '../services/api';
import type {
  RetirementCase,
  CaseStatus,
  Employee,
  CoverageDetermination,
  CaseNote,
  GeneratedForm,
  CalculationResult,
} from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const STATUS_STEPS: { key: CaseStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'processed', label: 'Processed' },
  { key: 'closed', label: 'Closed' },
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

const FORM_TYPES = [
  { number: 'SF-2801', name: 'CSRS Retirement Application' },
  { number: 'SF-3107', name: 'FERS Retirement Application' },
  { number: 'SF-2818', name: 'FEGLI Election' },
  { number: 'TSP-70', name: 'TSP Withdrawal' },
  { number: 'SF-1152', name: 'Beneficiary Designation' },
];

const TABS = ['Overview', 'Determinations', 'Forms', 'Notes', 'Calculations'] as const;
type TabKey = (typeof TABS)[number];

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function statusIndex(status: CaseStatus): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<RetirementCase | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');

  // Action states
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Determination form
  const [showDetForm, setShowDetForm] = useState(false);
  const [detForm, setDetForm] = useState({
    type: 'coverage' as 'coverage' | 'FERCCA',
    currentCoverage: '',
    determinedCoverage: '',
    effectiveDate: '',
    rationale: '',
  });
  const [detSubmitting, setDetSubmitting] = useState(false);

  // Form generation
  const [showFormDropdown, setShowFormDropdown] = useState(false);
  const [formGenerating, setFormGenerating] = useState(false);

  // ------------------------------------------------------------------
  //  Data fetching
  // ------------------------------------------------------------------

  const fetchCase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await casesApi.getById(id);
      setCaseData(c);

      // Fetch employee
      try {
        const emp = await employeesApi.getById(c.employeeId);
        setEmployee(emp);
      } catch {
        // non-critical
      }
    } catch {
      setError('Failed to load case. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // ------------------------------------------------------------------
  //  Status actions
  // ------------------------------------------------------------------

  async function updateStatus(newStatus: CaseStatus) {
    if (!caseData) return;
    setStatusUpdating(true);
    try {
      const updated = await casesApi.updateStatus(caseData.id, { status: newStatus });
      setCaseData(updated);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  }

  // ------------------------------------------------------------------
  //  Notes
  // ------------------------------------------------------------------

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!caseData || !noteContent.trim()) return;
    setNoteSubmitting(true);
    try {
      await casesApi.addNote(caseData.id, { content: noteContent.trim() });
      setNoteContent('');
      // Re-fetch to get updated notes
      const updated = await casesApi.getById(caseData.id);
      setCaseData(updated);
    } catch {
      alert('Failed to add note.');
    } finally {
      setNoteSubmitting(false);
    }
  }

  // ------------------------------------------------------------------
  //  Determinations
  // ------------------------------------------------------------------

  async function handleAddDetermination(e: React.FormEvent) {
    e.preventDefault();
    if (!caseData) return;
    setDetSubmitting(true);
    try {
      await casesApi.addDetermination(caseData.id, {
        type: detForm.type,
        currentCoverage: detForm.currentCoverage,
        determinedCoverage: detForm.determinedCoverage,
        effectiveDate: detForm.effectiveDate,
        rationale: detForm.rationale,
      });
      setDetForm({
        type: 'coverage',
        currentCoverage: '',
        determinedCoverage: '',
        effectiveDate: '',
        rationale: '',
      });
      setShowDetForm(false);
      const updated = await casesApi.getById(caseData.id);
      setCaseData(updated);
    } catch {
      alert('Failed to add determination.');
    } finally {
      setDetSubmitting(false);
    }
  }

  // ------------------------------------------------------------------
  //  Form generation
  // ------------------------------------------------------------------

  async function handleGenerateForm(formNumber: string) {
    if (!caseData) return;
    setFormGenerating(true);
    setShowFormDropdown(false);
    try {
      await casesApi.generateForm(caseData.id, { formNumber });
      const updated = await casesApi.getById(caseData.id);
      setCaseData(updated);
    } catch {
      alert('Failed to generate form.');
    } finally {
      setFormGenerating(false);
    }
  }

  // ------------------------------------------------------------------
  //  Loading / Error states
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <Briefcase className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
        <h2 className="text-lg font-semibold text-neutral-700">Case Not Found</h2>
        <p className="mt-1 text-sm text-neutral-500">{error}</p>
        <Link to="/cases" className="btn-primary mt-4 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Link>
      </div>
    );
  }

  const currentStepIdx = statusIndex(caseData.status);

  // ------------------------------------------------------------------
  //  Status action buttons
  // ------------------------------------------------------------------

  function renderStatusActions() {
    if (!caseData) return null;
    const s = caseData.status;
    const disabled = statusUpdating;

    switch (s) {
      case 'draft':
        return (
          <button
            onClick={() => updateStatus('submitted')}
            disabled={disabled}
            className="btn-primary"
          >
            {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Case
          </button>
        );
      case 'submitted':
        return (
          <button
            onClick={() => updateStatus('under_review')}
            disabled={disabled}
            className="btn-accent"
          >
            {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Begin Review
          </button>
        );
      case 'under_review':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('draft')}
              disabled={disabled}
              className="btn-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Return to Draft
            </button>
            <button
              onClick={() => updateStatus('approved')}
              disabled={disabled}
              className="btn-primary"
            >
              {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </button>
          </div>
        );
      case 'approved':
        return (
          <button
            onClick={() => updateStatus('processed')}
            disabled={disabled}
            className="btn-accent"
          >
            {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Process
          </button>
        );
      case 'processed':
        return (
          <button
            onClick={() => updateStatus('closed')}
            disabled={disabled}
            className="btn-secondary"
          >
            {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Close Case
          </button>
        );
      default:
        return null;
    }
  }

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------

  return (
    <div>
      {/* Back link */}
      <Link
        to="/cases"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cases
      </Link>

      {/* Page header */}
      <div className="page-header">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">{caseData.caseNumber}</h1>
          <span className={STATUS_BADGE[caseData.status]}>
            {STATUS_LABEL[caseData.status]}
          </span>
          <span className="badge-info">{TYPE_LABEL[caseData.type] || caseData.type}</span>
        </div>
        <div className="flex items-center gap-2">{renderStatusActions()}</div>
      </div>

      {/* Status workflow bar */}
      <div className="card mb-6">
        <div className="card-body py-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isComplete = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isComplete
                          ? 'bg-primary-600 text-white'
                          : isCurrent
                            ? 'border-2 border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-2 border-neutral-200 bg-white text-neutral-400'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[10px] font-medium sm:text-xs ${
                        isCurrent ? 'text-primary-700' : isComplete ? 'text-neutral-700' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        i < currentStepIdx ? 'bg-primary-600' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-neutral-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <OverviewTab caseData={caseData} employee={employee} />
      )}
      {activeTab === 'Determinations' && (
        <DeterminationsTab
          determinations={caseData.determinations}
          showForm={showDetForm}
          setShowForm={setShowDetForm}
          form={detForm}
          setForm={setDetForm}
          submitting={detSubmitting}
          onSubmit={handleAddDetermination}
        />
      )}
      {activeTab === 'Forms' && (
        <FormsTab
          forms={caseData.forms}
          showDropdown={showFormDropdown}
          setShowDropdown={setShowFormDropdown}
          generating={formGenerating}
          onGenerate={handleGenerateForm}
        />
      )}
      {activeTab === 'Notes' && (
        <NotesTab
          notes={caseData.notes}
          noteContent={noteContent}
          setNoteContent={setNoteContent}
          submitting={noteSubmitting}
          onSubmit={handleAddNote}
        />
      )}
      {activeTab === 'Calculations' && (
        <CalculationsTab
          calculations={caseData.calculations}
          employeeId={caseData.employeeId}
        />
      )}
    </div>
  );
}

// =========================================================================
//  Tab: Overview
// =========================================================================

function OverviewTab({
  caseData,
  employee,
}: {
  caseData: RetirementCase;
  employee: Employee | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Employee info */}
      <div className="card">
        <div className="card-body">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Employee Information
          </h3>
          {employee ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {employee.lastName}, {employee.firstName}
                  </p>
                  <p className="text-sm text-neutral-500">{employee.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">Grade/Step</span>
                  <p className="font-medium">
                    {employee.payPlan}-{employee.grade}/{employee.step}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Retirement Plan</span>
                  <p className="font-medium">{employee.retirementPlan}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Current Salary</span>
                  <p className="font-medium">
                    ${employee.currentSalary.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">SCD</span>
                  <p className="font-medium">
                    {format(new Date(employee.serviceComputationDate), 'MM/dd/yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Sick Leave</span>
                  <p className="font-medium">{employee.sickLeaveHours} hours</p>
                </div>
                <div>
                  <span className="text-neutral-500">Date of Birth</span>
                  <p className="font-medium">
                    {format(new Date(employee.dateOfBirth), 'MM/dd/yyyy')}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to={`/employees/${employee.id}`}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  View full employee record &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Employee data unavailable.</p>
          )}
        </div>
      </div>

      {/* Case details */}
      <div className="card">
        <div className="card-body">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Case Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Case Number</span>
              <span className="font-medium text-neutral-900">{caseData.caseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Retirement Type</span>
              <span className="font-medium text-neutral-900">
                {TYPE_LABEL[caseData.type] || caseData.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Planned Retirement Date</span>
              <span className="font-medium text-neutral-900">
                {format(new Date(caseData.retirementDate), 'MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Status</span>
              <span className={STATUS_BADGE[caseData.status]}>
                {STATUS_LABEL[caseData.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Assigned Specialist</span>
              <span className="font-medium text-neutral-900">
                {caseData.assignedSpecialistId || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Created</span>
              <span className="font-medium text-neutral-900">
                {format(new Date(caseData.createdAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Last Updated</span>
              <span className="font-medium text-neutral-900">
                {format(new Date(caseData.updatedAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="card lg:col-span-2">
        <div className="card-body">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Activity Timeline
          </h3>
          <ActivityTimeline caseData={caseData} />
        </div>
      </div>
    </div>
  );
}

// Activity timeline - combines notes, forms, determinations chronologically
function ActivityTimeline({ caseData }: { caseData: RetirementCase }) {
  type TimelineEntry = {
    date: string;
    type: 'note' | 'form' | 'determination' | 'created';
    title: string;
    detail: string;
    icon: typeof Clock;
  };

  const entries: TimelineEntry[] = [];

  // Case creation
  entries.push({
    date: caseData.createdAt,
    type: 'created',
    title: 'Case Created',
    detail: `Case ${caseData.caseNumber} was created as ${TYPE_LABEL[caseData.type] || caseData.type} retirement.`,
    icon: Briefcase,
  });

  // Notes
  caseData.notes.forEach((n) => {
    entries.push({
      date: n.createdAt,
      type: 'note',
      title: `Note by ${n.authorName}`,
      detail: n.content,
      icon: MessageSquare,
    });
  });

  // Forms
  caseData.forms.forEach((f) => {
    entries.push({
      date: f.generatedAt,
      type: 'form',
      title: `Form Generated: ${f.formNumber}`,
      detail: f.formName,
      icon: FileText,
    });
  });

  // Determinations
  caseData.determinations.forEach((d) => {
    entries.push({
      date: d.determinedAt,
      type: 'determination',
      title: `${d.type === 'FERCCA' ? 'FERCCA' : 'Coverage'} Determination`,
      detail: `${d.currentCoverage} -> ${d.determinedCoverage}`,
      icon: Shield,
    });
  });

  // Sort newest first
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (entries.length === 0) {
    return <p className="text-sm text-neutral-400">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => {
        const IconComp = entry.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <IconComp className="h-4 w-4" />
              </div>
              {i < entries.length - 1 && <div className="mt-1 w-px flex-1 bg-neutral-200" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-neutral-900">{entry.title}</p>
              <p className="text-sm text-neutral-600">{entry.detail}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {format(new Date(entry.date), 'MMM d, yyyy h:mm a')} &middot;{' '}
                {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
//  Tab: Determinations
// =========================================================================

function DeterminationsTab({
  determinations,
  showForm,
  setShowForm,
  form,
  setForm,
  submitting,
  onSubmit,
}: {
  determinations: CoverageDetermination[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  form: {
    type: 'coverage' | 'FERCCA';
    currentCoverage: string;
    determinedCoverage: string;
    effectiveDate: string;
    rationale: string;
  };
  setForm: (v: any) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Coverage Determinations
        </h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            Add Determination
          </button>
        )}
      </div>

      {/* Existing determinations */}
      {determinations.length === 0 && !showForm && (
        <div className="card">
          <div className="card-body py-12 text-center">
            <Shield className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No determinations yet</p>
            <p className="text-xs text-neutral-400">
              Add a coverage or FERCCA determination for this case.
            </p>
          </div>
        </div>
      )}

      {determinations.map((det) => (
        <div key={det.id} className="card">
          <div className="card-body">
            <div className="mb-3 flex items-center justify-between">
              <span className={det.type === 'FERCCA' ? 'badge-warning' : 'badge-info'}>
                {det.type === 'FERCCA' ? 'FERCCA' : 'Coverage'}
              </span>
              <span className="text-xs text-neutral-400">
                {format(new Date(det.determinedAt), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-neutral-500">Current Coverage</span>
                <p className="font-medium text-neutral-900">{det.currentCoverage}</p>
              </div>
              <div>
                <span className="text-neutral-500">Determined Coverage</span>
                <p className="font-medium text-neutral-900">{det.determinedCoverage}</p>
              </div>
              <div>
                <span className="text-neutral-500">Effective Date</span>
                <p className="font-medium text-neutral-900">
                  {format(new Date(det.effectiveDate), 'MM/dd/yyyy')}
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Determined By</span>
                <p className="font-medium text-neutral-900">{det.determinedBy}</p>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm text-neutral-500">Rationale</span>
              <p className="mt-1 text-sm text-neutral-700">{det.rationale}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Add determination form */}
      {showForm && (
        <div className="card border-primary-200">
          <div className="card-body">
            <h4 className="mb-4 font-medium text-neutral-900">New Determination</h4>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as 'coverage' | 'FERCCA' })
                  }
                  className="form-select"
                >
                  <option value="coverage">Coverage Determination</option>
                  <option value="FERCCA">FERCCA (Coverage Error Correction)</option>
                </select>
              </div>

              {form.type === 'FERCCA' && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  FERCCA determinations address errors in retirement coverage. Document the
                  original coverage error, the corrected coverage, and the basis for the
                  correction under the Federal Erroneous Retirement Coverage Corrections Act.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Current Coverage
                  </label>
                  <input
                    type="text"
                    value={form.currentCoverage}
                    onChange={(e) => setForm({ ...form, currentCoverage: e.target.value })}
                    placeholder="e.g., CSRS, FERS"
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Determined Coverage
                  </label>
                  <input
                    type="text"
                    value={form.determinedCoverage}
                    onChange={(e) => setForm({ ...form, determinedCoverage: e.target.value })}
                    placeholder="e.g., FERS, CSRS-Offset"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Rationale
                </label>
                <textarea
                  value={form.rationale}
                  onChange={(e) => setForm({ ...form, rationale: e.target.value })}
                  rows={4}
                  placeholder={
                    form.type === 'FERCCA'
                      ? 'Describe the coverage error, how it was discovered, and the corrective action...'
                      : 'Explain the basis for this coverage determination...'
                  }
                  className="form-textarea"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Determination'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
//  Tab: Forms
// =========================================================================

function FormsTab({
  forms,
  showDropdown,
  setShowDropdown,
  generating,
  onGenerate,
}: {
  forms: GeneratedForm[];
  showDropdown: boolean;
  setShowDropdown: (v: boolean) => void;
  generating: boolean;
  onGenerate: (formNumber: string) => void;
}) {
  const FORM_STATUS_BADGE: Record<string, string> = {
    draft: 'badge-neutral',
    completed: 'badge-success',
    signed: 'badge-accent',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Generated Forms
        </h3>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={generating}
            className="btn-primary btn-sm"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate Form
            <ChevronDown className="h-3 w-3" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg">
              {FORM_TYPES.map((ft) => (
                <button
                  key={ft.number}
                  onClick={() => onGenerate(ft.number)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{ft.number}</p>
                    <p className="text-xs text-neutral-500">{ft.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="card">
          <div className="card-body py-12 text-center">
            <FileText className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No forms generated yet</p>
            <p className="text-xs text-neutral-400">
              Generate retirement forms for this case.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((f) => (
            <div key={f.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                      <FileText className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{f.formNumber}</p>
                      <p className="text-sm text-neutral-500">{f.formName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={FORM_STATUS_BADGE[f.status] || 'badge-neutral'}>
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  Generated {format(new Date(f.generatedAt), 'MMM d, yyyy h:mm a')}
                </p>

                {/* Form data preview */}
                {f.data && Object.keys(f.data).length > 0 && (
                  <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Form Data
                    </p>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {Object.entries(f.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <span className="text-neutral-500">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                          </span>
                          <span className="font-medium text-neutral-700">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
//  Tab: Notes
// =========================================================================

function NotesTab({
  notes,
  noteContent,
  setNoteContent,
  submitting,
  onSubmit,
}: {
  notes: CaseNote[];
  noteContent: string;
  setNoteContent: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Case Notes
      </h3>

      {notes.length === 0 && (
        <div className="card">
          <div className="card-body py-12 text-center">
            <MessageSquare className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No notes yet</p>
            <p className="text-xs text-neutral-400">Add a note to this case below.</p>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="card">
            <div className="card-body">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {getInitials(note.authorName)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">{note.authorName}</p>
                    <p className="text-xs text-neutral-400">
                      {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                    {note.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add note form */}
      <div className="card border-neutral-200">
        <div className="card-body">
          <h4 className="mb-3 text-sm font-medium text-neutral-700">Add a Note</h4>
          <form onSubmit={onSubmit}>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              placeholder="Write a note..."
              className="form-textarea"
              required
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !noteContent.trim()}
                className="btn-primary btn-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Add Note
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
//  Tab: Calculations
// =========================================================================

function CalculationsTab({
  calculations,
  employeeId,
}: {
  calculations: CalculationResult[];
  employeeId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Retirement Calculations
        </h3>
        <Link to={`/calculator?employeeId=${employeeId}`} className="btn-primary btn-sm">
          <Calculator className="h-4 w-4" />
          Run New Calculation
        </Link>
      </div>

      {calculations.length === 0 ? (
        <div className="card">
          <div className="card-body py-12 text-center">
            <Calculator className="mx-auto mb-2 h-10 w-10 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">No calculations yet</p>
            <p className="text-xs text-neutral-400">
              Run a retirement benefit calculation for this employee.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {calculations.map((calc) => (
            <div key={calc.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {calc.retirementSystem} &mdash; {TYPE_LABEL[calc.retirementType] || calc.retirementType}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Retirement Date: {format(new Date(calc.retirementDate), 'MM/dd/yyyy')}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {format(new Date(calc.calculatedAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="stat-card">
                    <span className="text-xs text-neutral-500">Gross Annuity</span>
                    <p className="text-lg font-bold text-neutral-900">
                      ${calc.grossAnnuity.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-400">/year</p>
                  </div>
                  <div className="stat-card">
                    <span className="text-xs text-neutral-500">Monthly Net</span>
                    <p className="text-lg font-bold text-neutral-900">
                      ${calc.monthlyNetAnnuity.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-400">/month</p>
                  </div>
                  <div className="stat-card">
                    <span className="text-xs text-neutral-500">High-3 Average</span>
                    <p className="text-lg font-bold text-neutral-900">
                      ${calc.highThreeAverage.toLocaleString()}
                    </p>
                  </div>
                  <div className="stat-card">
                    <span className="text-xs text-neutral-500">Total Monthly Income</span>
                    <p className="text-lg font-bold text-green-700">
                      ${calc.totalMonthlyIncome.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-3">
                  <span>
                    Service: {calc.totalServiceCredit.years}yr {calc.totalServiceCredit.months}mo
                  </span>
                  <span>TSP Balance: ${calc.tspBalance.toLocaleString()}</span>
                  {calc.fersSupplement != null && (
                    <span>FERS Supplement: ${calc.fersSupplement.toLocaleString()}/mo</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
