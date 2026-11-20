import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';
import NotFound from '../pages/NotFound';

// Requires login. If `roles` is given, other roles see the normal 404 page,
// so restricted pages look exactly like pages that don't exist.
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <NotFound />;
  return <Outlet />;
}
