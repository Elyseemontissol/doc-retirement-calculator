// Education Resource Routes

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { educationResources } from '../config/database';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { EducationResource } from '../models/types';

const router = Router();

// GET /api/education - list resources (filterable by category, type)
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { category, type, search } = req.query;

  let results = Array.from(educationResources.values());

  if (category) {
    results = results.filter(r => r.category === category);
  }
  if (type) {
    results = results.filter(r => r.type === type);
  }
  if (search) {
    const term = (search as string).toLowerCase();
    results = results.filter(r =>
      r.title.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      r.tags.some(t => t.toLowerCase().includes(term))
    );
  }

  results.sort((a, b) => a.order - b.order);
  res.json(results);
});

// GET /api/education/:id - get specific resource
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const resource = educationResources.get(req.params.id);
  if (!resource) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json(resource);
});

// POST /api/education - create resource (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), (req: Request, res: Response) => {
  const { title, description, category, type, url, content, tags, order } = req.body;

  if (!title || !description || !category || !type) {
    res.status(400).json({ error: 'title, description, category, and type are required' });
    return;
  }

  const now = new Date().toISOString();
  const resource: EducationResource = {
    id: uuidv4(),
    title,
    description,
    category,
    type,
    url,
    content,
    tags: tags || [],
    order: order || 0,
    createdAt: now,
    updatedAt: now,
  };

  educationResources.set(resource.id, resource);
  res.status(201).json(resource);
});

export default router;
