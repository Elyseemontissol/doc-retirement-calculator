// Retirement Case Routes

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { cases, employees, calculations } from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { RetirementCase, CaseNote, CoverageDetermination } from '../models/types';
import { generateForm } from '../services/formGenerator';

const router = Router();

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const existingCases = Array.from(cases.values()).filter(c => c.caseNumber.includes(`${year}`));
  const seq = (existingCases.length + 1).toString().padStart(4, '0');
  return `DOC-RET-${year}-${seq}`;
}

// GET /api/cases - list cases with filters
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status, specialistId, startDate, endDate, page: pageStr, limit: limitStr } = req.query;
  const page = parseInt(pageStr as string) || 1;
  const limit = Math.min(parseInt(limitStr as string) || 20, 100);

  let results = Array.from(cases.values());

  // Employees can only see their own cases
  if (req.user!.role === 'employee') {
    results = results.filter(c => {
      const emp = employees.get(c.employeeId);
      return emp && req.user!.employeeId === c.employeeId;
    });
  }

  if (status) {
    results = results.filter(c => c.status === status);
  }
  if (specialistId) {
    results = results.filter(c => c.assignedSpecialistId === specialistId);
  }
  if (startDate) {
    results = results.filter(c => c.retirementDate >= (startDate as string));
  }
  if (endDate) {
    results = results.filter(c => c.retirementDate <= (endDate as string));
  }

  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = results.length;
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  res.json({
    data: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/cases - create new case
router.post('/', authenticateToken, (req: Request, res: Response) => {
  const { employeeId, type, retirementDate, assignedSpecialistId } = req.body;

  if (!employeeId || !type || !retirementDate) {
    res.status(400).json({ error: 'employeeId, type, and retirementDate are required' });
    return;
  }

  const employee = employees.get(employeeId);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  // Employees can only create cases for themselves
  if (req.user!.role === 'employee' && req.user!.employeeId !== employeeId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const now = new Date().toISOString();
  const newCase: RetirementCase = {
    id: uuidv4(),
    employeeId,
    caseNumber: generateCaseNumber(),
    type,
    status: 'draft',
    retirementDate,
    assignedSpecialistId: assignedSpecialistId || null,
    calculations: [],
    determinations: [],
    forms: [],
    notes: [],
    createdAt: now,
    updatedAt: now,
  };

  cases.set(newCase.id, newCase);
  res.status(201).json(newCase);
});

// GET /api/cases/:id
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  if (req.user!.role === 'employee' && req.user!.employeeId !== caseRecord.employeeId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(caseRecord);
});

// PUT /api/cases/:id
router.put('/:id', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const { type, retirementDate, assignedSpecialistId } = req.body;
  if (type) caseRecord.type = type;
  if (retirementDate) caseRecord.retirementDate = retirementDate;
  if (assignedSpecialistId !== undefined) caseRecord.assignedSpecialistId = assignedSpecialistId;
  caseRecord.updatedAt = new Date().toISOString();

  cases.set(req.params.id, caseRecord);
  res.json(caseRecord);
});

// PATCH /api/cases/:id/status
router.patch('/:id/status', authenticateToken, (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const { status } = req.body;
  const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'processed', 'closed'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  // Employees can only submit (draft -> submitted)
  if (req.user!.role === 'employee') {
    if (caseRecord.employeeId !== req.user!.employeeId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (caseRecord.status !== 'draft' || status !== 'submitted') {
      res.status(400).json({ error: 'Employees can only submit draft cases' });
      return;
    }
  }

  caseRecord.status = status;
  caseRecord.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseRecord);

  res.json(caseRecord);
});

// POST /api/cases/:id/notes
router.post('/:id/notes', authenticateToken, (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: 'Note content is required' });
    return;
  }

  const note: CaseNote = {
    id: uuidv4(),
    authorId: req.user!.userId,
    authorName: `${req.user!.username}`,
    content,
    createdAt: new Date().toISOString(),
  };

  caseRecord.notes.push(note);
  caseRecord.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseRecord);

  res.status(201).json(note);
});

// POST /api/cases/:id/determinations
router.post('/:id/determinations', authenticateToken, authorizeRoles('hr_specialist', 'admin'), (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const { type, currentCoverage, determinedCoverage, effectiveDate, rationale } = req.body;
  if (!type || !currentCoverage || !determinedCoverage || !effectiveDate || !rationale) {
    res.status(400).json({ error: 'type, currentCoverage, determinedCoverage, effectiveDate, and rationale are required' });
    return;
  }

  const determination: CoverageDetermination = {
    id: uuidv4(),
    type,
    currentCoverage,
    determinedCoverage,
    effectiveDate,
    rationale,
    determinedBy: req.user!.userId,
    determinedAt: new Date().toISOString(),
  };

  caseRecord.determinations.push(determination);
  caseRecord.updatedAt = new Date().toISOString();
  cases.set(req.params.id, caseRecord);

  res.status(201).json(determination);
});

// GET /api/cases/:id/forms
router.get('/:id/forms', authenticateToken, (req: Request, res: Response) => {
  const caseRecord = cases.get(req.params.id);
  if (!caseRecord) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  res.json(caseRecord.forms);
});

// POST /api/cases/:id/forms - generate a form for the case
router.post('/:id/forms', authenticateToken, (req: Request, res: Response) => {
  try {
    const caseRecord = cases.get(req.params.id);
    if (!caseRecord) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const { formNumber } = req.body;
    if (!formNumber) {
      res.status(400).json({ error: 'formNumber is required' });
      return;
    }

    const employee = employees.get(caseRecord.employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Find the latest calculation for this employee
    const latestCalc = Array.from(calculations.values())
      .filter(c => c.employeeId === caseRecord.employeeId)
      .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0];

    const form = generateForm(formNumber, employee, caseRecord, latestCalc);
    caseRecord.forms.push(form);
    caseRecord.updatedAt = new Date().toISOString();
    cases.set(req.params.id, caseRecord);

    res.status(201).json(form);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
