// In-memory data store with seed data
// U.S. Department of Commerce - Federal Retirement Benefits Calculator

import {
  Employee,
  RetirementCase,
  CalculationResult,
  User,
  GeneratedForm,
  EducationResource,
} from '../models/types';
import bcrypt from 'bcryptjs';

// ── Data Stores ──────────────────────────────────────────────────────────────

export const employees = new Map<string, Employee>();
export const cases = new Map<string, RetirementCase>();
export const calculations = new Map<string, CalculationResult>();
export const users = new Map<string, User>();
export const forms = new Map<string, GeneratedForm>();
export const educationResources = new Map<string, EducationResource>();

// Track invalidated JWT tokens (simple blacklist)
export const tokenBlacklist = new Set<string>();

// ── Seed Data ────────────────────────────────────────────────────────────────

function seedEmployees(): void {
  const now = new Date().toISOString();

  const seedData: Employee[] = [
    {
      id: 'emp-001',
      firstName: 'Margaret',
      lastName: 'Chen',
      email: 'margaret.chen@commerce.gov',
      dateOfBirth: '1965-03-15',
      ssn: '***-**-1234',
      agencyCode: 'CM',
      organizationCode: 'NOAA',
      payPlan: 'GS',
      grade: '14',
      step: '10',
      currentSalary: 142180,
      localityPayArea: 'Washington-Baltimore-Arlington',
      retirementPlan: 'CSRS',
      serviceComputationDate: '1988-06-20',
      serviceHistory: [
        {
          id: 'sp-001-1',
          agencyName: 'Department of Commerce - NOAA',
          startDate: '1988-06-20',
          endDate: null,
          retirementCoverage: 'CSRS',
          serviceType: 'civilian',
          isCreditable: true,
        },
        {
          id: 'sp-001-2',
          agencyName: 'U.S. Army',
          startDate: '1984-05-01',
          endDate: '1988-04-30',
          retirementCoverage: 'Military',
          serviceType: 'military',
          isCreditable: true,
        },
      ],
      salaryHistory: [
        { effectiveDate: '2024-01-01', basicPay: 136520, localityAdjustment: 5660, totalPay: 142180 },
        { effectiveDate: '2023-01-01', basicPay: 131096, localityAdjustment: 5434, totalPay: 136530 },
        { effectiveDate: '2022-01-01', basicPay: 125290, localityAdjustment: 5193, totalPay: 130483 },
        { effectiveDate: '2021-01-01', basicPay: 122530, localityAdjustment: 5079, totalPay: 127609 },
        { effectiveDate: '2020-01-01', basicPay: 119276, localityAdjustment: 4944, totalPay: 124220 },
      ],
      tspAccount: {
        accountBalance: 485000,
        traditionalBalance: 485000,
        rothBalance: 0,
        contributionPercentage: 7,
        agencyMatchPercentage: 0,
        loanBalance: 0,
        funds: {
          gFund: 50,
          fFund: 10,
          cFund: 20,
          sFund: 10,
          iFund: 10,
          lFunds: [],
        },
      },
      fegliEnrollment: {
        basicLife: true,
        optionA: true,
        optionB: true,
        optionBMultiple: 3,
        optionC: true,
        optionCMultiple: 2,
      },
      sickLeaveHours: 2450,
      annualLeaveHours: 240,
      maritalStatus: 'married',
      numberOfDependents: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp-002',
      firstName: 'James',
      lastName: 'Robinson',
      email: 'james.robinson@commerce.gov',
      dateOfBirth: '1968-09-22',
      ssn: '***-**-5678',
      agencyCode: 'CM',
      organizationCode: 'Census',
      payPlan: 'GS',
      grade: '13',
      step: '7',
      currentSalary: 119760,
      localityPayArea: 'Washington-Baltimore-Arlington',
      retirementPlan: 'CSRS-Offset',
      serviceComputationDate: '1987-01-05',
      serviceHistory: [
        {
          id: 'sp-002-1',
          agencyName: 'Department of Commerce - Census Bureau',
          startDate: '1993-08-15',
          endDate: null,
          retirementCoverage: 'CSRS-Offset',
          serviceType: 'civilian',
          isCreditable: true,
        },
        {
          id: 'sp-002-2',
          agencyName: 'Department of Labor',
          startDate: '1987-01-05',
          endDate: '1993-08-14',
          retirementCoverage: 'CSRS',
          serviceType: 'civilian',
          isCreditable: true,
        },
      ],
      salaryHistory: [
        { effectiveDate: '2024-01-01', basicPay: 114950, localityAdjustment: 4810, totalPay: 119760 },
        { effectiveDate: '2023-01-01', basicPay: 110370, localityAdjustment: 4620, totalPay: 114990 },
        { effectiveDate: '2022-01-01', basicPay: 105510, localityAdjustment: 4415, totalPay: 109925 },
        { effectiveDate: '2021-01-01', basicPay: 103182, localityAdjustment: 4318, totalPay: 107500 },
      ],
      tspAccount: {
        accountBalance: 320000,
        traditionalBalance: 280000,
        rothBalance: 40000,
        contributionPercentage: 5,
        agencyMatchPercentage: 0,
        loanBalance: 12000,
        funds: {
          gFund: 40,
          fFund: 10,
          cFund: 25,
          sFund: 15,
          iFund: 10,
          lFunds: [],
        },
      },
      fegliEnrollment: {
        basicLife: true,
        optionA: false,
        optionB: true,
        optionBMultiple: 2,
        optionC: false,
        optionCMultiple: 0,
      },
      sickLeaveHours: 1890,
      annualLeaveHours: 200,
      maritalStatus: 'married',
      numberOfDependents: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp-003',
      firstName: 'Patricia',
      lastName: 'Williams',
      email: 'patricia.williams@commerce.gov',
      dateOfBirth: '1972-11-08',
      ssn: '***-**-9012',
      agencyCode: 'CM',
      organizationCode: 'NIST',
      payPlan: 'GS',
      grade: '15',
      step: '5',
      currentSalary: 152771,
      localityPayArea: 'Washington-Baltimore-Arlington',
      retirementPlan: 'FERS',
      serviceComputationDate: '1998-03-16',
      serviceHistory: [
        {
          id: 'sp-003-1',
          agencyName: 'Department of Commerce - NIST',
          startDate: '2005-07-01',
          endDate: null,
          retirementCoverage: 'FERS',
          serviceType: 'civilian',
          isCreditable: true,
        },
        {
          id: 'sp-003-2',
          agencyName: 'Department of Energy',
          startDate: '1998-03-16',
          endDate: '2005-06-30',
          retirementCoverage: 'FERS',
          serviceType: 'civilian',
          isCreditable: true,
        },
      ],
      salaryHistory: [
        { effectiveDate: '2024-01-01', basicPay: 146757, localityAdjustment: 6014, totalPay: 152771 },
        { effectiveDate: '2023-01-01', basicPay: 140903, localityAdjustment: 5775, totalPay: 146678 },
        { effectiveDate: '2022-01-01', basicPay: 134760, localityAdjustment: 5523, totalPay: 140283 },
        { effectiveDate: '2021-01-01', basicPay: 131836, localityAdjustment: 5403, totalPay: 137239 },
      ],
      tspAccount: {
        accountBalance: 580000,
        traditionalBalance: 420000,
        rothBalance: 160000,
        contributionPercentage: 15,
        agencyMatchPercentage: 5,
        loanBalance: 0,
        funds: {
          gFund: 20,
          fFund: 10,
          cFund: 30,
          sFund: 20,
          iFund: 10,
          lFunds: [{ name: 'L 2040', percentage: 10 }],
        },
      },
      fegliEnrollment: {
        basicLife: true,
        optionA: true,
        optionB: true,
        optionBMultiple: 5,
        optionC: true,
        optionCMultiple: 3,
      },
      sickLeaveHours: 1650,
      annualLeaveHours: 180,
      maritalStatus: 'married',
      numberOfDependents: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp-004',
      firstName: 'David',
      lastName: 'Kim',
      email: 'david.kim@commerce.gov',
      dateOfBirth: '1978-06-30',
      ssn: '***-**-3456',
      agencyCode: 'CM',
      organizationCode: 'BEA',
      payPlan: 'GS',
      grade: '12',
      step: '8',
      currentSalary: 106823,
      localityPayArea: 'Washington-Baltimore-Arlington',
      retirementPlan: 'FERS-RAE',
      serviceComputationDate: '2013-09-02',
      serviceHistory: [
        {
          id: 'sp-004-1',
          agencyName: 'Department of Commerce - BEA',
          startDate: '2013-09-02',
          endDate: null,
          retirementCoverage: 'FERS-RAE',
          serviceType: 'civilian',
          isCreditable: true,
        },
      ],
      salaryHistory: [
        { effectiveDate: '2024-01-01', basicPay: 102530, localityAdjustment: 4293, totalPay: 106823 },
        { effectiveDate: '2023-01-01', basicPay: 98430, localityAdjustment: 4121, totalPay: 102551 },
        { effectiveDate: '2022-01-01', basicPay: 94120, localityAdjustment: 3940, totalPay: 98060 },
      ],
      tspAccount: {
        accountBalance: 185000,
        traditionalBalance: 120000,
        rothBalance: 65000,
        contributionPercentage: 10,
        agencyMatchPercentage: 5,
        loanBalance: 0,
        funds: {
          gFund: 10,
          fFund: 5,
          cFund: 35,
          sFund: 25,
          iFund: 15,
          lFunds: [{ name: 'L 2050', percentage: 10 }],
        },
      },
      fegliEnrollment: {
        basicLife: true,
        optionA: false,
        optionB: true,
        optionBMultiple: 2,
        optionC: false,
        optionCMultiple: 0,
      },
      sickLeaveHours: 780,
      annualLeaveHours: 120,
      maritalStatus: 'single',
      numberOfDependents: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'emp-005',
      firstName: 'Angela',
      lastName: 'Martinez',
      email: 'angela.martinez@commerce.gov',
      dateOfBirth: '1985-01-12',
      ssn: '***-**-7890',
      agencyCode: 'CM',
      organizationCode: 'ITA',
      payPlan: 'GS',
      grade: '11',
      step: '5',
      currentSalary: 86335,
      localityPayArea: 'Washington-Baltimore-Arlington',
      retirementPlan: 'FERS-FRAE',
      serviceComputationDate: '2014-06-30',
      serviceHistory: [
        {
          id: 'sp-005-1',
          agencyName: 'Department of Commerce - ITA',
          startDate: '2014-06-30',
          endDate: null,
          retirementCoverage: 'FERS-FRAE',
          serviceType: 'civilian',
          isCreditable: true,
        },
      ],
      salaryHistory: [
        { effectiveDate: '2024-01-01', basicPay: 82880, localityAdjustment: 3455, totalPay: 86335 },
        { effectiveDate: '2023-01-01', basicPay: 79570, localityAdjustment: 3317, totalPay: 82887 },
        { effectiveDate: '2022-01-01', basicPay: 76080, localityAdjustment: 3172, totalPay: 79252 },
      ],
      tspAccount: {
        accountBalance: 95000,
        traditionalBalance: 55000,
        rothBalance: 40000,
        contributionPercentage: 8,
        agencyMatchPercentage: 5,
        loanBalance: 5000,
        funds: {
          gFund: 5,
          fFund: 5,
          cFund: 40,
          sFund: 25,
          iFund: 15,
          lFunds: [{ name: 'L 2060', percentage: 10 }],
        },
      },
      fegliEnrollment: {
        basicLife: true,
        optionA: true,
        optionB: false,
        optionBMultiple: 0,
        optionC: true,
        optionCMultiple: 1,
      },
      sickLeaveHours: 520,
      annualLeaveHours: 80,
      maritalStatus: 'married',
      numberOfDependents: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const emp of seedData) {
    employees.set(emp.id, emp);
  }
}

function seedUsers(): void {
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync('password123', 10);

  const seedData: User[] = [
    {
      id: 'user-001',
      username: 'admin',
      passwordHash: hash,
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@commerce.gov',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'user-002',
      username: 'jsmith',
      passwordHash: hash,
      role: 'hr_specialist',
      firstName: 'Jennifer',
      lastName: 'Smith',
      email: 'jennifer.smith@commerce.gov',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'user-003',
      username: 'mchen',
      passwordHash: hash,
      role: 'employee',
      employeeId: 'emp-001',
      firstName: 'Margaret',
      lastName: 'Chen',
      email: 'margaret.chen@commerce.gov',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'user-004',
      username: 'pwilliams',
      passwordHash: hash,
      role: 'employee',
      employeeId: 'emp-003',
      firstName: 'Patricia',
      lastName: 'Williams',
      email: 'patricia.williams@commerce.gov',
      isActive: true,
      createdAt: now,
    },
  ];

  for (const user of seedData) {
    users.set(user.id, user);
  }
}

function seedCases(): void {
  const now = new Date().toISOString();

  const seedData: RetirementCase[] = [
    {
      id: 'case-001',
      employeeId: 'emp-001',
      caseNumber: 'DOC-RET-2026-0001',
      type: 'voluntary',
      status: 'under_review',
      retirementDate: '2026-09-30',
      assignedSpecialistId: 'user-002',
      calculations: [],
      determinations: [],
      forms: [],
      notes: [
        {
          id: 'note-001',
          authorId: 'user-002',
          authorName: 'Jennifer Smith',
          content: 'Employee is eligible for voluntary retirement under CSRS. Verified 36+ years of creditable service including military buyback.',
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'case-002',
      employeeId: 'emp-003',
      caseNumber: 'DOC-RET-2026-0002',
      type: 'voluntary',
      status: 'draft',
      retirementDate: '2027-01-03',
      assignedSpecialistId: null,
      calculations: [],
      determinations: [],
      forms: [],
      notes: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const c of seedData) {
    cases.set(c.id, c);
  }
}

function seedEducation(): void {
  const now = new Date().toISOString();

  const seedData: EducationResource[] = [
    {
      id: 'edu-001',
      title: 'Understanding CSRS Retirement',
      description: 'A comprehensive guide to the Civil Service Retirement System, including eligibility requirements, benefit calculations, and survivor benefits.',
      category: 'retirement_systems',
      type: 'article',
      content: 'The Civil Service Retirement System (CSRS) covers federal employees hired before January 1, 1984. CSRS employees do not pay Social Security taxes on their federal earnings and generally do not receive Social Security benefits based on federal service. The CSRS annuity is calculated using the high-3 average salary and years of creditable service.',
      tags: ['CSRS', 'retirement', 'annuity', 'eligibility'],
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-002',
      title: 'FERS Retirement Overview',
      description: 'Learn about the three components of the Federal Employees Retirement System: basic benefit, Social Security, and TSP.',
      category: 'retirement_systems',
      type: 'article',
      content: 'The Federal Employees Retirement System (FERS) is a three-tiered retirement plan consisting of a basic annuity, Social Security benefits, and the Thrift Savings Plan (TSP). FERS employees contribute to Social Security and receive matching TSP contributions from their agency.',
      tags: ['FERS', 'retirement', 'three-tier', 'Social Security'],
      order: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-003',
      title: 'Thrift Savings Plan Investment Options',
      description: 'Detailed overview of TSP fund options including G, F, C, S, I, and Lifecycle funds.',
      category: 'tsp',
      type: 'article',
      content: 'The TSP offers six individual funds and several Lifecycle (L) funds. The G Fund invests in government securities, F Fund in fixed-income bonds, C Fund tracks the S&P 500, S Fund tracks small-cap stocks, and I Fund tracks international stocks. Lifecycle funds automatically adjust their allocation as you approach your target retirement date.',
      tags: ['TSP', 'investing', 'funds', 'lifecycle'],
      order: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-004',
      title: 'FEGLI - Federal Life Insurance',
      description: 'Guide to Federal Employees Group Life Insurance coverage options, costs, and post-retirement considerations.',
      category: 'fegli',
      type: 'document',
      content: 'FEGLI provides group term life insurance. Basic coverage is equal to your salary rounded up to the nearest $1,000 plus $2,000. Optional coverages include Option A ($10,000 standard), Option B (1-5 multiples of salary), and Option C (family coverage). Premiums increase with age, and coverage can be continued into retirement with certain elections.',
      tags: ['FEGLI', 'life insurance', 'coverage', 'premiums'],
      order: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-005',
      title: 'Social Security and Federal Retirement',
      description: 'How Social Security integrates with FERS and the Windfall Elimination Provision for CSRS employees.',
      category: 'ssa',
      type: 'article',
      content: 'FERS employees earn Social Security benefits based on their federal earnings. CSRS employees who also have non-federal Social Security credits may be subject to the Windfall Elimination Provision (WEP), which can reduce their Social Security benefit. The Government Pension Offset (GPO) may affect spousal Social Security benefits for CSRS retirees.',
      tags: ['Social Security', 'WEP', 'GPO', 'FERS', 'CSRS'],
      order: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-006',
      title: 'Retirement Application Checklist',
      description: 'Step-by-step guide to the federal retirement application process and required forms.',
      category: 'forms_guides',
      type: 'document',
      tags: ['forms', 'checklist', 'application', 'SF-2801', 'SF-3107'],
      order: 6,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'edu-007',
      title: 'Financial Planning for Federal Retirees',
      description: 'Key considerations for financial planning including FEHB, dental, vision, and tax implications of retirement income.',
      category: 'financial_planning',
      type: 'article',
      content: 'Federal retirees can continue their FEHB coverage into retirement if they were enrolled for the 5 consecutive years before retirement. Consider the tax implications of TSP withdrawals, the timing of Social Security benefits, and the impact of survivor benefit elections on your net annuity.',
      tags: ['financial planning', 'FEHB', 'taxes', 'budgeting'],
      order: 7,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const res of seedData) {
    educationResources.set(res.id, res);
  }
}

// ── Initialize ───────────────────────────────────────────────────────────────

export function initializeDatabase(): void {
  seedEmployees();
  seedUsers();
  seedCases();
  seedEducation();
  console.log('[DB] In-memory database initialized with seed data');
  console.log(`  Employees: ${employees.size}`);
  console.log(`  Users: ${users.size}`);
  console.log(`  Cases: ${cases.size}`);
  console.log(`  Education Resources: ${educationResources.size}`);
}
