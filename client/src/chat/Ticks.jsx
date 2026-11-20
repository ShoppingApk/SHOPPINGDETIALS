import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from './icons';

const LABEL = { sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Not sent' };

// Message state for my own messages: clock, ✓, ✓✓, blue ✓✓, or a red alert.
export default function Ticks({ status, light = false }) {
  const muted = light ? 'text-white/70' : 'text-gray-400';
  const props = { width: 15, height: 15, role: 'img', 'aria-label': LABEL[status] };
  if (status === 'sending') return <ClockIcon {...props} width={12} height={12} className={muted} />;
  if (status === 'failed') return <AlertIcon {...props} className="text-red-300" />;
  if (status === 'sent') return <CheckIcon {...props} className={muted} />;
  if (status === 'delivered') return <DoubleCheckIcon {...props} className={muted} />;
  if (status === 'read') return <DoubleCheckIcon {...props} className={light ? 'text-sky-200' : 'text-sky-500'} />;
  return null;
}
