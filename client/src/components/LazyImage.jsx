import { useState } from 'react';

// Native lazy loading + a shimmer until the image arrives + a fallback on error.
export default function LazyImage({ src, alt, className = '', imgClassName = '', eager = false, ...rest }) {
  const [state, setState] = useState('loading'); // loading | loaded | error

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />}
      {state === 'error' || !src ? (
        <div className="absolute inset-0 grid place-items-center text-xs text-gray-400" role="img" aria-label={alt}>
          Image unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
          draggable={false}
          {...rest}
        />
      )}
    </div>
  );
}
