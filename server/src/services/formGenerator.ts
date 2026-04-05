// OPM Form Data Generator
// Generates structured form data for federal retirement forms

import { v4 as uuidv4 } from 'uuid';
import { Employee, RetirementCase, GeneratedForm, CalculationResult } from '../models/types';

interface FormType {
  formNumber: string;
  formName: string;
  applicableSystems: string[];
  description: string;
}

export const FORM_TYPES: FormType[] = [
  {
    formNumber: 'SF-2801',
    formName: 'Application for Immediate Retirement (CSRS)',
    applicableSystems: ['CSRS', 'CSRS-Offset'],
    description: 'Standard Form 2801 for CSRS immediate retirement application',
  },
  {
    formNumber: 'SF-3107',
    formName: 'Application for Immediate Retirement (FERS)',
    applicableSystems: ['FERS', 'FERS-RAE', 'FERS-FRAE'],
    description: 'Standard Form 3107 for FERS immediate retirement application',
  },
  {
    formNumber: 'SF-2818',
    formName: 'Continuation of Life Insurance Coverage',
    applicableSystems: ['CSRS', 'CSRS-Offset', 'FERS', 'FERS-RAE', 'FERS-FRAE'],
    description: 'Election form for continuing FEGLI coverage into retirement',
  },
  {
    formNumber: 'TSP-70',
    formName: 'Request for Full Withdrawal',
    applicableSystems: ['CSRS', 'CSRS-Offset', 'FERS', 'FERS-RAE', 'FERS-FRAE'],
    description: 'TSP withdrawal request for separated/retired employees',
  },
  {
    formNumber: 'SF-1152',
    formName: 'Designation of Beneficiary (FEGLI)',
    applicableSystems: ['CSRS', 'CSRS-Offset', 'FERS', 'FERS-RAE', 'FERS-FRAE'],
    description: 'Designation of beneficiary for Federal Employees Group Life Insurance',
  },
];

export function getAvailableFormTypes(): FormType[] {
  return FORM_TYPES;
}

export function generateSF2801(employee: Employee, retirementCase: RetirementCase, calculation?: CalculationResult): GeneratedForm {
  return {
    id: uuidv4(),
    formNumber: 'SF-2801',
    formName: 'Application for Immediate Retirement (CSRS)',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    data: {
      // Part A - Applicant Information
      partA: {
        name: `${employee.lastName}, ${employee.firstName}`,
        dateOfBirth: employee.dateOfBirth,
        ssn: employee.ssn,
        homeAddress: 'On file with agency',
        phoneNumber: 'On file with agency',
        emailAddress: employee.email,
      },
      // Part B - Federal Service
      partB: {
        retirementPlan: employee.retirementPlan,
        agencyName: 'Department of Commerce',
        organizationCode: employee.organizationCode,
        payPlan: employee.payPlan,
        grade: employee.grade,
        step: employee.step,
        currentSalary: employee.currentSalary,
        serviceComputationDate: employee.serviceComputationDate,
        proposedRetirementDate: retirementCase.retirementDate,
        typeOfRetirement: retirementCase.type,
      },
      // Part C - Service History
      partC: {
        serviceHistory: employee.serviceHistory.map(sp => ({
          agency: sp.agencyName,
          fromDate: sp.startDate,
          toDate: sp.endDate || retirementCase.retirementDate,
          retirementCoverage: sp.retirementCoverage,
          serviceType: sp.serviceType,
        })),
        totalYearsMonths: calculation
          ? `${calculation.totalServiceCredit.years} years, ${calculation.totalServiceCredit.months} months`
          : 'Pending calculation',
        sickLeaveHours: employee.sickLeaveHours,
      },
      // Part D - Marital Status
      partD: {
        maritalStatus: employee.maritalStatus,
        numberOfDependents: employee.numberOfDependents,
      },
      // Part E - Annuity Election
      partE: {
        highThreeAverage: calculation?.highThreeAverage,
        estimatedAnnuity: calculation?.grossAnnuity,
        survivorBenefitElection: 'To be determined',
      },
      // Part F - Insurance
      partF: {
        fegliBasic: employee.fegliEnrollment.basicLife,
        fegliOptionA: employee.fegliEnrollment.optionA,
        fegliOptionB: employee.fegliEnrollment.optionB,
        fegliOptionBMultiple: employee.fegliEnrollment.optionBMultiple,
        fegliOptionC: employee.fegliEnrollment.optionC,
        fegliOptionCMultiple: employee.fegliEnrollment.optionCMultiple,
      },
      caseNumber: retirementCase.caseNumber,
    },
  };
}

export function generateSF3107(employee: Employee, retirementCase: RetirementCase, calculation?: CalculationResult): GeneratedForm {
  return {
    id: uuidv4(),
    formNumber: 'SF-3107',
    formName: 'Application for Immediate Retirement (FERS)',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    data: {
      // Section 1 - Employee Information
      section1: {
        name: `${employee.lastName}, ${employee.firstName}`,
        dateOfBirth: employee.dateOfBirth,
        ssn: employee.ssn,
        homeAddress: 'On file with agency',
        phoneNumber: 'On file with agency',
        emailAddress: employee.email,
        agencyName: 'Department of Commerce',
        organizationCode: employee.organizationCode,
      },
      // Section 2 - Retirement Information
      section2: {
        retirementPlan: employee.retirementPlan,
        proposedRetirementDate: retirementCase.retirementDate,
        typeOfRetirement: retirementCase.type,
        payPlan: employee.payPlan,
        grade: employee.grade,
        step: employee.step,
        currentSalary: employee.currentSalary,
        serviceComputationDate: employee.serviceComputationDate,
      },
      // Section 3 - Service History
      section3: {
        serviceHistory: employee.serviceHistory.map(sp => ({
          agency: sp.agencyName,
          fromDate: sp.startDate,
          toDate: sp.endDate || retirementCase.retirementDate,
          retirementCoverage: sp.retirementCoverage,
          serviceType: sp.serviceType,
          isCreditable: sp.isCreditable,
        })),
        totalService: calculation
          ? `${calculation.totalServiceCredit.years} years, ${calculation.totalServiceCredit.months} months`
          : 'Pending calculation',
        sickLeaveHours: employee.sickLeaveHours,
      },
      // Section 4 - Survivor Benefits
      section4: {
        maritalStatus: employee.maritalStatus,
        survivorElection: 'To be completed by employee',
      },
      // Section 5 - Computation
      section5: {
        highThreeAverage: calculation?.highThreeAverage,
        accrualRate: calculation?.retirementType === 'voluntary' ? '1.0% (or 1.1% if age 62+ with 20+ years)' : '1.0%',
        estimatedAnnuity: calculation?.grossAnnuity,
        fersSupplement: calculation?.fersSupplement,
        estimatedSSA: calculation?.estimatedSSA,
      },
      // Section 6 - TSP
      section6: {
        tspBalance: employee.tspAccount.accountBalance,
        tspTraditional: employee.tspAccount.traditionalBalance,
        tspRoth: employee.tspAccount.rothBalance,
        tspLoanBalance: employee.tspAccount.loanBalance,
      },
      caseNumber: retirementCase.caseNumber,
    },
  };
}

export function generateSF2818(employee: Employee): GeneratedForm {
  const salary = employee.currentSalary;
  const bia = Math.ceil(salary / 1000) * 1000 + 2000;

  return {
    id: uuidv4(),
    formNumber: 'SF-2818',
    formName: 'Continuation of Life Insurance Coverage',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    data: {
      employeeName: `${employee.lastName}, ${employee.firstName}`,
      dateOfBirth: employee.dateOfBirth,
      ssn: employee.ssn,
      agencyName: 'Department of Commerce',
      currentEnrollment: {
        basicLife: employee.fegliEnrollment.basicLife,
        basicAmount: employee.fegliEnrollment.basicLife ? bia : 0,
        optionA: employee.fegliEnrollment.optionA,
        optionAAmount: employee.fegliEnrollment.optionA ? 10000 : 0,
        optionB: employee.fegliEnrollment.optionB,
        optionBMultiple: employee.fegliEnrollment.optionBMultiple,
        optionBAmount: employee.fegliEnrollment.optionB
          ? Math.ceil(salary / 1000) * 1000 * employee.fegliEnrollment.optionBMultiple
          : 0,
        optionC: employee.fegliEnrollment.optionC,
        optionCMultiple: employee.fegliEnrollment.optionCMultiple,
      },
      retirementElection: {
        continueBasic: true,
        basicReduction: '75% reduction (no additional cost) or No Reduction (additional premium)',
        continueOptionA: employee.fegliEnrollment.optionA,
        continueOptionB: false, // Option B terminates unless elected with full cost
        continueOptionC: false, // Option C terminates unless elected with full cost
      },
    },
  };
}

export function generateTSP70(employee: Employee): GeneratedForm {
  return {
    id: uuidv4(),
    formNumber: 'TSP-70',
    formName: 'Request for Full Withdrawal',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    data: {
      participantName: `${employee.lastName}, ${employee.firstName}`,
      dateOfBirth: employee.dateOfBirth,
      ssn: employee.ssn,
      agencyCode: employee.agencyCode,
      accountInformation: {
        totalBalance: employee.tspAccount.accountBalance,
        traditionalBalance: employee.tspAccount.traditionalBalance,
        rothBalance: employee.tspAccount.rothBalance,
        outstandingLoan: employee.tspAccount.loanBalance,
        netBalance: employee.tspAccount.accountBalance - employee.tspAccount.loanBalance,
      },
      withdrawalOptions: {
        singlePayment: false,
        tspAnnuity: false,
        monthlyPayments: false,
        mixedWithdrawal: false,
        transferToIRA: false,
      },
      annuityOptions: {
        lifeAnnuity: 'single',
        cashRefund: false,
        tenYearCertain: false,
        increasingPayments: false,
      },
      taxWithholding: {
        federalTax: 'Mandatory 20% for eligible rollover distribution',
        stateTax: 'Varies by state',
      },
    },
  };
}

export function generateSF1152(employee: Employee): GeneratedForm {
  return {
    id: uuidv4(),
    formNumber: 'SF-1152',
    formName: 'Designation of Beneficiary (FEGLI)',
    status: 'draft',
    generatedAt: new Date().toISOString(),
    data: {
      insuredName: `${employee.lastName}, ${employee.firstName}`,
      dateOfBirth: employee.dateOfBirth,
      ssn: employee.ssn,
      agencyName: 'Department of Commerce',
      coverageTypes: {
        basic: employee.fegliEnrollment.basicLife,
        optionA: employee.fegliEnrollment.optionA,
        optionB: employee.fegliEnrollment.optionB,
        optionC: employee.fegliEnrollment.optionC,
      },
      beneficiaries: {
        primary: [],
        contingent: [],
        note: 'To be completed by the employee. If no designation is on file, benefits are paid in the order of precedence specified by law.',
      },
      orderOfPrecedence: [
        '1. To the widow or widower',
        '2. If none, to the child or children in equal shares',
        '3. If none, to the parents in equal shares or the surviving parent',
        '4. If none, to the executor or administrator of the estate',
        '5. If none, to other next of kin under the laws of the domicile',
      ],
    },
  };
}

export function generateForm(
  formNumber: string,
  employee: Employee,
  retirementCase?: RetirementCase,
  calculation?: CalculationResult
): GeneratedForm {
  // Create a default stub case if none provided (for standalone form generation)
  const caseOrStub: RetirementCase = retirementCase ?? {
    id: 'stub',
    employeeId: employee.id,
    caseNumber: 'DRAFT',
    type: 'voluntary',
    status: 'draft',
    retirementDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
    assignedSpecialistId: null,
    calculations: [],
    determinations: [],
    forms: [],
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  switch (formNumber) {
    case 'SF-2801':
      return generateSF2801(employee, caseOrStub, calculation);
    case 'SF-3107':
      return generateSF3107(employee, caseOrStub, calculation);
    case 'SF-2818':
      return generateSF2818(employee);
    case 'TSP-70':
      return generateTSP70(employee);
    case 'SF-1152':
      return generateSF1152(employee);
    default:
      throw new Error(`Unknown form number: ${formNumber}`);
  }
}
