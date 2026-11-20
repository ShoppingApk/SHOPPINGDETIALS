import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import AuthCard from '../components/AuthCard';
import { safeFrom } from '../utils/safeRedirect';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeFrom(location.state?.from);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from || '/'} replace />;

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setError('');
    setBusy(true);
    try {
      const u = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      navigate(from || (u.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to see your bag, wishlist and orders">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" value={form.email} onChange={onChange} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
          {errors.email && <p id="email-err" className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput id="password" name="password" autoComplete="current-password" value={form.password} onChange={onChange} aria-invalid={!!errors.password} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-600">
        New here?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-brand-600">Create an account</Link>
      </p>
    </AuthCard>
  );
}
