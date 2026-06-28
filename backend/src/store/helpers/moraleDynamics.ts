// Dinâmica Social Semanal — Consequências do vestiário
// Atualiza moral dos jogadores baseado em: promessas, tempo de jogo,
// forma do time, e cascata social (capitão infeliz arrasta o grupo)

import type { Team, Player } from '../../types/game';

// ============================================================
// TIPOS
// ============================================================

export interface MoraleEvent {
  playerId: string;
  playerName: string;
  change: number;
  reason: string;
}

export interface MoraleDynamicsResult {
  team: Team;
  events: MoraleEvent[];
}

// ============================================================
// HELPERS
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getFullName(p: Player): string {
  return p.surname ? `${p.name} ${p.surname}` : p.name;
}

// ============================================================
// MOTORES DE ATUALIZAÇÃO DE MORAL
// ============================================================

// 1. Promessas expiradas — penalidade severa (jogador perde confiança)
function applyPromisePenalties(squad: Player[]): { squad: Player[]; events: MoraleEvent[] } {
  const events: MoraleEvent[] = [];
  const updated = squad.map(player => {
    const expired = player.promises.filter(p => !p.fulfilled && p.deadline <= 0);
    if (expired.length === 0) return player;

    const penalty = expired.length * 12;
    events.push({
      playerId: player.id,
      playerName: getFullName(player),
      change: -penalty,
      reason: `${expired.length} promessa(s) não cumprida(s)`,
    });
    return { ...player, morale: clamp(player.morale - penalty, 0, 100) };
  });
  return { squad: updated, events };
}

// 2. Tempo de jogo vs status — Key Player no banco perde moral rápido
function applyPlayingTimeMorale(squad: Player[]): { squad: Player[]; events: MoraleEvent[] } {
  const events: MoraleEvent[] = [];
  const isInXI = (p: Player, idx: number) => idx < 11;

  const updated = squad.map((player, idx) => {
    let change = 0;
    let reason = '';

    if (player.squadStatus === 'Key Player' && !isInXI(player, idx)) {
      change = -8;
      reason = 'Titular chave no banco';
    } else if (player.squadStatus === 'Regular Starter' && !isInXI(player, idx)) {
      change = -5;
      reason = 'Titular regular no banco';
    } else if (isInXI(player, idx) && player.squadStatus !== 'Excess' && player.squadStatus !== 'Young Talent') {
      change = 2;
      reason = 'Jogando como titular';
    } else if (player.squadStatus === 'Excess') {
      change = -3;
      reason = 'Excesso no elenco';
    }

    if (change === 0) return player;

    events.push({
      playerId: player.id,
      playerName: getFullName(player),
      change,
      reason,
    });
    return { ...player, morale: clamp(player.morale + change, 0, 100) };
  });
  return { squad: updated, events };
}

// 3. Forma do time — vitórias motivam, derrotas desmotivam
function applyTeamFormMorale(squad: Player[], teamForm: string[]): { squad: Player[]; events: MoraleEvent[] } {
  const events: MoraleEvent[] = [];
  if (teamForm.length === 0) return { squad, events };

  const wins = teamForm.filter(f => f === 'W').length;
  const losses = teamForm.filter(f => f === 'L').length;

  let change = 0;
  let reason = '';

  if (wins >= 4) {
    change = 5;
    reason = 'Time em grande fase';
  } else if (wins >= 3) {
    change = 3;
    reason = 'Boa sequência de resultados';
  } else if (losses >= 4) {
    change = -6;
    reason = 'Sequência de derrotas';
  } else if (losses >= 3) {
    change = -4;
    reason = 'Má fase do time';
  }

  if (change === 0) return { squad, events };

  const updated = squad.map(player => {
    // Jogadores jovens são mais resilientes; veteranos mais afetados
    const ageMod = player.age < 21 ? 0.5 : player.age > 30 ? 1.3 : 1.0;
    const finalChange = Math.round(change * ageMod);

    events.push({
      playerId: player.id,
      playerName: getFullName(player),
      change: finalChange,
      reason,
    });
    return { ...player, morale: clamp(player.morale + finalChange, 0, 100) };
  });

  return { squad: updated, events };
}

// 4. Cascata social — capitão infeliz arrasta aliados
function applySocialCascade(squad: Player[]): { squad: Player[]; events: MoraleEvent[] } {
  const events: MoraleEvent[] = [];

  // Identificar capitão (maior liderança no elenco)
  const captain = squad.reduce((best, p) =>
    (p.mental?.leadership ?? 0) > (best.mental?.leadership ?? 0) ? p : best, squad[0]);

  if ((captain.morale ?? 50) >= 40) return { squad, events };

  // Capitão infeliz: aliados diretos perdem moral
  const captainAllies = captain.teamMates ?? [];
  const severity = captain.morale < 25 ? 10 : captain.morale < 35 ? 7 : 4;

  const updated = squad.map(player => {
    if (player.id === captain.id) return player;
    if (!captainAllies.includes(player.id)) return player;
    if (player.morale <= captain.morale) return player; // já tão mal quanto

    events.push({
      playerId: player.id,
      playerName: getFullName(player),
      change: -severity,
      reason: `Cascata: capitão ${getFullName(captain)} insatisfeito`,
    });
    return { ...player, morale: clamp(player.morale - severity, 0, 100) };
  });

  return { squad: updated, events };
}

// 5. Grupo social infeliz — membros do grupo perdem moral juntos
function applySocialGroupCascade(squad: Player[]): { squad: Player[]; events: MoraleEvent[] } {
  const events: MoraleEvent[] = [];

  const groups = new Map<string, Player[]>();
  squad.forEach(p => {
    const g = p.socialGroup;
    if (g) {
      const arr = groups.get(g) ?? [];
      arr.push(p);
      groups.set(g, arr);
    }
  });

  let updated = [...squad];

  groups.forEach((members, groupId) => {
    if (members.length < 2) return;
    const avgMorale = members.reduce((s, p) => s + (p.morale ?? 50), 0) / members.length;
    if (avgMorale >= 40) return;

    // Grupo infeliz: quem está com moral alta no grupo perde um pouco
    const penalty = avgMorale < 25 ? 5 : 3;
    updated = updated.map(player => {
      if (player.socialGroup !== groupId) return player;
      if ((player.morale ?? 50) <= avgMorale) return player;

      events.push({
        playerId: player.id,
        playerName: getFullName(player),
        change: -penalty,
        reason: `Grupo social "${groupId}" insatisfeito`,
      });
      return { ...player, morale: clamp(player.morale - penalty, 0, 100) };
    });
  });

  return { squad: updated, events };
}

// 6. Regressão à média — moral extrema tende a voltar ao centro
function applyMoraleRegression(squad: Player[]): Player[] {
  return squad.map(player => {
    let morale = player.morale ?? 50;
    if (morale > 85) morale -= 1;      // euforia diminui lentamente
    else if (morale < 20) morale += 2;  // fundo do poço recupera um pouco
    else if (morale < 35) morale += 1;  // moral muito baixa recupera levemente
    return { ...player, morale: clamp(Math.round(morale), 0, 100) };
  });
}

// ============================================================
// PONTO DE ENTRADA — Aplica toda a dinâmica semanal
// ============================================================

export function applyWeeklyMoraleDynamics(team: Team): MoraleDynamicsResult {
  let squad = [...team.squad];
  const allEvents: MoraleEvent[] = [];

  // 1. Promessas expiradas
  const promiseResult = applyPromisePenalties(squad);
  squad = promiseResult.squad;
  allEvents.push(...promiseResult.events);

  // 2. Tempo de jogo vs status
  const playingResult = applyPlayingTimeMorale(squad);
  squad = playingResult.squad;
  allEvents.push(...playingResult.events);

  // 3. Forma do time
  const formResult = applyTeamFormMorale(squad, team.leagueForm ?? []);
  squad = formResult.squad;
  allEvents.push(...formResult.events);

  // 4. Cascata do capitão
  const cascadeResult = applySocialCascade(squad);
  squad = cascadeResult.squad;
  allEvents.push(...cascadeResult.events);

  // 5. Cascata de grupo social
  const groupResult = applySocialGroupCascade(squad);
  squad = groupResult.squad;
  allEvents.push(...groupResult.events);

  // 6. Regressão à média (sem eventos, é natural)
  squad = applyMoraleRegression(squad);

  return {
    team: { ...team, squad },
    events: allEvents.filter(e => e.change !== 0),
  };
}
