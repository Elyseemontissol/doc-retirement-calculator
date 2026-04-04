// Form Routes

import { Router, Request, Response } from 'express';
import { employees, forms } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { getAvailableFormTypes, generateForm } from '../services/formGenerator';

const router = Router();

// GET /api/forms/types - list available form types
router.get('/types', authenticateToken, (_req: Request, res: Response) => {
  res.json(getAvailableFormTypes());
});

// POST /api/forms/generate - generate form data
router.post('/generate', authenticateToken, (req: Request, res: Response) => {
  try {
    const { formNumber, employeeId } = req.body;

    if (!formNumber || !employeeId) {
      res.status(400).json({ error: 'formNumber and employeeId are required' });
      return;
    }

    if (req.user!.role === 'employee' && req.user!.employeeId !== employeeId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const employee = employees.get(employeeId);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const form = generateForm(formNumber, employee);
    forms.set(form.id, form);

    res.status(201).json(form);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/forms/:id - get generated form
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const form = forms.get(req.params.id);
  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  res.json(form);
});

export default router;
