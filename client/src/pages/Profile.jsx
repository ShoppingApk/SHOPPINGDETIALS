import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { errMsg, fieldErrors } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import { BagIcon, ChevronRightIcon, HeartIcon, LogoutIcon, PackageIcon } from '../components/Icons';

export default function Profile() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [profileErr, setProfileErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErr, setPwErr] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (profile.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (profile.phone && !/^[6-9]\d{9}$/.test(profile.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
    setProfileErr(errs);
    if (Object.keys(errs).length) return;
    setBusy('profile');
    try {
      await updateProfile({ name: profile.name.trim(), phone: profile.phone });
      toast.success('Profile updated');
    } catch (err) {
      setProfileErr(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) {
      errs.newPassword = 'At least 8 characters with a letter and a number';
    }
    setPwErr(errs);
    if (Object.keys(errs).length) return;
    setBusy('pw');
    try {
      await changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      setPwErr(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const onLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/', { replace: true });
  };

  const links = [
    { to: '/orders', label: 'My orders', hint: 'Track, view or cancel', Icon: PackageIcon },
    { to: '/wishlist', label: 'Wishlist', hint: `${wishCount} saved item${wishCount === 1 ? '' : 's'}`, Icon: HeartIcon },
    { to: '/cart', label: 'My bag', hint: `${cartCount} item${cartCount === 1 ? '' : 's'}`, Icon: BagIcon },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brand-500 to-plum-600 p-5 text-white">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/20 text-2xl font-bold" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{user.name}</h1>
          <p className="truncate text-sm opacity-90">{user.email}</p>
          {user.phone && <p className="text-sm opacity-90">+91 {user.phone}</p>}
        </div>
        {user.role === 'admin' && <Link to="/admin" className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/30">Admin</Link>}
      </section>

      {user.mustChangePassword && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          You’re using a temporary password. Please set a new one below.
        </p>
      )}

      <nav className="card divide-y divide-gray-100" aria-label="Account">
        {links.map(({ to, label, hint, Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
            <Icon width={20} height={20} className="text-brand-600" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-gray-500">{hint}</span>
            </span>
            <ChevronRightIcon width={18} height={18} className="text-gray-400" />
          </Link>
        ))}
      </nav>

      <form onSubmit={saveProfile} className="card space-y-4 p-5" noValidate>
        <h2 className="font-semibold">Personal details</h2>
        <div>
          <label className="label" htmlFor="p-name">Full name</label>
          <input id="p-name" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} aria-invalid={!!profileErr.name} />
          {profileErr.name && <p className="mt-1 text-xs text-red-600">{profileErr.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor="p-phone">Mobile number</label>
          <input id="p-phone" type="tel" inputMode="numeric" maxLength={10} className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, '') })} aria-invalid={!!profileErr.phone} />
          {profileErr.phone && <p className="mt-1 text-xs text-red-600">{profileErr.phone}</p>}
        </div>
        <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
      </form>

      <form onSubmit={savePassword} className="card space-y-4 p-5" noValidate>
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <PasswordInput id="currentPassword" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          {pwErr.currentPassword && <p className="mt-1 text-xs text-red-600">{pwErr.currentPassword}</p>}
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <PasswordInput id="newPassword" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          {pwErr.newPassword && <p className="mt-1 text-xs text-red-600">{pwErr.newPassword}</p>}
        </div>
        <button className="btn-primary" disabled={busy === 'pw'}>{busy === 'pw' ? 'Updating…' : 'Update password'}</button>
      </form>

      <button type="button" onClick={onLogout} className="btn-outline w-full">
        <LogoutIcon width={18} height={18} /> Log out
      </button>
    </div>
  );
}
