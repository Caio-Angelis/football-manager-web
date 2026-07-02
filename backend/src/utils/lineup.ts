import type { Team } from '../types/team';

/**
 * Returns a valid 11-man startingXI for a team. Keeps the manager's existing
 * (valid, de-duplicated) starters, guarantees a goalkeeper, then tops up with
 * the highest-ability remaining squad players. Older saves / tactical edits
 * sometimes leave startingXI with fewer than 11 IDs — this repairs it so the
 * match engine, substitutions and squad strength all see a full lineup.
 */
export function ensureElevenXI(team: Team): string[] {
  const squadIds = new Set(team.squad.map(p => p.id));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of team.startingXI ?? []) {
    if (squadIds.has(id) && !seen.has(id)) { result.push(id); seen.add(id); }
  }
  if (result.length >= 11) return result.slice(0, 11);

  // Guarantee a goalkeeper on the pitch
  if (!team.squad.some(p => seen.has(p.id) && p.position === 'GK')) {
    const gk = team.squad.find(p => p.position === 'GK' && !seen.has(p.id));
    if (gk) { result.push(gk.id); seen.add(gk.id); }
  }
  // Fill the rest by current ability
  const rest = team.squad
    .filter(p => !seen.has(p.id))
    .sort((a, b) => b.currentAbility - a.currentAbility);
  for (const p of rest) {
    if (result.length >= 11) break;
    result.push(p.id);
    seen.add(p.id);
  }
  return result.slice(0, 11);
}

/** Heals every team's startingXI to 11 (no-op for teams already at 11). */
export function healTeamsXI(teams: Team[]): Team[] {
  return teams.map(t => {
    const xi = ensureElevenXI(t);
    return xi.length === t.startingXI?.length && xi.every((id, i) => id === t.startingXI[i])
      ? t
      : { ...t, startingXI: xi };
  });
}
