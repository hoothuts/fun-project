import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function useAnime(params, deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { targets, ...rest } = params;
    animate(targets ? el.querySelectorAll(targets) : el, rest);
  }, deps);
  return ref;
}