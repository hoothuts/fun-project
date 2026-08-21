import { useEffect, useRef } from 'react';

export default function SpeedlineCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Generate 32 ambient telemetry speedline streaks
    const count = 32;
    const streaks = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: Math.random() * 80 + 40,
      speed: Math.random() * 0.8 + 0.3,
      opacity: Math.random() * 0.12 + 0.03,
      width: Math.random() * 1.5 + 0.5,
      isRed: Math.random() > 0.75,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const s = streaks[i];
        s.y -= s.speed;
        s.x -= s.speed * 0.4; // slight 25-degree angle drift

        if (s.y + s.len < 0 || s.x < 0) {
          s.y = height + Math.random() * 100;
          s.x = Math.random() * (width + 200);
          s.len = Math.random() * 80 + 40;
          s.speed = Math.random() * 0.8 + 0.3;
          s.opacity = Math.random() * 0.12 + 0.03;
          s.isRed = Math.random() > 0.75;
        }

        ctx.beginPath();
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.speed * 12, s.y + s.len);
        if (s.isRed) {
          grad.addColorStop(0, `rgba(225, 6, 0, ${s.opacity * 1.5})`);
          grad.addColorStop(1, 'rgba(225, 6, 0, 0)');
        } else {
          grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.speed * 12, s.y + s.len);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="speedline-canvas" aria-hidden="true" />;
}
