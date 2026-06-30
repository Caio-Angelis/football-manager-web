// Helpers de Scouting — Máscara de atributos, processamento de missões, nota

import type { Player, Team, Scout, ScoutReport, ActiveScoutMission, InboxMessage, PlayerAttribute, GKAttributes, ScoutRecommendation } from '../../types/game';
import { getFullName } from '../../utils/playerName';

// ============================================================
// MÁSCARA DE ATRIBUTOS
// ============================================================

/**
 * Retorna um valor mascarado para um atributo baseado no nível de conhecimento.
 * - < 25: null (desconhecido)
 * - 25-75: string "min-max" (intervalo baseado no judgingAbility do olheiro)
 * - > 75: número exato
 */
export function maskAttributeValue(
  realValue: number,
  knowledgeLevel: number,
  judgingAbility: number,
): number | string | null {
  if (knowledgeLevel >= 75) {
    return realValue;
  }
  if (knowledgeLevel >= 25) {
    // Desvio baseado no judgingAbility (1-20). Quanto melhor o olheiro, menor o intervalo.
    const spread = Math.max(1, Math.ceil((20 - judgingAbility) / 3));
    const min = Math.max(1, realValue - spread);
    const max = Math.min(20, realValue + spread);
    return `${min}-${max}`;
  }
  return null;
}

/**
 * Clona um Player aplicando máscara em todos os atributos técnicos, mentais, físicos e GK.
 * Usa o scoutKnowledge do estado e o melhor olheiro do time do usuário.
 */
export function maskPlayerAttributes(
  player: Player,
  knowledgeLevel: number,
  judgingAbility: number,
): Player {
  if (knowledgeLevel >= 100) {
    return player;
  }

  const maskAttr = (val: number | undefined): number | string | null | undefined => {
    if (val === undefined) return undefined;
    return maskAttributeValue(val, knowledgeLevel, judgingAbility);
  };

  const maskedTechnical: Record<string, number | string | null | undefined> = {};
  for (const key in player.technical) {
    maskedTechnical[key] = maskAttr((player.technical as unknown as Record<string, number | undefined>)[key]);
  }

  const maskedMental: Record<string, number | string | null | undefined> = {};
  for (const key in player.mental) {
    maskedMental[key] = maskAttr((player.mental as unknown as Record<string, number | undefined>)[key]);
  }

  const maskedPhysical: Record<string, number | string | null | undefined> = {};
  for (const key in player.physical) {
    maskedPhysical[key] = maskAttr((player.physical as unknown as Record<string, number | undefined>)[key]);
  }

  let maskedGK: Record<string, number | string | null | undefined> | undefined = undefined;
  if (player.goalkeeping) {
    maskedGK = {};
    for (const key in player.goalkeeping) {
      maskedGK[key] = maskAttr((player.goalkeeping as unknown as Record<string, number | undefined>)[key]);
    }
  }

  // CA/PA também mascarados
  const maskedCA = knowledgeLevel >= 50 ? player.currentAbility : Math.round(player.currentAbility / 20) * 20;
  const maskedPA = knowledgeLevel >= 75 ? player.potentialAbility : Math.round(player.potentialAbility / 20) * 20;

  return {
    ...player,
    technical: maskedTechnical as unknown as PlayerAttribute,
    mental: maskedMental as unknown as Partial<PlayerAttribute>,
    physical: maskedPhysical as unknown as Partial<PlayerAttribute>,
    goalkeeping: maskedGK as unknown as GKAttributes | undefined,
    currentAbility: maskedCA,
    potentialAbility: maskedPA,
    // hidden attributes sempre mascarados para jogadores de outros times
    hidden: {
      consistency: 0,
      injuryProneness: 0,
      bigGameImportance: 0,
      dirtiness: 0,
      adaptability: 0,
      ambition: 0,
      loyalty: 0,
      pressure: 0,
      professionalism: 0,
      sportsmanship: 0,
      temperament: 0,
    },
  };
}

/**
 * Encontra o melhor olheiro disponível do time (maior judgingAbility).
 */
export function getBestScout(team: Team): Scout | null {
  if (!team.scouts || team.scouts.length === 0) return null;
  return team.scouts.reduce((best, s) =>
    s.judgingAbility > best.judgingAbility ? s : best,
  );
}

/**
 * Gera olheiros padrão para um time se não tiver nenhum.
 */
export function generateDefaultScouts(teamId: string): Scout[] {
  return [
    {
      id: `scout_${teamId}_1`,
      name: 'Olheiro Sênior',
      judgingAbility: 12 + Math.floor(Math.random() * 4),
      judgingPotential: 10 + Math.floor(Math.random() * 4),
      assigned: false,
      experience: 0,
      missionsCompleted: 0,
    },
    {
      id: `scout_${teamId}_2`,
      name: 'Olheiro Júnior',
      judgingAbility: 8 + Math.floor(Math.random() * 4),
      judgingPotential: 7 + Math.floor(Math.random() * 4),
      assigned: false,
      experience: 0,
      missionsCompleted: 0,
    },
  ];
}

// ============================================================
// PROCESSAMENTO DE MISSÕES (chamado no advanceWeek)
// ============================================================

export interface ScoutMissionResult {
  updatedKnowledge: Record<string, number>;
  updatedMissions: ActiveScoutMission[];
  newInboxMessages: InboxMessage[];
  newScoutReports: ScoutReport[];
  updatedScouts: Scout[] | null; // scouts com experiência atualizada
}

/**
 * Processa todas as missões de scouting ativas no advanceWeek.
 * Para cada missão:
 * - Incrementa scoutKnowledge do alvo em X pontos (baseado no judgingAbility do olheiro)
 * - Decrementa weeksAssigned
 * - Se knowledge cruzar 50 ou 100, gera inbox message + scout report
 * - Se weeksAssigned chegar a 0, remove a missão
 */
export function processScoutMissions(
  missions: ActiveScoutMission[],
  scoutKnowledge: Record<string, number>,
  teams: Team[],
  selectedTeamId: string | null,
  currentWeek: number,
): ScoutMissionResult {
  const updatedKnowledge = { ...scoutKnowledge };
  const updatedMissions: ActiveScoutMission[] = [];
  const newInboxMessages: InboxMessage[] = [];
  const newScoutReports: ScoutReport[] = [];

  if (!selectedTeamId) {
    return { updatedKnowledge, updatedMissions: missions, newInboxMessages, newScoutReports, updatedScouts: null };
  }

  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam) {
    return { updatedKnowledge, updatedMissions: missions, newInboxMessages, newScoutReports, updatedScouts: null };
  }

  // Trackar quais scouts completaram missões para ganhar experiência
  const completedScoutIds = new Set<string>();
  // Trackar scouts ativos para ganhar experiência parcial
  const activeScoutIds = new Set<string>();

  for (const mission of missions) {
    const scout = userTeam.scouts?.find(s => s.id === mission.scoutId);
    if (!scout) {
      continue;
    }

    let targetPlayer: Player | undefined;
    for (const t of teams) {
      targetPlayer = t.squad.find(p => p.id === mission.targetId);
      if (targetPlayer) break;
    }
    if (!targetPlayer) {
      continue;
    }

    const currentKnowledge = updatedKnowledge[mission.targetId] ?? 0;

    const knowledgeGain = 8 + Math.floor(scout.judgingAbility / 2);
    const newKnowledge = Math.min(100, currentKnowledge + knowledgeGain);
    updatedKnowledge[mission.targetId] = newKnowledge;

    const crossed50 = currentKnowledge < 50 && newKnowledge >= 50;
    const crossed100 = currentKnowledge < 100 && newKnowledge >= 100;

    if (crossed50 || crossed100) {
      const report = generateScoutReportForMission(targetPlayer, scout, newKnowledge, userTeam);
      newScoutReports.push(report);

      const gradeText = report.grade ? ` — Nota: ${report.grade}` : '';
      newInboxMessages.push({
        id: `scout_report_${Date.now()}_${mission.targetId}_${currentWeek}`,
        type: 'suggestion',
        subject: crossed100
          ? `🔍 Relatório Final: ${getFullName(targetPlayer)}${gradeText}`
          : `🔍 Relatório Parcial: ${getFullName(targetPlayer)}${gradeText}`,
        body: crossed100
          ? `O olheiro ${scout.name} concluiu a observação de ${getFullName(targetPlayer)}. CA estimado: ${report.currentAbility}, PA estimado: ${report.potentialAbility}. ${getRecommendationText(report.grade)}`
          : `O olheiro ${scout.name} já tem um conhecimento moderado de ${getFullName(targetPlayer)}. CA estimado: ${report.currentAbility}, PA estimado: ${report.potentialAbility}.`,
        timestamp: Date.now(),
        read: false,
        priority: crossed100 ? 'high' : 'medium',
        relatedPlayerId: mission.targetId,
      });
    }

    const remaining = mission.weeksAssigned - 1;
    if (remaining > 0 && newKnowledge < 100) {
      updatedMissions.push({ ...mission, weeksAssigned: remaining });
      activeScoutIds.add(scout.id);
    } else {
      completedScoutIds.add(scout.id);
    }
  }

  // === DESENVOLVIMENTO DE SCOUTS ===
  // Scouts ganham experiência ao completar missões (10 + weeksTotal) e ao progredir (3 por semana ativa)
  let updatedScouts: Scout[] | null = null;
  if (userTeam.scouts && (completedScoutIds.size > 0 || activeScoutIds.size > 0)) {
    updatedScouts = userTeam.scouts.map(s => {
      if (completedScoutIds.has(s.id)) {
        const mission = missions.find(m => m.scoutId === s.id);
        const expGain = 10 + (mission?.weeksTotal ?? 0);
        const newExp = s.experience + expGain;
        const missionsCompleted = s.missionsCompleted + 1;
        // A cada 50 experiência, +1 judgingAbility (cap 20)
        const abilityBoost = Math.floor(newExp / 50) - Math.floor(s.experience / 50);
        const potentialBoost = Math.floor(newExp / 70) - Math.floor(s.experience / 70);
        return {
          ...s,
          experience: newExp,
          missionsCompleted,
          judgingAbility: Math.min(20, s.judgingAbility + abilityBoost),
          judgingPotential: Math.min(20, s.judgingPotential + potentialBoost),
          assigned: false, // missão concluída, scout livre
        };
      }
      if (activeScoutIds.has(s.id)) {
        // Ganho parcial por semana ativa
        return { ...s, experience: s.experience + 3 };
      }
      return s;
    });
  }

  return {
    updatedKnowledge,
    updatedMissions,
    newInboxMessages,
    newScoutReports,
    updatedScouts,
  };
}

// ============================================================
// GERAÇÃO DE RELATÓRIO DE SCOUT
// ============================================================

/**
 * Gera um ScoutReport baseado no nível de conhecimento e capacidade do olheiro.
 */
export function generateScoutReportForMission(
  player: Player,
  scout: Scout,
  knowledgeLevel: number,
  userTeam: Team,
): ScoutReport {
  const reliability = Math.min(5, Math.max(1, Math.ceil(scout.judgingAbility / 4)));

  // O fuzz é menor quanto maior o conhecimento e a capacidade do olheiro
  const fuzzRange = (val: number) => {
    const spread = Math.max(1, Math.ceil((20 - scout.judgingAbility) / 3) - Math.floor(knowledgeLevel / 30));
    return [Math.max(1, val - spread), Math.min(20, val + spread)] as [number, number];
  };

  // CA/PA estimados com base no conhecimento
  const caEstimate = knowledgeLevel >= 75
    ? player.currentAbility
    : Math.round(player.currentAbility / 10) * 10 + (Math.random() > 0.5 ? 5 : -5);
  const paEstimate = knowledgeLevel >= 75
    ? player.potentialAbility
    : Math.round(player.potentialAbility / 10) * 10 + (Math.random() > 0.5 ? 10 : -10);

  const grade = calculateScoutGrade(caEstimate, paEstimate, userTeam);

  return {
    playerId: player.id,
    playerName: getFullName(player),
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    currentAbility: caEstimate,
    potentialAbility: paEstimate,
    attributesRange: {
      passing: fuzzRange(player.technical.passing),
      technique: fuzzRange(player.technical.technique),
      finishing: fuzzRange(player.technical.finishing),
      speed: fuzzRange(player.physical.speed ?? 10),
      stamina: fuzzRange(player.physical.stamina ?? 10),
    },
    stars: Math.min(5, Math.ceil(paEstimate / 40)),
    reliability,
    grade,
  };
}

// ============================================================
// NOTA DE RECOMENDAÇÃO (A a F)
// ============================================================

/**
 * Calcula a nota do scout baseada na comparação entre o CA/PA estimado do jogador
 * e o nível atual do time (média de CA do elenco ou reputation).
 */
export function calculateScoutGrade(
  estimatedCA: number,
  estimatedPA: number,
  userTeam: Team,
): ScoutReport['grade'] {
  // Média de CA do elenco
  const squadAvgCA = userTeam.squad.length > 0
    ? userTeam.squad.reduce((sum, p) => sum + p.currentAbility, 0) / userTeam.squad.length
    : 100;

  // Score ponderado: 60% CA atual + 40% PA (potencial futuro)
  const playerScore = estimatedCA * 0.6 + estimatedPA * 0.4;
  const ratio = playerScore / squadAvgCA;

  if (ratio >= 1.3) return 'A';
  if (ratio >= 1.15) return 'B';
  if (ratio >= 1.0) return 'C';
  if (ratio >= 0.85) return 'D';
  if (ratio >= 0.7) return 'E';
  return 'F';
}

function getRecommendationText(grade: ScoutReport['grade']): string {
  switch (grade) {
    case 'A': return 'Recomendação: Contratação altamente recomendada. Jogador acima do nível do elenco.';
    case 'B': return 'Recomendação: Boa contratação. Jogador traria qualidade ao plantel.';
    case 'C': return 'Recomendação: Contratação razoável. Jogador no nível do elenco.';
    case 'D': return 'Recomendação: Contratação de risco. Jogador ligeiramente abaixo do nível atual.';
    case 'E': return 'Recomendação: Não recomendado. Jogador abaixo do nível do elenco.';
    case 'F': return 'Recomendação: Não contratar. Jogador muito abaixo do nível do elenco.';
    default: return '';
  }
}

// ============================================================
// DECAIMENTO DE CONHECIMENTO
// ============================================================

/**
 * Aplica decaimento semanal ao conhecimento de jogadores que NÃO estão
 * sendo observados ativamente. Conhecimento alto decai mais rápido.
 * Jogadores na shortlist decaem mais lentamente.
 */
export function decayScoutKnowledge(
  scoutKnowledge: Record<string, number>,
  activeTargetIds: Set<string>,
  shortlistPlayerIds: Set<string>,
): Record<string, number> {
  const updated = { ...scoutKnowledge };
  for (const playerId in updated) {
    if (activeTargetIds.has(playerId)) continue; // não decai se está sendo observado

    const current = updated[playerId];
    if (current <= 0) continue;

    // Decaimento: 2 pontos/semana para conhecimento alto, 1 para médio, 0 para baixo
    // Shortlist reduz decaimento pela metade
    let decay = 0;
    if (current >= 75) decay = 2;
    else if (current >= 25) decay = 1;

    if (shortlistPlayerIds.has(playerId)) decay = Math.floor(decay / 2);

    if (decay > 0) {
      updated[playerId] = Math.max(0, current - decay);
    }
  }
  return updated;
}

// ============================================================
// RECOMENDAÇÕES AUTOMÁTICAS DE SCOUTS
// ============================================================

/**
 * Gera recomendações automáticas baseadas nas necessidades do elenco.
 * Identifica a posição mais fraca do time e busca jogadores que seriam upgrades.
 * Usa o melhor olheiro disponível para estimar CA/PA.
 */
export function generateScoutRecommendations(
  userTeam: Team,
  allTeams: Team[],
  currentWeek: number,
  existingRecommendationIds: Set<string>,
  scoutKnowledge: Record<string, number>,
): ScoutRecommendation[] {
  const recommendations: ScoutRecommendation[] = [];
  if (!userTeam.scouts || userTeam.scouts.length === 0) return recommendations;

  // Identificar posição mais fraca do elenco
  const positionAvgCA: Record<string, { sum: number; count: number }> = {};
  for (const p of userTeam.squad) {
    if (!positionAvgCA[p.position]) positionAvgCA[p.position] = { sum: 0, count: 0 };
    positionAvgCA[p.position].sum += p.currentAbility;
    positionAvgCA[p.position].count++;
  }

  const positionNeeds = Object.entries(positionAvgCA)
    .map(([pos, { sum, count }]) => ({ position: pos, avgCA: sum / count }))
    .sort((a, b) => a.avgCA - b.avgCA);

  if (positionNeeds.length === 0) return recommendations;

  // Focar na posição mais fraca e possivelmente a segunda
  const targetPositions = positionNeeds.slice(0, 2).map(pn => pn.position);
  const weakestAvgCA = positionNeeds[0].avgCA;

  // Melhor olheiro disponível
  const bestScout = userTeam.scouts.reduce((best, s) =>
    !s.assigned && s.judgingAbility > best.judgingAbility ? s : best,
  );

  // Buscar candidatos em outros times
  const candidates: { player: Player; team: Team }[] = [];
  for (const t of allTeams) {
    if (t.id === userTeam.id) continue;
    for (const p of t.squad) {
      if (targetPositions.includes(p.position) && p.currentAbility > weakestAvgCA + 5) {
        candidates.push({ player: p, team: t });
      }
    }
  }

  // Ordenar por CA e pegar top 3
  candidates.sort((a, b) => b.player.currentAbility - a.player.currentAbility);
  const topCandidates = candidates.slice(0, Math.min(5, candidates.length));

  for (const { player, team } of topCandidates) {
    const recId = `rec_${player.id}_${currentWeek}`;
    if (existingRecommendationIds.has(recId)) continue;

    // Estimar CA/PA baseado no conhecimento existente ou usar valores reais com fuzz
    const knowledge = scoutKnowledge[player.id] ?? 0;
    const caEstimate = knowledge >= 75
      ? player.currentAbility
      : Math.round(player.currentAbility / 10) * 10 + (Math.random() > 0.5 ? 5 : -5);
    const paEstimate = knowledge >= 75
      ? player.potentialAbility
      : Math.round(player.potentialAbility / 10) * 10 + (Math.random() > 0.5 ? 10 : -10);

    const grade = calculateScoutGrade(caEstimate, paEstimate, userTeam) ?? 'F';

    // Só recomendar se for pelo menos grau C
    if (grade === 'E' || grade === 'F') continue;

    const reason = player.age < 21
      ? `Jovem promessa na posição ${player.position} com alto potencial. Pode se desenvolver no seu elenco.`
      : player.age > 29
        ? `Veterano experiente em ${player.position} que pode fortalecer o elenco imediatamente.`
        : `Jogador em ${player.position} com CA acima da média do seu elenco nesta posição.`;

    recommendations.push({
      id: recId,
      scoutId: bestScout.id,
      scoutName: bestScout.name,
      playerId: player.id,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      estimatedCA: caEstimate,
      estimatedPA: paEstimate,
      currentTeamName: team.name,
      estimatedValue: player.marketValue,
      reason,
      grade,
      week: currentWeek,
      dismissed: false,
    });
  }

  return recommendations;
}

// ============================================================
// PROCESSAMENTO DE EMPRÉSTIMOS (chamado no advanceWeek)
// ============================================================

/**
 * Processa empréstimos ativos: decrementa semanas restantes,
 * retorna jogadores ao fim do empréstimo e processa cláusulas de compra obrigatória.
 */
export function processLoans(
  activeLoans: import('../../types/game').LoanDeal[],
  teams: import('../../types/game').Team[],
  currentWeek: number,
): {
  updatedLoans: import('../../types/game').LoanDeal[];
  updatedTeams: import('../../types/game').Team[];
  inboxMessages: InboxMessage[];
} {
  const updatedLoans: import('../../types/game').LoanDeal[] = [];
  const updatedTeams = [...teams];
  const inboxMessages: InboxMessage[] = [];

  for (const loan of activeLoans) {
    if (loan.status !== 'active') {
      updatedLoans.push(loan);
      continue;
    }

    const remaining = loan.remainingWeeks - 1;

    if (remaining <= 0) {
      // Empréstimo terminou
      const fromIdx = updatedTeams.findIndex(t => t.id === loan.fromTeamId);
      const toIdx = updatedTeams.findIndex(t => t.id === loan.toTeamId);

      if (fromIdx !== -1 && toIdx !== -1) {
        const player = updatedTeams[toIdx].squad.find(p => p.id === loan.playerId);

        if (loan.buyOptionMandatory && loan.buyOptionFee) {
          // Compra obrigatória — executa automaticamente
          const buyer = { ...updatedTeams[toIdx] };
          if (buyer.budget >= loan.buyOptionFee && player) {
            buyer.budget -= loan.buyOptionFee;
            buyer.wageBill = recalcWageBillFn(buyer);
            updatedTeams[toIdx] = buyer;

            const seller = { ...updatedTeams[fromIdx] };
            seller.budget += loan.buyOptionFee * 0.8;
            seller.wageBill = recalcWageBillFn(seller);
            updatedTeams[fromIdx] = seller;

            updatedLoans.push({ ...loan, remainingWeeks: 0, status: 'bought' });
            inboxMessages.push({
              id: `loan_bought_${loan.id}_${currentWeek}`,
              type: 'news',
              subject: `✅ Compra obrigatória: ${loan.playerName}`,
              body: `${loan.playerName} foi comprado automaticamente por R$ ${loan.buyOptionFee}M ao fim do empréstimo com ${loan.fromTeamName}.`,
              timestamp: Date.now(),
              read: false,
              priority: 'high',
              relatedPlayerId: loan.playerId,
            });
            continue;
          }
        }

        // Retornar jogador ao clube de origem
        if (player) {
          const fromTeam = { ...updatedTeams[fromIdx] };
          fromTeam.squad = [...fromTeam.squad, player];
          fromTeam.wageBill = recalcWageBillFn(fromTeam);
          updatedTeams[fromIdx] = fromTeam;

          const toTeam = { ...updatedTeams[toIdx] };
          toTeam.squad = toTeam.squad.filter(p => p.id !== loan.playerId);
          toTeam.wageBill = recalcWageBillFn(toTeam);
          updatedTeams[toIdx] = toTeam;
        }

        updatedLoans.push({ ...loan, remainingWeeks: 0, status: 'completed' });
        inboxMessages.push({
          id: `loan_end_${loan.id}_${currentWeek}`,
          type: 'news',
          subject: `📋 Empréstimo finalizado: ${loan.playerName}`,
          body: `${loan.playerName} retornou ao ${loan.fromTeamName} ao fim do empréstimo de ${loan.durationWeeks} semanas.`,
          timestamp: Date.now(),
          read: false,
          priority: 'medium',
          relatedPlayerId: loan.playerId,
        });
      }
    } else {
      updatedLoans.push({ ...loan, remainingWeeks: remaining });
    }
  }

  return { updatedLoans, updatedTeams, inboxMessages };
}

// Helper local para evitar import circular
function recalcWageBillFn(team: import('../../types/game').Team): number {
  return team.squad.reduce((sum, p) => sum + p.salary, 0) / 1000;
}
