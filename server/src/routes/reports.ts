// Report Routes

import { Router, Request, Response } from 'express';
import { employees, cases } from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

function getAgeAtDate(dob: string, target: Date): number {
  const birth = new Date(dob);
  let age = target.getFullYear() - birth.getFullYear();
  const monthDiff = target.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getServiceYears(scd: string, target: Date): number {
  const start = new Date(scd);
  return (target.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function getMRA(dob: string): number {
  const year = new Date(dob).getFullYear();
  if (year <= 1947) return 55;
  if (year <= 1952) return 55 + (year - 1947) * (2 / 12);
  if (year <= 1964) return 56;
  if (year <= 1969) return 56 + (year - 1964) * (2 / 12);
  return 57;
}

interface EligibilityInfo {
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

function checkEligibility(emp: typeof employees extends Map<string, infer V> ? V : never): EligibilityInfo {
  const now = new Date();
  const oneYear = new Date(now.getTime() + 365.25 * 24 * 60 * 60 * 1000);
  const fiveYears = new Date(now.getTime() + 5 * 365.25 * 24 * 60 * 60 * 1000);

  const age = getAgeAtDate(emp.dateOfBirth, now);
  const svcYears = getServiceYears(emp.serviceComputationDate, now);
  const plan = emp.retirementPlan;

  function isEligibleAt(date: Date): boolean {
    const a = getAgeAtDate(emp.dateOfBirth, date);
    const s = getServiceYears(emp.serviceComputationDate, date);

    if (plan === 'CSRS' || plan === 'CSRS-Offset') {
      if (a >= 55 && s >= 30) return true;
      if (a >= 60 && s >= 20) return true;
      if (a >= 62 && s >= 5) return true;
      return false;
    }
    // FERS / FERS-RAE / FERS-FRAE
    const mra = getMRA(emp.dateOfBirth);
    if (a >= mra && s >= 30) return true;
    if (a >= 60 && s >= 20) return true;
    if (a >= 62 && s >= 5) return true;
    if (a >= mra && s >= 10) return true; // MRA+10 with reduction
    return false;
  }

  const eligibleNow = isEligibleAt(now);
  const eligibleWithin1Year = isEligibleAt(oneYear);
  const eligibleWithin5Years = isEligibleAt(fiveYears);

  // Find earliest eligible date (approximate by checking month by month for 30 years)
  let earliestDate: string | null = null;
  if (!eligibleNow) {
    for (let m = 1; m <= 360; m++) {
      const check = new Date(now.getTime() + m * 30.44 * 24 * 60 * 60 * 1000);
      if (isEligibleAt(check)) {
        earliestDate = check.toISOString().split('T')[0];
        break;
      }
    }
  }

  return {
    employeeId: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    retirementPlan: emp.retirementPlan,
    age: Math.floor(age),
    serviceYears: Math.round(svcYears * 10) / 10,
    eligibleNow,
    eligibleWithin1Year: eligibleNow || eligibleWithin1Year,
    eligibleWithin5Years: eligibleNow || eligibleWithin1Year || eligibleWithin5Years,
    earliestEligibleDate: eligibleNow ? 'Now' : earliestDate,
  };
}

// GET /api/reports/eligibility
router.get('/eligibility', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (_req: Request, res: Response) => {
  const allEmployees = Array.from(employees.values());
  const eligibility = allEmployees.map(checkEligibility);

  const summary = {
    total: eligibility.length,
    eligibleNow: eligibility.filter(e => e.eligibleNow).length,
    eligibleWithin1Year: eligibility.filter(e => e.eligibleWithin1Year && !e.eligibleNow).length,
    eligibleWithin5Years: eligibility.filter(e => e.eligibleWithin5Years && !e.eligibleWithin1Year).length,
    notEligibleWithin5Years: eligibility.filter(e => !e.eligibleWithin5Years).length,
  };

  res.json({ summary, employees: eligibility });
});

// GET /api/reports/cases
router.get('/cases', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (_req: Request, res: Response) => {
  const allCases = Array.from(cases.values());

  const byStatus: Record<string, number> = {};
  const bySpecialist: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const c of allCases) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byType[c.type] = (byType[c.type] || 0) + 1;

    if (c.assignedSpecialistId) {
      bySpecialist[c.assignedSpecialistId] = (bySpecialist[c.assignedSpecialistId] || 0) + 1;
    }

    const month = c.createdAt.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  res.json({
    total: allCases.length,
    byStatus,
    byType,
    bySpecialist,
    byMonth,
  });
});

// GET /api/reports/demographics
router.get('/demographics', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (_req: Request, res: Response) => {
  const allEmployees = Array.from(employees.values());

  const byRetirementPlan: Record<string, number> = {};
  const byOrganization: Record<string, number> = {};
  const byGrade: Record<string, number> = {};
  const ageRanges: Record<string, number> = {
    'Under 30': 0,
    '30-39': 0,
    '40-49': 0,
    '50-59': 0,
    '60+': 0,
  };

  const now = new Date();
  for (const emp of allEmployees) {
    byRetirementPlan[emp.retirementPlan] = (byRetirementPlan[emp.retirementPlan] || 0) + 1;
    byOrganization[emp.organizationCode] = (byOrganization[emp.organizationCode] || 0) + 1;
    byGrade[`${emp.payPlan}-${emp.grade}`] = (byGrade[`${emp.payPlan}-${emp.grade}`] || 0) + 1;

    const age = getAgeAtDate(emp.dateOfBirth, now);
    if (age < 30) ageRanges['Under 30']++;
    else if (age < 40) ageRanges['30-39']++;
    else if (age < 50) ageRanges['40-49']++;
    else if (age < 60) ageRanges['50-59']++;
    else ageRanges['60+']++;
  }

  const avgSalary = allEmployees.reduce((sum, e) => sum + e.currentSalary, 0) / allEmployees.length;
  const avgServiceYears = allEmployees.reduce((sum, e) => sum + getServiceYears(e.serviceComputationDate, now), 0) / allEmployees.length;

  res.json({
    totalEmployees: allEmployees.length,
    byRetirementPlan,
    byOrganization,
    byGrade,
    ageDistribution: ageRanges,
    averageSalary: Math.round(avgSalary),
    averageServiceYears: Math.round(avgServiceYears * 10) / 10,
  });
});

// GET /api/reports/dashboard
router.get('/dashboard', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (_req: Request, res: Response) => {
  const allEmployees = Array.from(employees.values());
  const allCases = Array.from(cases.values());
  const eligibility = allEmployees.map(checkEligibility);

  const activeCases = allCases.filter(c => !['closed', 'processed'].includes(c.status));
  const pendingReview = allCases.filter(c => c.status === 'under_review');

  // Average processing time for closed cases (mock)
  const closedCases = allCases.filter(c => c.status === 'closed' || c.status === 'processed');

  res.json({
    overview: {
      totalEmployees: allEmployees.length,
      activeCases: activeCases.length,
      pendingReview: pendingReview.length,
      closedThisYear: closedCases.length,
    },
    eligibility: {
      eligibleNow: eligibility.filter(e => e.eligibleNow).length,
      eligibleWithin1Year: eligibility.filter(e => e.eligibleWithin1Year).length,
      eligibleWithin5Years: eligibility.filter(e => e.eligibleWithin5Years).length,
    },
    retirementSystems: {
      CSRS: allEmployees.filter(e => e.retirementPlan === 'CSRS').length,
      'CSRS-Offset': allEmployees.filter(e => e.retirementPlan === 'CSRS-Offset').length,
      FERS: allEmployees.filter(e => e.retirementPlan === 'FERS').length,
      'FERS-RAE': allEmployees.filter(e => e.retirementPlan === 'FERS-RAE').length,
      'FERS-FRAE': allEmployees.filter(e => e.retirementPlan === 'FERS-FRAE').length,
    },
    casesByStatus: allCases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  });
});

export default router;
