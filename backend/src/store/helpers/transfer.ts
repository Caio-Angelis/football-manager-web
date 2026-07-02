// Helpers de Transferência — Scout, Incoming Transfers e Wage Bill

import type { Player, Team, ScoutReport, IncomingTransfer, InstallmentClause, PlayerBonus, BiddingWar } from '../../types/game';
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

/**
 * Gera ofertas recebidas de forma inteligente:
 * - IA alvo jogadores do usuário baseado em necessidade posicional, forma e reputação
 * - Jogadores em boa forma recebem mais ofertas
 * - Times maiores oferecem por jogadores de maior caliber
 * - Considera cláusula de rescisão do jogador
 */
export function maybeGenerateIncomingTransfer(
  teams: Team[],
  selectedTeamId: string,
  currentWeek: number,
): IncomingTransfer | null {
  if (Math.random() > 0.35) return null;

  const userTeam = teams.find(t => t.id === selectedTeamId);
  if (!userTeam || userTeam.squad.length === 0) return null;

  // === LÓGICA INTELIGENTE DE SELEÇÃO DE ALVO ===
  // 1. Identificar needs dos times AI
  // 2. Encontrar jogadores do usuário que preenchem essas needs
  // 3. Priorizar jogadores em boa forma e com CA alto

  const buyerTeams = teams.filter(t => t.id !== selectedTeamId);
  if (buyerTeams.length === 0) return null;

  // Avaliar cada time AI: qual posição eles mais precisam?
  const buyerNeeds: { team: Team; needPosition: string; needCA: number }[] = [];
  for (const buyer of buyerTeams) {
    const positionAvgCA: Record<string, { sum: number; count: number }> = {};
    for (const p of buyer.squad) {
      if (!positionAvgCA[p.position]) positionAvgCA[p.position] = { sum: 0, count: 0 };
      positionAvgCA[p.position].sum += p.currentAbility;
      positionAvgCA[p.position].count++;
    }
    const needs = Object.entries(positionAvgCA)
      .map(([pos, { sum, count }]) => ({ position: pos, avgCA: sum / count }))
      .sort((a, b) => a.avgCA - b.avgCA);

    if (needs.length > 0) {
      buyerNeeds.push({ team: buyer, needPosition: needs[0].position, needCA: needs[0].avgCA });
    }
  }

  // Para cada need, encontrar jogadores do usuário que seriam upgrades
  const candidates: { player: Player; buyer: Team; upgradeScore: number }[] = [];
  for (const { team: buyer, needPosition, needCA } of buyerNeeds) {
    for (const player of userTeam.squad) {
      if (player.position !== needPosition) continue;
      if (player.injury?.active) continue;

      // Score: quanto o jogador é melhor que a média do comprador na posição
      const caDiff = player.currentAbility - needCA;
      if (caDiff < 5) continue; // só oferece se for um upgrade real

      // Forma aumenta a atratividade
      const formBonus = (player.form - 50) * 0.1;
      // Reputação do comprador vs vendedor afasta interesse se for muito menor
      const repFactor = (buyer.reputation - userTeam.reputation) * 0.2;

      const upgradeScore = caDiff + formBonus + repFactor;
      if (upgradeScore > 0) {
        candidates.push({ player, buyer, upgradeScore });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: oferta aleatória (comportamento original)
    const player = userTeam.squad[Math.floor(Math.random() * userTeam.squad.length)];
    const buyer = buyerTeams[Math.floor(Math.random() * buyerTeams.length)];
    if (!buyer) return null;

    const offerPrice = Math.round(player.marketValue * (0.8 + Math.random() * 0.4) * 10) / 10;
    return buildIncomingTransfer(player, buyer, offerPrice, currentWeek);
  }

  // Ordenar por upgradeScore e pegar um dos top 5 aleatoriamente
  candidates.sort((a, b) => b.upgradeScore - a.upgradeScore);
  const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  // Oferta baseada no valor de mercado, ajustada pela forma e reputação
  const formMultiplier = 1 + (selected.player.form - 50) * 0.003; // ±15%
  const repMultiplier = 1 + (selected.buyer.reputation - userTeam.reputation) * 0.002;
  const basePrice = selected.player.marketValue * formMultiplier * repMultiplier;
  const offerPrice = Math.round(Math.max(basePrice * 0.85, selected.player.marketValue * 0.8) * 10) / 10;

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
): { updatedBiddingWars: BiddingWar[]; inboxMessages: import('../../types/game').InboxMessage[] } {
  const updatedBiddingWars: BiddingWar[] = [];
  const inboxMessages: import('../../types/game').InboxMessage[] = [];

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
