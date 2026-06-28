// AI Manager — Rotina semanal de decisões dos clubes controlados pela IA
// Os 19 clubes negociam entre si, ajustam táticas baseadas na tabela e renovam contratos.

import type { Team, Player, LeagueStandings, InboxMessage, CompletedTransfer, FormResult } from '../../types/game';
import { getFullName } from '../../utils/playerName';
import { recalcWageBill } from './transfer';

// ============================================================
// TIPOS AUXILIARES
// ============================================================

export interface AIWeeklyResult {
  teams: Team[];
  inboxMessages: InboxMessage[];
  completedTransfers: CompletedTransfer[];
}

interface SquadNeed {
  position: string;
  avgCA: number;
  count: number;
}

// ============================================================
// JANELAS DE TRANSFERÊNCIA
// ============================================================

function isTransferWindow(week: number): boolean {
  // Janela de verão: semanas 1-12 | Janela de inverno: semanas 20-26
  return (week >= 1 && week <= 12) || (week >= 20 && week <= 26);
}

// ============================================================
// ANÁLISE DE ELenco
// ============================================================

function analyzeSquadNeeds(team: Team): SquadNeed[] {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  const needs: SquadNeed[] = [];

  for (const pos of positions) {
    const playersInPos = team.squad.filter(p => p.position === pos);
    if (playersInPos.length === 0) {
      needs.push({ position: pos, avgCA: 0, count: 0 });
      continue;
    }
    const avgCA = playersInPos.reduce((s, p) => s + p.currentAbility, 0) / playersInPos.length;
    needs.push({ position: pos, avgCA, count: playersInPos.length });
  }

  // Ordenar por maior necessidade (menor avgCA primeiro, depois menor count)
  needs.sort((a, b) => {
    const aScore = a.avgCA * 0.7 + Math.min(a.count, 4) * 10;
    const bScore = b.avgCA * 0.7 + Math.min(b.count, 4) * 10;
    return aScore - bScore;
  });

  return needs;
}

function getWeakestPosition(team: Team): SquadNeed | null {
  const needs = analyzeSquadNeeds(team);
  // Ignorar GK se já tem pelo menos 2
  const fieldNeeds = needs.filter(n => !(n.position === 'GK' && n.count >= 2));
  return fieldNeeds[0] || null;
}

// ============================================================
// TRANSFERÊNCIAS AI-vs-AI
// ============================================================

function processAITransfers(
  teams: Team[],
  standings: LeagueStandings[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; completedTransfers: CompletedTransfer[]; inboxMessages: InboxMessage[] } {
  if (!isTransferWindow(currentWeek)) {
    return { teams, completedTransfers: [], inboxMessages: [] };
  }

  let updatedTeams = [...teams];
  const newTransfers: CompletedTransfer[] = [];
  const inboxMessages: InboxMessage[] = [];
  const standingsMap = new Map(standings.map(s => [s.teamId, s]));

  // Cada time AI tem chance de fazer 1 transferência por semana
  for (let i = 0; i < updatedTeams.length; i++) {
    const buyer = updatedTeams[i];
    if (buyer.id === selectedTeamId) continue; // Usuário não é controlado pela IA

    // Probabilidade de tentar uma compra: baseada em reputação e posição na tabela
    const standing = standingsMap.get(buyer.id);
    const position = standing?.position ?? 10;
    const transferIntent = Math.random();

    // Times maiores e em melhor posição são mais ativos no mercado
    const baseChance = 0.15;
    const reputationBonus = (buyer.reputation / 100) * 0.1;
    const positionBonus = position <= 4 ? 0.1 : position >= 18 ? 0.15 : 0; // Lutam por título ou contra rebaixamento
    const totalChance = baseChance + reputationBonus + positionBonus;

    if (transferIntent > totalChance) continue;

    // Identificar posição mais fraca
    const need = getWeakestPosition(buyer);
    if (!need) continue;

    // Procurar alvos em outros clubes (excluindo o time do usuário)
    const candidates: { teamIdx: number; player: Player; playerIdx: number }[] = [];
    for (let j = 0; j < updatedTeams.length; j++) {
      if (j === i) continue;
      const seller = updatedTeams[j];
      if (seller.id === selectedTeamId) continue; // Não compra do usuário diretamente aqui

      // Vendedor só vende se o jogador for "dispensável" ou a oferta for irresistível
      const playersInPos = seller.squad
        .map((p, idx) => ({ player: p, idx }))
        .filter(({ player }) => player.position === need.position && !player.injury?.active);

      for (const { player, idx } of playersInPos) {
        // O alvo deve ser melhor que a média atual do comprador na posição
        if (player.currentAbility > need.avgCA + 5) {
          candidates.push({ teamIdx: j, player, playerIdx: idx });
        }
      }
    }

    if (candidates.length === 0) continue;

    // Escolher o melhor alvo considerando custo-benefício
    candidates.sort((a, b) => {
      // Preferir jogadores com melhor CA mas que não sejam absurdamente caros
      const aScore = a.player.currentAbility - (a.player.marketValue / Math.max(a.player.marketValue, 1)) * 20;
      const bScore = b.player.currentAbility - (b.player.marketValue / Math.max(b.player.marketValue, 1)) * 20;
      return bScore - aScore;
    });

    // Pegar um dos top 3 candidatos aleatoriamente (para variabilidade)
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const target = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    const seller = updatedTeams[target.teamIdx];
    const player = target.player;
    const fee = player.marketValue;

    // Verificar orçamento do comprador
    if (buyer.budget < fee) continue;

    // Vendedor decide se aceita: se tem profundidade no elenco ou se a oferta é muito boa
    const sellerDepth = seller.squad.filter(p => p.position === need.position).length;
    const sellerKeyPlayer = player.currentAbility > 140;
    let sellerAccepts = false;

    if (sellerKeyPlayer && sellerDepth <= 3) {
      // Não vende craque se não tem reposição — a menos que a oferta seja 150%+ do valor
      sellerAccepts = fee * 1.5 <= buyer.budget && Math.random() < 0.2;
    } else if (sellerDepth > 4) {
      // Tem profundidade — vende mais facilmente
      sellerAccepts = Math.random() < 0.7;
    } else {
      // Caso normal
      sellerAccepts = Math.random() < 0.45;
    }

    // Diferença de reputação influencia: jogadores querem ir para clubes maiores
    const repDiff = buyer.reputation - seller.reputation;
    const playerWilling = Math.random() < (0.5 + repDiff / 200);

    if (!sellerAccepts || !playerWilling) continue;

    // Executar transferência
    const buyerTeam = { ...updatedTeams[i] };
    const sellerTeam = { ...updatedTeams[target.teamIdx] };

    buyerTeam.budget -= fee;
    buyerTeam.squad = [...buyerTeam.squad, { ...player, squadStatus: 'Rotation' }];
    buyerTeam.wageBill = recalcWageBill(buyerTeam);

    sellerTeam.squad = sellerTeam.squad.filter(p => p.id !== player.id);
    sellerTeam.budget += fee * 0.8;
    sellerTeam.wageBill = recalcWageBill(sellerTeam);

    updatedTeams[i] = buyerTeam;
    updatedTeams[target.teamIdx] = sellerTeam;

    const transfer: CompletedTransfer = {
      id: `ai_ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: player.id,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: sellerTeam.id,
      fromTeamName: sellerTeam.name,
      transferFee: fee,
      paymentMethod: 'cash',
      contractWeeks: 52 + Math.floor(Math.random() * 104),
      weeklySalary: Math.round(player.salary * (1.0 + Math.random() * 0.3)),
      transferDate: Date.now(),
      transferWeek: currentWeek,
    };
    newTransfers.push(transfer);

    // Notificar usuário se for uma transferência notável (craque ou entre grandes)
    const isNotable = player.currentAbility > 130 || (buyer.reputation > 70 && seller.reputation > 70);
    if (isNotable) {
      inboxMessages.push({
        id: `ai_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'transfer',
        subject: `📰 ${buyerTeam.name} contrata ${getFullName(player)}`,
        body: `${buyerTeam.name} fechou a contratação de ${getFullName(player)} (${player.position}, ${player.age} anos) vindo do ${sellerTeam.name} por R$ ${fee}M. O jogador tem CA ${player.currentAbility}.`,
        timestamp: Date.now(),
        read: false,
        priority: player.currentAbility > 150 ? 'high' : 'medium',
        relatedTeamId: buyerTeam.id,
      });
    }
  }

  return { teams: updatedTeams, completedTransfers: newTransfers, inboxMessages };
}

// ============================================================
// AJUSTES TÁTICOS BASEADOS NA TABELA
// ============================================================

function processAITactics(
  teams: Team[],
  standings: LeagueStandings[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; inboxMessages: InboxMessage[] } {
  // Roda a cada 4 semanas para não mudar táticas toda semana
  if (currentWeek % 4 !== 0 && currentWeek !== 1) {
    return { teams, inboxMessages: [] };
  }

  let updatedTeams = [...teams];
  const inboxMessages: InboxMessage[] = [];
  const standingsMap = new Map(standings.map(s => [s.teamId, s]));

  const formations = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-2-3-1', '3-4-3'];

  for (let i = 0; i < updatedTeams.length; i++) {
    const team = updatedTeams[i];
    if (team.id === selectedTeamId) continue;

    const standing = standingsMap.get(team.id);
    if (!standing) continue;

    const position = standing.position;
    const totalTeams = standings.length;
    const form = standing.form;
    const recentLosses = form.filter((f: FormResult) => f === 'L').length;
    const recentWins = form.filter((f: FormResult) => f === 'W').length;

    let changed = false;
    let changeDescription = '';

    // ============================================================
    // ZONA DE REBAIXAMENTO — Mentalidade ofensiva, pressão alta
    // ============================================================
    if (position >= totalTeams - 3 && standing.played >= 5) {
      if (team.teamMentality !== 'offensive' && team.teamMentality !== 'very offensive') {
        team.teamMentality = Math.random() < 0.3 ? 'very offensive' : 'offensive';
        team.tactic = 'attacking';
        team.pressIntensity = 'high';
        team.engagementLine = 'high';
        team.defensiveLine = 'high';
        team.tempo = 'fast';
        team.takeMoreRisks = true;
        changed = true;
        changeDescription = `${team.name} adota postura ofensiva na luta contra o rebaixamento`;
      }

      // Demissão do técnico virtual: 5 derrotas nos últimos 5 jogos
      if (recentLosses >= 5 && Math.random() < 0.4) {
        const newFormation = formations[Math.floor(Math.random() * formations.length)];
        team.formation = newFormation;
        team.teamMentality = 'positive';
        team.tactic = 'attacking';
        team.pressIntensity = 'high';
        team.tempo = 'fast';
        changed = true;
        changeDescription = `${team.name} DEMITE o técnico e contrata novo treinador — muda para ${newFormation}`;
      }
    }

    // ============================================================
    // ZONA DE TÍTULO — Mantém equilíbrio, mas pode ser mais ofensivo em casa
    // ============================================================
    else if (position <= 4 && standing.played >= 5) {
      if (recentWins >= 4 && team.teamMentality !== 'offensive') {
        team.teamMentality = 'positive';
        team.tactic = 'attacking';
        changed = true;
        changeDescription = `${team.name} em grande fase — adota mentalidade positiva`;
      } else if (recentLosses >= 3 && team.teamMentality === 'offensive') {
        // Recua um pouco após má sequência
        team.teamMentality = 'balanced';
        team.tactic = 'balanced';
        changed = true;
        changeDescription = `${team.name} recua a mentalidade após ma sequência`;
      }
    }

    // ============================================================
    // ZONA INTERMEDIÁRIA — Ajustes baseados em forma
    // ============================================================
    else if (standing.played >= 8) {
      if (recentLosses >= 4 && Math.random() < 0.3) {
        // Má forma → muda para algo mais defensivo
        team.teamMentality = 'cautious';
        team.tactic = 'defensive';
        team.defensiveLine = 'medium';
        team.engagementLine = 'medium';
        team.pressIntensity = 'medium';
        changed = true;
        changeDescription = `${team.name} adota postura cautelosa após sequência de derrotas`;
      } else if (recentWins >= 4 && team.teamMentality === 'cautious') {
        // Boa forma → volta ao equilíbrio
        team.teamMentality = 'balanced';
        team.tactic = 'balanced';
        changed = true;
        changeDescription = `${team.name} volta ao equilíbrio tático após boa sequência`;
      }
    }

    // ============================================================
    // AJUSTE DE FORMAÇÃO BASEADO EM ELenco (ocasional)
    // ============================================================
    if (!changed && currentWeek % 8 === 0 && Math.random() < 0.15) {
      const fwdCount = team.squad.filter(p => p.position === 'FWD').length;
      const midCount = team.squad.filter(p => p.position === 'MID').length;
      const defCount = team.squad.filter(p => p.position === 'DEF').length;

      let bestFormation = team.formation;
      if (fwdCount >= 4 && midCount >= 6) bestFormation = '4-3-3';
      else if (midCount >= 8) bestFormation = '3-5-2';
      else if (defCount >= 7) bestFormation = '5-3-2';
      else if (fwdCount >= 3 && midCount >= 5) bestFormation = '4-2-3-1';

      if (bestFormation !== team.formation) {
        team.formation = bestFormation;
        changed = true;
        changeDescription = `${team.name} ajusta formação para ${bestFormation} baseado no elenco`;
      }
    }

    if (changed) {
      updatedTeams[i] = { ...team };
      // Notificar apenas demissões de técnico (evento dramático)
      if (changeDescription.includes('DEMITE')) {
        inboxMessages.push({
          id: `ai_tactic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'suggestion',
          subject: `🔥 ${team.name} demite técnico!`,
          body: `${team.name}, atualmente ${position}º na tabela, demitiu o treinador após péssima sequência de resultados. O novo técnico chega com a formação ${team.formation} e mentalidade ${team.teamMentality}.`,
          timestamp: Date.now(),
          read: false,
          priority: 'high',
          relatedTeamId: team.id,
        });
      }
    }
  }

  return { teams: updatedTeams, inboxMessages };
}

// ============================================================
// RENOVAÇÃO DE CONTRATOS DA IA
// ============================================================

function processAIContracts(
  teams: Team[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; inboxMessages: InboxMessage[] } {
  let updatedTeams = [...teams];
  const inboxMessages: InboxMessage[] = [];

  for (let i = 0; i < updatedTeams.length; i++) {
    const team = updatedTeams[i];
    if (team.id === selectedTeamId) continue;

    const playersToRenew = team.squad.filter(p =>
      p.contractEnd <= 10 && p.contractEnd > 0 && p.squadStatus !== 'Excess'
    );

    if (playersToRenew.length === 0) continue;

    let squadChanged = false;
    let renewedSquad = team.squad.map(player => {
      if (player.contractEnd > 10 || player.contractEnd <= 0) return player;

      // Jogadores importantes têm maior chance de renovação
      const isKey = player.squadStatus === 'Key Player' || player.squadStatus === 'Regular Starter';
      const teamPerformingWell = team.leaguePosition <= 8;
      const renewChance = isKey ? 0.85 : teamPerformingWell ? 0.6 : 0.35;

      if (Math.random() < renewChance) {
        squadChanged = true;
        const newSalary = Math.round(player.salary * (1.05 + Math.random() * 0.15));
        return {
          ...player,
          contractEnd: 52 + Math.floor(Math.random() * 104),
          salary: newSalary,
        };
      }
      return player;
    });

    if (squadChanged) {
      updatedTeams[i] = {
        ...team,
        squad: renewedSquad,
        wageBill: recalcWageBill({ ...team, squad: renewedSquad }),
      };
    }
  }

  return { teams: updatedTeams, inboxMessages };
}

// ============================================================
// PONTO DE ENTRADA — Rotina semanal completa da IA
// ============================================================

export function processAIWeeklyDecisions(
  teams: Team[],
  standings: LeagueStandings[],
  currentWeek: number,
  selectedTeamId: string | null,
): AIWeeklyResult {
  let workingTeams = [...teams];
  const allInboxMessages: InboxMessage[] = [];
  const allCompletedTransfers: CompletedTransfer[] = [];

  // 1. Transferências AI-vs-AI
  const transferResult = processAITransfers(workingTeams, standings, currentWeek, selectedTeamId);
  workingTeams = transferResult.teams;
  allInboxMessages.push(...transferResult.inboxMessages);
  allCompletedTransfers.push(...transferResult.completedTransfers);

  // 2. Ajustes táticos baseados na tabela
  const tacticsResult = processAITactics(workingTeams, standings, currentWeek, selectedTeamId);
  workingTeams = tacticsResult.teams;
  allInboxMessages.push(...tacticsResult.inboxMessages);

  // 3. Renovações de contrato
  const contractResult = processAIContracts(workingTeams, currentWeek, selectedTeamId);
  workingTeams = contractResult.teams;
  allInboxMessages.push(...contractResult.inboxMessages);

  return {
    teams: workingTeams,
    inboxMessages: allInboxMessages,
    completedTransfers: allCompletedTransfers,
  };
}
