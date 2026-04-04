// Federal Retirement Benefits Calculator - Server Entry Point
// U.S. Department of Commerce

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initializeDatabase } from './config/database';

// Route imports
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import calculationRoutes from './routes/calculations';
import caseRoutes from './routes/cases';
import formRoutes from './routes/forms';
import educationRoutes from './routes/education';
import reportRoutes from './routes/reports';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ────────────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'DOC Retirement Benefits Calculator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Initialize & Start ───────────────────────────────────────────────────────

initializeDatabase();

// Only listen when running directly (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n  DOC Retirement Benefits Calculator`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
  });
}

export default app;

export default app;
