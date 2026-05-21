import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'reader';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user, role, isLoading, needsSetup } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    // If admin is required, and user is not admin, redirect to home or unauthorized
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
