import { useRef, useCallback } from 'react';

export default function TiltCard({ children, className = '', style = {}, maxTilt = 8, onClick }) {
  const cardRef = useRef(null);

  const handlePointerMove = useCallback(
    (e) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = (x / rect.width - 0.5) * 2; // -1 to 1
      const py = (y / rect.height - 0.5) * 2; // -1 to 1

      el.style.setProperty('--rx', `${-py * maxTilt}deg`);
      el.style.setProperty('--ry', `${px * maxTilt}deg`);
      el.style.setProperty('--shine-x', `${(x / rect.width) * 100}%`);
      el.style.setProperty('--shine-y', `${(y / rect.height) * 100}%`);
      el.style.setProperty('--shine-opacity', '1');
    },
    [maxTilt]
  );

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--shine-opacity', '0');
  }, []);

  return (
    <div
      ref={cardRef}
      className={`tilt-card-wrapper ${className}`}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
    >
      <div className="tilt-card-inner">
        {children}
        <div className="tilt-shine" aria-hidden="true" />
      </div>
    </div>
  );
}
