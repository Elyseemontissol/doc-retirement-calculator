// Calculation Routes

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { employees, calculations } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { CalculationRequest } from '../models/types';
import { runFullCalculation } from '../services/calculationEngine';

const router = Router();

// POST /api/calculations - run a new calculation
router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const calcRequest: CalculationRequest = req.body;

    if (!calcRequest.employeeId || !calcRequest.retirementDate || !calcRequest.retirementType) {
      res.status(400).json({ error: 'employeeId, retirementDate, and retirementType are required' });
      return;
    }

    // Employees can only calculate for themselves
    if (req.user!.role === 'employee' && req.user!.employeeId !== calcRequest.employeeId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const employee = employees.get(calcRequest.employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Set defaults
    if (calcRequest.includeSickLeave === undefined) calcRequest.includeSickLeave = true;
    if (!calcRequest.survivorBenefitOption) calcRequest.survivorBenefitOption = 'none';

    const result = runFullCalculation(employee, calcRequest);
    calculations.set(result.id, result);

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Calculation failed' });
  }
});

// GET /api/calculations/:id - get calculation result
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const calc = calculations.get(req.params.id);
  if (!calc) {
    res.status(404).json({ error: 'Calculation not found' });
    return;
  }

  // Employees can only view their own calculations
  if (req.user!.role === 'employee' && req.user!.employeeId !== calc.employeeId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(calc);
});

// GET /api/calculations/employee/:employeeId - get all calculations for employee
router.get('/employee/:employeeId', authenticateToken, (req: Request, res: Response) => {
  const { employeeId } = req.params;

  if (req.user!.role === 'employee' && req.user!.employeeId !== employeeId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const results = Array.from(calculations.values())
    .filter(c => c.employeeId === employeeId)
    .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime());

  res.json(results);
});

// POST /api/calculations/compare - compare multiple scenarios
router.post('/compare', authenticateToken, (req: Request, res: Response) => {
  try {
    const { scenarios } = req.body as { scenarios: CalculationRequest[] };

    if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
      res.status(400).json({ error: 'At least 2 scenarios are required for comparison' });
      return;
    }

    if (scenarios.length > 5) {
      res.status(400).json({ error: 'Maximum 5 scenarios allowed' });
      return;
    }

    // Ensure all scenarios are for the same employee
    const employeeIds = new Set(scenarios.map(s => s.employeeId));
    if (employeeIds.size > 1) {
      res.status(400).json({ error: 'All scenarios must be for the same employee' });
      return;
    }

    const employeeId = scenarios[0].employeeId;

    if (req.user!.role === 'employee' && req.user!.employeeId !== employeeId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const employee = employees.get(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const results = scenarios.map(scenario => {
      if (scenario.includeSickLeave === undefined) scenario.includeSickLeave = true;
      if (!scenario.survivorBenefitOption) scenario.survivorBenefitOption = 'none';
      const result = runFullCalculation(employee, scenario);
      calculations.set(result.id, result);
      return result;
    });

    // Build comparison summary
    const comparison = {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      retirementPlan: employee.retirementPlan,
      scenarios: results.map((r, i) => ({
        scenarioNumber: i + 1,
        retirementDate: r.retirementDate,
        retirementType: r.retirementType,
        totalServiceCredit: r.totalServiceCredit,
        grossAnnuity: r.grossAnnuity,
        netAnnuity: r.netAnnuity,
        monthlyNetAnnuity: r.monthlyNetAnnuity,
        fersSupplement: r.fersSupplement,
        tspBalance: r.tspBalance,
        tspMonthlyIncome: r.tspMonthlyIncome,
        estimatedSSA: r.estimatedSSA,
        totalMonthlyIncome: r.totalMonthlyIncome,
        totalAnnualIncome: r.totalAnnualIncome,
      })),
      fullResults: results,
    };

    res.status(201).json(comparison);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

export default router;
