import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function IdentityBackdrop({ type, teamId, teamName, number, code, accentColor }) {
  const arcRef = useRef(null);

  useEffect(() => {
    if (type !== 'driver' || !arcRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anim = animate(arcRef.current, {
      strokeDashoffset: [280, 40],
      duration: 2400,
      direction: 'alternate',
      loop: true,
      ease: 'inOutSine',
    });

    return () => anim.revert();
  }, [type]);

  if (type === 'team') {
    return (
      <div className="identity-backdrop team-backdrop" style={{ '--accent': accentColor }} aria-hidden="true">
        <div className="identity-watermark">{teamName || teamId}</div>
        <div className="aero-lines">
          <div className="aero-line line-1" />
          <div className="aero-line line-2" />
          <div className="aero-line line-3" />
        </div>
        <div className="identity-glow" />
      </div>
    );
  }

  if (type === 'driver') {
    const numDisplay = number || code || 'F1';
    return (
      <div className="identity-backdrop driver-backdrop" style={{ '--accent': accentColor }} aria-hidden="true">
        <div className="identity-watermark driver-number-watermark">{numDisplay}</div>
        {code && <div className="driver-code-stamp">{code}</div>}
        
        {/* Animated Telemetry RPM / Tachometer Arc */}
        <div className="telemetry-arc-wrap">
          <svg className="telemetry-arc-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="arc-track" />
            <circle
              ref={arcRef}
              cx="50"
              cy="50"
              r="42"
              className="arc-pulse"
              strokeDasharray="264"
              strokeDashoffset="120"
            />
          </svg>
          <span className="telemetry-lbl">RPM · LIVE</span>
        </div>

        <div className="identity-glow" />
      </div>
    );
  }

  if (type === 'circuit') {
    return (
      <div className="identity-backdrop circuit-backdrop" aria-hidden="true">
        <div className="identity-glow" />
      </div>
    );
  }

  return null;
}
