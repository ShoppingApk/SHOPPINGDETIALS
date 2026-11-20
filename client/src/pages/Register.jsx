import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errMsg, fieldErrors } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import AuthCard from '../components/AuthCard';
import { safeFrom } from '../utils/safeRedirect';

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email';
  if (f.phone && !/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number';
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) {
    e.password = 'At least 8 characters with a letter and a number';
  }
  return e;
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeFrom(location.state?.from);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from || '/'} replace />;

  const onChange = (e) => {
    const { name } = e.target;
    const value = name === 'phone' ? e.target.value.replace(/\D/g, '') : e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError('');
    setBusy(true);
    try {
      const u = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success(`Welcome to Kaasni, ${u.name.split(' ')[0]}!`);
      navigate(from || '/', { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else setError(errMsg(err, 'Sign up failed'));
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {props.password ? (
        <PasswordInput id={name} name={name} value={form[name]} onChange={onChange} autoComplete="new-password" aria-invalid={!!errors[name]} />
      ) : (
        <input id={name} name={name} className="input" value={form[name]} onChange={onChange} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-err` : undefined} {...props} />
      )}
      {errors[name] && <p id={`${name}-err`} className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  );

  return (
    <AuthCard title="Create your account" subtitle="Get exclusive offers and track your orders">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field('name', 'Full name', { autoComplete: 'name', maxLength: 60 })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('phone', 'Mobile number (optional)', { type: 'tel', inputMode: 'numeric', maxLength: 10, autoComplete: 'tel-national' })}
        {field('password', 'Password', { password: true })}
        {!errors.password && <p className="-mt-2 text-xs text-gray-500">At least 8 characters with a letter and a number.</p>}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-brand-600">Log in</Link>
      </p>
    </AuthCard>
  );
}
