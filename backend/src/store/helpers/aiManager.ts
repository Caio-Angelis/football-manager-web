// AI Manager — Rotina semanal de decisões dos clubes controlados pela IA
// Os 19 clubes negociam entre si, ajustam táticas baseadas na tabela e renovam contratos.

import type { Team, Player, LeagueStandings, InboxMessage, CompletedTransfer, FormResult } from '../../types/game';
import { getFullName } from '../../utils/playerName';
import { recalcWageBill, reputationGapImpact } from './transfer';

// ============================================================
// TIPOS AUXILIARES
// ============================================================

export interface AIWeeklyResult {
  teams: Team[];
  inboxMessages: InboxMessage[];
  completedTransfers: CompletedTransfer[];
  newLoans: import('../../types/game').LoanDeal[];
  freeAgents: Player[];
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

  const updatedTeams = [...teams];
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
    // E-30: Dividir pelo orçamento do comprador para que o preço influencie o ranking.
    const buyerBudget = Math.max(buyer.budget, 1);
    candidates.sort((a, b) => {
      const aScore = a.player.currentAbility - (a.player.marketValue / buyerBudget) * 20;
      const bScore = b.player.currentAbility - (b.player.marketValue / buyerBudget) * 20;
      return bScore - aScore;
    });

    // Pegar um dos top 3 candidatos aleatoriamente (para variabilidade)
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const target = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    const seller = updatedTeams[target.teamIdx];
    const player = target.player;
    let fee = player.marketValue;

    // Verificar orçamento do comprador
    if (buyer.budget < fee) continue;

    // Vendedor decide se aceita: se tem profundidade no elenco ou se a oferta é muito boa
    const sellerDepth = seller.squad.filter(p => p.position === need.position).length;
    const sellerKeyPlayer = player.currentAbility > 140;
    let sellerAccepts: boolean;

    if (sellerKeyPlayer && sellerDepth <= 3) {
      // Não vende craque se não tem reposição — e só sai por 150%+ do valor
      const premiumFee = fee * 1.5;
      sellerAccepts = premiumFee <= buyer.budget && Math.random() < 0.2;
      if (sellerAccepts) fee = premiumFee; // craque é pago a 150% do valor de mercado
    } else if (sellerDepth > 4) {
      // Tem profundidade — vende mais facilmente
      sellerAccepts = Math.random() < 0.7;
    } else {
      // Caso normal
      sellerAccepts = Math.random() < 0.45;
    }

    // Diferença de reputação influencia: jogadores querem ir para clubes maiores
    const repDiff = buyer.reputation - seller.reputation;
    // Reputação do jogador vs clube comprador — jogador de rep alta reluta em ir para clube pequeno
    const repImpact = reputationGapImpact(player.reputation, buyer.reputation);
    // Recusa categórica para gaps extremos
    if (repImpact.refuseChance > 0 && Math.random() < repImpact.refuseChance) continue;
    // Base 0.5 + repDiff/200 (clube vs clube) + ajuste de reputação jogador vs clube
    const playerWilling = Math.random() < (0.5 + repDiff / 200 + repImpact.willingnessAdjust / 100);

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
      weeklySalary: Math.round(player.salary * (1.0 + Math.random() * 0.3) * repImpact.salaryMultiplier),
      transferDate: Date.now(),
      transferWeek: currentWeek,
    };
    newTransfers.push(transfer);

    // Notificar usuário se for uma transferência notável (craque ou entre grandes)
    const isNotable = player.currentAbility > 130 || (buyer.reputation > 70 && seller.reputation > 70);
    if (isNotable) {
      inboxMessages.push({
        id: `ai_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news',
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

  const updatedTeams = [...teams];
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
    if (position >= totalTeams - 2 && standing.played >= 5) {
      if (team.teamMentality !== 'offensive' && team.teamMentality !== 'very offensive' && team.tactic !== 'defensive') {
        // Times em luta contra rebaixamento: 50% attacking, 30% balanced, 20% defensive
        const roll = Math.random();
        if (roll < 0.5) {
          team.teamMentality = 'offensive';
          team.tactic = 'attacking';
          team.pressIntensity = 'high';
          team.engagementLine = 'high';
          team.defensiveLine = 'high';
          team.tempo = 'fast';
          team.takeMoreRisks = true;
          changeDescription = `${team.name} adota postura ofensiva na luta contra o rebaixamento`;
        } else if (roll < 0.8) {
          team.teamMentality = 'balanced';
          team.tactic = 'balanced';
          team.pressIntensity = 'medium';
          team.engagementLine = 'medium';
          team.defensiveLine = 'medium';
          team.tempo = 'normal';
          changeDescription = `${team.name} mantém postura equilibrada na luta contra o rebaixamento`;
        } else {
          team.teamMentality = 'cautious';
          team.tactic = 'defensive';
          team.defensiveLine = 'low';
          team.engagementLine = 'low';
          team.pressIntensity = 'low';
          team.tempo = 'slow';
          changeDescription = `${team.name} adota postura defensiva para segurar resultado na luta contra o rebaixamento`;
        }
        changed = true;
      }
    }

    // ============================================================
    // ZONA DE TÍTULO — Mantém equilíbrio, mas pode ser mais ofensivo em casa
    // ============================================================
    else if (position <= 4 && standing.played >= 5) {
      if (recentWins >= 4 && team.teamMentality !== 'offensive' && team.tactic === 'balanced') {
        // Top teams in good form: 60% stay balanced, 40% go attacking
        if (Math.random() < 0.4) {
          team.teamMentality = 'positive';
          team.tactic = 'attacking';
          changed = true;
          changeDescription = `${team.name} em grande fase — adota mentalidade positiva`;
        }
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
      if (recentLosses >= 4 && Math.random() < 0.5) {
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
    // DEMISSÃO DO TÉCNICO — qualquer time com 5 derrotas nos últimos 5 jogos
    // (independente da posição na tabela; sobrepõe o ajuste de zona)
    // ============================================================
    if (recentLosses >= 5 && Math.random() < 0.4) {
      const newFormation = formations[Math.floor(Math.random() * formations.length)];
      team.formation = newFormation;
      const tacticRoll = Math.random();
      if (tacticRoll < 0.4) {
        team.teamMentality = 'positive';
        team.tactic = 'attacking';
        team.pressIntensity = 'high';
        team.tempo = 'fast';
        changeDescription = `${team.name} DEMITE o técnico e contrata novo treinador — muda para ${newFormation}`;
      } else {
        team.teamMentality = 'balanced';
        team.tactic = 'balanced';
        changeDescription = `${team.name} DEMITE o técnico e contrata novo treinador — muda para ${newFormation} com postura equilibrada`;
      }
      changed = true;
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
  const updatedTeams = [...teams];
  const inboxMessages: InboxMessage[] = [];

  for (let i = 0; i < updatedTeams.length; i++) {
    const team = updatedTeams[i];
    if (team.id === selectedTeamId) continue;

    const playersToRenew = team.squad.filter(p =>
      p.contractEnd <= 10 && p.contractEnd > 0 && p.squadStatus !== 'Excess'
    );

    if (playersToRenew.length === 0) continue;

    let squadChanged = false;
    const renewedSquad = team.squad.map(player => {
      if (player.contractEnd > 10 || player.contractEnd <= 0) return player;

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
// ATIVAÇÃO DE CLÁUSULAS DE RESCISÃO PELA IA
// ============================================================

function processAIReleaseClauses(
  teams: Team[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; completedTransfers: CompletedTransfer[]; inboxMessages: InboxMessage[] } {
  if (!isTransferWindow(currentWeek)) {
    return { teams, completedTransfers: [], inboxMessages: [] };
  }

  const updatedTeams = [...teams];
  const newTransfers: CompletedTransfer[] = [];
  const inboxMessages: InboxMessage[] = [];

  // Cada time AI tem uma pequena chance de ativar cláusula de um jogador
  for (let i = 0; i < updatedTeams.length; i++) {
    const buyer = updatedTeams[i];
    if (buyer.id === selectedTeamId) continue;

    // 5% de chance por semana de tentar ativar cláusula
    if (Math.random() > 0.05) continue;

    const need = getWeakestPosition(buyer);
    if (!need) continue;

    // Procurar jogadores em outros times com cláusula de rescisão acessível
    const targets: { teamIdx: number; player: Player; playerIdx: number }[] = [];
    for (let j = 0; j < updatedTeams.length; j++) {
      if (j === i) continue;
      const seller = updatedTeams[j];

      for (let idx = 0; idx < seller.squad.length; idx++) {
        const player = seller.squad[idx];
        if (player.position !== need.position) continue;
        if (player.injury?.active) continue;

        // Cláusula de rescisão deve existir e ser acessível
        if (player.contractClause > 0 && player.contractClause <= buyer.budget) {
          // O jogador deve ser um upgrade
          if (player.currentAbility > need.avgCA + 5) {
            // Cláusula não deve ser absurdamente alta vs valor de mercado
            if (player.contractClause <= player.marketValue * 1.5) {
              targets.push({ teamIdx: j, player, playerIdx: idx });
            }
          }
        }
      }
    }

    if (targets.length === 0) continue;

    // Escolher o melhor alvo
    targets.sort((a, b) => b.player.currentAbility - a.player.currentAbility);
    const target = targets[0];

    const seller = updatedTeams[target.teamIdx];
    const player = target.player;
    const fee = player.contractClause;

    // Verificar orçamento
    if (buyer.budget < fee) continue;

    // Vontade do jogador
    const repDiff = buyer.reputation - seller.reputation;
    // Reputação do jogador vs clube comprador
    const repImpact = reputationGapImpact(player.reputation, buyer.reputation);
    if (repImpact.refuseChance > 0 && Math.random() < repImpact.refuseChance) continue;
    const playerWilling = Math.random() < (0.5 + repDiff / 200 + repImpact.willingnessAdjust / 100);
    if (!playerWilling) continue;

    // Executar transferência via cláusula
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
      id: `ai_rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      weeklySalary: Math.round(player.salary * (1.0 + Math.random() * 0.3) * repImpact.salaryMultiplier),
      transferDate: Date.now(),
      transferWeek: currentWeek,
    };
    newTransfers.push(transfer);

    // Notificar usuário se for jogador do seu time ou transferência notável
    const isUserPlayer = sellerTeam.id === selectedTeamId;
    const isNotable = player.currentAbility > 130;

    if (isUserPlayer || isNotable) {
      inboxMessages.push({
        id: `ai_rc_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news',
        subject: isUserPlayer
          ? `💸 Cláusula ativada: ${getFullName(player)} saiu do seu time!`
          : `📰 ${buyerTeam.name} ativou cláusula de ${getFullName(player)}`,
        body: isUserPlayer
          ? `${buyerTeam.name} pagou R$ ${fee}M pela cláusula de rescisão de ${getFullName(player)}. O jogador deixou o ${sellerTeam.name} contra a sua vontade.`
          : `${buyerTeam.name} pagou R$ ${fee}M pela cláusula de rescisão de ${getFullName(player)} (${player.position}, ${player.age} anos) do ${sellerTeam.name}.`,
        timestamp: Date.now(),
        read: false,
        priority: isUserPlayer ? 'high' : 'medium',
        relatedTeamId: buyerTeam.id,
        relatedPlayerId: isUserPlayer ? player.id : undefined,
      });
    }
  }

  return { teams: updatedTeams, completedTransfers: newTransfers, inboxMessages };
}

// ============================================================
// EMPRÉSTIMOS AI-vs-AI
// ============================================================

function processAILoans(
  teams: Team[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; inboxMessages: InboxMessage[]; newLoans: import('../../types/game').LoanDeal[] } {
  if (!isTransferWindow(currentWeek)) {
    return { teams, inboxMessages: [], newLoans: [] };
  }

  const updatedTeams = [...teams];
  const inboxMessages: InboxMessage[] = [];
  const newLoans: import('../../types/game').LoanDeal[] = [];

  for (let i = 0; i < updatedTeams.length; i++) {
    const borrower = updatedTeams[i];
    if (borrower.id === selectedTeamId) continue;

    // 8% de chance de tentar empréstimo
    if (Math.random() > 0.08) continue;

    const need = getWeakestPosition(borrower);
    if (!need) continue;

    // Procurar jogadores "Excess" ou "Young Talent" em outros times para emprestar
    const targets: { teamIdx: number; player: Player }[] = [];
    for (let j = 0; j < updatedTeams.length; j++) {
      if (j === i) continue;
      const lender = updatedTeams[j];
      if (lender.id === selectedTeamId) continue;

      for (const player of lender.squad) {
        if (player.position !== need.position) continue;
        if (player.injury?.active) continue;
        // Emprestar jogadores excedentes ou jovens talentos
        if (player.squadStatus === 'Excess' || player.squadStatus === 'Young Talent') {
          if (player.currentAbility >= need.avgCA - 5) {
            targets.push({ teamIdx: j, player });
          }
        }
      }
    }

    if (targets.length === 0) continue;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const lender = updatedTeams[target.teamIdx];
    const player = target.player;

    // Taxa de empréstimo: 5-15% do valor de mercado
    const loanFee = Math.round(player.marketValue * (0.05 + Math.random() * 0.1) * 10) / 10;
    if (borrower.budget < loanFee) continue;

    // Duração: 16-26 semanas (resto da temporada ou metade)
    const durationWeeks = 16 + Math.floor(Math.random() * 10);

    // Cláusula de compra opcional: 50% de chance, 110-130% do valor de mercado
    const hasBuyOption = Math.random() < 0.5;
    const buyOptionFee = hasBuyOption
      ? Math.round(player.marketValue * (1.1 + Math.random() * 0.2) * 10) / 10
      : undefined;

    const loanDeal: import('../../types/game').LoanDeal = {
      id: `ai_loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: player.id,
      playerName: getFullName(player),
      fromTeamId: lender.id,
      fromTeamName: lender.name,
      toTeamId: borrower.id,
      toTeamName: borrower.name,
      loanFee,
      weeklyWageContribution: 50 + Math.floor(Math.random() * 50), // 50-100%
      durationWeeks,
      remainingWeeks: durationWeeks,
      buyOptionFee,
      buyOptionMandatory: false,
      startDate: Date.now(),
      startWeek: currentWeek,
      status: 'active',
    };

    // Executar empréstimo
    const borrowerTeam = { ...updatedTeams[i] };
    const lenderTeam = { ...updatedTeams[target.teamIdx] };

    borrowerTeam.budget -= loanFee;
    borrowerTeam.squad = [...borrowerTeam.squad, { ...player, squadStatus: 'Rotation' }];
    borrowerTeam.wageBill = recalcWageBill(borrowerTeam);

    lenderTeam.squad = lenderTeam.squad.filter(p => p.id !== player.id);
    lenderTeam.budget += loanFee;
    lenderTeam.wageBill = recalcWageBill(lenderTeam);

    updatedTeams[i] = borrowerTeam;
    updatedTeams[target.teamIdx] = lenderTeam;

    newLoans.push(loanDeal);

    // Notificar se for notável
    if (player.currentAbility > 120) {
      inboxMessages.push({
        id: `ai_loan_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news',
        subject: `📋 ${borrowerTeam.name} empresta ${getFullName(player)}`,
        body: `${borrowerTeam.name} contratou ${getFullName(player)} (${player.position}, ${player.age} anos) por empréstimo de ${lenderTeam.name}. Taxa: R$ ${loanFee}M. Duração: ${durationWeeks} semanas.${hasBuyOption ? ` Cláusula de compra: R$ ${buyOptionFee}M.` : ''}`,
        timestamp: Date.now(),
        read: false,
        priority: 'low',
        relatedTeamId: borrowerTeam.id,
      });
    }
  }

  return { teams: updatedTeams, inboxMessages, newLoans };
}

// ============================================================
// ASSINATURA DE AGENTES LIVRES PELA IA
// ============================================================

function processAIFreeAgentSignings(
  teams: Team[],
  freeAgents: Player[],
  currentWeek: number,
  selectedTeamId: string | null,
): { teams: Team[]; freeAgents: Player[]; completedTransfers: CompletedTransfer[]; inboxMessages: InboxMessage[] } {
  if (!isTransferWindow(currentWeek) || freeAgents.length === 0) {
    return { teams, freeAgents, completedTransfers: [], inboxMessages: [] };
  }

  const updatedTeams = [...teams];
  let remainingFreeAgents = [...freeAgents];
  const newTransfers: CompletedTransfer[] = [];
  const inboxMessages: InboxMessage[] = [];

  for (let i = 0; i < updatedTeams.length; i++) {
    const team = updatedTeams[i];
    if (team.id === selectedTeamId) continue;

    // Probabilidade de tentar assinar um agente livre
    if (Math.random() > 0.2) continue;

    // Verificar se tem espaço no elenco (máximo 30 jogadores)
    if (team.squad.length >= 30) continue;

    // Identificar posição mais fraca
    const need = getWeakestPosition(team);
    if (!need) continue;

    // Procurar agentes livres que preencham a necessidade
    const candidates = remainingFreeAgents
      .filter(p => p.position === need.position && !p.injury?.active)
      .filter(p => p.currentAbility > need.avgCA - 5);

    if (candidates.length === 0) continue;

    // Escolher o melhor candidato
    candidates.sort((a, b) => b.currentAbility - a.currentAbility);
    const target = candidates[0];

    // Verificar reputação: jogador de rep alta pode recusar clube de rep baixa
    const repImpact = reputationGapImpact(target.reputation, team.reputation);
    if (repImpact.refuseChance > 0 && Math.random() < repImpact.refuseChance) continue;

    // Verificar se o time pode pagar o salário (com prêmio de reputação)
    const newSalary = Math.round(target.salary * (1.0 + Math.random() * 0.3) * repImpact.salaryMultiplier);
    const newWageBill = recalcWageBill({ ...team, squad: [...team.squad, target] });
    if (newWageBill > team.budget * 0.5) continue; // Folha salarial não pode exceder 50% do orçamento

    // Executar assinatura
    const contractWeeks = 52 + Math.floor(Math.random() * 104);
    const buyerTeam = { ...updatedTeams[i] };
    buyerTeam.squad = [...buyerTeam.squad, {
      ...target,
      freeAgent: false,
      squadStatus: 'Rotation',
      contractEnd: contractWeeks,
      salary: newSalary,
    }];
    buyerTeam.wageBill = recalcWageBill(buyerTeam);
    updatedTeams[i] = buyerTeam;

    // Remover dos agentes livres
    remainingFreeAgents = remainingFreeAgents.filter(p => p.id !== target.id);

    const transfer: CompletedTransfer = {
      id: `ai_fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: target.id,
      playerName: getFullName(target),
      position: target.position,
      age: target.age,
      nationality: target.nationality,
      fromTeamId: 'free_agent',
      fromTeamName: 'Agente Livre',
      transferFee: 0,
      paymentMethod: 'cash',
      contractWeeks,
      weeklySalary: newSalary,
      transferDate: Date.now(),
      transferWeek: currentWeek,
    };
    newTransfers.push(transfer);

    // Notificar se for jogador notável
    if (target.currentAbility > 120) {
      inboxMessages.push({
        id: `ai_fa_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news',
        subject: `📰 ${buyerTeam.name} contrata agente livre ${getFullName(target)}`,
        body: `${buyerTeam.name} contratou ${getFullName(target)} (${target.position}, ${target.age} anos) como agente livre, sem taxa de transferência. CA: ${target.currentAbility}.`,
        timestamp: Date.now(),
        read: false,
        priority: 'low',
        relatedTeamId: buyerTeam.id,
      });
    }
  }

  return { teams: updatedTeams, freeAgents: remainingFreeAgents, completedTransfers: newTransfers, inboxMessages };
}

// ============================================================
// PONTO DE ENTRADA — Rotina semanal completa da IA
// ============================================================

export function processAIWeeklyDecisions(
  teams: Team[],
  standings: LeagueStandings[],
  currentWeek: number,
  selectedTeamId: string | null,
  freeAgents: Player[] = [],
): AIWeeklyResult {
  let workingTeams = [...teams];
  const allInboxMessages: InboxMessage[] = [];
  const allCompletedTransfers: CompletedTransfer[] = [];

  // 1. Transferências AI-vs-AI
  const transferResult = processAITransfers(workingTeams, standings, currentWeek, selectedTeamId);
  workingTeams = transferResult.teams;
  allInboxMessages.push(...transferResult.inboxMessages);
  allCompletedTransfers.push(...transferResult.completedTransfers);

  // 2. Ativação de cláusulas de rescisão pela IA
  const rcResult = processAIReleaseClauses(workingTeams, currentWeek, selectedTeamId);
  workingTeams = rcResult.teams;
  allInboxMessages.push(...rcResult.inboxMessages);
  allCompletedTransfers.push(...rcResult.completedTransfers);

  // 3. Empréstimos AI-vs-AI
  const loanResult = processAILoans(workingTeams, currentWeek, selectedTeamId);
  workingTeams = loanResult.teams;
  allInboxMessages.push(...loanResult.inboxMessages);
  const allNewLoans = loanResult.newLoans;

  // 4. Ajustes táticos baseados na tabela
  const tacticsResult = processAITactics(workingTeams, standings, currentWeek, selectedTeamId);
  workingTeams = tacticsResult.teams;
  allInboxMessages.push(...tacticsResult.inboxMessages);

  // 5. Renovações de contrato
  const contractResult = processAIContracts(workingTeams, currentWeek, selectedTeamId);
  workingTeams = contractResult.teams;
  allInboxMessages.push(...contractResult.inboxMessages);

  // 6. Assinatura de agentes livres
  const faResult = processAIFreeAgentSignings(workingTeams, freeAgents, currentWeek, selectedTeamId);
  workingTeams = faResult.teams;
  allInboxMessages.push(...faResult.inboxMessages);
  allCompletedTransfers.push(...faResult.completedTransfers);

  return {
    teams: workingTeams,
    inboxMessages: allInboxMessages,
    completedTransfers: allCompletedTransfers,
    newLoans: allNewLoans,
    freeAgents: faResult.freeAgents,
  };
}
