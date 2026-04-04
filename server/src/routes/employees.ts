// Employee Routes

import { Router, Request, Response } from 'express';
import { employees } from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { syncEmployeeRecord } from '../services/nfcIntegration';

const router = Router();

// GET /api/employees - list employees (all authenticated users can search, employees see limited results)
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const search = (req.query.search as string || '').toLowerCase();
  const retirementPlan = req.query.retirementPlan as string;

  let results = Array.from(employees.values());

  // Filter by search term (name, email, organization)
  if (search) {
    results = results.filter(emp =>
      emp.firstName.toLowerCase().includes(search) ||
      emp.lastName.toLowerCase().includes(search) ||
      emp.email.toLowerCase().includes(search) ||
      emp.organizationCode.toLowerCase().includes(search)
    );
  }

  // Filter by retirement plan
  if (retirementPlan) {
    results = results.filter(emp => emp.retirementPlan === retirementPlan);
  }

  const total = results.length;
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  res.json({
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/employees/:id - get employee detail
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;

  // Employees can only view their own record
  if (req.user!.role === 'employee' && req.user!.employeeId !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const employee = employees.get(id);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json(employee);
});

// PUT /api/employees/:id - update employee
router.put('/:id', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const employee = employees.get(id);

  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  // Merge updates (excluding id and timestamps)
  const { id: _id, createdAt: _ca, ...updates } = req.body;
  const updated = {
    ...employee,
    ...updates,
    id: employee.id,
    createdAt: employee.createdAt,
    updatedAt: new Date().toISOString(),
  };

  employees.set(id, updated);
  res.json(updated);
});

// GET /api/employees/:id/service-history
router.get('/:id/service-history', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user!.role === 'employee' && req.user!.employeeId !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const employee = employees.get(id);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json(employee.serviceHistory);
});

// GET /api/employees/:id/salary-history
router.get('/:id/salary-history', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user!.role === 'employee' && req.user!.employeeId !== id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const employee = employees.get(id);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json(employee.salaryHistory);
});

// POST /api/employees/:id/sync - trigger NFC sync
router.post('/:id/sync', authenticateToken, authorizeRoles('hr_specialist', 'admin'), async (req: Request, res: Response) => {
  const { id } = req.params;

  const employee = employees.get(id);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  try {
    const result = await syncEmployeeRecord(id);
    if (result.status === 'error') {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json({
      message: 'Employee record synced with NFC',
      requestId: result.requestId,
      syncedFields: result.data?.fields,
      syncedAt: result.timestamp,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync with NFC' });
  }
});

export default router;
