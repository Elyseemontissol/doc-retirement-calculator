// Federal Retirement Benefits Calculation Engine
// Implements CSRS, CSRS-Offset, FERS, TSP, SSA, and FEGLI calculations
// Based on OPM regulations and formulas

import { v4 as uuidv4 } from 'uuid';
import {
  Employee,
  CalculationRequest,
  CalculationResult,
  SalaryRecord,
} from '../models/types';

// ── Utility Helpers ──────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function diffYearsMonthsDays(start: Date, end: Date): { years: number; months: number; days: number } {
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getUTCFullYear(), end.getUTCMonth(), 0);
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

/**
 * Calculate total creditable service from service history.
 * Returns total in years and months.
 */
function calculateTotalService(employee: Employee, retirementDate: string): { years: number; months: number } {
  let totalMonths = 0;

  for (const period of employee.serviceHistory) {
    if (!period.isCreditable) continue;
    const start = parseDate(period.startDate);
    const end = period.endDate ? parseDate(period.endDate) : parseDate(retirementDate);
    const diff = diffYearsMonthsDays(start, end);
    totalMonths += diff.years * 12 + diff.months + (diff.days >= 16 ? 1 : 0);
  }

  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

/**
 * Convert sick leave hours to years and months credit.
 * OPM uses 2087 hours = 1 year of service, 174 hours ~= 1 month.
 */
function sickLeaveToCredit(hours: number): { years: number; months: number } {
  // Under CSRS: full sick leave credit
  // Under FERS (post-2014): full sick leave credit
  const totalMonths = Math.floor(hours / 174);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

/**
 * Calculate the high-3 average salary from salary history.
 * The high-3 is the highest average basic pay over any 3 consecutive years.
 */
function calculateHighThree(salaryHistory: SalaryRecord[]): {
  average: number;
  periods: { startDate: string; endDate: string; salary: number }[];
} {
  if (salaryHistory.length === 0) {
    return { average: 0, periods: [] };
  }

  // Sort by date descending
  const sorted = [...salaryHistory].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  // Take the top 3 years of salary records for a simplified high-3 calculation
  // In practice OPM looks at the highest average over any consecutive 3-year period
  const topRecords = sorted.slice(0, 3);

  if (topRecords.length === 0) {
    return { average: 0, periods: [] };
  }

  const totalBasicPay = topRecords.reduce((sum, r) => sum + r.totalPay, 0);
  const average = totalBasicPay / topRecords.length;

  const periods = topRecords.map((r, i) => {
    const start = r.effectiveDate;
    const end = i === 0
      ? new Date().toISOString().split('T')[0]
      : sorted[i - 1].effectiveDate;
    return { startDate: start, endDate: end, salary: r.totalPay };
  });

  return { average: Math.round(average * 100) / 100, periods };
}

/**
 * MRA (Minimum Retirement Age) for FERS based on birth year.
 */
function getMRA(dateOfBirth: string): number {
  const birthYear = new Date(dateOfBirth).getUTCFullYear();
  if (birthYear <= 1947) return 55;
  if (birthYear === 1948) return 55 + 2 / 12;
  if (birthYear === 1949) return 55 + 4 / 12;
  if (birthYear === 1950) return 55 + 6 / 12;
  if (birthYear === 1951) return 55 + 8 / 12;
  if (birthYear === 1952) return 55 + 10 / 12;
  if (birthYear >= 1953 && birthYear <= 1964) return 56;
  if (birthYear === 1965) return 56 + 2 / 12;
  if (birthYear === 1966) return 56 + 4 / 12;
  if (birthYear === 1967) return 56 + 6 / 12;
  if (birthYear === 1968) return 56 + 8 / 12;
  if (birthYear === 1969) return 56 + 10 / 12;
  return 57; // 1970 and later
}

function getAgeAtDate(dateOfBirth: string, targetDate: string): number {
  const birth = parseDate(dateOfBirth);
  const target = parseDate(targetDate);
  const diff = diffYearsMonthsDays(birth, target);
  return diff.years + diff.months / 12;
}

function getAgeYears(dateOfBirth: string, targetDate: string): number {
  const birth = parseDate(dateOfBirth);
  const target = parseDate(targetDate);
  return diffYearsMonthsDays(birth, target).years;
}

// ── CSRS Calculator ──────────────────────────────────────────────────────────

export function calculateCSRS(
  employee: Employee,
  request: CalculationRequest
): Partial<CalculationResult> {
  const service = calculateTotalService(employee, request.retirementDate);
  const sickLeave = request.includeSickLeave
    ? sickLeaveToCredit(employee.sickLeaveHours)
    : { years: 0, months: 0 };

  const totalServiceMonths =
    service.years * 12 + service.months + sickLeave.years * 12 + sickLeave.months;
  const totalYears = Math.floor(totalServiceMonths / 12);
  const totalMonths = totalServiceMonths % 12;
  const totalServiceDecimal = totalYears + totalMonths / 12;

  const highThree = calculateHighThree(employee.salaryHistory);

  // CSRS accrual rates:
  // 1.5% of high-3 for the first 5 years
  // 1.75% of high-3 for the next 5 years
  // 2.0% of high-3 for years over 10
  let annuityPercentage = 0;
  if (totalServiceDecimal <= 5) {
    annuityPercentage = totalServiceDecimal * 1.5;
  } else if (totalServiceDecimal <= 10) {
    annuityPercentage = 5 * 1.5 + (totalServiceDecimal - 5) * 1.75;
  } else {
    annuityPercentage = 5 * 1.5 + 5 * 1.75 + (totalServiceDecimal - 10) * 2.0;
  }

  // CSRS cap: annuity cannot exceed 80% of high-3
  annuityPercentage = Math.min(annuityPercentage, 80);

  let grossAnnuity = (annuityPercentage / 100) * highThree.average;

  // Age-based reduction for early retirement (MRA+10 equivalent for CSRS)
  // CSRS voluntary early: age 50 with 20 years, or any age with 25 years
  // Reduction: 2% per year under age 55 (1/6% per month)
  const ageAtRetirement = getAgeAtDate(employee.dateOfBirth, request.retirementDate);
  if (request.retirementType === 'early' && ageAtRetirement < 55) {
    const monthsUnder55 = Math.max(0, (55 - ageAtRetirement) * 12);
    const reductionFactor = monthsUnder55 * (1 / 6 / 100); // 1/6% per month = ~2% per year
    grossAnnuity *= (1 - reductionFactor);
  }

  // Survivor benefit reduction
  let survivorReduction = 0;
  if (request.survivorBenefitOption === 'full') {
    // Full survivor benefit = 55% to spouse, costs ~10% of annuity
    // Actual CSRS: 2.5% of first $3,600 + 10% of remainder
    const base = Math.min(grossAnnuity, 3600);
    const excess = Math.max(0, grossAnnuity - 3600);
    survivorReduction = base * 0.025 + excess * 0.10;
  } else if (request.survivorBenefitOption === 'half') {
    // Partial survivor benefit
    const base = Math.min(grossAnnuity, 3600);
    const excess = Math.max(0, grossAnnuity - 3600);
    survivorReduction = (base * 0.025 + excess * 0.10) * 0.5;
  }

  const netAnnuity = grossAnnuity - survivorReduction;

  return {
    retirementSystem: 'CSRS',
    yearsOfService: service.years,
    monthsOfService: service.months,
    sickLeaveCredit: sickLeave,
    totalServiceCredit: { years: totalYears, months: totalMonths },
    highThreeAverage: highThree.average,
    highThreePeriods: highThree.periods,
    grossAnnuity: Math.round(grossAnnuity * 100) / 100,
    monthlyAnnuity: Math.round((grossAnnuity / 12) * 100) / 100,
    survivorBenefitReduction: Math.round(survivorReduction * 100) / 100,
    netAnnuity: Math.round(netAnnuity * 100) / 100,
    monthlyNetAnnuity: Math.round((netAnnuity / 12) * 100) / 100,
  };
}

// ── CSRS-Offset Calculator ───────────────────────────────────────────────────

export function calculateCSRSOffset(
  employee: Employee,
  request: CalculationRequest
): Partial<CalculationResult> {
  // Start with the same CSRS calculation
  const csrsResult = calculateCSRS(employee, request);

  // The offset begins at age 62 (or when SSA disability benefit begins)
  // Offset amount = the portion of SSA benefit attributable to CSRS-Offset service
  // Simplified: estimate the SSA benefit and apply the offset
  const estimatedSSA = estimateSSABenefit(employee, request.ssaStartAge || 62);

  // The offset is based on years of CSRS-Offset service and the SSA benefit
  // Approximation: (CSRS-Offset service years / 40) * SSA benefit
  const totalService = (csrsResult.totalServiceCredit?.years || 0) +
    (csrsResult.totalServiceCredit?.months || 0) / 12;
  const offsetFraction = Math.min(totalService / 40, 1);
  const annualOffset = estimatedSSA * 12 * offsetFraction;

  // The offset only applies at age 62+, even if retiring earlier
  const ageAtRetirement = getAgeAtDate(employee.dateOfBirth, request.retirementDate);
  const offsetApplied = ageAtRetirement >= 62 ? annualOffset : 0;

  const adjustedGross = (csrsResult.grossAnnuity || 0) - offsetApplied;
  const adjustedNet = (csrsResult.netAnnuity || 0) - offsetApplied;

  return {
    ...csrsResult,
    retirementSystem: 'CSRS-Offset',
    grossAnnuity: Math.round(Math.max(0, adjustedGross) * 100) / 100,
    monthlyAnnuity: Math.round(Math.max(0, adjustedGross / 12) * 100) / 100,
    netAnnuity: Math.round(Math.max(0, adjustedNet) * 100) / 100,
    monthlyNetAnnuity: Math.round(Math.max(0, adjustedNet / 12) * 100) / 100,
    estimatedSSA: Math.round(estimatedSSA * 100) / 100,
    ssaStartAge: request.ssaStartAge || 62,
  };
}

// ── FERS Calculator ──────────────────────────────────────────────────────────

export function calculateFERS(
  employee: Employee,
  request: CalculationRequest
): Partial<CalculationResult> {
  const service = calculateTotalService(employee, request.retirementDate);
  const sickLeave = request.includeSickLeave
    ? sickLeaveToCredit(employee.sickLeaveHours)
    : { years: 0, months: 0 };

  const totalServiceMonths =
    service.years * 12 + service.months + sickLeave.years * 12 + sickLeave.months;
  const totalYears = Math.floor(totalServiceMonths / 12);
  const totalMonths = totalServiceMonths % 12;
  const totalServiceDecimal = totalYears + totalMonths / 12;

  const highThree = calculateHighThree(employee.salaryHistory);
  const ageAtRetirement = getAgeAtDate(employee.dateOfBirth, request.retirementDate);
  const ageYears = getAgeYears(employee.dateOfBirth, request.retirementDate);

  // FERS accrual rate:
  // 1% of high-3 per year of service
  // 1.1% if retiring at age 62 or older with 20+ years of service
  const accrualRate = (ageYears >= 62 && totalServiceDecimal >= 20) ? 1.1 : 1.0;
  let grossAnnuity = (accrualRate / 100) * highThree.average * totalServiceDecimal;

  // MRA+10 reduction: 5% per year (5/12% per month) under age 62
  // unless employee has 30 years at MRA or 20 years at 60
  const mra = getMRA(employee.dateOfBirth);
  if (request.retirementType === 'MRA+10' && ageAtRetirement < 62) {
    const monthsUnder62 = Math.max(0, Math.ceil((62 - ageAtRetirement) * 12));
    const reductionPercent = monthsUnder62 * (5 / 12 / 100);
    grossAnnuity *= (1 - reductionPercent);
  }

  // Early retirement reduction for discontinued service / early out
  if (request.retirementType === 'early' && ageAtRetirement < mra) {
    const monthsUnderMRA = Math.max(0, Math.ceil((mra - ageAtRetirement) * 12));
    const reductionPercent = monthsUnderMRA * (5 / 12 / 100);
    grossAnnuity *= (1 - reductionPercent);
  }

  // Survivor benefit reduction (FERS)
  let survivorReduction = 0;
  if (request.survivorBenefitOption === 'full') {
    // Full survivor (50% to spouse) costs 10% of annuity
    survivorReduction = grossAnnuity * 0.10;
  } else if (request.survivorBenefitOption === 'half') {
    // Partial survivor (25% to spouse) costs 5% of annuity
    survivorReduction = grossAnnuity * 0.05;
  }

  const netAnnuity = grossAnnuity - survivorReduction;

  // FERS Special Retirement Supplement (SRS)
  // Available from MRA to age 62, approximates SSA benefit earned during federal service
  // Formula: estimated full SSA benefit * (years of FERS service / 40)
  let fersSupplement: number | undefined;
  if (ageAtRetirement < 62 && totalServiceDecimal >= 20 && ageAtRetirement >= mra) {
    const estimatedFullSSA = estimateSSABenefit(employee, 62);
    const serviceRatio = Math.min(totalServiceDecimal / 40, 1);
    fersSupplement = Math.round(estimatedFullSSA * serviceRatio * 12 * 100) / 100;
    // fersSupplement is annual amount
  }

  // SSA estimate
  const ssaAge = request.ssaStartAge || 67;
  const estimatedSSA = estimateSSABenefit(employee, ssaAge);

  return {
    retirementSystem: employee.retirementPlan, // FERS, FERS-RAE, or FERS-FRAE
    yearsOfService: service.years,
    monthsOfService: service.months,
    sickLeaveCredit: sickLeave,
    totalServiceCredit: { years: totalYears, months: totalMonths },
    highThreeAverage: highThree.average,
    highThreePeriods: highThree.periods,
    grossAnnuity: Math.round(grossAnnuity * 100) / 100,
    monthlyAnnuity: Math.round((grossAnnuity / 12) * 100) / 100,
    survivorBenefitReduction: Math.round(survivorReduction * 100) / 100,
    netAnnuity: Math.round(netAnnuity * 100) / 100,
    monthlyNetAnnuity: Math.round((netAnnuity / 12) * 100) / 100,
    fersSupplement,
    estimatedSSA: Math.round(estimatedSSA * 100) / 100,
    ssaStartAge: ssaAge,
  };
}

// ── TSP Calculator ───────────────────────────────────────────────────────────

export function calculateTSP(
  employee: Employee,
  request: CalculationRequest
): { tspBalance: number; tspMonthlyIncome?: number } {
  const currentBalance = employee.tspAccount.accountBalance;
  const retirementDate = parseDate(request.retirementDate);
  const now = new Date();

  // Project balance to retirement date assuming average 6% annual return
  const yearsToRetirement = Math.max(0, (retirementDate.getTime() - now.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const annualContribution = employee.currentSalary * (employee.tspAccount.contributionPercentage / 100);
  const agencyMatch = employee.retirementPlan.startsWith('FERS')
    ? employee.currentSalary * (employee.tspAccount.agencyMatchPercentage / 100)
    : 0;
  const totalAnnualContrib = annualContribution + agencyMatch;

  // Future value of current balance + future value of annuity (contributions)
  const annualReturn = 0.06;
  const projectedBalance =
    currentBalance * Math.pow(1 + annualReturn, yearsToRetirement) +
    totalAnnualContrib * ((Math.pow(1 + annualReturn, yearsToRetirement) - 1) / annualReturn);

  const finalBalance = Math.round(projectedBalance * 100) / 100;

  // Calculate monthly income based on withdrawal option
  let tspMonthlyIncome: number | undefined;

  if (request.tspWithdrawalOption === 'annuity') {
    // TSP annuity: approximate using life expectancy
    // Single life annuity factor for age 60-65 is roughly 6.5% annual payout
    // Joint annuity factor is roughly 5.5%
    const ageAtRetirement = getAgeAtDate(employee.dateOfBirth, request.retirementDate);
    let annuityRate: number;
    if (request.tspAnnuityType === 'joint') {
      annuityRate = ageAtRetirement >= 65 ? 0.058 : 0.052;
    } else {
      annuityRate = ageAtRetirement >= 65 ? 0.068 : 0.062;
    }
    tspMonthlyIncome = Math.round((finalBalance * annuityRate / 12) * 100) / 100;
  } else if (request.tspWithdrawalOption === 'installments') {
    // Installments over life expectancy (~25 years from age 62)
    const ageAtRetirement = getAgeAtDate(employee.dateOfBirth, request.retirementDate);
    const lifeExpectancy = Math.max(85 - ageAtRetirement, 10);
    tspMonthlyIncome = Math.round((finalBalance / (lifeExpectancy * 12)) * 100) / 100;
  }

  return { tspBalance: finalBalance, tspMonthlyIncome };
}

// ── SSA Estimator ────────────────────────────────────────────────────────────

/**
 * Simplified SSA benefit estimation.
 * Uses a simplified PIA (Primary Insurance Amount) calculation.
 */
function estimateSSABenefit(employee: Employee, startAge: number): number {
  // Simplified: estimate based on average indexed monthly earnings (AIME)
  // Use current salary as a proxy for career average (simplified)
  const annualEarnings = employee.currentSalary;
  const aime = Math.round(annualEarnings / 12);

  // 2024 PIA bend points (simplified)
  const bendPoint1 = 1174;
  const bendPoint2 = 7078;

  let pia = 0;
  if (aime <= bendPoint1) {
    pia = aime * 0.9;
  } else if (aime <= bendPoint2) {
    pia = bendPoint1 * 0.9 + (aime - bendPoint1) * 0.32;
  } else {
    pia = bendPoint1 * 0.9 + (bendPoint2 - bendPoint1) * 0.32 + (aime - bendPoint2) * 0.15;
  }

  // Apply WEP for CSRS/CSRS-Offset employees
  // WEP reduces the 90% factor to as low as 40% for first bend point
  if (employee.retirementPlan === 'CSRS' || employee.retirementPlan === 'CSRS-Offset') {
    // WEP maximum reduction in 2024 is $558/month
    // Simplified: reduce first bend point factor from 90% to 40%
    const wepReduction = Math.min(bendPoint1 * 0.5, 558);
    pia = Math.max(0, pia - wepReduction);
  }

  // Age adjustment factors
  // Full retirement age (FRA) = 67 for those born 1960+
  // Early: reduced by 5/9% per month for first 36 months before FRA,
  //        then 5/12% per month for additional months
  // Delayed: 8% per year (2/3% per month) for each year after FRA up to 70
  const fra = 67;
  let adjustedPIA = pia;

  if (startAge < fra) {
    const monthsEarly = (fra - startAge) * 12;
    const first36 = Math.min(monthsEarly, 36);
    const additional = Math.max(0, monthsEarly - 36);
    const reduction = (first36 * 5 / 900) + (additional * 5 / 1200);
    adjustedPIA = pia * (1 - reduction);
  } else if (startAge > fra) {
    const monthsDelayed = Math.min((startAge - fra) * 12, 36); // max delay credit to 70
    const increase = monthsDelayed * (2 / 300);
    adjustedPIA = pia * (1 + increase);
  }

  return Math.round(adjustedPIA * 100) / 100;
}

export function calculateSSA(
  employee: Employee,
  startAge: number = 67,
  includeWEP: boolean = true
): { monthlyBenefit: number; annualBenefit: number; startAge: number } {
  const monthly = estimateSSABenefit(employee, startAge);
  return {
    monthlyBenefit: monthly,
    annualBenefit: Math.round(monthly * 12 * 100) / 100,
    startAge,
  };
}

// ── FEGLI Calculator ─────────────────────────────────────────────────────────

export function calculateFEGLI(
  employee: Employee,
  retirementDate: string
): { monthlyCost: number; totalCoverage: number } {
  const salary = employee.currentSalary;
  const enrollment = employee.fegliEnrollment;
  const age = getAgeYears(employee.dateOfBirth, retirementDate);

  // Basic Insurance Amount (BIA)
  // Salary rounded up to nearest $1,000, plus $2,000
  const bia = enrollment.basicLife ? Math.ceil(salary / 1000) * 1000 + 2000 : 0;

  // Basic life biweekly cost per $1,000 of BIA (age-based post-retirement)
  // Pre-65 post-retirement: $0.3250 per $1,000 per biweekly period (under 45),
  // increasing with age. Simplified schedule (monthly rates per $1,000):
  function basicMonthlyRatePer1000(age: number): number {
    if (age < 35) return 0.0433;
    if (age < 40) return 0.0533;
    if (age < 45) return 0.0700;
    if (age < 50) return 0.0975;
    if (age < 55) return 0.1517;
    if (age < 60) return 0.2850;
    if (age < 65) return 0.5200;
    return 0.6500; // 65+
  }

  const basicCost = enrollment.basicLife
    ? (bia / 1000) * basicMonthlyRatePer1000(age)
    : 0;

  // Option A: $10,000 additional
  function optionAMonthly(age: number): number {
    if (age < 35) return 0.43;
    if (age < 40) return 0.65;
    if (age < 45) return 0.87;
    if (age < 50) return 1.30;
    if (age < 55) return 2.17;
    if (age < 60) return 4.33;
    if (age < 65) return 8.67;
    return 10.83;
  }

  const optionACost = enrollment.optionA ? optionAMonthly(age) : 0;

  // Option B: 1-5 multiples of salary
  // Monthly rate per $1,000 of Option B coverage
  function optionBMonthlyPer1000(age: number): number {
    if (age < 35) return 0.0433;
    if (age < 40) return 0.0650;
    if (age < 45) return 0.0867;
    if (age < 50) return 0.1300;
    if (age < 55) return 0.2167;
    if (age < 60) return 0.4333;
    if (age < 65) return 0.8667;
    return 1.0833;
  }

  const optionBAmount = enrollment.optionB
    ? Math.ceil(salary / 1000) * 1000 * enrollment.optionBMultiple
    : 0;
  const optionBCost = enrollment.optionB
    ? (optionBAmount / 1000) * optionBMonthlyPer1000(age)
    : 0;

  // Option C: Family coverage
  // Multiple * $5,000 for spouse, * $2,500 for each child
  // Simplified: use spouse amount as primary
  function optionCMonthlyPerMultiple(age: number): number {
    if (age < 35) return 0.87;
    if (age < 40) return 1.04;
    if (age < 45) return 1.30;
    if (age < 50) return 1.73;
    if (age < 55) return 2.60;
    if (age < 60) return 4.77;
    if (age < 65) return 8.67;
    return 10.83;
  }

  const optionCAmount = enrollment.optionC
    ? enrollment.optionCMultiple * 5000 // spouse coverage per multiple
    : 0;
  const optionCCost = enrollment.optionC
    ? enrollment.optionCMultiple * optionCMonthlyPerMultiple(age)
    : 0;

  const totalMonthlyCost = Math.round((basicCost + optionACost + optionBCost + optionCCost) * 100) / 100;
  const totalCoverage = bia + (enrollment.optionA ? 10000 : 0) + optionBAmount + optionCAmount;

  return { monthlyCost: totalMonthlyCost, totalCoverage };
}

// ── Full Calculation Runner ──────────────────────────────────────────────────

export function runFullCalculation(
  employee: Employee,
  request: CalculationRequest
): CalculationResult {
  // Select the right calculator based on retirement system
  let annuityResult: Partial<CalculationResult>;

  switch (employee.retirementPlan) {
    case 'CSRS':
      annuityResult = calculateCSRS(employee, request);
      break;
    case 'CSRS-Offset':
      annuityResult = calculateCSRSOffset(employee, request);
      break;
    case 'FERS':
    case 'FERS-RAE':
    case 'FERS-FRAE':
      annuityResult = calculateFERS(employee, request);
      break;
    default:
      throw new Error(`Unsupported retirement plan: ${employee.retirementPlan}`);
  }

  // TSP
  const tspResult = calculateTSP(employee, request);

  // FEGLI
  const fegliResult = calculateFEGLI(employee, request.retirementDate);

  // Total monthly income
  const monthlyAnnuity = annuityResult.monthlyNetAnnuity || 0;
  const tspMonthly = tspResult.tspMonthlyIncome || 0;
  const ssaMonthly = annuityResult.estimatedSSA || 0;
  const supplementMonthly = annuityResult.fersSupplement
    ? annuityResult.fersSupplement / 12
    : 0;

  const totalMonthly = Math.round((monthlyAnnuity + tspMonthly + ssaMonthly + supplementMonthly) * 100) / 100;

  const result: CalculationResult = {
    id: uuidv4(),
    employeeId: employee.id,
    calculatedAt: new Date().toISOString(),
    retirementSystem: annuityResult.retirementSystem || employee.retirementPlan,
    retirementDate: request.retirementDate,
    retirementType: request.retirementType,

    yearsOfService: annuityResult.yearsOfService || 0,
    monthsOfService: annuityResult.monthsOfService || 0,
    sickLeaveCredit: annuityResult.sickLeaveCredit || { years: 0, months: 0 },
    totalServiceCredit: annuityResult.totalServiceCredit || { years: 0, months: 0 },

    highThreeAverage: annuityResult.highThreeAverage || 0,
    highThreePeriods: annuityResult.highThreePeriods || [],

    grossAnnuity: annuityResult.grossAnnuity || 0,
    monthlyAnnuity: annuityResult.monthlyAnnuity || 0,
    survivorBenefitReduction: annuityResult.survivorBenefitReduction || 0,
    netAnnuity: annuityResult.netAnnuity || 0,
    monthlyNetAnnuity: annuityResult.monthlyNetAnnuity || 0,

    fersSupplement: annuityResult.fersSupplement,

    tspBalance: tspResult.tspBalance,
    tspMonthlyIncome: tspResult.tspMonthlyIncome,

    estimatedSSA: annuityResult.estimatedSSA,
    ssaStartAge: annuityResult.ssaStartAge,

    fegliMonthlyCost: fegliResult.monthlyCost,
    fegliCoverage: fegliResult.totalCoverage,

    totalMonthlyIncome: totalMonthly,
    totalAnnualIncome: Math.round(totalMonthly * 12 * 100) / 100,
  };

  return result;
}
