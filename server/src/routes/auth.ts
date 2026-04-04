// Authentication Routes

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { users, tokenBlacklist } from '../config/database';
import { generateToken, authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Find user by username
    let foundUser = null;
    for (const user of users.values()) {
      if (user.username === username) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!foundUser.isActive) {
      res.status(401).json({ error: 'Account is disabled' });
      return;
    }

    const validPassword = await bcrypt.compare(password, foundUser.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    foundUser.lastLogin = new Date().toISOString();
    users.set(foundUser.id, foundUser);

    const token = generateToken(foundUser);

    res.json({
      token,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        email: foundUser.email,
        employeeId: foundUser.employeeId,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = users.get(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    employeeId: user.employeeId,
    lastLogin: user.lastLogin,
  });
});

export default router;
