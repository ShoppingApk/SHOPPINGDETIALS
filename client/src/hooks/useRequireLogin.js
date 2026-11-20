import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Returns ensureLoggedIn(): true if logged in; otherwise sends the guest to /login
// (remembering the current page) and returns false.
export default function useRequireLogin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (message = 'Please log in to continue') => {
      if (user) return true;
      toast(message, { id: 'login-required', icon: '🔒' });
      navigate('/login', { state: { from: location.pathname + location.search } });
      return false;
    },
    [user, navigate, location]
  );
}
