import type {
  GameStore, Team,
  InstallmentClause, InstallmentPayment, PlayerBonus,
  ContractClause, TransferAgreement, CompletedTransfer,
  CounterOffer, InboxMessage, DeferredTransfer, NegotiationResult,
  ContractNegotiationResult, LoanDeal, BiddingWar,
} from '../../types/game';
import { recalcWageBill, maybeGenerateBiddingWar, reputationGapImpact } from '../helpers/transfer';
import { getFullName } from '../../utils/playerName';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createTransferSlice = (set: Set, get: Get) => ({
  // ============================================================
  // ACORDO CONTRATUAL COMPLETO (Item 7.10)
  // ============================================================

  buyPlayer: (playerId: string, sellerTeamId: string, useInstallments = false) => {
    const state = get();
    if (!state.selectedTeam) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (buyerIdx === -1 || sellerIdx === -1) return false;

    const buyer = { ...state.teams[buyerIdx] };
    const seller = { ...state.teams[sellerIdx] };
    const playerIdx = seller.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return false;

    const player = seller.squad[playerIdx];
    const fee = player.marketValue;

    // Verificar orçamento
    if (!useInstallments && buyer.budget < fee) return false;
    if (useInstallments && buyer.budget < (fee * 0.3)) return false; // Precisa de 30% de entrada

    // Calcular pagamento parcelado se necessário
    let installmentClause: InstallmentClause | undefined;
    if (useInstallments) {
      const downPayment = fee * 0.3;
      const remaining = fee - downPayment;
      const installmentCount = Math.min(4, Math.max(2, Math.ceil(remaining / (fee * 0.1))));
      const installmentAmount = Math.round(remaining / installmentCount * 10) / 10;

      buyer.budget -= downPayment;

      installmentClause = {
        id: `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalAmount: remaining,
        installmentCount,
        installmentAmount,
        payments: [],
        status: 'active',
        direction: 'payable',
      };

      for (let i = 0; i < installmentCount; i++) {
        const amount = i === 0 ? Math.round((remaining - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
        installmentClause.payments.push({
          installmentNumber: i + 1,
          amount,
          dueWeek: state.currentWeek + 1 + i * 4,
          paid: false,
        });
      }
    } else {
      buyer.budget -= fee;
    }

    // Criar cláusula contratual completa (Item 7.10)
    const contractWeeks = 52 + Math.floor(Math.random() * 156); // 1-4 anos
    const weeklySalary = Math.round(player.salary * (1.0 + Math.random() * 0.3)); // Salário 100-130% do atual
    const releaseClause = Math.round(fee * (1.2 + Math.random() * 0.3) * 10) / 10;

    const contract: ContractClause = {
      weeklySalary,
      contractWeeks,
      releaseClause,
      performanceBonuses: Math.random() < 0.4 ? [
        {
          type: 'appearances',
          threshold: 15 + Math.floor(Math.random() * 25),
          bonusAmount: Math.floor(Math.random() * 100) + 25,
        },
      ] : undefined,
    };

    // Criar acordo de transferência completo (Item 7.10)
    const transferAgreement: TransferAgreement = {
      id: `ta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      fromTeamId: sellerTeamId,
      toTeamId: state.selectedTeam,
      transferFee: fee,
      paymentMethod: useInstallments ? 'installments' : 'cash',
      contract,
      agreementDate: Date.now(),
      status: 'active',
      installmentClause,
      history: [
        {
          action: 'created',
          timestamp: Date.now(),
          reason: `Compra de ${player.name} por R$ ${fee}M`,
        },
      ],
    };

    // Mover jogador para o plantel do comprador
    buyer.squad = [...buyer.squad, { ...player, squadStatus: 'Rotation' }];
    buyer.wageBill = recalcWageBill(buyer);
    seller.squad = seller.squad.filter(p => p.id !== playerId);
    seller.budget += fee * 0.8;
    seller.wageBill = recalcWageBill(seller);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = buyer;
    updatedTeams[sellerIdx] = seller;

    // Item 12 - Checklist: Registrar transferência realizada no histórico
    const completedTransfer: CompletedTransfer = {
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: sellerTeamId,
      fromTeamName: seller.name,
      transferFee: fee,
      paymentMethod: useInstallments ? 'installments' : 'cash',
      contractWeeks,
      weeklySalary,
      transferDate: Date.now(),
      transferWeek: state.currentWeek,
    };

    set({
      teams: updatedTeams,
      scoutReports: state.scoutReports.filter(r => r.playerId !== playerId),
      pendingInstallments: useInstallments && installmentClause
        ? [...state.pendingInstallments, installmentClause]
        : state.pendingInstallments,
      transferAgreements: [...state.transferAgreements, transferAgreement],
      completedTransfers: [...state.completedTransfers, completedTransfer],
    });
    return true;
  },

  signFreeAgent: (playerId: string) => {
    const state = get();
    if (!state.selectedTeam) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (buyerIdx === -1) return false;

    const faIdx = (state.freeAgents || []).findIndex(p => p.id === playerId);
    if (faIdx === -1) return false;

    const player = state.freeAgents[faIdx];

    const buyer = { ...state.teams[buyerIdx] };

    // Verificar reputação: jogador de rep alta pode recusar clube de rep baixa
    const repImpact = reputationGapImpact(player.reputation, buyer.reputation);
    if (repImpact.refuseChance > 0 && Math.random() < repImpact.refuseChance) {
      const refuseMsg: InboxMessage = {
        id: `fa_refuse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'news',
        subject: `❌ ${getFullName(player)} recusou a proposta`,
        body: `${getFullName(player)} recusou assinar com o ${buyer.name}. A reputação do clube é muito inferior à dele — ele prefere esperar por uma oportunidade melhor.`,
        timestamp: Date.now(),
        read: false,
        priority: 'medium',
        relatedPlayerId: player.id,
      };
      set({ inbox: [...(state.inbox ?? []), refuseMsg] });
      return false;
    }

    // Agentes livres não têm taxa de transferência — só salário
    // Salário reflete prêmio de reputação (jogador de rep alta em clube pequeno custa mais)
    const contractWeeks = 52 + Math.floor(Math.random() * 156);
    const weeklySalary = Math.round(player.salary * (1.0 + Math.random() * 0.3) * repImpact.salaryMultiplier);

    // Adicionar ao elenco com novo contrato
    buyer.squad = [...buyer.squad, {
      ...player,
      freeAgent: false,
      squadStatus: 'Rotation',
      contractEnd: contractWeeks,
      salary: weeklySalary,
    }];
    buyer.wageBill = recalcWageBill(buyer);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = buyer;

    const completedTransfer: CompletedTransfer = {
      id: `ct_fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: 'free_agent',
      fromTeamName: 'Agente Livre',
      transferFee: 0,
      paymentMethod: 'cash',
      contractWeeks,
      weeklySalary,
      transferDate: Date.now(),
      transferWeek: state.currentWeek,
    };

    set({
      teams: updatedTeams,
      freeAgents: (state.freeAgents || []).filter(p => p.id !== playerId),
      completedTransfers: [...state.completedTransfers, completedTransfer],
    });
    return true;
  },

  makeOffer: (playerId: string, sellerTeamId: string, offerPrice: number, negotiationRound = 1): NegotiationResult => {
    const state = get();
    if (!state.selectedTeam) {
      return { status: 'rejected', marketValue: 0, offerPrice, message: 'Nenhum time selecionado.' };
    }

    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (sellerIdx === -1) {
      return { status: 'rejected', marketValue: 0, offerPrice, message: 'Time vendedor não encontrado.' };
    }

    const seller = state.teams[sellerIdx];
    const player = seller.squad.find(p => p.id === playerId);
    if (!player) {
      return { status: 'rejected', marketValue: 0, offerPrice, message: 'Jogador não encontrado.' };
    }

    const buyer = state.teams.find(t => t.id === state.selectedTeam);
    const marketValue = player.marketValue;
    const ratio = offerPrice / marketValue;

    // === VONTADE DO JOGADOR (0-100) ===
    // Fatores: idade, status no plantel, moral, diferença de reputação entre clubes
    let willingness = 50;
    if (player.age < 21) willingness -= 15; // Jovens preferem ficar
    else if (player.age > 29) willingness += 20; // Veteranos querem rotação
    if (player.squadStatus === 'Excess') willingness += 25;
    else if (player.squadStatus === 'Rotation') willingness += 10;
    else if (player.squadStatus === 'Key Player') willingness -= 15;
    if (player.transferRequest?.active) willingness += 30;
    if (player.morale < 40) willingness += 20;
    else if (player.morale > 75) willingness -= 10;
    if (buyer) {
      const repDiff = buyer.reputation - seller.reputation;
      willingness += repDiff * 0.3; // Mais vontade se for para um clube maior
      // Reputação do jogador vs clube comprador — jogador de rep alta reluta em ir para clube pequeno
      const repImpact = reputationGapImpact(player.reputation, buyer.reputation);
      willingness += repImpact.willingnessAdjust;
    }
    willingness = Math.max(5, Math.min(95, Math.round(willingness)));

    const willingnessLabel = willingness >= 75 ? 'Muito interessado em sair'
      : willingness >= 55 ? 'Interessado em sair'
      : willingness >= 35 ? 'Neutro'
      : willingness >= 15 ? 'Relutante em sair'
      : 'Não quer sair';

    // === TEIMOSIA DO VENDEDOR ===
    const stubbornness = seller.reputation / 100; // 0.01 - 1.0

    // === FADIGA DE NEGOCIAÇÃO ===
    // A cada ronda após a 1ª, o vendedor fica 5% menos flexível
    // Após 4 rondas, pode desistir da negociação
    const maxRounds = 4;
    const fatigueFactor = Math.max(0, (negotiationRound - 1) * 0.05);
    const walkAwayChance = negotiationRound >= 3 ? (negotiationRound - 2) * 0.12 : 0;

    const roll = Math.random();

    // Verificar se o vendedor desiste da negociação
    if (negotiationRound > 1 && roll < walkAwayChance) {
      return {
        status: 'walked_away',
        marketValue,
        offerPrice,
        message: `O ${seller.name} encerrou as negociações. Eles não estão mais interessados em vender ${getFullName(player)} neste momento.`,
        playerWillingness: willingness,
        willingnessLabel,
        negotiationRound,
        maxRounds,
      };
    }

    // === PRÉVIA DE CONTRATO ===
    // Salário estimado reflete prêmio de reputação (jogador de rep alta em clube pequeno custa mais)
    const repSalaryMult = buyer ? reputationGapImpact(player.reputation, buyer.reputation).salaryMultiplier : 1;
    const contractPreview = {
      estimatedSalary: Math.round(player.salary * (1.0 + Math.random() * 0.5) * repSalaryMult),
      estimatedWeeks: 52 + Math.floor(Math.random() * 156),
      estimatedReleaseClause: Math.round(offerPrice * (1.2 + Math.random() * 0.3) * 10) / 10,
    };

    // Helper para construir resultado aceito
    const acceptedResult = (): NegotiationResult => {
      // === GUERRA DE OFERTAS ===
      // Só pode ser gerada na primeira ronda
      if (negotiationRound === 1) {
        const biddingWar = maybeGenerateBiddingWar(player, seller, offerPrice, state.teams, state.selectedTeam!, state.currentWeek);
        if (biddingWar) {
          set({ biddingWars: [...(state.biddingWars ?? []), biddingWar] });
        }
      }
      return {
        status: 'accepted',
        marketValue,
        offerPrice,
        message: `O ${seller.name} aceitou a sua proposta de R$ ${offerPrice}M por ${getFullName(player)}!`,
        playerWillingness: willingness,
        willingnessLabel,
        negotiationRound,
        maxRounds,
        contractPreview,
      };
    };

    // Helper para contra-oferta
    const counteredResult = (mult: number, msg: string): NegotiationResult => {
      const counterPrice = Math.round(marketValue * mult * 10) / 10;
      return {
        status: 'countered',
        marketValue,
        offerPrice,
        counterPrice,
        message: msg,
        playerWillingness: willingness,
        willingnessLabel,
        negotiationRound,
        maxRounds,
        contractPreview,
      };
    };

    // Helper para recusa
    const rejectedResult = (msg: string): NegotiationResult => ({
      status: 'rejected',
      marketValue,
      offerPrice,
      message: msg,
      playerWillingness: willingness,
      willingnessLabel,
      negotiationRound,
      maxRounds,
    });

    // === LÓGICA DE ACEITAÇÃO ===
    // A vontade do jogador reduz a teimosia do vendedor
    const effectiveStubbornness = stubbornness * (1 - (willingness - 50) * 0.004);

    // Oferta >= valor de mercado
    if (ratio >= 1.0) {
      const acceptChance = (0.92 - effectiveStubbornness * 0.07) - fatigueFactor;
      if (roll < acceptChance) return acceptedResult();
      const counterPrice = Math.round(marketValue * (1.05 + Math.random() * 0.1) * 10) / 10;
      return counteredResult(1.05 + Math.random() * 0.1,
        `O ${seller.name} reconhece o valor mas contra-propôs R$ ${counterPrice}M pelo ${getFullName(player)}.`);
    }

    // Oferta entre 90% e 100%
    if (ratio >= 0.9) {
      const acceptChance = (0.55 - effectiveStubbornness * 0.2) - fatigueFactor;
      const counterChance = acceptChance + 0.35;
      if (roll < acceptChance) return acceptedResult();
      if (roll < counterChance) {
        const counterPrice = Math.round(marketValue * (0.95 + Math.random() * 0.1) * 10) / 10;
        return counteredResult(0.95 + Math.random() * 0.1,
          `O ${seller.name} contra-propôs R$ ${counterPrice}M pelo ${getFullName(player)}.`);
      }
      return rejectedResult(`O ${seller.name} recusou a proposta de R$ ${offerPrice}M. Valor de mercado: R$ ${marketValue}M.`);
    }

    // Oferta entre 75% e 90%
    if (ratio >= 0.75) {
      const counterChance = (0.5 - effectiveStubbornness * 0.2) - fatigueFactor;
      if (roll < counterChance) {
        const counterPrice = Math.round(marketValue * (0.95 + Math.random() * 0.1) * 10) / 10;
        return counteredResult(0.95 + Math.random() * 0.1,
          `O ${seller.name} contra-propôs R$ ${counterPrice}M pelo ${getFullName(player)}.`);
      }
      return rejectedResult(`O ${seller.name} recusou a proposta de R$ ${offerPrice}M. Valor de mercado: R$ ${marketValue}M.`);
    }

    // Oferta entre 60% e 75%
    if (ratio >= 0.6) {
      const counterChance = (0.2 - effectiveStubbornness * 0.1) - fatigueFactor;
      if (roll < counterChance) {
        const counterPrice = Math.round(marketValue * (0.9 + Math.random() * 0.1) * 10) / 10;
        return counteredResult(0.9 + Math.random() * 0.1,
          `O ${seller.name} achou a proposta baixa, mas contra-propôs R$ ${counterPrice}M pelo ${getFullName(player)}.`);
      }
      return rejectedResult(`O ${seller.name} recusou a proposta de R$ ${offerPrice}M. Valor de mercado: R$ ${marketValue}M.`);
    }

    // Oferta muito baixa (< 60%)
    return rejectedResult(`O ${seller.name} recusou categoricamente a proposta de R$ ${offerPrice}M. Valor de mercado: R$ ${marketValue}M.`);
  },

  acceptOffer: (playerId: string, sellerTeamId: string, offerPrice: number, agreedSalary: number): boolean => {
    const state = get();
    if (!state.selectedTeam) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (buyerIdx === -1 || sellerIdx === -1) return false;

    const buyer = { ...state.teams[buyerIdx] };
    const seller = { ...state.teams[sellerIdx] };
    const playerIdx = seller.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return false;

    const player = seller.squad[playerIdx];
    const fee = offerPrice;

    if (buyer.budget < fee) return false;

    buyer.budget -= fee;

    const contractWeeks = 52 + Math.floor(Math.random() * 156);
    const weeklySalary = agreedSalary;
    const releaseClause = Math.round(fee * (1.2 + Math.random() * 0.3) * 10) / 10;

    const contract: ContractClause = {
      weeklySalary,
      contractWeeks,
      releaseClause,
      performanceBonuses: Math.random() < 0.4 ? [
        {
          type: 'appearances',
          threshold: 15 + Math.floor(Math.random() * 25),
          bonusAmount: Math.floor(Math.random() * 100) + 25,
        },
      ] : undefined,
    };

    const transferAgreement: TransferAgreement = {
      id: `ta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      fromTeamId: sellerTeamId,
      toTeamId: state.selectedTeam,
      transferFee: fee,
      paymentMethod: 'cash',
      contract,
      agreementDate: Date.now(),
      status: 'active',
      history: [
        {
          action: 'created',
          timestamp: Date.now(),
          reason: `Negociação aceita por R$ ${fee}M`,
        },
      ],
    };

    buyer.squad = [...buyer.squad, { ...player, squadStatus: 'Rotation' }];
    buyer.wageBill = recalcWageBill(buyer);
    seller.squad = seller.squad.filter(p => p.id !== playerId);
    seller.budget += fee * 0.8;
    seller.wageBill = recalcWageBill(seller);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = buyer;
    updatedTeams[sellerIdx] = seller;

    const completedTransfer: CompletedTransfer = {
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: sellerTeamId,
      fromTeamName: seller.name,
      transferFee: fee,
      paymentMethod: 'cash',
      contractWeeks,
      weeklySalary,
      transferDate: Date.now(),
      transferWeek: state.currentWeek,
    };

    set({
      teams: updatedTeams,
      scoutReports: state.scoutReports.filter(r => r.playerId !== playerId),
      transferAgreements: [...state.transferAgreements, transferAgreement],
      completedTransfers: [...state.completedTransfers, completedTransfer],
    });
    return true;
  },

  negotiatePlayerContract: (playerId: string, sellerTeamId: string, offeredSalary: number, negotiationRound: number): ContractNegotiationResult => {
    const state = get();
    if (!state.selectedTeam) {
      return { status: 'rejected', offeredSalary, expectedSalary: 0, message: 'Nenhum time selecionado.', negotiationRound, maxRounds: 4 };
    }

    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (sellerIdx === -1) {
      return { status: 'rejected', offeredSalary, expectedSalary: 0, message: 'Time vendedor não encontrado.', negotiationRound, maxRounds: 4 };
    }

    const seller = state.teams[sellerIdx];
    const player = seller.squad.find(p => p.id === playerId);
    if (!player) {
      return { status: 'rejected', offeredSalary, expectedSalary: 0, message: 'Jogador não encontrado.', negotiationRound, maxRounds: 4 };
    }

    const buyer = state.teams.find(t => t.id === state.selectedTeam);
    const maxRounds = 4;

    // === EXPECTED SALARY ===
    // Base: current salary, adjusted by willingness and reputation
    let willingness = 50;
    if (player.age < 21) willingness -= 15;
    else if (player.age > 29) willingness += 20;
    if (player.squadStatus === 'Excess') willingness += 25;
    else if (player.squadStatus === 'Rotation') willingness += 10;
    else if (player.squadStatus === 'Key Player') willingness -= 15;
    if (player.transferRequest?.active) willingness += 30;
    if (player.morale < 40) willingness += 20;
    else if (player.morale > 75) willingness -= 10;
    if (buyer) {
      const repDiff = buyer.reputation - seller.reputation;
      willingness += repDiff * 0.3;
      // Reputação do jogador vs clube comprador
      const repImpact = reputationGapImpact(player.reputation, buyer.reputation);
      willingness += repImpact.willingnessAdjust;
    }
    willingness = Math.max(5, Math.min(95, Math.round(willingness)));

    // Expected salary: current salary + premium based on willingness
    // High willingness = less demanding (lower expected)
    // Low willingness = more demanding (higher expected)
    // 0.80 (muita vontade de sair, aceita menos) a 1.50 (pouca vontade, pede mais); 1.15 no meio
    const premiumFactor = 1.15 - (willingness - 50) * 0.00778;
    // Prêmio de reputação: jogador de rep alta exige salário muito maior em clube pequeno
    const repSalaryMult = buyer ? reputationGapImpact(player.reputation, buyer.reputation).salaryMultiplier : 1;
    const expectedSalary = Math.round(player.salary * premiumFactor * repSalaryMult);

    // Recusa categórica: se o gap de reputação for muito grande, o jogador pode recusar qualquer proposta
    const repRefuseChance = buyer ? reputationGapImpact(player.reputation, buyer.reputation).refuseChance : 0;
    if (repRefuseChance > 0 && Math.random() < repRefuseChance) {
      return {
        status: 'rejected',
        offeredSalary,
        expectedSalary,
        message: `${getFullName(player)} recusou categoricamente. A reputação do ${buyer!.name} é muito inferior à dele — ele não tem interesse em assinar, independentemente do salário oferecido.`,
        negotiationRound,
        maxRounds,
      };
    }

    const ratio = offeredSalary / expectedSalary;
    const roll = Math.random();

    // Fatigue factor for repeated rounds
    const fatigueFactor = Math.max(0, (negotiationRound - 1) * 0.05);

    // Offer >= expected
    if (ratio >= 1.0) {
      const acceptChance = 0.92 - fatigueFactor;
      if (roll < acceptChance) {
        return {
          status: 'accepted',
          offeredSalary,
          expectedSalary,
          message: `${getFullName(player)} aceitou a proposta de R$ ${offeredSalary}K/semana!`,
          negotiationRound,
          maxRounds,
        };
      }
      const counterSalary = Math.round(expectedSalary * (1.05 + Math.random() * 0.1));
      return {
        status: 'countered',
        offeredSalary,
        expectedSalary,
        counterSalary,
        message: `${getFullName(player)} contra-propôs R$ ${counterSalary}K/semana.`,
        negotiationRound,
        maxRounds,
      };
    }

    // Offer between 80% and 100%
    if (ratio >= 0.8) {
      const acceptChance = 0.5 - fatigueFactor;
      const counterChance = acceptChance + 0.4;
      if (roll < acceptChance) {
        return {
          status: 'accepted',
          offeredSalary,
          expectedSalary,
          message: `${getFullName(player)} aceitou a proposta de R$ ${offeredSalary}K/semana.`,
          negotiationRound,
          maxRounds,
        };
      }
      if (roll < counterChance) {
        const counterSalary = Math.round(expectedSalary * (0.95 + Math.random() * 0.1));
        return {
          status: 'countered',
          offeredSalary,
          expectedSalary,
          counterSalary,
          message: `${getFullName(player)} contra-propôs R$ ${counterSalary}K/semana.`,
          negotiationRound,
          maxRounds,
        };
      }
      return {
        status: 'rejected',
        offeredSalary,
        expectedSalary,
        message: `${getFullName(player)} recusou a proposta de R$ ${offeredSalary}K/semana.`,
        negotiationRound,
        maxRounds,
      };
    }

    // Offer between 60% and 80%
    if (ratio >= 0.6) {
      const counterChance = 0.3 - fatigueFactor;
      if (roll < counterChance) {
        const counterSalary = Math.round(expectedSalary * (0.9 + Math.random() * 0.1));
        return {
          status: 'countered',
          offeredSalary,
          expectedSalary,
          counterSalary,
          message: `${getFullName(player)} achou a proposta baixa, mas contra-propôs R$ ${counterSalary}K/semana.`,
          negotiationRound,
          maxRounds,
        };
      }
      return {
        status: 'rejected',
        offeredSalary,
        expectedSalary,
        message: `${getFullName(player)} recusou a proposta de R$ ${offeredSalary}K/semana. Valor esperado: R$ ${expectedSalary}K/semana.`,
        negotiationRound,
        maxRounds,
      };
    }

    // Offer too low (< 60%)
    return {
      status: 'rejected',
      offeredSalary,
      expectedSalary,
      message: `${getFullName(player)} recusou categoricamente a proposta de R$ ${offeredSalary}K/semana.`,
      negotiationRound,
      maxRounds,
    };
  },

  acceptIncomingTransfer: (playerId: string) => {
    const state = get();
    const offer = state.incomingTransfers.find(o => o.playerId === playerId)
      || state.deferredTransfers.find(o => o.playerId === playerId);
    if (!offer || !state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const userTeam = state.teams[teamIdx];
    const playerIdx = userTeam.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return;

    const player = userTeam.squad[playerIdx];

    // Update user team: remove player, add budget
    const updatedUserTeam: Team = {
      ...userTeam,
      budget: userTeam.budget + offer.offerPrice,
      squad: userTeam.squad.filter(p => p.id !== playerId),
    };
    updatedUserTeam.wageBill = recalcWageBill(updatedUserTeam);

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = updatedUserTeam;

    // Update buyer team
    const buyerIdx = state.teams.findIndex(t => t.id === offer.fromTeam);
    let newPendingInstallments = state.pendingInstallments;
    let newIncomingBonuses = state.incomingBonuses;

    if (buyerIdx !== -1) {
      const buyer = state.teams[buyerIdx];
      let buyerBudget = buyer.budget;

      if (offer.paymentMethod === 'installments' && offer.installmentClause) {
        const firstPaymentAmount = offer.installmentClause.payments[0].amount;
        buyerBudget -= firstPaymentAmount;
        const remainingPayments = offer.installmentClause.payments.slice(1).map(p => ({
          ...p,
        }));
        const remainingTotal = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
        newPendingInstallments = [...state.pendingInstallments, {
          ...offer.installmentClause,
          id: offer.installmentClause.id || `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          totalAmount: remainingTotal,
          installmentCount: remainingPayments.length,
          payments: remainingPayments,
          status: 'active' as const,
          direction: 'receivable' as const,
        }];
        // Seller receives only the first installment upfront
        updatedUserTeam.budget -= offer.offerPrice; // undo full price
        updatedUserTeam.budget += firstPaymentAmount; // add only first installment
      } else {
        buyerBudget -= offer.offerPrice;
      }

      const updatedBuyer: Team = {
        ...buyer,
        budget: buyerBudget,
        squad: [...buyer.squad, { ...player }],
      };
      updatedBuyer.wageBill = recalcWageBill(updatedBuyer);
      updatedTeams[buyerIdx] = updatedBuyer;
    }

    // Add bonuses to incoming bonuses
    if (offer.bonuses && offer.bonuses.length > 0) {
      newIncomingBonuses = [...state.incomingBonuses, ...offer.bonuses];
    }

    // Record completed transfer for selling
    const completedTransfer: CompletedTransfer = {
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: state.selectedTeam,
      fromTeamName: userTeam.name,
      transferFee: offer.offerPrice,
      paymentMethod: offer.paymentMethod ?? 'cash',
      contractWeeks: offer.contractProposal.duration,
      weeklySalary: offer.contractProposal.salary,
      transferDate: Date.now(),
      transferWeek: state.currentWeek,
    };

    set({
      teams: updatedTeams,
      incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId),
      deferredTransfers: state.deferredTransfers.filter(o => o.playerId !== playerId),
      pendingInstallments: newPendingInstallments,
      incomingBonuses: newIncomingBonuses,
      completedTransfers: [...state.completedTransfers, completedTransfer],
    });
  },

  rejectIncomingTransfer: (playerId: string) => {
    const state = get();
    const offer = state.incomingTransfers.find(o => o.playerId === playerId);
    set({ incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId) });

    if (!offer || !state.selectedTeam) return;

    const teamIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    if (teamIdx === -1) return;

    const team = { ...state.teams[teamIdx] };
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return;

    const moraleDrop = player.transferRequest?.active
      ? (player.squadStatus === 'Key Player' || player.squadStatus === 'Excess' ? 18 : 14)
      : (player.squadStatus === 'Key Player' ? 15 : 10);
    const mateDrop = player.transferRequest?.active ? 8 : 5;
    const updatedSquad = team.squad.map(p => {
      if (p.id === playerId) {
        return { ...p, morale: Math.max(0, p.morale - moraleDrop) };
      }
      if (player.teamMates?.includes(p.id) && p.morale > 30) {
        return { ...p, morale: Math.max(0, p.morale - mateDrop) };
      }
      // Pedido ativo: mesmo grupo social também sofre ao ver a oferta rejeitada
      if (player.transferRequest?.active && player.socialGroup && p.socialGroup === player.socialGroup && p.id !== playerId) {
        return { ...p, morale: Math.max(0, p.morale - 4) };
      }
      return p;
    });

    const updatedTeams = [...state.teams];
    updatedTeams[teamIdx] = { ...team, squad: updatedSquad };
    set({ teams: updatedTeams });
  },

  deferTransfer: (playerId: string) => {
    const state = get();
    const offer = state.incomingTransfers.find(o => o.playerId === playerId);
    if (!offer) return;

    const deferred: DeferredTransfer = {
      ...offer,
      deferredAt: Date.now(),
      deferredWeek: state.currentWeek,
    };

    set({
      incomingTransfers: state.incomingTransfers.filter(o => o.playerId !== playerId),
      deferredTransfers: [...state.deferredTransfers, deferred],
    });
  },

  reinstateDeferredTransfer: (playerId: string) => {
    const state = get();
    const offer = state.deferredTransfers.find(o => o.playerId === playerId);
    if (!offer) return;

    set({
      incomingTransfers: [...state.incomingTransfers, offer],
      deferredTransfers: state.deferredTransfers.filter(o => o.playerId !== playerId),
    });
  },

  rejectDeferredTransfer: (playerId: string) => {
    const state = get();
    set({
      deferredTransfers: state.deferredTransfers.filter(o => o.playerId !== playerId),
    });
  },

  negotiateCounterOffer: (playerId: string) => {
    const state = get();
    const offer = state.incomingTransfers.find(o => o.playerId === playerId)
      || state.deferredTransfers.find(o => o.playerId === playerId);
    if (!offer || !state.selectedTeam) return false;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return false;

    // E-13: Counter-offer as SELLER should ask for MORE, not less. Invert sign.
    const reduction = 0.2 + Math.random() * 0.1;
    const counterPrice = Math.round(offer.offerPrice * (1 + reduction) * 10) / 10;

    // Determine payment method
    const paymentMethod: 'cash' | 'installments' = Math.random() < 0.6 ? 'cash' : 'installments';
    let installmentClause: InstallmentClause | undefined;
    let bonuses: PlayerBonus[] | undefined;

    if (paymentMethod === 'installments' && counterPrice > 8) {
      const installmentCount = Math.min(6, Math.max(3, Math.ceil(counterPrice / 4) + 1));
      const installmentAmount = Math.round(counterPrice / installmentCount * 10) / 10;

      installmentClause = {
        id: `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalAmount: counterPrice,
        installmentCount,
        installmentAmount,
        payments: [],
        status: 'active',
        direction: 'receivable',
      };

      for (let i = 0; i < installmentCount; i++) {
        const amount = i === 0 ? Math.round((counterPrice - installmentAmount * (installmentCount - 1)) * 10) / 10 : installmentAmount;
        installmentClause.payments.push({
          installmentNumber: i + 1,
          amount,
          dueWeek: state.currentWeek + 1 + i * 4,
          paid: false,
        });
      }
    }

    // Generate random bonuses
    if (Math.random() < 0.4) {
      bonuses = [];
      const bonusTypes: PlayerBonus['type'][] = ['goals', 'appearances', 'assists'];
      for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
        bonuses.push({
          id: `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
          playerId: offer.playerId,
          type: bonusTypes[Math.floor(Math.random() * bonusTypes.length)],
          threshold: Math.floor(Math.random() * 30) + 10,
          bonusAmount: Math.floor(Math.random() * 200) + 50,
          triggered: false,
        });
      }
    }

    const newCounterOffer: CounterOffer = {
      originalPlayerId: offer.playerId,
      originalFromTeam: offer.fromTeam,
      counterPrice,
      counterSalary: offer.contractProposal.salary,
      counterDuration: offer.contractProposal.duration,
      counterClause: offer.contractProposal.clause * 0.9,
      status: 'pending',
      createdAt: Date.now(),
      paymentMethod,
      installmentClause,
      bonuses,
    };

    const buyerTeam = state.teams.find(t => t.id === offer.fromTeam);
    const buyerName = buyerTeam ? buyerTeam.name : 'Time interessado';
    const player = team.squad.find(p => p.id === offer.playerId);
    const playerName = player ? getFullName(player) : 'jogador';

    const counterMessage: InboxMessage = {
      id: `msg_co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'news',
      subject: 'Contra-oferta Enviada',
      body: `Você fez uma contra-oferta de R$ ${counterPrice}M para o ${buyerName} por ${playerName}. Aguarde a resposta na próxima semana.`,
      timestamp: Date.now(),
      read: false,
      priority: 'high',
      relatedPlayerId: offer.playerId,
    };

    // E-13: Don't remove the original offer — keep it so the deal survives if the
    // counter-offer is rejected by the AI. The counter-offer is resolved in advanceWeek.
    set({
      counterOffers: [...state.counterOffers, newCounterOffer],
      inbox: [counterMessage, ...state.inbox],
    });

    return true;
  },

  // ============================================================
  // CLÁUSULAS PARCELADAS E BÓNUS
  // ============================================================

  generateInstallmentClause: (totalAmount: number, count: number): InstallmentClause => {
    const installmentAmount = Math.round(totalAmount / count * 10) / 10;
    const payments: InstallmentPayment[] = [];

    for (let i = 0; i < count; i++) {
      payments.push({
        installmentNumber: i + 1,
        amount: i === 0 ? Math.round((totalAmount - installmentAmount * (count - 1)) * 10) / 10 : installmentAmount,
        dueWeek: get().currentWeek + 1 + i * 4, // cada parcela em 4 semanas
        paid: false,
      });
    }

    return {
      id: `ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalAmount,
      installmentCount: count,
      installmentAmount,
      payments,
      status: 'active',
    };
  },

  generatePlayerBonus: (type: PlayerBonus['type'], threshold: number, bonusAmount: number): PlayerBonus => ({
    playerId: '',
    type,
    threshold,
    bonusAmount,
    triggered: false,
  }),

  payInstallment: (installmentId: string) => {
    const state = get();
    // installmentId format: "<clauseId>:<installmentNumber>" or fallback to installmentNumber only
    const sepIdx = installmentId.indexOf(':');
    let clauseId: string | null = null;
    let payNum: string = installmentId;
    if (sepIdx !== -1) {
      clauseId = installmentId.substring(0, sepIdx);
      payNum = installmentId.substring(sepIdx + 1);
    }

    const instIdx = state.pendingInstallments.findIndex(inst =>
      (clauseId ? inst.id === clauseId : true) &&
      inst.payments.some(p => p.installmentNumber.toString() === payNum),
    );
    if (instIdx === -1) return false;

    const installment = state.pendingInstallments[instIdx];
    const paymentIdx = installment.payments.findIndex(p => p.installmentNumber.toString() === payNum);
    if (paymentIdx === -1) return false;
    const payment = installment.payments[paymentIdx];
    if (payment.paid) return false;

    // 'receivable' = usuário RECEBE (vendeu a prazo); 'payable' = usuário PAGA
    const isReceivable = installment.direction === 'receivable';
    const buyerTeam = state.teams.find(t => t.id === state.selectedTeam);
    if (!buyerTeam) return false;
    if (!isReceivable && buyerTeam.budget < payment.amount) return false;

    const updatedPayments = installment.payments.map(p =>
      p.installmentNumber === payment.installmentNumber
        ? { ...p, paid: true, paidWeek: state.currentWeek }
        : p,
    );
    const allPaid = updatedPayments.every(p => p.paid);
    const updatedInstallment: InstallmentClause = {
      ...installment,
      payments: updatedPayments,
      status: allPaid ? 'completed' : installment.status,
    };

    const updatedPendingInstallments = [...state.pendingInstallments];
    updatedPendingInstallments[instIdx] = updatedInstallment;

    set({
      teams: state.teams.map(t =>
        t.id === state.selectedTeam
          ? { ...t, budget: isReceivable ? t.budget + payment.amount : t.budget - payment.amount }
          : t,
      ),
      pendingInstallments: updatedPendingInstallments,
    });

    return true;
  },

  checkBonuses: (playerId?: string) => {
    const state = get();
    const userTeam = state.selectedTeam
      ? state.teams.find(t => t.id === state.selectedTeam)
      : undefined;
    const userStanding = state.selectedTeam
      ? state.leagueTable.find(s => s.teamId === state.selectedTeam)
      : undefined;

    const updatedBonuses = state.incomingBonuses.map(b => {
      if (b.triggered || b.claimed || (playerId && b.playerId !== playerId)) return b;

      const player = state.teams.flatMap(t => t.squad).find(p => p.id === b.playerId);
      if (!player) return b;

      let shouldTrigger = false;
      if (b.type === 'goals') {
        shouldTrigger = (player.seasonGoals ?? 0) >= b.threshold;
      } else if (b.type === 'assists') {
        shouldTrigger = (player.seasonAssists ?? 0) >= b.threshold;
      } else if (b.type === 'appearances') {
        shouldTrigger = (userTeam?.played ?? 0) >= b.threshold;
      } else if (b.type === 'titles') {
        shouldTrigger = (userStanding?.position ?? 99) === 1;
      } else if (b.type === 'performance') {
        shouldTrigger = (player.form ?? 0) >= b.threshold;
      }

      if (shouldTrigger) {
        return { ...b, triggered: true, triggeredWeek: state.currentWeek };
      }
      return b;
    });

    set({ incomingBonuses: updatedBonuses });
  },

  claimBonus: (bonusId: string) => {
    const state = get();
    const bonus = state.incomingBonuses.find(b => (b.id === bonusId || b.playerId === bonusId) && b.triggered && !b.claimed);
    if (!bonus) return;

    const bonusAmountM = bonus.bonusAmount / 1000;

    set({
      incomingBonuses: state.incomingBonuses.map(b =>
        b.id === bonus.id ? { ...b, claimed: true } : b,
      ),
      teams: state.teams.map(t =>
        t.id === state.selectedTeam ? { ...t, budget: t.budget + bonusAmountM } : t,
      ),
    });
  },

  // ============================================================
  // MÉTODOS PARA ACORDOS CONTRATUAIS (Item 7.10)
  // ============================================================

  terminateTransferAgreement: (agreementId: string, reason?: string) => {
    const state = get();
    const agreementIdx = state.transferAgreements.findIndex(a => a.id === agreementId);
    if (agreementIdx === -1) return;

    const agreement = state.transferAgreements[agreementIdx];
    const updatedAgreements = [...state.transferAgreements];
    updatedAgreements[agreementIdx] = {
      ...agreement,
      status: 'terminated',
      history: [
        ...(agreement.history || []),
        {
          action: 'terminated',
          timestamp: Date.now(),
          reason: reason || 'Acordo encerrado pelo usuário',
        },
      ],
    };

    set({ transferAgreements: updatedAgreements });
  },

  getTransferAgreements: (playerId?: string) => {
    const state = get();
    if (playerId) {
      return state.transferAgreements.filter(a => a.playerId === playerId);
    }
    return state.transferAgreements;
  },

  // Item 12 - Checklist: Obter histórico de transferências realizadas
  getCompletedTransfers: () => {
    const state = get();
    return state.completedTransfers;
  },

  // ============================================================
  // SISTEMA DE EMPRÉSTIMOS (LOANS)
  // ============================================================

  loanPlayer: (playerId: string, sellerTeamId: string, durationWeeks: number, loanFee: number, buyOptionFee?: number, buyOptionMandatory = false) => {
    const state = get();
    if (!state.selectedTeam) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (buyerIdx === -1 || sellerIdx === -1) return false;

    const buyer = { ...state.teams[buyerIdx] };
    const seller = { ...state.teams[sellerIdx] };
    const playerIdx = seller.squad.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return false;

    const player = seller.squad[playerIdx];

    if (buyer.budget < loanFee) return false;

    buyer.budget -= loanFee;
    seller.budget += loanFee * 0.8;

    const loanDeal: LoanDeal = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      fromTeamId: sellerTeamId,
      fromTeamName: seller.name,
      toTeamId: state.selectedTeam,
      toTeamName: buyer.name,
      loanFee,
      weeklyWageContribution: 100,
      durationWeeks,
      remainingWeeks: durationWeeks,
      buyOptionFee,
      buyOptionMandatory,
      startDate: Date.now(),
      startWeek: state.currentWeek,
      status: 'active',
    };

    buyer.squad = [...buyer.squad, { ...player, squadStatus: 'Rotation' }];
    buyer.wageBill = recalcWageBill(buyer);
    seller.squad = seller.squad.filter(p => p.id !== playerId);
    seller.wageBill = recalcWageBill(seller);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = buyer;
    updatedTeams[sellerIdx] = seller;

    set({
      teams: updatedTeams,
      activeLoans: [...(state.activeLoans ?? []), loanDeal],
    });

    return true;
  },

  recallLoanedPlayer: (loanId: string) => {
    const state = get();
    const loan = (state.activeLoans ?? []).find(l => l.id === loanId);
    if (!loan || loan.status !== 'active') return;

    const fromIdx = state.teams.findIndex(t => t.id === loan.fromTeamId);
    const toIdx = state.teams.findIndex(t => t.id === loan.toTeamId);
    if (fromIdx === -1 || toIdx === -1) return;

    const player = state.teams[toIdx].squad.find(p => p.id === loan.playerId);
    if (!player) return;

    const fromTeam = { ...state.teams[fromIdx] };
    fromTeam.squad = [...fromTeam.squad, player];
    fromTeam.wageBill = recalcWageBill(fromTeam);

    const toTeam = { ...state.teams[toIdx] };
    toTeam.squad = toTeam.squad.filter(p => p.id !== loan.playerId);
    toTeam.wageBill = recalcWageBill(toTeam);

    const updatedTeams = [...state.teams];
    updatedTeams[fromIdx] = fromTeam;
    updatedTeams[toIdx] = toTeam;

    set({
      teams: updatedTeams,
      activeLoans: (state.activeLoans ?? []).map(l =>
        l.id === loanId ? { ...l, status: 'recalled' as const, remainingWeeks: 0 } : l,
      ),
    });
  },

  buyLoanedPlayer: (loanId: string) => {
    const state = get();
    const loan = (state.activeLoans ?? []).find(l => l.id === loanId);
    if (!loan || loan.status !== 'active' || !loan.buyOptionFee) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === loan.toTeamId);
    const sellerIdx = state.teams.findIndex(t => t.id === loan.fromTeamId);
    if (buyerIdx === -1 || sellerIdx === -1) return false;

    const buyer = { ...state.teams[buyerIdx] };
    if (buyer.budget < loan.buyOptionFee) return false;

    const seller = { ...state.teams[sellerIdx] };
    buyer.budget -= loan.buyOptionFee;
    seller.budget += loan.buyOptionFee * 0.8;

    const player = buyer.squad.find(p => p.id === loan.playerId);
    if (player) {
      buyer.squad = buyer.squad.map(p =>
        p.id === loan.playerId ? { ...p, squadStatus: 'Rotation' } : p,
      );
    }
    buyer.wageBill = recalcWageBill(buyer);
    seller.wageBill = recalcWageBill(seller);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = buyer;
    updatedTeams[sellerIdx] = seller;

    set({
      teams: updatedTeams,
      activeLoans: (state.activeLoans ?? []).map(l =>
        l.id === loanId ? { ...l, status: 'bought' as const, remainingWeeks: 0 } : l,
      ),
    });

    return true;
  },

  // ============================================================
  // CLÁUSULA DE RESCISÃO (RELEASE CLAUSE)
  // ============================================================

  activateReleaseClause: (playerId: string, sellerTeamId: string) => {
    const state = get();
    if (!state.selectedTeam) return false;

    const buyerIdx = state.teams.findIndex(t => t.id === state.selectedTeam);
    const sellerIdx = state.teams.findIndex(t => t.id === sellerTeamId);
    if (buyerIdx === -1 || sellerIdx === -1) return false;

    const seller = state.teams[sellerIdx];
    const player = seller.squad.find(p => p.id === playerId);
    if (!player) return false;

    const releaseClause = player.contractClause;
    if (!releaseClause || releaseClause <= 0) return false;

    const buyer = state.teams[buyerIdx];
    if (buyer.budget < releaseClause) return false;

    const updatedBuyer = { ...buyer };
    updatedBuyer.budget -= releaseClause;
    updatedBuyer.squad = [...updatedBuyer.squad, { ...player, squadStatus: 'Rotation' }];
    updatedBuyer.wageBill = recalcWageBill(updatedBuyer);

    const updatedSeller = { ...seller };
    updatedSeller.squad = updatedSeller.squad.filter(p => p.id !== playerId);
    updatedSeller.budget += releaseClause * 0.8;
    updatedSeller.wageBill = recalcWageBill(updatedSeller);

    const updatedTeams = [...state.teams];
    updatedTeams[buyerIdx] = updatedBuyer;
    updatedTeams[sellerIdx] = updatedSeller;

    const completedTransfer: CompletedTransfer = {
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: getFullName(player),
      position: player.position,
      age: player.age,
      nationality: player.nationality,
      fromTeamId: sellerTeamId,
      fromTeamName: seller.name,
      transferFee: releaseClause,
      paymentMethod: 'cash',
      contractWeeks: 52 + Math.floor(Math.random() * 156),
      weeklySalary: player.salary,
      transferDate: Date.now(),
      transferWeek: state.currentWeek,
    };

    set({
      teams: updatedTeams,
      completedTransfers: [...state.completedTransfers, completedTransfer],
    });

    return true;
  },

  // ============================================================
  // GUERRA DE OFERTAS (BIDDING WARS)
  // ============================================================

  raiseBid: (biddingWarId: string, newOffer: number) => {
    const state = get();
    const war = (state.biddingWars ?? []).find(w => w.id === biddingWarId);
    if (!war || war.status !== 'active') return false;

    if (newOffer <= war.userOffer) return false;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team || team.budget < newOffer) return false;

    const highestAIOffer = war.aiOffers.length > 0
      ? Math.max(...war.aiOffers.map(o => o.offerPrice))
      : 0;

    set({
      biddingWars: (state.biddingWars ?? []).map(w =>
        w.id === biddingWarId
          ? {
              ...w,
              userOffer: newOffer,
              highestOffer: Math.max(newOffer, highestAIOffer),
              isUserWinning: newOffer >= highestAIOffer,
            }
          : w,
      ),
    });

    return true;
  },

  withdrawBid: (biddingWarId: string) => {
    const state = get();
    const war = (state.biddingWars ?? []).find(w => w.id === biddingWarId);
    if (!war || war.status !== 'active') return;

    set({
      biddingWars: (state.biddingWars ?? []).map(w =>
        w.id === biddingWarId
          ? { ...w, status: 'withdrawn' as const }
          : w,
      ),
    });
  },
});
