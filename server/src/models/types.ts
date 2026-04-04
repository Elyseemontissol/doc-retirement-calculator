// Federal Retirement Benefits Calculator - Type Definitions
// U.S. Department of Commerce

export interface ServicePeriod {
  id: string;
  agencyName: string;
  startDate: string;
  endDate: string | null;
  retirementCoverage: string;
  serviceType: 'civilian' | 'military' | 'deposit' | 'redeposit';
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

export type RetirementPlan = 'CSRS' | 'CSRS-Offset' | 'FERS' | 'FERS-RAE' | 'FERS-FRAE';

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
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  numberOfDependents: number;
  createdAt: string;
  updatedAt: string;
}

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
  data: Record<string, any>;
}

export interface RetirementCase {
  id: string;
  employeeId: string;
  caseNumber: string;
  type: 'voluntary' | 'early' | 'disability' | 'deferred' | 'MRA+10' | 'discontinued';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'processed' | 'closed';
  retirementDate: string;
  assignedSpecialistId: string | null;
  calculations: CalculationResult[];
  determinations: CoverageDetermination[];
  forms: GeneratedForm[];
  notes: CaseNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CalculationRequest {
  employeeId: string;
  retirementDate: string;
  retirementType: string;
  includeSickLeave: boolean;
  survivorBenefitOption: 'full' | 'half' | 'none';
  survivorBenefitSpouseAge?: number;
  ssaStartAge?: number;
  tspWithdrawalOption?: 'lump_sum' | 'annuity' | 'installments' | 'mixed';
  tspAnnuityType?: 'single' | 'joint';
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
  highThreePeriods: { startDate: string; endDate: string; salary: number }[];

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

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'employee' | 'hr_specialist' | 'admin';
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EducationResource {
  id: string;
  title: string;
  description: string;
  category: 'retirement_systems' | 'tsp' | 'ssa' | 'fegli' | 'financial_planning' | 'forms_guides';
  type: 'video' | 'document' | 'article' | 'faq' | 'tool';
  url?: string;
  content?: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}
