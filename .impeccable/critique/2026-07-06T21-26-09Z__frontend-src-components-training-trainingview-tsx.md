---
timestamp: 2026-07-06T21-26-09Z
slug: frontend-src-components-training-trainingview-tsx
---
# Critique: Treinos (`TrainingView.tsx`)

Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/success feedback on "Aplicar Treino Agora" or prevention buttons; saved vs draft plan indistinguishable |
| 2 | Match System / Real World | 3 | FM-familiar terms (Foco, CA/PA, calendário semanal) but workflow order puts monitoring before planning |
| 3 | User Control and Freedom | 2 | `savePlan()` regenerates from `FOCUS_PATTERNS`, silently discarding manual `fm-training-block__select` edits |
| 4 | Consistency and Standards | 2 | `fms-page`/`PageHeader` shell vs legacy `fm-*` body, emoji icons vs Lucide in header, dead `Button` variants |
| 5 | Error Prevention | 2 | Only guard is custom-group empty check; no warning when applying high-physical focus with critical injury list |
| 6 | Recognition Rather Than Recall | 2 | User must recall difference between "Salvar Plano" and "Aplicar Treino Agora"; snapshot workflow unexplained |
| 7 | Flexibility and Efficiency of Use | 2 | 21 individual selects, no bulk assign, no sort/filter on fatigue grid, progression capped at 15 players |
| 8 | Aesthetic and Minimalist Design | 2 | Six stacked sections at equal weight; emoji noise and Material-style gradient bars clash with tactics-room register |
| 9 | Error Recovery | 2 | API toasts exist elsewhere but training actions give no inline recovery guidance |
| 10 | Help and Documentation | 1 | No contextual help linking focus presets to calendar generation or snapshot capture |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Does not read as generic AI landing-page slop, but it does read as **assembled feature UI** — emoji-as-icons (`🏃⚽🤝`), card-grid stacking of every subsystem, and gradient attribute bars sit against the project's dark, serious FM register. The biggest trust breakers are workflow logic (calendar edits lost on save) and visual hierarchy (all CTAs look identical). Density is appropriate for FM; redundancy is not.

**Deterministic scan**: CLI on `TrainingView.tsx` returned **0 findings** (`[]`). Browser runtime injection (`detect.js` via live-server on port 8400) logged `[impeccable] No anti-patterns found.` — no overlay badges rendered.

**Detector gaps (manual/CSS review)**:
- **Side-stripe borders** on injury-risk cards: `.fm-injury-risk--*` uses `border-left: 3px solid` in `styles-supplement.css:1969-1972` — violates project absolute ban; missed because scan targeted TSX only.
- **Gradient bar fills**: `.fm-attribute-progression-bar-fill--technical/--physical` use `linear-gradient` in `styles.css` — missed for same reason.
- **Emoji iconography**: not a detector rule but dominant visual tell.

**Visual inspection**: Browser reached `/treino` (Palmeiras, Week 11). Screenshots degraded (blank captures); a11y snapshot confirms long vertical stack: Foco → Alvo → actions → Calendário (7×3 selects) → Fadiga (full squad) → Progressão → Prevenção. Injury-risk panel hidden by default (`showInjuryRisk: false`) so side-tab DOM was not in runtime scan.

## Overall Impression

The screen has real FM depth — weekly patterns, injury risk tiers, attribute deltas — wrapped in a legacy visual layer that fights the rest of the app. `PageHeader` feels professional; everything below it feels like an older prototype grafted on. The single biggest opportunity: **restructure as Plan | Monitor** with design-system alignment and a trustworthy focus↔calendar contract.

## What's Working

1. **Weekly pattern engine** — `FOCUS_PATTERNS` + `generateWeeklySchedule()` delivers authentic "set focus, get a week" behavior; `fm-training-type__desc` surfaces the Físico injury tradeoff inline.
2. **Calendar metaphor** — 7 days × Manhã/Tarde/Noite with native `<select>` is the right FM mental model and collapses cleanly on mobile.
3. **Risk integration** — `getInverseRatingColor` / `getRatingColor` on fatigue bars ties training decisions to squad health with consistent thresholds.

## Priority Issues

### [P0] Manual calendar edits are silently discarded
- **Why it matters**: User edits 21 session dropdowns, clicks "Salvar Plano" or "Aplicar Treino Agora" — both call `generateWeeklySchedule(teamFocus)`, wiping manual changes. Destroys trust.
- **Fix**: Split "Gerar a partir do foco" from "Guardar calendário"; show dirty-state indicator; or live-bind calendar when focus changes with explicit confirmation.
- **Suggested command**: `/impeccable shape frontend/src/components/training/TrainingView.tsx`

### [P0] Button variants are dead code — all CTAs look identical
- **Why it matters**: `Button` accepts `variant="success"|"secondary"` but never applies modifier classes (`Button.tsx` line 33). "Salvar Plano", "Aplicar Treino Agora", and "Mostrar Risco" have equal visual weight.
- **Fix**: Wire variants to `fm-button--success` / `fm-button--secondary`, or migrate to `fms-continue` / `fms-link-btn`.
- **Suggested command**: `/impeccable polish frontend/src/components/training/TrainingView.tsx`

### [P1] Design-system schism (`fm-*` inside `fms-page`)
- **Why it matters**: Header uses modern `fms-*` shell; body uses legacy tokens, emoji cards, and Material gradients. Training is the most visually inconsistent screen in the app.
- **Fix**: Migrate sections to `fms-section`/`fms-card`; replace emoji with Lucide (as TacticsView); use `fms-select` for session dropdowns; route colors through `statusColors.ts`.
- **Suggested command**: `/impeccable adapt frontend/src/components/training/TrainingView.tsx`

### [P1] Information architecture — monitoring before planning
- **Why it matters**: Manager scrolls past full squad fatigue grid (twice, with progression) before completing the planning loop. Cognitive load checklist: 7/8 failures.
- **Fix**: Two-column or tabbed layout: **Plan** (focus + calendar + actions) | **Monitor** (fatigue + progression + prevention). Collapse monitor by default.
- **Suggested command**: `/impeccable layout frontend/src/components/training/TrainingView.tsx`

### [P2] Delta color classes don't match CSS
- **Why it matters**: JSX uses `fm-attribute-progression-delta-change positive`; CSS defines `--positive`/`--negative` BEM modifiers. Attribute deltas render without green/red signaling.
- **Fix**: Align to `fm-attribute-progression-delta-change--positive`.
- **Suggested command**: `/impeccable harden frontend/src/components/training/TrainingView.tsx`

## Persona Red Flags

**Alex (Power User)**: 21 individual `fm-training-block__select` interactions with no bulk assign; `savePlan()` is a data-loss trap; fatigue grid has no sort-by-risk or filter; progression silently capped at `slice(0, 15)`; prevention buttons auto-target thresholds with no schedule preview.

**Jordan (First-Timer)**: "Salvar Plano" vs "Aplicar Treino Agora" — neither explains outcome; "📷 Capturar Snapshot Semanal" required before progression makes sense but is buried; "Alvo do Treino" opens overwhelming checkbox wall for "Selecionados"; injury risk duplicated in toggle section and every fatigue card.

**Sam (Accessibility)**: Emoji icons in `fm-training-type__icon` lack meaningful text alternatives beyond label; `fm-training-block__label` not associated with `<select>` via `htmlFor`; risk severity conveyed by inline color only; toggle buttons lack `aria-expanded`/`aria-controls`; `Button` ripple has no `prefers-reduced-motion` guard.

## Minor Observations

- `.fm-training-view { max-width: 900px }` in CSS never applies — root is `fms-page` without wrapper class.
- `POSITION_LABELS` used in player picker but raw `player.position` in progression cards.
- Injury summary `h2` uses emoji prefix; critical tier repeats ⚠️ in heading and list items.
- `targetGroup` state not reflected in calendar UI (only passed to `applyWeeklyTraining`).
- Progression toggle "Ocultar" switches views rather than hiding the section — confusing copy, not inverted logic.

## Questions to Consider

- Is this one screen or three products (planning, medical, development)? Should Training split into FM-style sub-tabs like Tactics?
- Should the calendar be read-only when a focus preset is active — or should manual edit disable focus regeneration?
- What if emoji disappeared tomorrow — would Lucide + status chips communicate Físico vs Médico faster than the current cards?
