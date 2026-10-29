import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import AccessDenied from './AccessDenied';

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
