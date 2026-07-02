# Product

## Register

product

## Users

Football fans who want a management game experience. They're looking for an authentic Football Manager-like simulation, played through a web browser.

## Product Purpose

Football Manager Web is a Football Manager-style simulation split into a React/Vite frontend and an Express backend that owns all game state (Zustand store server-side, saves persisted to disk, not localStorage). The frontend is a thin client: every action round-trips through a REST API (`/api/action`, `/api/state`) and re-syncs full state from the server.

The simulation is deep, not a toy: minute-by-minute match engine (set pieces, substitutions, fatigue, live interventions), a transfer market with scouting fog-of-war, negotiations, loans and installment deals, tactics with formations and mentality, weekly training with injury risk, club finances, press conferences that move fan/board sentiment, squad dynamics and player promises, and a youth academy — all procedurally generated per save.

## Brand Personality

Authentic, gritty, serious — inspired by Football Manager 2026. This is not a casual game; it's a simulation. The interface should feel functional and grounded, not polished or playful. Think real-world sports management tools, not entertainment apps.

## Anti-references

- Avoid SaaS/corporate aesthetics. This should never feel like enterprise software.
- Not childish or gamified beyond realism. Keep the tone serious and grounded.
- No neon/gaming RGB aesthetics.
- Not overly minimal — FM has depth and density. Don't flatten the information hierarchy.

## Design Principles

1. **Function over decoration** — Every visual element should serve the data. No decorative fluff.
2. **Realism over gamification** — The interface should feel like a real management tool, not a game app.
3. **Density over minimalism** — Present information clearly and completely. Don't hide details behind abstraction.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion` — all animations and transitions should have alternatives for users who prefer reduced motion.
