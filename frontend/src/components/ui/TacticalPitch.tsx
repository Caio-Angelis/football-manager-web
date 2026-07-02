import React, { useEffect, useRef } from 'react';

/**
 * Ambient "living tactics board" for the landing hero: a top-down pitch with a
 * 4-3-3 whose nodes drift within their zones while a ball circulates through the
 * pass network. Pure canvas, ~11 nodes — cheap. Honors prefers-reduced-motion
 * (draws a single static frame instead of looping).
 */

// Formation in normalized pitch space: x = depth (0 own goal → 1 opp goal), y = 0 top → 1 bottom.
const FORMATION: ReadonlyArray<readonly [number, number]> = [
  [0.06, 0.5], // GK
  [0.24, 0.18], [0.24, 0.4], [0.24, 0.6], [0.24, 0.82], // DEF
  [0.46, 0.28], [0.46, 0.5], [0.46, 0.72], // MID
  [0.68, 0.22], [0.71, 0.5], [0.68, 0.78], // FWD
];

// Nearest-neighbour adjacency for the pass network (undirected, deduped).
function buildNetwork(nodes: ReadonlyArray<readonly [number, number]>) {
  const neighbours: number[][] = nodes.map(() => []);
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(n[0] - m[0], n[1] - m[1]) }))
      .filter(o => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of near) {
      neighbours[i].push(j);
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(i < j ? [i, j] : [j, i]);
      }
    }
  });
  return { neighbours, edges };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const TacticalPitch: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { neighbours, edges } = buildNetwork(FORMATION);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // live drift positions
    const livePos = (i: number, t: number): [number, number] => {
      const [bx, by] = FORMATION[i];
      const px = bx + 0.011 * Math.sin(t * 0.0005 + i * 1.7);
      const py = by + 0.018 * Math.sin(t * 0.0007 + i * 2.3);
      return [px * W, py * H];
    };

    // ball pass state
    let from = 0, to = neighbours[0][0], hopStart = 0;
    const HOP = 1500;
    const trail: [number, number][] = [];
    const pickNext = (cur: number) => {
      // occasionally reset buildup from an advanced node
      if (FORMATION[cur][0] > 0.6 && Math.random() < 0.55) {
        const back = [0, 1, 2, 3, 4];
        return back[Math.floor(Math.random() * back.length)];
      }
      const opts = neighbours[cur];
      // weight toward forward progress
      const weights = opts.map(j => Math.max(0.15, FORMATION[j][0] - FORMATION[cur][0] + 0.35));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let k = 0; k < opts.length; k++) {
        r -= weights[k];
        if (r <= 0) return opts[k];
      }
      return opts[opts.length - 1];
    };

    const drawPitch = () => {
      const p = 0.045;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(p * W, p * H, W * (1 - 2 * p), H * (1 - 2 * p));
      ctx.beginPath();
      ctx.moveTo(0.5 * W, p * H);
      ctx.lineTo(0.5 * W, (1 - p) * H);
      ctx.stroke();
      const r = Math.min(W, H) * 0.11;
      ctx.beginPath();
      ctx.arc(0.5 * W, 0.5 * H, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.5 * W, 0.5 * H, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      const boxW = W * 0.1, boxH = H * 0.42;
      ctx.strokeRect(p * W, (H - boxH) / 2, boxW, boxH);
      ctx.strokeRect((1 - p) * W - boxW, (H - boxH) / 2, boxW, boxH);
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const pos = FORMATION.map((_, i) => livePos(i, t));

      // pass network
      for (let e = 0; e < edges.length; e++) {
        const [a, b] = edges[e];
        const shimmer = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(t * 0.0011 + e));
        ctx.strokeStyle = `rgba(61,123,245,${shimmer})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos[a][0], pos[a][1]);
        ctx.lineTo(pos[b][0], pos[b][1]);
        ctx.stroke();
      }

      // ball progress
      let p = (t - hopStart) / HOP;
      if (p >= 1) { from = to; to = pickNext(from); hopStart = t; p = 0; }
      const e = easeInOut(Math.min(p, 1));
      const bx = pos[from][0] + (pos[to][0] - pos[from][0]) * e;
      const by = pos[from][1] + (pos[to][1] - pos[from][1]) * e;

      // active pass line (comet from origin to ball)
      const grad = ctx.createLinearGradient(pos[from][0], pos[from][1], bx, by);
      grad.addColorStop(0, 'rgba(120,170,255,0)');
      grad.addColorStop(1, 'rgba(150,190,255,0.55)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(pos[from][0], pos[from][1]);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // nodes
      for (let i = 0; i < pos.length; i++) {
        const [x, y] = pos[i];
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 15);
        glow.addColorStop(0, 'rgba(61,123,245,0.32)');
        glow.addColorStop(1, 'rgba(61,123,245,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        // receiving pulse ring
        if (i === to && p < 1) {
          const ring = 4 + e * 9;
          ctx.strokeStyle = `rgba(63,191,107,${0.5 * (1 - e)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, ring, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(200,218,255,0.92)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ball trail
      trail.push([bx, by]);
      if (trail.length > 10) trail.shift();
      for (let k = 0; k < trail.length; k++) {
        const a = (k / trail.length) * 0.35;
        ctx.fillStyle = `rgba(224,179,65,${a})`;
        ctx.beginPath();
        ctx.arc(trail[k][0], trail[k][1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // ball
      const bglow = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
      bglow.addColorStop(0, 'rgba(255,214,120,0.85)');
      bglow.addColorStop(1, 'rgba(224,179,65,0)');
      ctx.fillStyle = bglow;
      ctx.beginPath();
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(frame);
    };

    let raf = 0;
    if (reduce) {
      frame(0);
      cancelAnimationFrame(raf); // draw one static frame only
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="fm-landing__pitch" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
};
