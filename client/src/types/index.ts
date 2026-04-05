// Federal Retirement Benefits Calculator - Frontend Type Definitions
// U.S. Department of Commerce

// ---------------------------------------------------------------------------
//  Employee & related
// ---------------------------------------------------------------------------

export type RetirementPlan = 'CSRS' | 'CSRS-Offset' | 'FERS' | 'FERS-RAE' | 'FERS-FRAE';

export type ServiceType = 'civilian' | 'military' | 'deposit' | 'redeposit';

export interface ServicePeriod {
  id: string;
  agencyName: string;
  startDate: string;
  endDate: string | null;
  retirementCoverage: string;
  serviceType: ServiceType;
  isCreditable: boolean;
}

export interface SalaryRecord {
  effectiveDate: string;
  basicPay: number;
  localityAdjustment: number;
  totalPay: number;
}

export interface TSPAccount {
  accountBalance: number;
  traditionalBalance: number;
  rothBalance: number;
  contributionPercentage: number;
  agencyMatchPercentage: number;
  loanBalance: number;
  funds: {
    gFund: number;
    fFund: number;
    cFund: number;
    sFund: number;
    iFund: number;
    lFunds: { name: string; percentage: number }[];
  };
}

export interface FEGLIEnrollment {
  basicLife: boolean;
  optionA: boolean;
  optionBMultiple: number;
  optionB: boolean;
  optionC: boolean;
  optionCMultiple: number;
}

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  ssn: string;
  agencyCode: string;
  organizationCode: string;
  payPlan: string;
  grade: string;
  step: string;
  currentSalary: number;
  localityPayArea: string;
  retirementPlan: RetirementPlan;
  serviceComputationDate: string;
  serviceHistory: ServicePeriod[];
  salaryHistory: SalaryRecord[];
  tspAccount: TSPAccount;
  fegliEnrollment: FEGLIEnrollment;
  sickLeaveHours: number;
  annualLeaveHours: number;
  maritalStatus: MaritalStatus;
  numberOfDependents: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
//  Retirement cases
// ---------------------------------------------------------------------------

export type CaseType =
  | 'voluntary'
  | 'early'
  | 'disability'
  | 'deferred'
  | 'MRA+10'
  | 'discontinued';

export type CaseStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'processed'
  | 'closed';

export interface CoverageDetermination {
  id: string;
  type: 'coverage' | 'FERCCA';
  currentCoverage: string;
  determinedCoverage: string;
  effectiveDate: string;
  rationale: string;
  determinedBy: string;
  determinedAt: string;
}

export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface GeneratedForm {
  id: string;
  formNumber: string;
  formName: string;
  status: 'draft' | 'completed' | 'signed';
  generatedAt: string;
  data: Record<string, unknown>;
}

export interface RetirementCase {
  id: string;
  employeeId: string;
  caseNumber: string;
  type: CaseType;
  status: CaseStatus;
  retirementDate: string;
  assignedSpecialistId: string | null;
  calculations: CalculationResult[];
  determinations: CoverageDetermination[];
  forms: GeneratedForm[];
  notes: CaseNote[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
//  Calculations
// ---------------------------------------------------------------------------

export type SurvivorBenefitOption = 'full' | 'half' | 'none';
export type TSPWithdrawalOption = 'lump_sum' | 'annuity' | 'installments' | 'mixed';
export type TSPAnnuityType = 'single' | 'joint';

export interface CalculationRequest {
  employeeId: string;
  retirementDate: string;
  retirementType: string;
  includeSickLeave: boolean;
  survivorBenefitOption: SurvivorBenefitOption;
  survivorBenefitSpouseAge?: number;
  ssaStartAge?: number;
  tspWithdrawalOption?: TSPWithdrawalOption;
  tspAnnuityType?: TSPAnnuityType;
}

export interface HighThreePeriod {
  startDate: string;
  endDate: string;
  salary: number;
}

export interface CalculationResult {
  id: string;
  employeeId: string;
  calculatedAt: string;
  retirementSystem: string;
  retirementDate: string;
  retirementType: string;

  yearsOfService: number;
  monthsOfService: number;
  sickLeaveCredit: { years: number; months: number };
  totalServiceCredit: { years: number; months: number };

  highThreeAverage: number;
  highThreePeriods: HighThreePeriod[];

  grossAnnuity: number;
  monthlyAnnuity: number;
  survivorBenefitReduction: number;
  netAnnuity: number;
  monthlyNetAnnuity: number;

  fersSupplement?: number;

  tspBalance: number;
  tspMonthlyIncome?: number;

  estimatedSSA?: number;
  ssaStartAge?: number;

  fegliMonthlyCost: number;
  fegliCoverage: number;

  totalMonthlyIncome: number;
  totalAnnualIncome: number;
}

export interface ComparisonScenario {
  scenarioNumber: number;
  retirementDate: string;
  retirementType: string;
  totalServiceCredit: { years: number; months: number };
  grossAnnuity: number;
  netAnnuity: number;
  monthlyNetAnnuity: number;
  fersSupplement?: number;
  tspBalance: number;
  tspMonthlyIncome?: number;
  estimatedSSA?: number;
  totalMonthlyIncome: number;
  totalAnnualIncome: number;
}

export interface ComparisonResult {
  employeeId: string;
  employeeName: string;
  retirementPlan: RetirementPlan;
  scenarios: ComparisonScenario[];
  fullResults: CalculationResult[];
}

// ---------------------------------------------------------------------------
//  Users (frontend-safe — no passwordHash)
// ---------------------------------------------------------------------------

export type UserRole = 'employee' | 'hr_specialist' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  lastLogin?: string;
  isActive?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// ---------------------------------------------------------------------------
//  Education resources
// ---------------------------------------------------------------------------

export type EducationCategory =
  | 'retirement_systems'
  | 'tsp'
  | 'ssa'
  | 'fegli'
  | 'financial_planning'
  | 'forms_guides';

export type EducationResourceType = 'video' | 'document' | 'article' | 'faq' | 'tool';

export interface EducationResource {
  id: string;
  title: string;
  description: string;
  category: EducationCategory;
  type: EducationResourceType;
  url?: string;
  content?: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationResourceRequest {
  title: string;
  description: string;
  category: EducationCategory;
  type: EducationResourceType;
  url?: string;
  content?: string;
  tags?: string[];
  order?: number;
}

// ---------------------------------------------------------------------------
//  Forms
// ---------------------------------------------------------------------------

export interface FormType {
  formNumber: string;
  formName: string;
  description: string;
  applicableSystems: string[];
}

export interface GenerateFormRequest {
  formNumber: string;
  employeeId: string;
}

// ---------------------------------------------------------------------------
//  Reports
// ---------------------------------------------------------------------------

export interface EligibilityInfo {
  employeeId: string;
  name: string;
  retirementPlan: string;
  age: number;
  serviceYears: number;
  eligibleNow: boolean;
  eligibleWithin1Year: boolean;
  eligibleWithin5Years: boolean;
  earliestEligibleDate: string | null;
}

export interface EligibilityReport {
  summary: {
    total: number;
    eligibleNow: number;
    eligibleWithin1Year: number;
    eligibleWithin5Years: number;
    notEligibleWithin5Years: number;
  };
  employees: EligibilityInfo[];
}

export interface CasesReport {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  bySpecialist: Record<string, number>;
  byMonth: Record<string, number>;
}

export interface DemographicsReport {
  totalEmployees: number;
  byRetirementPlan: Record<string, number>;
  byOrganization: Record<string, number>;
  byGrade: Record<string, number>;
  ageDistribution: Record<string, number>;
  averageSalary: number;
  averageServiceYears: number;
}

export interface DashboardReport {
  overview: {
    totalEmployees: number;
    activeCases: number;
    pendingReview: number;
    closedThisYear: number;
  };
  eligibility: {
    eligibleNow: number;
    eligibleWithin1Year: number;
    eligibleWithin5Years: number;
  };
  retirementSystems: Record<string, number>;
  casesByStatus: Record<string, number>;
}

// ---------------------------------------------------------------------------
//  Shared / generic
// ---------------------------------------------------------------------------

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ApiError {
  error: string;
}

export interface SyncResult {
  message: string;
  requestId: string;
  syncedFields: string[];
  syncedAt: string;
}

// Case creation / update payloads
export interface CreateCaseRequest {
  employeeId: string;
  type: CaseType;
  retirementDate: string;
  assignedSpecialistId?: string;
}

export interface UpdateCaseRequest {
  type?: CaseType;
  retirementDate?: string;
  assignedSpecialistId?: string | null;
}

export interface UpdateCaseStatusRequest {
  status: CaseStatus;
}

export interface AddCaseNoteRequest {
  content: string;
}

export interface AddDeterminationRequest {
  type: 'coverage' | 'FERCCA';
  currentCoverage: string;
  determinedCoverage: string;
  effectiveDate: string;
  rationale: string;
}

export interface GenerateCaseFormRequest {
  formNumber: string;
}
