import { useEffect, useMemo, useRef } from 'react';
import { animate, stagger } from 'animejs';

export default function BootTitle({ className = 'display', children, style, delay = 0 }) {
  const ref = useRef(null);
  const text = typeof children === 'string' ? children : String(children || '');

  const dynamicStyle = useMemo(() => {
    const len = text.length;
    const s = { ...style };
    if (len > 28) {
      s.fontSize = 'clamp(1.85rem, 4.2vw, 3.2rem)';
      s.lineHeight = '1.02';
    } else if (len > 20) {
      s.fontSize = 'clamp(2.2rem, 5.2vw, 4.2rem)';
      s.lineHeight = '1.0';
    }
    return s;
  }, [text, style]);

  const words = useMemo(() => text.split(' '), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const chars = el.querySelectorAll('.char');
    if (!chars.length) return;

    const anim = animate(chars, {
      opacity: [0, 1],
      y: [44, 0],
      filter: ['blur(12px)', 'blur(0px)'],
      delay: stagger(28, { start: delay }),
      duration: 800,
      ease: 'outExpo',
    });

    return () => {
      anim.revert();
    };
  }, [text, delay]);

  return (
    <h1 className={className} style={dynamicStyle} ref={ref} aria-label={text}>
      {words.map((word, wIdx) => (
        <span className="title-word" key={`${word}-${wIdx}`}>
          {word.split('').map((c, cIdx) => (
            <span className="char" key={`${word}-${cIdx}`} aria-hidden="true">
              {c}
            </span>
          ))}
          {wIdx < words.length - 1 && <span className="title-space">&nbsp;</span>}
        </span>
      ))}
    </h1>
  );
}
