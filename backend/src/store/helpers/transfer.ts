// Helpers de Transferência — Scout, Incoming Transfers, Transfer Requests e Wage Bill

import type { Player, Team, ScoutReport, IncomingTransfer, InstallmentClause, PlayerBonus, BiddingWar, InboxMessage } from '../../types/game';
import { getFullName } from '../../utils/playerName';

export function generateScoutReport(player: Player): ScoutReport {
  const reliability = Math.min(5, Math.floor(Math.random() * 3) + 2);
  const fuzz = (val: number) => {
    const range = Math.max(2, 6 - reliability);
    return [Math.max(1, val - range), Math.min(20, val + range)] as [number, number];
  };

  return {
    playerId: player.id,
    playerName: getFullName(player),
    position: player.position,
    age: player.age,
    nationality: player.nationality,
    currentAbility: player.currentAbility,
    potentialAbility: player.potentialAbility,
    attributesRange: {
      passing: fuzz(player.technical.passing),
      technique: fuzz(player.technical.technique),
      finishing: fuzz(player.technical.finishing),
      speed: fuzz(player.physical.speed ?? 10),
      stamina: fuzz(player.physical.stamina ?? 10),
    },
    stars: Math.min(5, Math.ceil(player.potentialAbility / 40)),
    reliability,
  };
}

// ============================================================
// NECESSIDADE POSICIONAL DA IA (lesões + profundidade)
// ============================================================

interface PositionalCrisis {
  team: Team;
  position: string;
  urgency: number; // 0–1+
  bestAvailableCA: number;
  injuredStarterDays: number;
}

/**
 * Detecta crises posicionais: titular lesionado longo, profundidade fraca, etc.
 * Ex.: Flamengo (rep 88) com atacante titular fora 60 dias → urgency alta em FWD.
 */
export function detectPositionalCrises(team: Team): PositionalCrisis[] {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  const xi = new Set(team.startingXI ?? []);
  const crises: PositionalCrisis[] = [];

  for (const position of positions) {
    const inPos = team.squad.filter(p => p.position === position);
    if (inPos.length === 0) {
      // Elenco real sempre tem as 4 posições; urgência moderada só se o plantel for grande o bastante
      if (team.squad.length >= 15) {
        crises.push({ team, position, urgency: 0.9, bestAvailableCA: 0, injuredStarterDays: 0 });
      }
      continue;
    }

    const injuredStarters = inPos.filter(
      p => p.injury?.active && (xi.has(p.id) || p.squadStatus === 'Key Player' || p.squadStatus === 'Regular Starter'),
    );
    const maxInjuredDays = injuredStarters.reduce(
      (m, p) => Math.max(m, p.injury?.daysRemaining ?? 0),
      0,
    );

    const available = inPos.filter(p => !p.injury?.active);
    const bestAvailableCA = available.length > 0
      ? Math.max(...available.map(p => p.currentAbility))
      : 0;
    const avgAvailableCA = available.length > 0
      ? available.reduce((s, p) => s + p.currentAbility, 0) / available.length
      : 0;

    let urgency = 0;
    // Lesão longa de titular: 30+ dias já dói; 60+ é crise
    if (maxInjuredDays >= 60) urgency += 0.55;
    else if (maxInjuredDays >= 30) urgency += 0.35;
    else if (maxInjuredDays >= 14) urgency += 0.2;

    // Pouca profundidade disponível
    if (available.length <= 1) urgency += 0.35;
    else if (available.length <= 2) urgency += 0.2;

    // Elenco fraco na posição (média baixa)
    if (avgAvailableCA < 110) urgency += 0.15;
    else if (avgAvailableCA < 125) urgency += 0.08;

    // Titular chave lesionado mesmo com reposição fraca
    if (injuredStarters.length > 0 && bestAvailableCA < (injuredStarters[0].currentAbility - 8)) {
      urgency += 0.25;
    }

    if (urgency >= 0.25) {
      crises.push({ team, position, urgency, bestAvailableCA, injuredStarterDays: maxInjuredDays });
    }
  }

  return crises.sort((a, b) => b.urgency - a.urgency);
}

/**
 * Gera ofertas recebidas de forma inteligente (substitui o sorteio de 35%):
 * - IA rastreia crises (titular lesionado, profundidade fraca)
 * - Mira reservas/altos CA do usuário que resolvem a crise
 * - Ofertas agressivas (premium) quando a urgência é alta
 * - Jogadores com transfer request são alvos fáceis (abaixo do mercado)
 */
export function maybeGenerateIncomingTransfer(
  teams: Team[],
  selectedTeamId: string,
  currentWeek: number,
): IncomingTransfer | null {
  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam || userTeam.squad.length === 0) return null;

  const buyerTeams = teams.filter(t => t.id !== selectedTeamId);
  if (buyerTeams.length === 0) return null;

  type Candidate = {
    player: Player;
    buyer: Team;
    score: number;
    urgency: number;
    aggressive: boolean;
  };

  const candidates: Candidate[] = [];

  for (const buyer of buyerTeams) {
    const crises = detectPositionalCrises(buyer);
    // Sem crise clara: ainda pode ter necessidade fraca (média baixa)
    const needs = crises.length > 0
      ? crises
      : (['GK', 'DEF', 'MID', 'FWD'] as const).map(position => {
          const inPos = buyer.squad.filter(p => p.position === position && !p.injury?.active);
          const avg = inPos.length
            ? inPos.reduce((s, p) => s + p.currentAbility, 0) / inPos.length
            : 0;
          return {
            team: buyer,
            position,
            urgency: Math.max(0.1, (130 - avg) / 200),
            bestAvailableCA: inPos.length ? Math.max(...inPos.map(p => p.currentAbility)) : 0,
            injuredStarterDays: 0,
          };
        }).filter(n => n.urgency >= 0.12);

    for (const need of needs) {
      for (const player of userTeam.squad) {
        if (player.position !== need.position) continue;
        if (player.injury?.active) continue;

        const isListed = player.transferRequest?.active || player.squadStatus === 'Excess';
        const caUpgrade = player.currentAbility - need.bestAvailableCA;
        // Sem upgrade e sem lista → ignora (exceto crise extrema)
        if (caUpgrade < 3 && !isListed && need.urgency < 0.45) continue;
        if (caUpgrade < -5 && !isListed) continue;

        // Reserva de alto CA no banco do usuário é o alvo clássico
        const isUserReserve =
          !(userTeam.startingXI ?? []).includes(player.id)
          && (player.squadStatus === 'Rotation' || player.squadStatus === 'Young Talent' || player.squadStatus === 'Excess');
        const reserveBonus = isUserReserve && player.currentAbility >= 125 ? 18 : isUserReserve ? 8 : 0;

        const formBonus = (player.form - 50) * 0.12;
        const repPull = (buyer.reputation - userTeam.reputation) * 0.25;
        const listedBonus = isListed ? 25 : 0;
        const urgencyScore = need.urgency * 40;

        // Orçamento: precisa conseguir pagar
        const discount = player.transferRequest?.askingPriceDiscount ?? 1;
        const estPrice = player.marketValue * discount * (need.urgency >= 0.45 ? 1.2 : 1);
        if (buyer.budget < estPrice * 0.7) continue;

        const score = caUpgrade + reserveBonus + formBonus + repPull + listedBonus + urgencyScore;
        if (score <= 0) continue;

        candidates.push({
          player,
          buyer,
          score,
          urgency: need.urgency,
          aggressive: need.urgency >= 0.4 || (buyer.reputation >= 80 && caUpgrade >= 5),
        });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback raro (~12%): oferta oportunista aleatória
    if (Math.random() > 0.12) return null;
    const listed = userTeam.squad.filter(p => p.transferRequest?.active || p.squadStatus === 'Excess');
    const pool = listed.length > 0 ? listed : userTeam.squad;
    const player = pool[Math.floor(Math.random() * pool.length)];
    const buyer = buyerTeams[Math.floor(Math.random() * buyerTeams.length)];
    if (!buyer || buyer.budget < player.marketValue * 0.5) return null;
    const discount = player.transferRequest?.askingPriceDiscount ?? 1;
    const offerPrice = Math.round(player.marketValue * discount * (0.85 + Math.random() * 0.25) * 10) / 10;
    return buildIncomingTransfer(player, buyer, offerPrice, currentWeek);
  }

  // Chance de oferta escala com o melhor score (não mais 35% fixo)
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const offerChance = Math.min(0.85, 0.18 + best.score / 120 + (best.aggressive ? 0.15 : 0));
  if (Math.random() > offerChance) return null;

  const top = candidates.slice(0, Math.min(5, candidates.length));
  const selected = top[Math.floor(Math.random() * top.length)];

  const discount = selected.player.transferRequest?.askingPriceDiscount ?? 1;
  let priceMult: number;
  if (selected.player.transferRequest?.active) {
    // Jogador pedindo saída: IA baixa a oferta (abaixo do mercado)
    priceMult = discount * (0.9 + Math.random() * 0.1);
  } else if (selected.aggressive) {
    // Crise: proposta agressiva (premium)
    priceMult = 1.15 + Math.min(0.25, selected.urgency * 0.35) + Math.random() * 0.1;
  } else {
    priceMult = 0.9 + Math.random() * 0.25;
  }

  const formMultiplier = 1 + (selected.player.form - 50) * 0.002;
  const offerPrice = Math.round(selected.player.marketValue * priceMult * formMultiplier * 10) / 10;

  return buildIncomingTransfer(selected.player, selected.buyer, offerPrice, currentWeek);
}

function buildIncomingTransfer(
  player: Player,
  buyer: Team,
  offerPrice: number,
  currentWeek: number,
): IncomingTransfer {
  const paymentMethod: 'cash' | 'installments' = Math.random() < 0.6 ? 'cash' : 'installments';
  let installmentClause: InstallmentClause | undefined;
  let bonuses: PlayerBonus[] | undefined;

  if (paymentMethod === 'installments' && offerPrice > 10) {
    const installmentCount = Math.min(6, Math.max(3, Math.floor(offerPrice / 5) + 1));
    const installmentAmount = Math.round(offerPrice / installmentCount * 10) / 10;

    installmentClause = {
      id: `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalAmount: offerPrice,
      installmentCount,
      installmentAmount,
      payments: [],
      status: 'active',
    };

    for (let i = 0; i < installmentCount; i++) {
      const amount = i === 0 ? Math.round((offerPrice - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
      installmentClause.payments.push({
        installmentNumber: i + 1,
        amount,
        dueWeek: currentWeek + 1 + i * 4,
        paid: false,
      });
    }
  }

  if (Math.random() < 0.5) {
    bonuses = [];
    const bonusTypes: PlayerBonus['type'][] = ['goals', 'appearances', 'assists', 'titles'];
    for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
      bonuses.push({
        id: `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
        playerId: player.id,
        type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
        threshold: Math.floor(Math.random() * 30) + 10,
        bonusAmount: Math.floor(Math.random() * 200) + 50,
        triggered: false,
      });
    }
  }

  return {
    playerId: player.id,
    offerPrice,
    fromTeam: buyer.id,
    contractProposal: {
      salary: Math.round(player.salary * 1.1),
      duration: 52 + Math.floor(Math.random() * 104),
      clause: Math.round(player.marketValue * 1.5 * 10) / 10,
    },
    paymentMethod,
    installmentClause,
    bonuses,
  };
}

// ============================================================
// PEDIDOS DE TRANSFERÊNCIA (Transfer Request)
// ============================================================

export interface TransferRequestResult {
  team: Team;
  newRequests: Player[];
  cascadeEvents: { playerId: string; playerName: string; change: number }[];
  inboxMessages: InboxMessage[];
}

/**
 * Jogadores com moral destruída ou promessas quebradas pedem transferência.
 * Pedidos ativos não resolvidos causam cascata social no vestiário.
 */
export function processTransferRequests(
  team: Team,
  currentWeek: number,
): TransferRequestResult {
  const inboxMessages: InboxMessage[] = [];
  const newRequests: Player[] = [];
  const cascadeEvents: TransferRequestResult['cascadeEvents'] = [];

  let squad = team.squad.map(player => {
    // Já tem pedido ativo → cascata semanal se não vendido
    if (player.transferRequest?.active) {
      const weeksOpen = Math.max(0, currentWeek - player.transferRequest.weekRequested);
      const selfDrop = weeksOpen >= 2 ? 3 : 1;
      const updated = {
        ...player,
        morale: Math.max(0, player.morale - selfDrop),
        squadStatus: player.squadStatus === 'Key Player' || player.squadStatus === 'Regular Starter'
          ? 'Excess'
          : player.squadStatus,
      };
      return updated;
    }

    // Disparo: moral muito baixa OU promessas quebradas (marcadas fulfilled após penalidade)
    const brokenPromises = player.promises.filter(p => p.fulfilled && p.deadline <= 0);
    const lowMorale = player.morale < 28;
    const unhappyBench =
      player.morale < 35
      && (player.squadStatus === 'Excess' || !(team.startingXI ?? []).includes(player.id))
      && (player.squadStatus === 'Key Player' || player.squadStatus === 'Regular Starter');

    // Ambition alta + moral baixa acelera o pedido
    const ambitious = (player.hidden?.ambition ?? 3) >= 4 && player.morale < 32;
    const afterBrokenPromise = brokenPromises.length > 0 && player.morale < 40;

    if (!lowMorale && !unhappyBench && !ambitious && !afterBrokenPromise) return player;

    // Chance: moral 20 → ~70%; moral 27 → ~40%; pós-promessa quebrada → +20pp
    let chance = lowMorale
      ? Math.min(0.75, 0.35 + (28 - player.morale) * 0.04)
      : unhappyBench
        ? 0.35
        : afterBrokenPromise
          ? 0.45
          : 0.25;
    if (afterBrokenPromise) chance = Math.min(0.85, chance + 0.2);

    if (Math.random() > chance) return player;

    const reason: 'low_morale' | 'broken_promise' =
      brokenPromises.length > 0 ? 'broken_promise' : 'low_morale';
    // Desconto: quanto pior a moral, mais barato o clube é forçado a vender
    const askingPriceDiscount = Math.max(0.65, Math.min(0.85, 0.7 + player.morale / 500));

    const requested: Player = {
      ...player,
      squadStatus: 'Excess',
      transferRequest: {
        active: true,
        weekRequested: currentWeek,
        reason,
        askingPriceDiscount,
      },
    };
    newRequests.push(requested);
    return requested;
  });

  // Cascata social: pedidos ativos contaminam colegas (teamMates + mesmo grupo)
  const activeRequesters = squad.filter(p => p.transferRequest?.active);
  if (activeRequesters.length > 0) {
    const requesterIds = new Set(activeRequesters.map(p => p.id));
    const allyIds = new Set<string>();
    for (const r of activeRequesters) {
      for (const id of r.teamMates ?? []) allyIds.add(id);
      if (r.socialGroup) {
        for (const p of squad) {
          if (p.socialGroup === r.socialGroup && p.id !== r.id) allyIds.add(p.id);
        }
      }
    }

    squad = squad.map(p => {
      if (requesterIds.has(p.id)) return p;
      if (!allyIds.has(p.id)) return p;
      // Influência: líderes/Key Players pedindo saída doem mais
      const influencer = activeRequesters.find(
        r => (r.teamMates ?? []).includes(p.id) || r.socialGroup === p.socialGroup,
      );
      const severity = influencer?.squadStatus === 'Key Player' ? 6
        : influencer && (influencer.mental?.leadership ?? 0) >= 14 ? 5
        : 3;
      cascadeEvents.push({
        playerId: p.id,
        playerName: getFullName(p),
        change: -severity,
      });
      return { ...p, morale: Math.max(0, p.morale - severity) };
    });
  }

  for (const player of newRequests) {
    const reasonText = player.transferRequest?.reason === 'broken_promise'
      ? 'promessas quebradas e insatisfação acumulada'
      : 'moral destruída no vestiário';
    const discountPct = Math.round((1 - (player.transferRequest?.askingPriceDiscount ?? 0.75)) * 100);
    inboxMessages.push({
      id: `tr_req_${player.id}_${currentWeek}_${Date.now()}`,
      type: 'transfer',
      subject: `🚨 Pedido de transferência: ${getFullName(player)}`,
      body: `${getFullName(player)} veio a público e pediu para ser colocado na lista de transferências (${reasonText}). `
        + `O ambiente no vestiário está contaminado — quanto mais demorar a venda, pior a cascata social. `
        + `O mercado já sabe da situação: espere ofertas ~${discountPct}% abaixo do valor de mercado. `
        + `Recusar propostas ou segurar o jogador agrava a moral dos colegas.`,
      timestamp: Date.now(),
      read: false,
      priority: 'high',
      relatedPlayerId: player.id,
    });
  }

  if (activeRequesters.length > 0 && newRequests.length === 0 && cascadeEvents.length > 0) {
    const names = activeRequesters.map(p => getFullName(p)).join(', ');
    inboxMessages.push({
      id: `tr_cascade_${team.id}_${currentWeek}_${Date.now()}`,
      type: 'news',
      subject: `Vestiário abalado — pedidos de saída pendentes`,
      body: `${names} continua(m) na lista de transferências. Colegas próximos perderam moral esta semana. Resolva as saídas antes que a cascata se espalhe.`,
      timestamp: Date.now(),
      read: false,
      priority: 'medium',
    });
  }

  return {
    team: { ...team, squad },
    newRequests,
    cascadeEvents,
    inboxMessages,
  };
}

export function clearTransferRequest(player: Player): Player {
  if (!player.transferRequest?.active) return player;
  const { transferRequest: _removed, ...rest } = player;
  return { ...rest, transferRequest: undefined };
}

/**
 * Gera uma guerra de ofertas quando o usuário faz uma oferta por um jogador.
 * Outros times AI podem competir pelo mesmo jogador.
 */
export function maybeGenerateBiddingWar(
  player: Player,
  sellerTeam: Team,
  userOffer: number,
  teams: Team[],
  selectedTeamId: string,
  currentWeek: number,
): BiddingWar | null {
  // 30% de chance de gerar guerra de ofertas
  if (Math.random() > 0.3) return null;

  // Encontrar times AI interessados (excluindo usuário e vendedor)
  const interestedTeams = teams.filter(t =>
    t.id !== selectedTeamId &&
    t.id !== sellerTeam.id &&
    t.budget >= player.marketValue * 0.9,
  );

  if (interestedTeams.length === 0) return null;

  // Filtrar por times que precisam da posição do jogador
  const positionNeeds = interestedTeams.filter(team => {
    const posPlayers = team.squad.filter(p => p.position === player.position);
    const avgCA = posPlayers.length > 0
      ? posPlayers.reduce((sum, p) => sum + p.currentAbility, 0) / posPlayers.length
      : 100;
    return player.currentAbility > avgCA + 3;
  });

  if (positionNeeds.length === 0) return null;

  // Gerar ofertas AI (1-3 competidores)
  const numCompetitors = Math.min(positionNeeds.length, Math.floor(Math.random() * 2) + 1);
  const shuffled = [...positionNeeds].sort(() => Math.random() - 0.5);
  const competitors = shuffled.slice(0, numCompetitors);

  const aiOffers = competitors.map(team => ({
    teamId: team.id,
    teamName: team.name,
    offerPrice: Math.round(player.marketValue * (0.9 + Math.random() * 0.2) * 10) / 10,
  }));

  const highestAIOffer = Math.max(...aiOffers.map(o => o.offerPrice));
  const highestOffer = Math.max(userOffer, highestAIOffer);
  const isUserWinning = userOffer >= highestAIOffer;

  return {
    id: `bw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerId: player.id,
    playerName: getFullName(player),
    sellerTeamId: sellerTeam.id,
    sellerTeamName: sellerTeam.name,
    userOffer,
    aiOffers,
    highestOffer,
    isUserWinning,
    round: 1,
    maxRounds: 3,
    status: 'active',
    week: currentWeek,
  };
}

/**
 * Processa guerras de ofertas ativas: IA pode aumentar lances ou desistir.
 */
export function processBiddingWars(
  biddingWars: BiddingWar[],
  teams: Team[],
  selectedTeamId: string,
  currentWeek: number,
): { updatedBiddingWars: BiddingWar[]; inboxMessages: InboxMessage[] } {
  const updatedBiddingWars: BiddingWar[] = [];
  const inboxMessages: InboxMessage[] = [];

  for (const war of biddingWars) {
    if (war.status !== 'active') {
      updatedBiddingWars.push(war);
      continue;
    }

    const newRound = war.round + 1;
    if (newRound > war.maxRounds) {
      // Fim da guerra — maior oferta ganha
      const userWon = war.userOffer >= war.highestOffer;
      updatedBiddingWars.push({
        ...war,
        status: userWon ? 'won' : 'lost',
      });
      inboxMessages.push({
        id: `bw_end_${war.id}_${currentWeek}`,
        type: 'news',
        subject: userWon
          ? `🎉 Você venceu a disputa por ${war.playerName}!`
          : `❌ Você perdeu a disputa por ${war.playerName}`,
        body: userWon
          ? `Sua oferta de R$ ${war.userOffer}M foi a maior. ${war.sellerTeamName} aceitou negociar com você.`
          : `Outro clube ofereceu mais por ${war.playerName}. O ${war.sellerTeamName} preferiu negociar com eles.`,
        timestamp: Date.now(),
        read: false,
        priority: 'high',
        relatedPlayerId: war.playerId,
      });
      continue;
    }

    // IA decide se aumenta o lance ou desiste
    const updatedAIOffers = war.aiOffers.map(offer => {
      const team = teams.find(t => t.id === offer.teamId);
      if (!team) return null;

      // Se a IA está perdendo, 60% de chance de aumentar
      if (offer.offerPrice < war.highestOffer) {
        if (Math.random() < 0.6 && team.budget >= war.highestOffer * 1.1) {
          const newOffer = Math.round(war.highestOffer * (1.05 + Math.random() * 0.1) * 10) / 10;
          return { ...offer, offerPrice: newOffer };
        }
        return null; // desiste
      }
      return offer;
    }).filter((o): o is NonNullable<typeof o> => o !== null);

    const highestAIOffer = updatedAIOffers.length > 0
      ? Math.max(...updatedAIOffers.map(o => o.offerPrice))
      : 0;
    const newHighest = Math.max(war.userOffer, highestAIOffer);
    const userWinning = war.userOffer >= highestAIOffer;

    updatedBiddingWars.push({
      ...war,
      aiOffers: updatedAIOffers,
      highestOffer: newHighest,
      isUserWinning: userWinning,
      round: newRound,
    });

    if (!userWinning && updatedAIOffers.length > 0) {
      inboxMessages.push({
        id: `bw_round_${war.id}_${currentWeek}`,
        type: 'news',
        subject: `⚔️ Disputa por ${war.playerName} — Ronda ${newRound}`,
        body: `Outro clube ofereceu R$ ${highestAIOffer}M por ${war.playerName}. Você precisa aumentar sua oferta para R$ ${Math.round(highestAIOffer * 1.05 * 10) / 10}M ou mais para continuar na disputa.`,
        timestamp: Date.now(),
        read: false,
        priority: 'high',
        relatedPlayerId: war.playerId,
      });
    }
  }

  return { updatedBiddingWars, inboxMessages };
}

export function recalcWageBill(team: Team): number {
  return team.squad.reduce((sum, p) => sum + p.salary, 0) / 1000;
}

/**
 * Impacto da diferença de reputação entre jogador e clube comprador.
 * Um jogador de reputação alta exige muito mais para ir a um clube de reputação baixa.
 *
 * @param playerReputation  Reputação do jogador (1-100)
 * @param clubReputation    Reputação do clube comprador (1-100)
 * @returns willingnessAdjust  Ajuste na vontade do jogador (negativo se clube for menor)
 *          salaryMultiplier    Multiplicador de salário esperado (>1 se clube for menor)
 *          refuseChance        Chance de recusa categórica independente de salário
 */
export function reputationGapImpact(
  playerReputation: number,
  clubReputation: number,
): { willingnessAdjust: number; salaryMultiplier: number; refuseChance: number } {
  const gap = playerReputation - clubReputation; // positivo = jogador maior que o clube

  if (gap <= 0) {
    return { willingnessAdjust: 0, salaryMultiplier: 1, refuseChance: 0 };
  }

  // Vontade: -0.4 por ponto de gap → gap 60 = -24 (muito relutante)
  const willingnessAdjust = -gap * 0.4;

  // Salário: +1.5% por ponto de gap → gap 60 = +90% salário
  const salaryMultiplier = 1 + gap * 0.015;

  // Recusa categórica: só acima de gap 40
  // gap 40 → 0%, gap 60 → 24%, gap 80 → 48%
  const refuseChance = gap > 40 ? (gap - 40) * 0.012 : 0;

  return { willingnessAdjust, salaryMultiplier, refuseChance };
}
