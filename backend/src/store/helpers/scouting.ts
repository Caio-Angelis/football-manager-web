// Helpers de Scouting — Máscara de atributos, processamento de missões, nota

import type { Player, Team, Scout, ScoutReport, ActiveScoutMission, InboxMessage } from '../../types/game';

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

  const maskedTechnical: any = {};
  for (const key in player.technical) {
    maskedTechnical[key] = maskAttr((player.technical as any)[key]);
  }

  const maskedMental: any = {};
  for (const key in player.mental) {
    maskedMental[key] = maskAttr((player.mental as any)[key]);
  }

  const maskedPhysical: any = {};
  for (const key in player.physical) {
    maskedPhysical[key] = maskAttr((player.physical as any)[key]);
  }

  let maskedGK: any = undefined;
  if (player.goalkeeping) {
    maskedGK = {};
    for (const key in player.goalkeeping) {
      maskedGK[key] = maskAttr((player.goalkeeping as any)[key]);
    }
  }

  // CA/PA também mascarados
  const maskedCA = knowledgeLevel >= 50 ? player.currentAbility : Math.round(player.currentAbility / 20) * 20;
  const maskedPA = knowledgeLevel >= 75 ? player.potentialAbility : Math.round(player.potentialAbility / 20) * 20;

  return {
    ...player,
    technical: maskedTechnical,
    mental: maskedMental,
    physical: maskedPhysical,
    goalkeeping: maskedGK,
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
    },
    {
      id: `scout_${teamId}_2`,
      name: 'Olheiro Júnior',
      judgingAbility: 8 + Math.floor(Math.random() * 4),
      judgingPotential: 7 + Math.floor(Math.random() * 4),
      assigned: false,
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
    return { updatedKnowledge, updatedMissions: missions, newInboxMessages, newScoutReports };
  }

  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam) {
    return { updatedKnowledge, updatedMissions: missions, newInboxMessages, newScoutReports };
  }

  for (const mission of missions) {
    const scout = userTeam.scouts?.find(s => s.id === mission.scoutId);
    if (!scout) {
      // Scout não existe mais, remove missão
      continue;
    }

    // Encontrar jogador alvo em qualquer time
    let targetPlayer: Player | undefined;
    for (const t of teams) {
      targetPlayer = t.squad.find(p => p.id === mission.targetId);
      if (targetPlayer) break;
    }
    if (!targetPlayer) {
      // Jogador não existe mais, remove missão
      continue;
    }

    const currentKnowledge = updatedKnowledge[mission.targetId] ?? 0;

    // Ganho de conhecimento semanal: base 8 + judgingAbility/2
    const knowledgeGain = 8 + Math.floor(scout.judgingAbility / 2);
    const newKnowledge = Math.min(100, currentKnowledge + knowledgeGain);
    updatedKnowledge[mission.targetId] = newKnowledge;

    // Verificar cruzamento de limites
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
          ? `🔍 Relatório Final: ${targetPlayer.name} ${targetPlayer.surname}${gradeText}`
          : `🔍 Relatório Parcial: ${targetPlayer.name} ${targetPlayer.surname}${gradeText}`,
        body: crossed100
          ? `O olheiro ${scout.name} concluiu a observação de ${targetPlayer.name} ${targetPlayer.surname}. CA estimado: ${report.currentAbility}, PA estimado: ${report.potentialAbility}. ${getRecommendationText(report.grade)}`
          : `O olheiro ${scout.name} já tem um conhecimento moderado de ${targetPlayer.name} ${targetPlayer.surname}. CA estimado: ${report.currentAbility}, PA estimado: ${report.potentialAbility}.`,
        timestamp: Date.now(),
        read: false,
        priority: crossed100 ? 'high' : 'medium',
        relatedPlayerId: mission.targetId,
      });
    }

    // Decrementar semanas restantes
    const remaining = mission.weeksAssigned - 1;
    if (remaining > 0 && newKnowledge < 100) {
      updatedMissions.push({ ...mission, weeksAssigned: remaining });
    }
    // Se remaining <= 0 ou knowledge chegou a 100, missão concluída (não adiciona à lista)
  }

  // Liberar olheiros cujas missões terminaram
  const activeScoutIds = new Set(updatedMissions.map(m => m.scoutId));
  // (a atualização do campo `assigned` nos scouts é feita pelo caller via updateTeam)

  return {
    updatedKnowledge,
    updatedMissions,
    newInboxMessages,
    newScoutReports,
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
    playerName: `${player.name} ${player.surname}`,
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
