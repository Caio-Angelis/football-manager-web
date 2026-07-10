// Relatório pós-jogo v2 — Fase 10 da checklist do motor v2
// Relatório expõe duelos-por-zona reais ("seu lateral perdeu 7 de 10").
// Relatório separa chances por origem: lateral / centro / bola parada / transição.
// Conselho do assistente é acionável (ex: "o meio deles teve superioridade; use um volante a mais").

import type { Team, LiveMatchState, TacticalInsight } from '../../types/game';
import { getDuelLog, duelStatsByPlayer } from './zones';

// ============================================================
// 10.1 — Duelos por zona reais
// ============================================================

export interface ZoneDuelSummary {
  zone: string;
  attackerWins: number;
  defenderWins: number;
  total: number;
  winRate: number;
}

/**
 * Gera resumo de duelos por zona a partir do log de duelos.
 */
export function summarizeDuelsByZone(): ZoneDuelSummary[] {
  const log = getDuelLog();
  const byZone: Record<string, { att: number; def: number }> = {};

  for (const d of log) {
    const zoneKey = `${d.zone.third}-${d.zone.flank}`;
    if (!byZone[zoneKey]) byZone[zoneKey] = { att: 0, def: 0 };
    if (d.winner === 'attacker') byZone[zoneKey].att++;
    else byZone[zoneKey].def++;
  }

  return Object.entries(byZone).map(([zone, counts]) => ({
    zone,
    attackerWins: counts.att,
    defenderWins: counts.def,
    total: counts.att + counts.def,
    winRate: counts.att + counts.def > 0 ? counts.att / (counts.att + counts.def) : 0,
  }));
}

/**
 * Gera insights de duelos por jogador ("seu lateral perdeu 7 de 10").
 */
export function generateDuelInsights(homeTeam: Team, awayTeam: Team): TacticalInsight[] {
  const stats = duelStatsByPlayer();
  const insights: TacticalInsight[] = [];

  for (const [playerId, stat] of Object.entries(stats)) {
    const total = stat.won + stat.lost;
    if (total < 3) continue;

    const winRate = stat.won / total;
    const player = [...homeTeam.squad, ...awayTeam.squad].find(p => p.id === playerId);
    if (!player) continue;

    if (winRate < 0.35 && total >= 5) {
      insights.push({
        category: 'negative',
        icon: '⚔️',
        title: `${player.name} perdeu ${stat.lost} de ${total} duelos`,
        description: `${player.name} (${player.position}) teve apenas ${(winRate * 100).toFixed(0)}% de sucesso nos duelos. Considere reforçar esta zona.`,
      });
    } else if (winRate > 0.70 && total >= 5) {
      insights.push({
        category: 'positive',
        icon: '💪',
        title: `${player.name} dominou nos duelos (${stat.won}/${total})`,
        description: `${player.name} teve ${(winRate * 100).toFixed(0)}% de sucesso nos duelos — referência da partida.`,
      });
    }
  }

  return insights;
}

// ============================================================
// 10.2 — Chances por origem
// ============================================================

export interface ChanceOriginSummary {
  origin: string;
  count: number;
  percentage: number;
}

/**
 * Resume chances por origem a partir do estado da partida.
 */
export function summarizeChancesByOrigin(state: LiveMatchState): ChanceOriginSummary[] {
  const origins = state.chancesByOrigin ?? {};
  const total = Object.values(origins).reduce((s, v) => s + v, 0);

  return Object.entries(origins)
    .map(([origin, count]) => ({
      origin,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================
// 10.3 — Conselho do assistente (acionável)
// ============================================================

/**
 * Gera conselho tático acionável baseado nos duelos, chances e placar.
 */
export interface AssistantAdviceV2Result {
  summary: string;
  recommendations: string[];
  keyInsights: TacticalInsight[];
}

export function generateAssistantAdviceV2(
  homeTeam: Team,
  awayTeam: Team,
  state: LiveMatchState,
  isUserHome: boolean,
): AssistantAdviceV2Result {
  const userTeam = isUserHome ? homeTeam : awayTeam;
  const oppTeam = isUserHome ? awayTeam : homeTeam;
  const userSide = isUserHome ? 'home' : 'away';

  const duelSummaries = summarizeDuelsByZone();
  const chanceOrigins = summarizeChancesByOrigin(state);
  const duelInsights = generateDuelInsights(homeTeam, awayTeam);

  // Identifica zona onde o usuário sofreu mais
  const weakZones = duelSummaries
    .filter(d => d.winRate < 0.40 && d.total >= 3)
    .sort((a, b) => a.winRate - b.winRate);

  // Identifica origem predominante de chances adversárias
  const topOrigin = chanceOrigins[0];

  const advice: string[] = [];
  const recommendations: string[] = [];

  // Zona fraca
  if (weakZones.length > 0) {
    const wz = weakZones[0];
    const zoneDesc = wz.zone.includes('left') ? 'pela esquerda'
      : wz.zone.includes('right') ? 'pela direita'
      : 'pelo centro';
    advice.push(`Seu time perdeu a maioria dos duelos ${zoneDesc} (${wz.attackerWins}/${wz.total}).`);
    recommendations.push(`Reforce ${zoneDesc}: considere um jogador mais defensivo ou ajuste a cobertura.`);
  }

  // Origem de chances
  if (topOrigin && topOrigin.count > 5) {
    if (topOrigin.origin === 'lateral') {
      advice.push(`O adversário criou maioria das chances pelas pontas (${topOrigin.count}).`);
      recommendations.push('Use laterais mais defensivos ou feche os flancos com wingBacks em duty defend.');
    } else if (topOrigin.origin === 'centro') {
      advice.push(`O adversário criou maioria das chances pelo centro (${topOrigin.count}).`);
      recommendations.push('Adicione um volante a mais ou use marcação mais firme no meio-campo.');
    } else if (topOrigin.origin === 'bolaParada') {
      advice.push(`O adversário ameaçou muito em bola parada (${topOrigin.count}).`);
      recommendations.push('Trabalhe a marcação em escanteios e faltas — aumente o foco em heading/positioning.');
    }
  }

  // Bola parada como força
  const setPieceGoals = state.chancesByOrigin?.bolaParada ?? 0;
  if (setPieceGoals > 3 && (isUserHome ? state.homeGoals : state.awayGoals) > 0) {
    advice.push(`Seus gols de bola parada (${setPieceGoals} chances) foram produtivos.`);
    recommendations.push('Continue explorando bola parada — é uma arma consistente.');
  }

  // Transição
  const transitionChances = state.xgByPhase?.transition ?? 0;
  if (transitionChances > 0.3) {
    if (isUserHome ? state.homeGoals > state.awayGoals : state.awayGoals > state.homeGoals) {
      advice.push('O contra-ataque funcionou bem — boas transições criaram chances.');
      recommendations.push('Mantenha a mentalidade de contra-ataque ativa.');
    } else {
      advice.push('O adversário criou perigo em transições rápidas.');
      recommendations.push('Reduza riscos no campo de defesa: use saída mais direta ou recue a linha.');
    }
  }

  // Default se nada encontrado
  if (advice.length === 0) {
    advice.push('Partada equilibrada sem zonas de fragilidade evidente.');
    recommendations.push('Mantenha a configuração tática atual e foque em consistência.');
  }

  return {
    summary: advice.join(' '),
    recommendations,
    keyInsights: duelInsights,
  };
}
