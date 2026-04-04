import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// ---------------------------------------------------------------------------
//  Lazy-loaded pages
// ---------------------------------------------------------------------------

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const EmployeeList = React.lazy(() => import('./pages/EmployeeList'));
const EmployeeDetail = React.lazy(() => import('./pages/EmployeeDetail'));
const CalculatorPage = React.lazy(() => import('./pages/Calculator'));
const CaseList = React.lazy(() => import('./pages/CaseList'));
const CaseNew = React.lazy(() => import('./pages/CaseNew'));
const CaseDetail = React.lazy(() => import('./pages/CaseDetail'));
const FormsCenter = React.lazy(() => import('./pages/FormsCenter'));
const EducationCenter = React.lazy(() => import('./pages/EducationCenter'));
const Reports = React.lazy(() => import('./pages/Reports'));

// ---------------------------------------------------------------------------
//  Loading fallback
// ---------------------------------------------------------------------------

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              <Route
                path="employees"
                element={
                  <ProtectedRoute requiredRoles={['hr_specialist', 'admin']}>
                    <EmployeeList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees/:id"
                element={
                  <ProtectedRoute requiredRoles={['hr_specialist', 'admin']}>
                    <EmployeeDetail />
                  </ProtectedRoute>
                }
              />

              <Route path="calculator" element={<CalculatorPage />} />

              <Route path="cases" element={<CaseList />} />
              <Route path="cases/new" element={<CaseNew />} />
              <Route path="cases/:id" element={<CaseDetail />} />

              <Route path="forms" element={<FormsCenter />} />
              <Route path="education" element={<EducationCenter />} />

              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredRoles={['hr_specialist', 'admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
