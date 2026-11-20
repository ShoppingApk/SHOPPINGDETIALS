const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function daysAgo(d) {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(d))) / DAY);
}

// Separator label in the message list.
export function dayLabel(d) {
  const n = daysAgo(d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return new Date(d).toLocaleDateString('en-IN', { weekday: 'long' });
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Compact time in the conversation list.
export function listTime(d) {
  if (!d) return '';
  const n = daysAgo(d);
  if (n === 0) return timeOf(d);
  if (n === 1) return 'Yesterday';
  if (n < 7) return new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function lastSeenLabel(d) {
  if (!d) return 'offline';
  const n = daysAgo(d);
  if (n === 0) return `last seen today at ${timeOf(d)}`;
  if (n === 1) return `last seen yesterday at ${timeOf(d)}`;
  return `last seen ${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export const sameDay = (a, b) => startOfDay(new Date(a)) === startOfDay(new Date(b));
