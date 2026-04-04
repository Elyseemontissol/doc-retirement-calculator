import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Still restoring session
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-24">
        <ShieldAlert className="h-16 w-16 text-danger-500" />
        <h1 className="text-2xl font-bold text-danger-700">Access Denied</h1>
        <p className="max-w-md text-center text-neutral-600">
          You do not have permission to view this page. Please contact your administrator
          if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
