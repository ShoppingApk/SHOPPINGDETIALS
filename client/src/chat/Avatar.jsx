const COLORS = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-sky-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'];

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function Avatar({ user, size = 44, online = false }) {
  const name = user?.name || '?';
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const color = COLORS[hash(String(user?._id || name)) % COLORS.length];
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className={`grid h-full w-full place-items-center rounded-full font-semibold text-white ${color}`} style={{ fontSize: size * 0.38 }} aria-hidden="true">
          {initials}
        </span>
      )}
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />}
    </span>
  );
}
