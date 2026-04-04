// Mock NFC (National Finance Center) Integration Service
// Simulates RESTful API calls to the NFC payroll system

import { Employee, ServicePeriod, SalaryRecord, TSPAccount } from '../models/types';
import { employees } from '../config/database';

interface NFCResponse<T> {
  status: 'success' | 'error';
  timestamp: string;
  requestId: string;
  data: T | null;
  error?: string;
}

function generateRequestId(): string {
  return `NFC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function wrapResponse<T>(data: T | null, error?: string): NFCResponse<T> {
  return {
    status: error ? 'error' : 'success',
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    data,
    error,
  };
}

interface NFCEmployeePayroll {
  employeeId: string;
  name: string;
  ssn: string;
  agencyCode: string;
  organizationCode: string;
  payPlan: string;
  grade: string;
  step: string;
  basicPay: number;
  localityPay: number;
  totalPay: number;
  localityPayArea: string;
  retirementPlan: string;
  serviceComputationDate: string;
  fehbEnrollmentCode: string;
  fegliCode: string;
  tspElectionPercentage: number;
  withholdingAllowances: number;
  payFrequency: 'biweekly';
  payPeriod: string;
  netPay: number;
  deductions: {
    federalTax: number;
    stateTax: number;
    socialSecurity: number;
    medicare: number;
    retirementContribution: number;
    fehbPremium: number;
    fegliPremium: number;
    tspContribution: number;
    tspLoanRepayment: number;
  };
}

/**
 * Fetch employee payroll data from NFC.
 */
export async function fetchEmployeeData(employeeId: string): Promise<NFCResponse<NFCEmployeePayroll>> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 50));

  const employee = employees.get(employeeId);
  if (!employee) {
    return wrapResponse<NFCEmployeePayroll>(null, `Employee ${employeeId} not found in NFC system`);
  }

  const biweeklyPay = employee.currentSalary / 26;
  const retirementRate = employee.retirementPlan.startsWith('CSRS') ? 0.07 : 0.008;
  const ssRate = employee.retirementPlan === 'CSRS' ? 0 : 0.062;

  const payrollData: NFCEmployeePayroll = {
    employeeId: employee.id,
    name: `${employee.lastName}, ${employee.firstName}`,
    ssn: employee.ssn,
    agencyCode: employee.agencyCode,
    organizationCode: employee.organizationCode,
    payPlan: employee.payPlan,
    grade: employee.grade,
    step: employee.step,
    basicPay: Math.round(employee.salaryHistory[0]?.basicPay / 26 * 100) / 100,
    localityPay: Math.round(employee.salaryHistory[0]?.localityAdjustment / 26 * 100) / 100,
    totalPay: Math.round(biweeklyPay * 100) / 100,
    localityPayArea: employee.localityPayArea,
    retirementPlan: employee.retirementPlan,
    serviceComputationDate: employee.serviceComputationDate,
    fehbEnrollmentCode: '105', // Example FEHB code
    fegliCode: employee.fegliEnrollment.basicLife ? 'A' : 'N',
    tspElectionPercentage: employee.tspAccount.contributionPercentage,
    withholdingAllowances: employee.numberOfDependents + 1,
    payFrequency: 'biweekly',
    payPeriod: '2026-PP07',
    netPay: Math.round(biweeklyPay * 0.68 * 100) / 100, // Simplified net
    deductions: {
      federalTax: Math.round(biweeklyPay * 0.18 * 100) / 100,
      stateTax: Math.round(biweeklyPay * 0.05 * 100) / 100,
      socialSecurity: Math.round(biweeklyPay * ssRate * 100) / 100,
      medicare: Math.round(biweeklyPay * 0.0145 * 100) / 100,
      retirementContribution: Math.round(biweeklyPay * retirementRate * 100) / 100,
      fehbPremium: 185.42,
      fegliPremium: 12.50,
      tspContribution: Math.round(biweeklyPay * (employee.tspAccount.contributionPercentage / 100) * 100) / 100,
      tspLoanRepayment: employee.tspAccount.loanBalance > 0 ? 75.00 : 0,
    },
  };

  return wrapResponse(payrollData);
}

/**
 * Fetch service computation records from NFC.
 */
export async function fetchServiceHistory(employeeId: string): Promise<NFCResponse<ServicePeriod[]>> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const employee = employees.get(employeeId);
  if (!employee) {
    return wrapResponse<ServicePeriod[]>(null, `Employee ${employeeId} not found`);
  }

  return wrapResponse(employee.serviceHistory);
}

/**
 * Fetch salary history from NFC.
 */
export async function fetchSalaryHistory(employeeId: string): Promise<NFCResponse<SalaryRecord[]>> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const employee = employees.get(employeeId);
  if (!employee) {
    return wrapResponse<SalaryRecord[]>(null, `Employee ${employeeId} not found`);
  }

  return wrapResponse(employee.salaryHistory);
}

/**
 * Fetch TSP account data from NFC/FRTIB.
 */
export async function fetchTSPData(employeeId: string): Promise<NFCResponse<TSPAccount>> {
  await new Promise(resolve => setTimeout(resolve, 50));

  const employee = employees.get(employeeId);
  if (!employee) {
    return wrapResponse<TSPAccount>(null, `Employee ${employeeId} not found`);
  }

  return wrapResponse(employee.tspAccount);
}

/**
 * Full sync of employee record from NFC.
 * In production, this would pull fresh data and update the local record.
 */
export async function syncEmployeeRecord(employeeId: string): Promise<NFCResponse<{ synced: boolean; fields: string[] }>> {
  await new Promise(resolve => setTimeout(resolve, 100));

  const employee = employees.get(employeeId);
  if (!employee) {
    return wrapResponse<{ synced: boolean; fields: string[] }>(null, `Employee ${employeeId} not found`);
  }

  // Simulate a sync - update the updatedAt timestamp
  employee.updatedAt = new Date().toISOString();
  employees.set(employeeId, employee);

  return wrapResponse({
    synced: true,
    fields: [
      'basicPay',
      'localityAdjustment',
      'totalPay',
      'grade',
      'step',
      'tspContributionPercentage',
      'tspAccountBalance',
      'sickLeaveHours',
      'annualLeaveHours',
      'fegliEnrollment',
    ],
  });
}
