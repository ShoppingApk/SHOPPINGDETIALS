import { useEffect, useRef, useState } from 'react';

// Tracks whether an element is near the viewport (used for infinite scroll).
export default function useInView({ rootMargin = '400px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}
