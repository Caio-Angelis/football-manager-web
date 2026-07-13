// ============================================================
// Controlador de animação da partida 2D — imperativo e desacoplado do React.
//
// Por que imperativo? Se o React reposicionasse os discos a cada re-render
// (uma vez por minuto simulado), eles "teleportariam" de volta à formação.
// Aqui o controlador é dono dos nós do DOM e escreve left/top a cada frame.
// O React só cria os nós uma vez e registra as refs; nunca mexe na posição
// ao vivo. Todo movimento é por VELOCIDADE LIMITADA por frame, então nada
// pode saltar instantaneamente — passes têm tempo de voo, corridas têm ritmo.
//
// Coordenadas internas: x = comprimento (0 = gol casa, 100 = gol fora; casa
// ataca rumo a 100), y = largura (0 = topo, 100 = base). 0-100 em ambos.
// ============================================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const now = () => performance.now();

const POS_RANGE: Record<string, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  GK: { xMin: 1, xMax: 16, yMin: 28, yMax: 72 },
  DEF: { xMin: 4, xMax: 66, yMin: 2, yMax: 98 },
  MID: { xMin: 14, xMax: 86, yMin: 2, yMax: 98 },
  FWD: { xMin: 26, xMax: 97, yMin: 4, yMax: 96 },
};

function toScreen(x: number, y: number, classic: boolean): { left: number; top: number } {
  // classic: casa ataca PARA CIMA → comprimento 0 (gol casa) embaixo, 100 no topo
  if (classic) return { left: y, top: 100 - x };
  return { left: x, top: y };
}

export interface MotionPlayer {
  id: string;
  side: 'home' | 'away';
  baseX: number;
  baseY: number;
  position: string;
}

export interface MotionTick {
  possession: 'home' | 'away';
  ballHolderId?: string;
  ballX: number; // 0..100
  ballY: number; // 0..100
  touches: { playerId: string; side: 'home' | 'away'; x: number }[]; // ordem cronológica, x 0..100
  durationMs: number;
  /** Se houve gol neste minuto: lado que marcou. A bola vai à rede e fica lá. */
  goal?: 'home' | 'away';
}

interface PlayerState {
  side: 'home' | 'away';
  baseX: number;
  baseY: number;
  position: string;
  x: number;
  y: number;
}

// Velocidades em % de campo por ms.
const SPEED = {
  base: 0.017, // ~17%/s andando/trotando
  carrier: 0.032, // portador/recebedor corre até a bola
  receiver: 0.03,
  presser: 0.028,
  ball: 0.10, // passe rápido (~100%/s)
};
const BALL_GLUE_DIST = 2.5; // abaixo disso a bola "assenta" no portador

function moveToward(o: { x: number; y: number }, tx: number, ty: number, maxStep: number) {
  const dx = tx - o.x;
  const dy = ty - o.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxStep || d === 0) {
    o.x = tx;
    o.y = ty;
  } else {
    o.x += (dx / d) * maxStep;
    o.y += (dy / d) * maxStep;
  }
}

export class PitchMotion {
  private classic: boolean;
  private players = new Map<string, PlayerState>();
  private order: string[] = [];
  private nodes = new Map<string, HTMLElement>();
  private ballEl: HTMLElement | null = null;
  private trailEls: HTMLElement[] = [];
  private trail: { x: number; y: number }[] = [];
  private ball = { x: 50, y: 50 };
  private tick: MotionTick | null = null;
  private tickStart = 0;
  private raf = 0;
  private lastT = 0;
  private running = false;
  private highlightId: string | null = null;
  private lastTrailAt = 0;
  private celebrateUntil = 0;
  private celebrateSide: 'home' | 'away' | null = null;
  private visualCarrier: string | null = null;

  constructor(classic: boolean) {
    this.classic = classic;
  }

  setClassic(classic: boolean) {
    this.classic = classic;
  }

  setPlayers(list: MotionPlayer[]) {
    const seen = new Set<string>();
    this.order = list.map(p => p.id);
    for (const p of list) {
      seen.add(p.id);
      const ex = this.players.get(p.id);
      if (ex) {
        ex.side = p.side;
        ex.baseX = p.baseX;
        ex.baseY = p.baseY;
        ex.position = p.position;
      } else {
        this.players.set(p.id, { side: p.side, baseX: p.baseX, baseY: p.baseY, position: p.position, x: p.baseX, y: p.baseY });
      }
    }
    for (const id of [...this.players.keys()]) if (!seen.has(id)) this.players.delete(id);
  }

  registerNode(id: string, el: HTMLElement | null) {
    if (el) {
      this.nodes.set(id, el);
      this.writeNode(id);
    } else {
      this.nodes.delete(id);
    }
  }

  registerBall(el: HTMLElement | null) {
    this.ballEl = el;
    if (el) this.writeBall();
  }

  registerTrail(els: HTMLElement[]) {
    this.trailEls = els;
  }

  pushTick(t: MotionTick) {
    this.tick = t;
    this.tickStart = now();
    if (t.goal) {
      // segura a bola na rede pela comemoração toda, mesmo em 4x (vários ticks)
      this.celebrateUntil = now() + 2600;
      this.celebrateSide = t.goal;
    }
  }

  /** Posiciona tudo imediatamente (chamar num layout effect p/ evitar flash). */
  snapAll() {
    if (this.tick) {
      this.ball.x = this.tick.ballX;
      this.ball.y = this.tick.ballY;
    }
    for (const id of this.nodes.keys()) this.writeNode(id);
    this.writeBall();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(64, t - this.lastT);
    this.lastT = t;
    this.update(dt, t);
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number, t: number) {
    const tick = this.tick;
    let ballX = tick?.ballX ?? 50;
    let ballY = tick?.ballY ?? 50;

    // Estado do lance neste instante (qual toque está "ativo").
    let possession: 'home' | 'away' = tick?.possession ?? 'home';
    let carrierId: string | undefined = tick?.ballHolderId;
    let nextReceiver: string | undefined;
    let guideX = ballX;
    let guideY = ballY;

    if (now() < this.celebrateUntil && this.celebrateSide) {
      // GOL: bola fica na rede do time que marcou durante a comemoração.
      // Casa ataca rumo a x=100; visitante rumo a x=0.
      const gx = this.celebrateSide === 'home' ? 99 : 1;
      guideX = gx;
      guideY = 50;
      ballX = gx;
      ballY = 50;
      possession = this.celebrateSide;
      carrierId = undefined;
    } else if (tick && tick.touches.length > 0) {
      const dur = Math.max(1, tick.durationMs);
      const prog = clamp((now() - this.tickStart) / dur, 0, 1);
      const n = tick.touches.length;
      const i = Math.min(n - 1, Math.floor(prog * n));
      const cur = tick.touches[i];
      carrierId = cur.playerId;
      possession = cur.side;
      nextReceiver = tick.touches[i + 1]?.playerId;
      const carrier = this.players.get(cur.playerId);
      guideX = cur.x;
      guideY = carrier ? carrier.baseY * 0.42 + ballY * 0.58 : ballY;
    } else if (carrierId) {
      const c = this.players.get(carrierId);
      guideX = ballX;
      guideY = c ? c.baseY * 0.4 + ballY * 0.6 : ballY;
    }

    // Portador VISUAL = jogador do time em posse mais próximo do ponto do lance
    // (nunca um zagueiro lá atrás). Garante passe PÉ-A-PÉ e a bola sempre num
    // jogador, no lugar certo. Histerese evita trocar de portador a cada frame.
    if (now() >= this.celebrateUntil) {
      let best: string | null = null;
      let bestD = Infinity;
      for (const id of this.order) {
        const p = this.players.get(id);
        if (!p || p.side !== possession || p.position === 'GK') continue;
        const d = Math.hypot(p.x - guideX, p.y - guideY);
        if (d < bestD) { bestD = d; best = id; }
      }
      const cur = this.visualCarrier ? this.players.get(this.visualCarrier) : null;
      const curOk = !!cur && cur.side === possession && cur.position !== 'GK';
      const curD = curOk ? Math.hypot(cur!.x - guideX, cur!.y - guideY) : Infinity;
      if (best && (!curOk || bestD < curD - 5)) this.visualCarrier = best;
      if (this.visualCarrier) carrierId = this.visualCarrier;
    }

    // Defensor mais próximo da bola pressiona.
    const defSide: 'home' | 'away' = possession === 'home' ? 'away' : 'home';
    let presserId: string | null = null;
    let presserDist = Infinity;
    for (const id of this.order) {
      const p = this.players.get(id);
      if (!p || p.side !== defSide || p.position === 'GK') continue;
      const d = Math.hypot(p.x - ballX, p.y - ballY);
      if (d < presserDist) {
        presserDist = d;
        presserId = id;
      }
    }

    // Move cada jogador em direção ao seu alvo (velocidade limitada).
    let idx = 0;
    for (const id of this.order) {
      const p = this.players.get(id);
      if (!p) {
        idx++;
        continue;
      }
      const hasBall = p.side === possession;
      let [tx, ty] = this.shape(p, ballX, ballY, hasBall);
      let speed = SPEED.base;

      if (id === carrierId) {
        tx = guideX;
        ty = guideY;
        speed = SPEED.carrier;
      } else if (id === nextReceiver) {
        const dir = p.side === 'home' ? 1 : -1;
        tx = clamp(tx + dir * 8, 2, 98);
        ty = clamp(ty + (ballY - ty) * 0.3, 2, 98);
        speed = SPEED.receiver;
      } else if (id === presserId) {
        tx = clamp(ballX - (p.side === 'home' ? 2 : -2), 2, 98);
        ty = ballY;
        speed = SPEED.presser;
      } else {
        // jockeying sutil pra ninguém ficar estático
        tx += Math.sin(t / 900 + idx * 1.7) * 0.55;
        ty += Math.cos(t / 1100 + idx * 2.3) * 0.55;
      }

      moveToward(p, tx, ty, speed * dt);
      this.writeNode(id, p);
      idx++;
    }

    // Bola vai PÉ-A-PÉ: mira o disco do portador visual (jogador em posse mais
    // perto do lance). Como ele foi escolhido perto do ponto do lance, a bola
    // fica em alguém e no lugar certo — sem "voltar" a um zagueiro atrás.
    const carrier = carrierId ? this.players.get(carrierId) : null;
    const btx = carrier ? carrier.x : guideX;
    const bty = carrier ? carrier.y : guideY;
    if (Math.hypot(this.ball.x - btx, this.ball.y - bty) < BALL_GLUE_DIST) {
      // na posse: micro-drible (nunca congela de vez).
      const tt = now();
      this.ball.x = btx + Math.sin(tt * 0.006) * 0.5;
      this.ball.y = bty + Math.cos(tt * 0.0075) * 0.5;
    } else {
      moveToward(this.ball, btx, bty, SPEED.ball * dt);
    }
    this.ball.x = clamp(this.ball.x, 1.5, 98.5);
    this.ball.y = clamp(this.ball.y, 2, 98);
    this.writeBall();

    // Realce no jogador mais perto da bola (quem está com ela).
    let nearId: string | null = null;
    let nearD = 4;
    for (const id of this.order) {
      const p = this.players.get(id);
      if (!p) continue;
      const d = Math.hypot(p.x - this.ball.x, p.y - this.ball.y);
      if (d < nearD) {
        nearD = d;
        nearId = id;
      }
    }
    if (nearId !== this.highlightId) {
      if (this.highlightId) this.nodes.get(this.highlightId)?.classList.remove('fm-pitch2d__player--ball');
      if (nearId) this.nodes.get(nearId)?.classList.add('fm-pitch2d__player--ball');
      this.highlightId = nearId;
    }

    // Rastro da bola.
    if (this.trailEls.length > 0) {
      if (t - this.lastTrailAt > 40) {
        this.trail.unshift({ x: this.ball.x, y: this.ball.y });
        if (this.trail.length > this.trailEls.length) this.trail.pop();
        this.lastTrailAt = t;
      }
      for (let i = 0; i < this.trailEls.length; i++) {
        const el = this.trailEls[i];
        const pt = this.trail[i];
        if (pt) {
          const s = toScreen(pt.x, pt.y, this.classic);
          el.style.left = `${s.left}%`;
          el.style.top = `${s.top}%`;
          el.style.opacity = `${Math.max(0, 0.35 * (1 - i / this.trailEls.length))}`;
        } else {
          el.style.opacity = '0';
        }
      }
    }
  }

  /** Alvo de formação (forma do time) em função da posição da bola. */
  private shape(p: PlayerState, ballX: number, ballY: number, hasBall: boolean): [number, number] {
    const dir = p.side === 'home' ? 1 : -1;
    const prog = p.side === 'home' ? ballX / 100 : (100 - ballX) / 100;
    const posMult = p.position === 'GK' ? 0.1 : p.position === 'DEF' ? 0.62 : p.position === 'FWD' ? 1.15 : 1.0;
    const push = hasBall ? dir * prog * 24 : -dir * (1 - prog) * 16;
    const tx = p.baseX + push * posMult;
    const yPull = (p.position === 'GK' ? 0.32 : 1) * (hasBall ? 0.16 : 0.24);
    const ty = p.baseY + (ballY - 50) * yPull;
    const r = POS_RANGE[p.position] ?? POS_RANGE.MID;
    const range = p.side === 'home'
      ? r
      : { xMin: 100 - r.xMax, xMax: 100 - r.xMin, yMin: r.yMin, yMax: r.yMax };
    return [clamp(tx, range.xMin, range.xMax), clamp(ty, range.yMin, range.yMax)];
  }

  private writeNode(id: string, p?: PlayerState) {
    const el = this.nodes.get(id);
    if (!el) return;
    const pl = p ?? this.players.get(id);
    if (!pl) return;
    const s = toScreen(pl.x, pl.y, this.classic);
    el.style.left = `${s.left}%`;
    el.style.top = `${s.top}%`;
  }

  private writeBall() {
    if (!this.ballEl) return;
    const s = toScreen(this.ball.x, this.ball.y, this.classic);
    this.ballEl.style.left = `${s.left}%`;
    this.ballEl.style.top = `${s.top}%`;
  }
}
