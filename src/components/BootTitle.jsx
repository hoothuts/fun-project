import { useEffect, useRef } from 'react';
import { animate, stagger, splitText } from 'animejs';

export default function BootTitle({ className = 'display', children, style, delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const split = splitText(el, { chars: true, accessible: true });
    animate(split.chars, {
      opacity: [0, 1],
      y: [44, 0],
      filter: ['blur(12px)', 'blur(0px)'],
      delay: stagger(32, { start: delay }),
      duration: 850,
      ease: 'outExpo',
    });
    return () => split.revert();
  }, [children, delay]);

  return (
    <h1 className={className} style={style} ref={ref}>
      {children}
    </h1>
  );
}
