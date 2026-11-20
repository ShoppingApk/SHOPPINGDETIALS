import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ChevronDownIcon, UserIcon } from './Icons';

// Desktop account dropdown.
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const item = 'block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 focus:bg-brand-50 focus:outline-none';

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex flex-col items-center text-xs text-gray-600 hover:text-brand-600"
      >
        <UserIcon />
        <span className="flex items-center gap-0.5">
          {user.name.split(' ')[0].slice(0, 12)}
          <ChevronDownIcon width={12} height={12} />
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg animate-fade-in">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
          <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>My profile</Link>
          <Link role="menuitem" to="/orders" className={item} onClick={() => setOpen(false)}>My orders</Link>
          <Link role="menuitem" to="/wishlist" className={item} onClick={() => setOpen(false)}>Wishlist</Link>
          {user.role === 'admin' && (
            <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>Admin panel</Link>
          )}
          <button role="menuitem" type="button" className={`${item} border-t border-gray-100 text-red-600`} onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
