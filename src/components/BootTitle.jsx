import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export default function BootTitle({ className = 'display', children, style, delay = 0 }) {
  const ref = useRef(null);
  const text = typeof children === 'string' ? children : String(children || '');

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const chars = el.querySelectorAll('.char');
    if (!chars.length) return;

    const anim = animate(chars, {
      opacity: [0, 1],
      y: [44, 0],
      filter: ['blur(12px)', 'blur(0px)'],
      delay: stagger(32, { start: delay }),
      duration: 850,
      ease: 'outExpo',
    });

    return () => {
      anim.revert();
    };
  }, [text, delay]);

  return (
    <h1 className={className} style={style} ref={ref} aria-label={text}>
      {text.split('').map((c, i) => (
        <span className="char" key={`${text}-${i}`} aria-hidden="true">
          {c === ' ' ? '\u00A0' : c}
        </span>
      ))}
    </h1>
  );
}
