import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function ScrambleNumber({ value, duration = 900, delay = 0, fallback = '–' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === undefined || value === null || value === fallback) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(value);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      el.textContent = String(value);
      return;
    }
    const state = { val: 0 };
    const anim = animate(state, {
      val: num,
      duration,
      delay,
      ease: 'outExpo',
      onUpdate: () => {
        if (el) el.textContent = Math.round(state.val).toString();
      },
    });
    return () => anim.revert();
  }, [value, duration, delay, fallback]);

  return <strong ref={ref}>{value ?? fallback}</strong>;
}
