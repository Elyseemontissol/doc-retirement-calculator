import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { format, differenceInYears, parseISO } from 'date-fns';
import {
  Search,
  User,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  DollarSign,
  Shield,
  TrendingUp,
  PiggyBank,
  Heart,
  Printer,
  PlusCircle,
  RotateCcw,
  AlertCircle,
  ClipboardList,
  Building2,
  Clock,
  BadgeDollarSign,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { employees as employeesApi, calculations } from '../services/api';
import type {
  Employee,
  CalculationRequest,
  CalculationResult,
  SurvivorBenefitOption,
  TSPWithdrawalOption,
  TSPAnnuityType,
} from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Select Employee', icon: User },
  { label: 'Parameters', icon: ClipboardList },
  { label: 'Review', icon: Search },
  { label: 'Results', icon: TrendingUp },
] as const;

const RETIREMENT_TYPES: Record<string, { value: string; label: string }[]> = {
  CSRS: [
    { value: 'voluntary', label: 'Voluntary' },
    { value: 'early', label: 'Early' },
    { value: 'disability', label: 'Disability' },
    { value: 'deferred', label: 'Deferred' },
  ],
  'CSRS-Offset': [
    { value: 'voluntary', label: 'Voluntary' },
    { value: 'early', label: 'Early' },
    { value: 'disability', label: 'Disability' },
    { value: 'deferred', label: 'Deferred' },
  ],
  FERS: [
    { value: 'voluntary', label: 'Voluntary' },
    { value: 'early', label: 'Early' },
    { value: 'disability', label: 'Disability' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'MRA+10', label: 'MRA + 10' },
    { value: 'discontinued', label: 'Discontinued Service' },
  ],
  'FERS-RAE': [
    { value: 'voluntary', label: 'Voluntary' },
    { value: 'early', label: 'Early' },
    { value: 'disability', label: 'Disability' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'MRA+10', label: 'MRA + 10' },
    { value: 'discontinued', label: 'Discontinued Service' },
  ],
  'FERS-FRAE': [
    { value: 'voluntary', label: 'Voluntary' },
    { value: 'early', label: 'Early' },
    { value: 'disability', label: 'Disability' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'MRA+10', label: 'MRA + 10' },
    { value: 'discontinued', label: 'Discontinued Service' },
  ],
};

const PIE_COLORS = ['#5b7faf', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const SSA_AGES = Array.from({ length: 9 }, (_, i) => 62 + i);

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const isFersFamily = (plan: string) =>
  plan === 'FERS' || plan === 'FERS-RAE' || plan === 'FERS-FRAE';

// ---------------------------------------------------------------------------
//  Validation helpers
// ---------------------------------------------------------------------------

interface StepErrors {
  [key: string]: string;
}

function validateStep1(employee: Employee | null): StepErrors {
  const errors: StepErrors = {};
  if (!employee) errors.employee = 'Please select an employee.';
  return errors;
}

function validateStep2(
  retirementDate: string,
  retirementType: string,
  survivorBenefitOption: SurvivorBenefitOption,
  survivorBenefitSpouseAge: string,
): StepErrors {
  const errors: StepErrors = {};
  if (!retirementDate) errors.retirementDate = 'Retirement date is required.';
  if (!retirementType) errors.retirementType = 'Retirement type is required.';
  if (survivorBenefitOption !== 'none' && !survivorBenefitSpouseAge) {
    errors.survivorBenefitSpouseAge = 'Spouse age is required for survivor benefit.';
  }
  if (survivorBenefitOption !== 'none' && survivorBenefitSpouseAge) {
    const age = Number(survivorBenefitSpouseAge);
    if (isNaN(age) || age < 18 || age > 100) {
      errors.survivorBenefitSpouseAge = 'Spouse age must be between 18 and 100.';
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export default function Calculator() {
  // -- Wizard state --
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const stepContentRef = useRef<HTMLDivElement>(null);

  // Animate step content on step change
  useEffect(() => {
    if (stepContentRef.current) {
      gsap.fromTo(
        stepContentRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'all' },
      );
    }
  }, [step]);

  // -- Step 1 --
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // -- Step 2 --
  const [retirementDate, setRetirementDate] = useState('');
  const [retirementType, setRetirementType] = useState('');
  const [includeSickLeave, setIncludeSickLeave] = useState(true);
  const [survivorBenefitOption, setSurvivorBenefitOption] =
    useState<SurvivorBenefitOption>('full');
  const [survivorBenefitSpouseAge, setSurvivorBenefitSpouseAge] = useState('');
  const [ssaStartAge, setSsaStartAge] = useState(67);
  const [tspWithdrawalOption, setTspWithdrawalOption] =
    useState<TSPWithdrawalOption>('annuity');
  const [tspAnnuityType, setTspAnnuityType] = useState<TSPAnnuityType>('single');

  // -- Step 3/4 --
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);

  // -- Scenario comparison --
  const [scenarios, setScenarios] = useState<CalculationResult[]>([]);

  // -- Fetch employees when search changes --
  const fetchEmployees = useCallback(async (search: string) => {
    setLoadingEmployees(true);
    try {
      const res = await employeesApi.list({ search, limit: 20 });
      setEmployeeList(res.data);
    } catch {
      setEmployeeList([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEmployee) return;
    const t = setTimeout(() => {
      if (employeeSearch.length >= 1) {
        fetchEmployees(employeeSearch);
        setShowDropdown(true);
      } else {
        setEmployeeList([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [employeeSearch, fetchEmployees, selectedEmployee]);

  // Reset retirement type when employee changes (different plan = different options)
  useEffect(() => {
    setRetirementType('');
  }, [selectedEmployee?.retirementPlan]);

  // -- Build the request --
  const buildRequest = useCallback((): CalculationRequest | null => {
    if (!selectedEmployee) return null;
    return {
      employeeId: selectedEmployee.id,
      retirementDate,
      retirementType,
      includeSickLeave,
      survivorBenefitOption,
      ...(survivorBenefitOption !== 'none' && survivorBenefitSpouseAge
        ? { survivorBenefitSpouseAge: Number(survivorBenefitSpouseAge) }
        : {}),
      ssaStartAge,
      tspWithdrawalOption,
      ...(tspWithdrawalOption === 'annuity' ? { tspAnnuityType } : {}),
    };
  }, [
    selectedEmployee,
    retirementDate,
    retirementType,
    includeSickLeave,
    survivorBenefitOption,
    survivorBenefitSpouseAge,
    ssaStartAge,
    tspWithdrawalOption,
    tspAnnuityType,
  ]);

  // -- Navigation helpers --
  const goNext = () => {
    let stepErrors: StepErrors = {};
    if (step === 0) stepErrors = validateStep1(selectedEmployee);
    if (step === 1)
      stepErrors = validateStep2(
        retirementDate,
        retirementType,
        survivorBenefitOption,
        survivorBenefitSpouseAge,
      );
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const runCalculation = async () => {
    const req = buildRequest();
    if (!req) return;
    setCalculating(true);
    setCalcError('');
    try {
      const res = await calculations.run(req);
      setResult(res);
      setStep(3);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Calculation failed. Please try again.';
      setCalcError(message);
    } finally {
      setCalculating(false);
    }
  };

  const addScenario = () => {
    if (result) {
      setScenarios((prev) => {
        const exists = prev.some((s) => s.id === result.id);
        if (exists) return prev;
        return [...prev, result].slice(-3);
      });
    }
    setResult(null);
    setStep(1);
  };

  const resetCalculator = () => {
    setStep(0);
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setRetirementDate('');
    setRetirementType('');
    setIncludeSickLeave(true);
    setSurvivorBenefitOption('full');
    setSurvivorBenefitSpouseAge('');
    setSsaStartAge(67);
    setTspWithdrawalOption('annuity');
    setTspAnnuityType('single');
    setResult(null);
    setScenarios([]);
    setErrors({});
    setCalcError('');
  };

  // -- Retirement type options --
  const retirementTypeOptions = useMemo(() => {
    if (!selectedEmployee) return [];
    const plan = selectedEmployee.retirementPlan;
    if (plan.startsWith('FERS')) return RETIREMENT_TYPES['FERS'];
    return RETIREMENT_TYPES[plan] ?? RETIREMENT_TYPES['FERS'];
  }, [selectedEmployee]);

  // -- Service years shortcut --
  const serviceYears = selectedEmployee
    ? differenceInYears(new Date(), parseISO(selectedEmployee.serviceComputationDate))
    : 0;

  // -- Pie chart data --
  const pieData = useMemo(() => {
    if (!result) return [];
    const slices: { name: string; value: number }[] = [];
    if (result.monthlyNetAnnuity > 0)
      slices.push({ name: 'Annuity', value: result.monthlyNetAnnuity });
    if (result.fersSupplement && result.fersSupplement > 0)
      slices.push({ name: 'FERS Supplement', value: result.fersSupplement });
    if (result.tspMonthlyIncome && result.tspMonthlyIncome > 0)
      slices.push({ name: 'TSP Income', value: result.tspMonthlyIncome });
    if (result.estimatedSSA && result.estimatedSSA > 0)
      slices.push({ name: 'Social Security', value: result.estimatedSSA });
    return slices;
  }, [result]);

  // =========================================================================
  //  Render helpers
  // =========================================================================

  const renderStepIndicator = () => (
    <nav className="mb-8">
      <ol className="flex items-center justify-center gap-2 sm:gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <li key={i} className="flex items-center">
              <button
                type="button"
                disabled={i > step}
                onClick={() => {
                  if (i <= step) {
                    setErrors({});
                    setStep(i);
                  }
                }}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all
                  ${
                    isActive
                      ? 'bg-primary-800 text-white shadow-md'
                      : isComplete
                        ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                    ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isComplete
                          ? 'bg-primary-800 text-white'
                          : 'bg-neutral-200 text-neutral-500'
                    }`}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">
                  <Icon className="mr-1 inline h-4 w-4" />
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight
                  className={`mx-1 h-4 w-4 flex-shrink-0 ${
                    isComplete ? 'text-primary-400' : 'text-neutral-300'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );

  // -- Step 1 --
  const renderStep1 = () => (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Select Employee
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Search for an employee to calculate retirement benefits.
          </p>
        </div>
        <div className="card-body">
          {/* Search input — only shown when no employee is selected */}
          {!selectedEmployee && (
            <div className="relative">
              <label className="form-label" htmlFor="emp-search">
                Employee Name or ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="emp-search"
                  type="text"
                  className="form-input pl-9"
                  placeholder="Type a name to search..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  onFocus={() => {
                    if (employeeList.length > 0) setShowDropdown(true);
                  }}
                  autoComplete="off"
                />
              </div>
              {errors.employee && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.employee}
                </p>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                  {loadingEmployees ? (
                    <div className="flex items-center justify-center py-6 text-sm text-neutral-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                    </div>
                  ) : employeeList.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-neutral-500">
                      No employees found.
                    </div>
                  ) : (
                    employeeList.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary-50 transition-colors border-b border-neutral-50 last:border-0"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEmployeeSearch('');
                          setShowDropdown(false);
                          setEmployeeList([]);
                          setErrors({});
                        }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
                          {emp.firstName[0]}
                          {emp.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-800 truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {emp.retirementPlan} &middot; {emp.payPlan}-{emp.grade}/{emp.step}
                          </p>
                        </div>
                        <span className="badge-neutral text-xs">{emp.retirementPlan}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected employee card */}
          {selectedEmployee && (
            <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-800 text-white font-bold text-sm">
                  {selectedEmployee.firstName[0]}
                  {selectedEmployee.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-primary-800">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <p className="text-sm text-neutral-600">{selectedEmployee.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-primary">{selectedEmployee.retirementPlan}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setEmployeeSearch('');
                      setEmployeeList([]);
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Grade / Step
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    {selectedEmployee.payPlan}-{selectedEmployee.grade}/{selectedEmployee.step}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Current Salary
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    {usd(selectedEmployee.currentSalary)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Service Date
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    {format(parseISO(selectedEmployee.serviceComputationDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Years of Service
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    ~{serviceYears} years
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Sick Leave
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    {selectedEmployee.sickLeaveHours.toLocaleString()} hrs
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    TSP Balance
                  </p>
                  <p className="mt-0.5 font-semibold text-neutral-800">
                    {usd(selectedEmployee.tspAccount.accountBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // -- Step 2 --
  const renderStep2 = () => (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Retirement Date & Type */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Retirement Details
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="ret-date">
                Retirement Date
              </label>
              <input
                id="ret-date"
                type="date"
                className="form-input"
                value={retirementDate}
                onChange={(e) => setRetirementDate(e.target.value)}
              />
              {errors.retirementDate && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.retirementDate}
                </p>
              )}
            </div>
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="ret-type">
                Retirement Type
              </label>
              <select
                id="ret-type"
                className="form-select"
                value={retirementType}
                onChange={(e) => setRetirementType(e.target.value)}
              >
                <option value="">Select type...</option>
                {retirementTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.retirementType && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.retirementType}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sick-leave"
              type="checkbox"
              className="form-checkbox"
              checked={includeSickLeave}
              onChange={(e) => setIncludeSickLeave(e.target.checked)}
            />
            <label htmlFor="sick-leave" className="text-sm text-neutral-700 font-medium">
              Include unused sick leave credit
            </label>
          </div>
        </div>
      </div>

      {/* Survivor Benefit */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary-600" />
            Survivor Benefit
          </h2>
        </div>
        <div className="card-body space-y-4">
          <fieldset>
            <legend className="form-label">Survivor Benefit Election</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {(
                [
                  { value: 'full', label: 'Full (50% of annuity)' },
                  { value: 'half', label: 'Partial (25% of annuity)' },
                  { value: 'none', label: 'None' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all
                    ${
                      survivorBenefitOption === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-800 ring-2 ring-primary-200'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="survivor"
                    value={opt.value}
                    checked={survivorBenefitOption === opt.value}
                    onChange={() => setSurvivorBenefitOption(opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      survivorBenefitOption === opt.value
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {survivorBenefitOption === opt.value && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {survivorBenefitOption !== 'none' && (
            <div className="form-group mb-0 max-w-xs">
              <label className="form-label" htmlFor="spouse-age">
                Spouse's Current Age
              </label>
              <input
                id="spouse-age"
                type="number"
                className="form-input"
                min={18}
                max={100}
                placeholder="e.g. 60"
                value={survivorBenefitSpouseAge}
                onChange={(e) => setSurvivorBenefitSpouseAge(e.target.value)}
              />
              {errors.survivorBenefitSpouseAge && (
                <p className="form-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.survivorBenefitSpouseAge}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SSA */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            Social Security
          </h2>
        </div>
        <div className="card-body">
          <label className="form-label" htmlFor="ssa-age">
            Planned SSA Start Age: <span className="text-primary-800 font-bold">{ssaStartAge}</span>
          </label>
          <input
            id="ssa-age"
            type="range"
            min={62}
            max={70}
            step={1}
            value={ssaStartAge}
            onChange={(e) => setSsaStartAge(Number(e.target.value))}
            className="mt-2 w-full accent-primary-600"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-400">
            {SSA_AGES.map((a) => (
              <span key={a} className={a === ssaStartAge ? 'font-bold text-primary-600' : ''}>
                {a}
              </span>
            ))}
          </div>
          <p className="form-hint mt-2">
            Delaying Social Security increases your monthly benefit. Full retirement age is
            typically 67 for those born after 1960.
          </p>
        </div>
      </div>

      {/* TSP */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary-600" />
            TSP Withdrawal
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="tsp-option">
              Withdrawal Option
            </label>
            <select
              id="tsp-option"
              className="form-select"
              value={tspWithdrawalOption}
              onChange={(e) => setTspWithdrawalOption(e.target.value as TSPWithdrawalOption)}
            >
              <option value="lump_sum">Lump Sum</option>
              <option value="annuity">Life Annuity</option>
              <option value="installments">Monthly Installments</option>
              <option value="mixed">Mixed (Partial Lump Sum + Installments)</option>
            </select>
          </div>

          {tspWithdrawalOption === 'annuity' && (
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="tsp-annuity-type">
                Annuity Type
              </label>
              <select
                id="tsp-annuity-type"
                className="form-select"
                value={tspAnnuityType}
                onChange={(e) => setTspAnnuityType(e.target.value as TSPAnnuityType)}
              >
                <option value="single">Single Life</option>
                <option value="joint">Joint Life with Spouse</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // -- Step 3: Review --
  const renderStep3 = () => {
    const emp = selectedEmployee!;
    const retTypeLabel =
      retirementTypeOptions.find((o) => o.value === retirementType)?.label ?? retirementType;
    const survivorLabel =
      survivorBenefitOption === 'full'
        ? 'Full (50%)'
        : survivorBenefitOption === 'half'
          ? 'Partial (25%)'
          : 'None';
    const tspLabel =
      tspWithdrawalOption === 'lump_sum'
        ? 'Lump Sum'
        : tspWithdrawalOption === 'annuity'
          ? `Life Annuity (${tspAnnuityType === 'joint' ? 'Joint' : 'Single'})`
          : tspWithdrawalOption === 'installments'
            ? 'Monthly Installments'
            : 'Mixed';

    return (
      <div className="mx-auto max-w-2xl">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              Review Calculation Inputs
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Verify all inputs before running the calculation.
            </p>
          </div>
          <div className="card-body">
            <div className="divide-y divide-neutral-100">
              <ReviewRow label="Employee" value={`${emp.firstName} ${emp.lastName}`} />
              <ReviewRow label="Retirement System" value={emp.retirementPlan} />
              <ReviewRow label="Current Salary" value={usd(emp.currentSalary)} />
              <ReviewRow
                label="Retirement Date"
                value={retirementDate ? format(parseISO(retirementDate), 'MMMM d, yyyy') : '-'}
              />
              <ReviewRow label="Retirement Type" value={retTypeLabel} />
              <ReviewRow label="Include Sick Leave" value={includeSickLeave ? 'Yes' : 'No'} />
              <ReviewRow label="Survivor Benefit" value={survivorLabel} />
              {survivorBenefitOption !== 'none' && (
                <ReviewRow label="Spouse Age" value={survivorBenefitSpouseAge} />
              )}
              <ReviewRow label="SSA Start Age" value={String(ssaStartAge)} />
              <ReviewRow label="TSP Withdrawal" value={tspLabel} />
            </div>

            {calcError && (
              <div className="alert-danger mt-6">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Calculation Error</p>
                  <p className="text-sm">{calcError}</p>
                </div>
              </div>
            )}
          </div>
          <div className="card-footer flex justify-end">
            <button
              type="button"
              className="btn-primary btn-lg"
              disabled={calculating}
              onClick={runCalculation}
            >
              {calculating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5" />
                  Calculate Benefits
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -- Step 4: Results --
  const renderStep4 = () => {
    if (!result) return null;

    const showFers = isFersFamily(result.retirementSystem);

    return (
      <div className="space-y-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Monthly Annuity (Net)"
            value={usd(result.monthlyNetAnnuity)}
            accent="primary"
          />
          <StatCard
            icon={<BadgeDollarSign className="h-5 w-5" />}
            label="Annual Annuity"
            value={usd(result.netAnnuity)}
            accent="accent"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Total Monthly Income"
            value={usd(result.totalMonthlyIncome)}
            accent="success"
          />
          <StatCard
            icon={<Shield className="h-5 w-5" />}
            label="FEGLI Coverage"
            value={usd(result.fegliCoverage)}
            accent="neutral"
          />
        </div>

        {/* Detail sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Service Credit */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-600" />
                Service Credit
              </h3>
            </div>
            <div className="card-body">
              <div className="divide-y divide-neutral-100">
                <ReviewRow
                  label="Creditable Service"
                  value={`${result.yearsOfService} yrs, ${result.monthsOfService} mos`}
                />
                <ReviewRow
                  label="Sick Leave Credit"
                  value={`${result.sickLeaveCredit.years} yrs, ${result.sickLeaveCredit.months} mos`}
                />
                <ReviewRow
                  label="Total Service Credit"
                  value={`${result.totalServiceCredit.years} yrs, ${result.totalServiceCredit.months} mos`}
                  bold
                />
              </div>
            </div>
          </div>

          {/* High-3 */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                High-3 Average Salary
              </h3>
            </div>
            <div className="card-body">
              <p className="text-2xl font-bold text-primary-800 mb-4">
                {usd(result.highThreeAverage)}
              </p>
              {result.highThreePeriods.length > 0 && (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th className="text-right">Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.highThreePeriods.map((p, i) => (
                        <tr key={i}>
                          <td>
                            {format(parseISO(p.startDate), 'MMM yyyy')} &ndash;{' '}
                            {format(parseISO(p.endDate), 'MMM yyyy')}
                          </td>
                          <td className="text-right font-medium">{usd(p.salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Annuity Calculation */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary-600" />
                Annuity Calculation
              </h3>
            </div>
            <div className="card-body">
              <div className="divide-y divide-neutral-100">
                <ReviewRow label="Gross Annual Annuity" value={usd(result.grossAnnuity)} />
                <ReviewRow label="Gross Monthly Annuity" value={usd(result.monthlyAnnuity)} />
                <ReviewRow
                  label="Survivor Benefit Reduction"
                  value={`- ${usd(result.survivorBenefitReduction)}`}
                  className="text-danger-600"
                />
                <ReviewRow label="Net Annual Annuity" value={usd(result.netAnnuity)} bold />
                <ReviewRow
                  label="Net Monthly Annuity"
                  value={usd(result.monthlyNetAnnuity)}
                  bold
                />
              </div>
            </div>
          </div>

          {/* FERS Supplement */}
          {showFers && result.fersSupplement != null && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary-600" />
                  FERS Supplement
                </h3>
              </div>
              <div className="card-body">
                <p className="text-2xl font-bold text-primary-800 mb-2">
                  {usd(result.fersSupplement)}<span className="text-sm font-normal text-neutral-500"> / month</span>
                </p>
                <p className="text-sm text-neutral-600">
                  The FERS supplement approximates your Social Security benefit earned during
                  federal service. It is payable from your retirement date until age 62, when you
                  become eligible for Social Security.
                </p>
              </div>
            </div>
          )}

          {/* TSP Income */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary-600" />
                TSP Income
              </h3>
            </div>
            <div className="card-body">
              <div className="divide-y divide-neutral-100">
                <ReviewRow label="TSP Balance" value={usd(result.tspBalance)} />
                {result.tspMonthlyIncome != null && (
                  <ReviewRow
                    label="Projected Monthly Income"
                    value={usd(result.tspMonthlyIncome)}
                    bold
                  />
                )}
              </div>
            </div>
          </div>

          {/* Social Security */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary-600" />
                Social Security Estimate
              </h3>
            </div>
            <div className="card-body">
              <div className="divide-y divide-neutral-100">
                {result.estimatedSSA != null && (
                  <ReviewRow
                    label={`Monthly Benefit at Age ${result.ssaStartAge ?? ssaStartAge}`}
                    value={usd(result.estimatedSSA)}
                    bold
                  />
                )}
                {result.estimatedSSA == null && (
                  <p className="py-2 text-sm text-neutral-500">
                    Social Security estimate not available.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* FEGLI */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary-600" />
                FEGLI Coverage
              </h3>
            </div>
            <div className="card-body">
              <div className="divide-y divide-neutral-100">
                <ReviewRow label="Coverage Amount" value={usd(result.fegliCoverage)} />
                <ReviewRow
                  label="Monthly Premium"
                  value={usd(result.fegliMonthlyCost)}
                />
              </div>
            </div>
          </div>

          {/* Total Income Pie Chart */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                Total Income Summary
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent, x, y, textAnchor }) => (
                            <text
                              x={x}
                              y={y}
                              textAnchor={textAnchor}
                              fill="var(--chart-label-fill, #374151)"
                              fontSize={13}
                              fontWeight={500}
                            >
                              {`${name} ${(percent * 100).toFixed(0)}%`}
                            </text>
                          )}
                          labelLine={{ stroke: 'var(--chart-label-line, #6b7280)' }}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => usd(value)}
                          contentStyle={{
                            borderRadius: '8px',
                            backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
                            border: '1px solid var(--chart-tooltip-border, #e5e7eb)',
                            color: 'var(--chart-tooltip-text, #1f2937)',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-neutral-500">No income data to display.</p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="divide-y divide-neutral-100">
                    <ReviewRow
                      label="Monthly Annuity (Net)"
                      value={usd(result.monthlyNetAnnuity)}
                    />
                    {showFers && result.fersSupplement != null && result.fersSupplement > 0 && (
                      <ReviewRow
                        label="FERS Supplement"
                        value={usd(result.fersSupplement)}
                      />
                    )}
                    {result.tspMonthlyIncome != null && result.tspMonthlyIncome > 0 && (
                      <ReviewRow
                        label="TSP Monthly Income"
                        value={usd(result.tspMonthlyIncome)}
                      />
                    )}
                    {result.estimatedSSA != null && result.estimatedSSA > 0 && (
                      <ReviewRow
                        label="Social Security"
                        value={usd(result.estimatedSSA)}
                      />
                    )}
                    <ReviewRow
                      label="Total Monthly Income"
                      value={usd(result.totalMonthlyIncome)}
                      bold
                    />
                    <ReviewRow
                      label="Total Annual Income"
                      value={usd(result.totalAnnualIncome)}
                      bold
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={addScenario}>
            <PlusCircle className="h-4 w-4" />
            Compare Scenarios
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print / Export
          </button>
          <button type="button" className="btn-ghost" onClick={resetCalculator}>
            <RotateCcw className="h-4 w-4" />
            Start New Calculation
          </button>
        </div>

        {/* Scenario comparison table */}
        {scenarios.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Scenario Comparison</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Side-by-side comparison of up to 3 scenarios.
              </p>
            </div>
            <div className="card-body overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    {scenarios.map((s, i) => (
                      <th key={s.id} className="text-right">
                        Scenario {i + 1}
                      </th>
                    ))}
                    <th className="text-right">Current</th>
                  </tr>
                </thead>
                <tbody>
                  <CompRow label="Retirement Date" scenarios={scenarios} current={result} render={(r) => format(parseISO(r.retirementDate), 'MMM d, yyyy')} />
                  <CompRow label="Retirement Type" scenarios={scenarios} current={result} render={(r) => r.retirementType} />
                  <CompRow label="Total Service" scenarios={scenarios} current={result} render={(r) => `${r.totalServiceCredit.years}y ${r.totalServiceCredit.months}m`} />
                  <CompRow label="High-3 Average" scenarios={scenarios} current={result} render={(r) => usd(r.highThreeAverage)} />
                  <CompRow label="Gross Annuity" scenarios={scenarios} current={result} render={(r) => usd(r.grossAnnuity)} />
                  <CompRow label="Net Annuity" scenarios={scenarios} current={result} render={(r) => usd(r.netAnnuity)} />
                  <CompRow label="Monthly Net Annuity" scenarios={scenarios} current={result} render={(r) => usd(r.monthlyNetAnnuity)} />
                  <CompRow label="FERS Supplement" scenarios={scenarios} current={result} render={(r) => r.fersSupplement != null ? usd(r.fersSupplement) : '-'} />
                  <CompRow label="TSP Monthly Income" scenarios={scenarios} current={result} render={(r) => r.tspMonthlyIncome != null ? usd(r.tspMonthlyIncome) : '-'} />
                  <CompRow label="Est. SSA" scenarios={scenarios} current={result} render={(r) => r.estimatedSSA != null ? usd(r.estimatedSSA) : '-'} />
                  <CompRow label="Total Monthly Income" scenarios={scenarios} current={result} render={(r) => usd(r.totalMonthlyIncome)} />
                  <CompRow label="Total Annual Income" scenarios={scenarios} current={result} render={(r) => usd(r.totalAnnualIncome)} />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  //  Main render
  // =========================================================================

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Retirement Calculator</h1>
          <p className="page-subtitle">
            Estimate federal retirement benefits step by step
          </p>
        </div>
        {step > 0 && step < 3 && (
          <button type="button" className="btn-ghost text-sm" onClick={resetCalculator}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      {renderStepIndicator()}

      {/* Step content */}
      <div ref={stepContentRef} key={step}>
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
        {step === 3 && renderStep4()}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-between">
          <button
            type="button"
            className="btn-secondary"
            disabled={step === 0}
            onClick={goBack}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {step < 2 && (
            <button type="button" className="btn-primary" onClick={goNext}>
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Small sub-components
// ---------------------------------------------------------------------------

function ReviewRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-neutral-600">{label}</span>
      <span
        className={`text-sm text-right ${bold ? 'font-bold text-primary-800' : 'font-medium text-neutral-800'} ${className ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'primary' | 'accent' | 'success' | 'neutral';
}) {
  const iconColors: Record<string, string> = {
    primary: 'text-primary-600 bg-primary-100',
    accent: 'text-accent-600 bg-accent-100',
    success: 'text-success-600 bg-success-100',
    neutral: 'text-neutral-600 bg-neutral-100',
  };
  return (
    <div className="stat-card flex items-start gap-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColors[accent]}`}
      >
        {icon}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

function CompRow({
  label,
  scenarios,
  current,
  render,
}: {
  label: string;
  scenarios: CalculationResult[];
  current: CalculationResult;
  render: (r: CalculationResult) => string;
}) {
  return (
    <tr>
      <td className="font-medium">{label}</td>
      {scenarios.map((s) => (
        <td key={s.id} className="text-right">
          {render(s)}
        </td>
      ))}
      <td className="text-right font-semibold">{render(current)}</td>
    </tr>
  );
}
