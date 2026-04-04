// JWT Authentication and Role-Based Access Control Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { users, tokenBlacklist } from '../config/database';
import { User } from '../models/types';

const JWT_SECRET = process.env.JWT_SECRET || 'doc-retirement-calc-secret-key-change-in-production';
const JWT_EXPIRY = '8h';

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generateToken(user: User): string {
  const payload: AuthPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    employeeId: user.employeeId,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (tokenBlacklist.has(token)) {
    res.status(401).json({ error: 'Token has been invalidated' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Verify user still exists and is active
    const user = users.get(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account is inactive or not found' });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export { JWT_SECRET };
