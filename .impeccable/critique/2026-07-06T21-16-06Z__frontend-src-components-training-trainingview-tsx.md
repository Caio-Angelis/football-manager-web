---
target: treinos
total_score: 20
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-07-06T21-16-06Z
slug: frontend-src-components-training-trainingview-tsx
---
# Critique: Treinos (`TrainingView.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Current week/team shown, but no success/loading feedback when applying training; saved vs. draft state is indistinguishable |
| 2 | Match System / Real World | 3 | Portuguese football terms are natural; training types map to real-world sessions |
| 3 | User Control and Freedom | 2 | No undo for plan changes; prevention sessions fire instantly without confirmation |
| 4 | Consistency and Standards | 2 | Emoji icons mixed with Lucide icons; inline styles mixed with CSS classes; toggle label is inverted |
| 5 | Error Prevention | 2 | Only one hard guard (custom group disabled when empty); no warning before applying high-risk training |
| 6 | Recognition Rather Than Recall | 3 | Training types, target groups, and calendar options are visible and labeled |
| 7 | Flexibility and Efficiency of Use | 1 | No bulk select, no search/filter, no keyboard shortcuts, no training presets beyond the six focus buttons |
| 8 | Aesthetic and Minimalist Design | 2 | Information overload: six dense sections on one scroll; emojis clash with the serious "tactics room" register |
| 9 | Error Recovery | 2 | Toast appears on API failure, but no inline error display or recovery suggestions |
| 10 | Help and Documentation | 1 | No contextual help; CA/PA, risk percentages, and focus/calendar relationship are unexplained |
| **Total** | | **20/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment**: The interface does not scream "AI-generated" in a generic sense, but it does feel like a feature that was assembled rather than designed. The biggest tells are the **emoji iconography** in the training-type cards (🏃⚽🤝🏥💆🧘) and the **gradient stat bars** in the attribute progression cards, both of which sit awkwardly against the project's dark, serious, broadcast-graphics register. The layout is a long stack of card sections rather than a deliberate task flow, and the inverted toggle state in the progression section is a clear sign of UI that was iterated without final polish. The page is dense by necessity, but density is not the same as clarity; many elements compete at equal weight.

**Deterministic scan**: Running the bundled detector against the training files returned **566 findings** across the four files. The most relevant to this surface are:

- **side-tab** (15 project-wide, 4 directly in the injury-risk cards at `styles-supplement.css:1969-1972`): the absolute-ban side-stripe border pattern used to encode risk severity. The project explicitly forbids `border-left`/`border-right` accents on cards.
- **gradient-text** (8 project-wide): gradient-text decorative headings elsewhere in the same stylesheets, indicating the stylesheet drift that affects the training surface's visual system.
- **design-system-color** (445) and **design-system-radius** (82): widespread literal colors and one-off radii outside `DESIGN.md` (e.g., `#ff9800`, `#4ade80`, `4px`, `5px`), undermining the token system.
- **layout-transition** (13): layout-property animations that can cause jank.
- **border-accent-on-rounded** (1), **overused-font** (1), **bounce-easing** (1): smaller signals of visual inconsistency.

**Visual overlays**: Browser script injection was not attempted because no agent-controllable browser automation is available in this session (the preview tool is user-driven). No reliable user-visible overlay is available for this critique.

## Overall Impression

The training screen is functional but reads like a data dashboard that was dropped into a single page without a clear primary task. A manager landing here wants to either **plan the week** or **review squad readiness**; the current UI forces both (plus prevention, plus attribute progression) into the same scroll. The biggest opportunity is to separate the planning flow from the monitoring dashboard, and to strip the casual emoji/gradient language that undermines the serious tone of the rest of the app.

## What's Working

- **Risk communication is explicit**. The training-type cards include consequence language ("+risco de lesão"), and the fatigue cards surface both fitness and injury risk in one place.
- **Target-group shortcuts exist**. The `Todos / Atacantes / Meias / Defensores / Selecionados` row gives a quick path for common segmentation, which is the right affordance for a football tool.
- **Weekly calendar is editable per block**. Letting the user tune morning/afternoon/evening for each day matches the domain well and gives managers control over micro-scheduling.

## Priority Issues

### [P1] Information overload and unclear hierarchy
**What**: Six sections (focus, target, calendar, risk, fatigue, progression, prevention) are stacked vertically at roughly the same visual weight. There is no clear "do this first" signal.
**Why it matters**: The user must scroll and parse a full page before they can confidently act. High cognitive load leads to mistakes like applying the wrong training focus or missing high-risk players.
**Fix**: Split the view into two modes/tabs: **Plan (foco + calendário + aplicação)** and **Monitor (fadiga + risco + progressão + prevenção)**. Default to Plan. Use the existing `fms-body--scroll` pattern but make the primary action area sticky.
**Suggested command**: `/impeccable layout treinos`

### [P1] Casual emoji/gradient language clashes with the serious register
**What**: Training cards use emoji icons (`🏃`, `⚽`, `🤝`, `🏥`, `💆`, `🧘`) and the attribute progression uses gradient bars (`#1a73e8 → #4fc3f7`, `#0f9d58 → #81c784`). The project register is a dark analytics room, not a mobile game.
**Why it matters**: The aesthetic inconsistency signals "this part was built separately." It weakens trust in a tool where the user makes consequential decisions.
**Fix**: Replace emoji icons with a small Lucide icon set (or simple initials) and use the design-system status colors (`pitch-green`, `assistants-amber`, `red-card`, `pitch-blue`) for solid bars instead of gradients.
**Suggested command**: `/impeccable colorize treinos` and `/impeccable quieter treinos`

### [P1] Side-stripe borders encode meaning (absolute ban)
**What**: Injury-risk categories use `border-left: 3px solid` for low/moderate/high/critical states at `styles-supplement.css:1969-1972`.
**Why it matters**: The project explicitly bans side-stripe borders as an accent pattern. They also rely on color alone for severity, which is inaccessible.
**Fix**: Replace the left border with a full-border treatment or a status badge (chip/label). Use the status colors from `DESIGN.md` and add a text label ("Baixo", "Moderado", etc.) to the card header.
**Suggested command**: `/impeccable audit treinos`

### [P2] Inverted "Progressão de Atributos" toggle
**What**: The state is named `showProgression` and starts as `true`, but the `true` branch shows the delta/progression view and the `false` branch shows the current-attribute monitor. The button label says "Ocultar" when progression is visible, which is the opposite of the section's title.
**Why it matters**: The user cannot predict what the button will do, and the default state contradicts the section name.
**Fix**: Rename the state to `showDeltas` and default to `false`. Show the current-attribute monitor by default, with a clear button: "Ver evolução semanal" / "Voltar ao monitor".
**Suggested command**: `/impeccable clarify treinos`

### [P2] Custom player selection is tedious for large squads
**What**: When "Selecionados" is chosen, the user sees a checkbox list of every player with no select-all, no position filter, and no search.
**Why it matters**: For a 25-player squad, selecting a custom group is a one-by-one click fest. Power users will avoid the feature.
**Fix**: Add a "Selecionar todos" / "Limpar" pair, plus a position filter row (GOL/DEF/MEI/ATA) that toggles groups.
**Suggested command**: `/impeccable adapt treinos`

## Persona Red Flags

### Alex (Power User)
- **No keyboard shortcuts or bulk actions**: must use mouse for every checkbox, every calendar select, every button.
- **No presets**: the six focus buttons regenerate the entire week; there is no "save as preset" or "repeat last week".
- **One-item-at-a-time player selection**: the custom target group is unusable for a large squad.
- **No clear risk-before-action signal**: Alex can apply a high-risk physical plan without seeing a confirmation of the total load.
- **Abandonment risk**: high. The fastest path is to click the focus button and "Aplicar", ignoring the rest of the page.

### Jordan (First-Timer)
- **Inverted progression toggle**: Jordan reads the section title, sees the button says "Ocultar", and cannot tell what will be hidden.
- **No explanation of the relationship between Foco Semanal and Calendário**: selecting a focus does not visibly update the calendar until "Salvar Plano" is clicked, and the calendar itself can be edited independently.
- **CA/PA, cumulative load, and risk percentages are unexplained**: no tooltips or inline help.
- **No confirmation that "Aplicar Treino Agora" succeeded**: the button just fires silently.
- **Will abandon at the first ambiguous section**, likely the progression toggle or the risk summary.

### Sam (Accessibility-Dependent)
- **Emoji icons are not meaningful to screen readers**: the training cards announce "runner emoji" or may skip the emoji entirely, leaving no icon label.
- **Injury risk relies on color alone**: the red/amber/green border-left and emoji indicators carry no text labels.
- **Inline-styled bars lack ARIA**: the fitness bars and attribute bars have no `role="progressbar"`, `aria-valuenow`, or labels.
- **Calendar selects are 21 individual `<select>` elements**: tedious to navigate sequentially, with no grouping or legend.
- **Focus states are unverified**: many custom-styled elements use transparent/background-based borders; visible focus indicators may be missing.

## Minor Observations

- The `fms-body--scroll` wrapper is present, but the action buttons (`Salvar Plano`, `Aplicar Treino Agora`) scroll away with the page; making them sticky would reduce the gap between decision and action.
- The attribute progression cards are capped to `team.squad.slice(0, 15)` with no explanation; the remaining players are silently omitted.
- Prevention session buttons contain inline async handlers and duplicated object construction, which is a code smell but not a UI problem on its own.
- The `fm-training-view` wrapper in the old styles has a `max-width: 900px` that is not used in the new `fms-page` layout, so the content stretches edge-to-edge on wide screens.
- The page header uses `Globe` for "Visão do Clube" and `Users` for "Elenco" — the icons are reasonable, but the labels are only available on hover if the existing `PageHeader` uses tooltips; otherwise, they are icon-only actions.

## Questions to Consider

- **What is the primary task on this screen?** Is it "plan the week's training" or "review and act on squad readiness"? The current UI treats both equally.
- **Do managers need to edit every single block, or should the focus buttons drive the calendar and allow exceptions?** If the calendar is mostly read-only, much of the visual noise can be removed.
- **Can we remove the progression toggle entirely and always show the most useful view?** If the user has history, show deltas; if not, show the current monitor with a history-empty state.
