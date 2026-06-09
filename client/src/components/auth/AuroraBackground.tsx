'use client';

import { useEffect, useRef } from 'react';

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const orbs = [
      { x: 0.3, y: 0.4, rx: 0.15, ry: 0.1, color: '99,102,241', speed: 0.3 },
      { x: 0.6, y: 0.3, rx: 0.2, ry: 0.12, color: '59,130,246', speed: 0.2 },
      { x: 0.5, y: 0.6, rx: 0.18, ry: 0.15, color: '6,182,212', speed: 0.25 },
      { x: 0.4, y: 0.7, rx: 0.12, ry: 0.08, color: '168,85,247', speed: 0.35 },
    ];

    const render = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      orbs.forEach((orb) => {
        const x = canvas.width * orb.x + Math.sin(time * orb.speed + orb.rx) * canvas.width * orb.rx;
        const y = canvas.height * orb.y + Math.cos(time * orb.speed * 0.7 + orb.ry) * canvas.height * orb.ry;
        const radius = Math.min(canvas.width, canvas.height) * 0.35;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${orb.color}, 0.12)`);
        gradient.addColorStop(0.3, `rgba(${orb.color}, 0.06)`);
        gradient.addColorStop(0.6, `rgba(${orb.color}, 0.02)`);
        gradient.addColorStop(1, `rgba(${orb.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#050816' }}
    />
  );
}
