import { Link } from 'react-router-dom';

export default function EmptyState({ emoji = '🛍️', title, message, actionLabel, actionTo, onAction, className = '' }) {
  return (
    <div className={`card mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center ${className}`}>
      <span className="text-5xl" aria-hidden="true">{emoji}</span>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
      {actionLabel && actionTo && <Link to={actionTo} className="btn-primary mt-6">{actionLabel}</Link>}
      {actionLabel && onAction && !actionTo && <button type="button" onClick={onAction} className="btn-primary mt-6">{actionLabel}</button>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-10 text-center" role="alert">
      <span className="text-4xl" aria-hidden="true">😕</span>
      <h2 className="mt-3 font-semibold text-gray-900">Couldn’t load this</h2>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-outline mt-5">Try again</button>}
    </div>
  );
}
