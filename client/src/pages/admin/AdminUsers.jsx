import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import Skeleton from '../../components/Skeleton';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { PlusIcon, SearchIcon } from '../../components/Icons';
import { adminApi } from '../../api/admin';
import { errMsg, fieldErrors } from '../../api/client';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { formatDate } from '../../utils/format';

const ROLE_LABEL = { user: 'Shopper', chatuser: 'Chatuser', admin: 'Admin' };
const ROLE_STYLE = { user: 'bg-gray-100 text-gray-700', chatuser: 'bg-plum-100 text-plum-700', admin: 'bg-amber-50 text-amber-700' };

// Readable temporary password: letters + digits, no look-alike characters.
function tempPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const rnd = new Uint32Array(10);
  crypto.getRandomValues(rnd);
  const pick = (set, n) => set[n % set.length];
  return [...rnd].map((n, i) => (i % 3 === 2 ? pick(digits, n) : pick(letters, n))).join('');
}

function CreateChatuser({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const reset = () => {
    setForm({ name: '', email: '', password: '' });
    setErrors({});
    setCreated(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Enter a name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'At least 8 characters with a letter and a number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { user } = await adminApi.createChatuser({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setCreated({ email: user.email, password: form.password });
      onCreated();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={created ? 'Chatuser created' : 'Create chatuser'} size="sm">
      {created ? (
        <div className="space-y-3 text-sm">
          <p>Share these sign-in details privately. The user will be asked to change the password after logging in.</p>
          <div className="rounded-lg bg-gray-50 p-3 font-mono text-sm">
            <p>Email: {created.email}</p>
            <p>Password: {created.password}</p>
          </div>
          <p className="text-xs text-gray-500">This password won’t be shown again.</p>
          <div className="flex gap-2">
            {navigator.clipboard && (
              <button
                type="button"
                className="btn-outline flex-1"
                onClick={() => navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`).then(() => toast.success('Copied'))}
              >
                Copy
              </button>
            )}
            <button type="button" className="btn-primary flex-1" onClick={close}>Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          {[
            ['name', 'Name', 'text', 'name'],
            ['email', 'Email', 'email', 'off'],
          ].map(([k, label, type, ac]) => (
            <div key={k}>
              <label htmlFor={`cc-${k}`} className="label">{label}</label>
              <input id={`cc-${k}`} type={type} autoComplete={ac} className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              {errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="cc-password" className="label">Temporary password</label>
            <div className="flex gap-2">
              <input id="cc-password" type="text" autoComplete="new-password" className="input flex-1 font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="btn-outline px-3 py-2 text-sm" onClick={() => setForm({ ...form, password: tempPassword() })}>Generate</button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create chatuser'}</button>
        </form>
      )}
    </Modal>
  );
}

export default function AdminUsers() {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const role = sp.get('role') || '';
  const status = sp.get('status') || '';
  const [q, setQ] = useState('');
  const term = useDebounce(q.trim(), 300);
  const list = useFetch((signal) => adminApi.users({ page, role, status, q: term }, signal), [page, role, status, term]);

  const [createOpen, setCreateOpen] = useState(false);
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = (patch) => {
    const next = Object.fromEntries([...sp.entries()]);
    Object.entries({ ...patch, page: patch.page ?? '' }).forEach(([k, v]) => (v ? (next[k] = String(v)) : delete next[k]));
    setSp(next);
  };

  const applyToggle = async () => {
    setBusy(true);
    try {
      const { user } = await adminApi.setUserActive(toggle.id, !toggle.isActive);
      list.setData((d) => ({ ...d, users: d.users.map((u) => (u.id === user.id ? user : u)) }));
      toast.success(user.isActive ? 'Account enabled' : 'Account disabled');
      setToggle(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search users</span>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="input pl-9" />
        </label>
        <label className="sr-only" htmlFor="au-role">Role</label>
        <select id="au-role" value={role} onChange={(e) => setParam({ role: e.target.value })} className="input w-auto">
          <option value="">All roles</option>
          <option value="user">Shoppers</option>
          <option value="chatuser">Chatusers</option>
          <option value="admin">Admins</option>
        </select>
        <label className="sr-only" htmlFor="au-status">Status</label>
        <select id="au-status" value={status} onChange={(e) => setParam({ status: e.target.value })} className="input w-auto">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary ml-auto py-2">
          <PlusIcon width={18} height={18} /> Create chatuser
        </button>
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : !list.data.users.length ? (
        <EmptyState emoji="👥" title="No users found" />
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-500">{list.data.total} user{list.data.total === 1 ? '' : 's'}</p>
          <ul className={`card divide-y divide-gray-100 ${list.loading ? 'opacity-60' : ''}`}>
            {list.data.users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {u.name} {!u.isActive && <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">Disabled</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">{u.email} · joined {formatDate(u.createdAt)}{u.mustChangePassword ? ' · temporary password' : ''}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLE[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                {u.role !== 'admin' ? (
                  <button
                    type="button"
                    onClick={() => setToggle(u)}
                    className={`w-20 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'}`}
                  >
                    {u.isActive ? 'Disable' : 'Enable'}
                  </button>
                ) : (
                  <span className="w-20" />
                )}
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={list.data.pages} onChange={(p) => setParam({ page: p > 1 ? p : '' })} />
        </>
      )}

      <CreateChatuser open={createOpen} onClose={() => setCreateOpen(false)} onCreated={list.reload} />
      <ConfirmDialog
        open={!!toggle}
        title={toggle?.isActive ? 'Disable account?' : 'Enable account?'}
        message={
          toggle?.isActive
            ? `${toggle?.name} will be signed out everywhere and won’t be able to log in until re-enabled.`
            : `${toggle?.name} will be able to log in again.`
        }
        confirmLabel={toggle?.isActive ? 'Disable' : 'Enable'}
        danger={!!toggle?.isActive}
        busy={busy}
        onConfirm={applyToggle}
        onClose={() => setToggle(null)}
      />
    </div>
  );
}
