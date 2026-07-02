// verify_transfer.ts — Verificação Fase 5.3
// Simula a compra do jogador mais caro disponível por um clube grande,
// e verifica se o clube permanece viável (não quebra) ao longo da temporada.
// Compara com o mesmo clube SEM a compra (controle).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { useGameStore } from './src/store/gameStore';
import {
  calculateTicketRevenue,
  calculateSponsorshipRevenue,
  calculateBroadcastingRevenue,
  calculateFacilityCosts,
  calculateStaffCosts,
  weeklyWages,
} from './src/store/helpers/finance';
import type { Team, Player } from './src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEEKS_PER_SEASON = 38;

function findMostExpensivePlayer(teams: Team[], buyerId: string): { player: Player; sellerId: string } | null {
  let best: { player: Player; sellerId: string } | null = null;
  for (const team of teams) {
    if (team.id === buyerId) continue;
    for (const player of team.squad) {
      if (!best || player.marketValue > best.player.marketValue) {
        best = { player, sellerId: team.id };
      }
    }
  }
  return best;
}

function simulateSeason(buyerId: string): { finalBudget: number; minBudget: number; bankrupted: boolean } {
  let currentBudget = useGameStore.getState().teams.find(t => t.id === buyerId)!.budget;
  let minBudget = currentBudget;
  let bankrupted = false;

  for (let week = 1; week <= WEEKS_PER_SEASON; week++) {
    const team = useGameStore.getState().teams.find(t => t.id === buyerId);
    if (!team) break;

    const ticketRevenue = calculateTicketRevenue(team.reputation);
    const sponsorship = calculateSponsorshipRevenue(team.reputation);
    const broadcasting = calculateBroadcastingRevenue(team.reputation);
    const facilityCosts = calculateFacilityCosts(team.facilitiesLevel);
    const staffCosts = calculateStaffCosts(team.staffLevel);
    const wageCost = weeklyWages(team.wageBill);
    const weeklyBalance = ticketRevenue + sponsorship + broadcasting - wageCost - facilityCosts - staffCosts;

    currentBudget = Math.max(-50, currentBudget + weeklyBalance);
    minBudget = Math.min(minBudget, currentBudget);

    if (currentBudget <= -50) {
      bankrupted = true;
      break;
    }

    useGameStore.setState({
      teams: useGameStore.getState().teams.map(t =>
        t.id === buyerId ? { ...t, budget: currentBudget } : t
      ),
    });
  }

  return { finalBudget: currentBudget, minBudget, bankrupted };
}

async function main() {
  // === RUN 1: Without purchase (control) ===
  useGameStore.getState().initGame();
  let teams = useGameStore.getState().teams;

  // Pick the club with the highest budget that has a healthy wage ratio (<80%)
  const candidates = teams
    .map(t => {
      const revenue = calculateTicketRevenue(t.reputation) + calculateSponsorshipRevenue(t.reputation) + calculateBroadcastingRevenue(t.reputation);
      const wageRatio = weeklyWages(t.wageBill) / revenue;
      return { team: t, wageRatio, budget: t.budget };
    })
    .filter(c => c.wageRatio < 0.80)
    .sort((a, b) => b.budget - a.budget);

  if (candidates.length === 0) {
    console.log('No healthy club found! All teams have wage ratio > 80%.');
    process.exit(1);
  }

  const buyer = candidates[0].team;
  const buyerWageRatio = candidates[0].wageRatio;
  console.log(`\n=== Verificação Fase 5.3 — Compra do craque mais caro ===`);
  console.log(`Buyer: ${buyer.name} (rep ${buyer.reputation}, budget R$${buyer.budget.toFixed(1)}M, wage/receita ${(buyerWageRatio * 100).toFixed(1)}%)`);

  // Find the most expensive player across all other teams
  const target = findMostExpensivePlayer(teams, buyer.id);
  if (!target) {
    console.log('No target found!');
    process.exit(1);
  }

  const craque = target.player;
  const sellerId = target.sellerId;
  const seller = teams.find(t => t.id === sellerId)!;
  console.log(`Target: ${craque.name} ${craque.surname} (CA ${craque.currentAbility}, marketValue R$${craque.marketValue}M, salary R$${craque.salary}K/sem)`);
  console.log(`Seller: ${seller.name}`);

  const fee = craque.marketValue;
  const transferCostPct = (fee / buyer.budget) * 100;

  // Control: simulate without purchase
  console.log(`\n--- RUN 1: Controle (sem compra) ---`);
  const control = simulateSeason(buyer.id);
  console.log(`Budget final: R$${control.finalBudget.toFixed(1)}M, min: R$${control.minBudget.toFixed(1)}M, quebrou? ${control.bankrupted ? 'SIM' : 'NÃO'}`);

  // === RUN 2: With purchase ===
  useGameStore.getState().initGame();
  teams = useGameStore.getState().teams;
  const buyer2 = teams.find(t => t.id === buyer.id)!;
  const target2 = findMostExpensivePlayer(teams, buyer.id);
  if (!target2) { console.log('No target on run 2!'); process.exit(1); }

  useGameStore.getState().selectTeam(buyer.id);
  console.log(`\n--- RUN 2: Com compra ---`);
  console.log(`Transfer fee: R$${fee}M (${transferCostPct.toFixed(1)}% do budget)`);

  let purchased = false;
  if (buyer2.budget >= fee) {
    const ok = useGameStore.getState().buyPlayer(target2.player.id, target2.sellerId, false);
    if (ok) {
      purchased = true;
      const updatedBuyer = useGameStore.getState().teams.find(t => t.id === buyer.id)!;
      const revenue = calculateTicketRevenue(updatedBuyer.reputation) + calculateSponsorshipRevenue(updatedBuyer.reputation) + calculateBroadcastingRevenue(updatedBuyer.reputation);
      console.log(`✅ Compra executada! Budget após: R$${updatedBuyer.budget.toFixed(1)}M`);
      console.log(`Folha salarial após: R$${updatedBuyer.wageBill.toFixed(2)}M/sem (${(updatedBuyer.wageBill / revenue * 100).toFixed(1)}% da receita)`);
    } else {
      console.log(`❌ Compra falhou!`);
    }
  } else {
    console.log(`⚠ Budget insuficiente para compra à vista (R$${fee}M > R$${buyer2.budget.toFixed(1)}M)`);
  }

  const withPurchase = simulateSeason(buyer.id);
  console.log(`Budget final: R$${withPurchase.finalBudget.toFixed(1)}M, min: R$${withPurchase.minBudget.toFixed(1)}M, quebrou? ${withPurchase.bankrupted ? 'SIM' : 'NÃO'}`);

  // === VERDICT ===
  console.log(`\n=== Veredito ===`);
  console.log(`Custo da transferência: ${transferCostPct.toFixed(1)}% do budget`);
  console.log(`Controle (sem compra): ${control.bankrupted ? 'quebrou' : 'sobreviveu'} (budget final R$${control.finalBudget.toFixed(1)}M)`);
  console.log(`Com compra: ${withPurchase.bankrupted ? 'quebrou' : 'sobreviveu'} (budget final R$${withPurchase.finalBudget.toFixed(1)}M)`);

  let verdict: string;
  if (!purchased) {
    verdict = '⚠ SKIP — não foi possível comprar';
  } else if (transferCostPct < 30) {
    verdict = '⚠ ATENÇÃO — craque custa menos de 30% da verba (barato demais)';
  } else if (withPurchase.bankrupted && !control.bankrupted) {
    verdict = '❌ FALHOU — compra causou quebra que não aconteceria sem ela';
  } else if (withPurchase.bankrupted && control.bankrupted) {
    verdict = '⚠ INCONCLUSIVO — clube quebraria mesmo sem comprar (folha pré-existente alta)';
  } else {
    const delta = control.finalBudget - withPurchase.finalBudget;
    verdict = `✅ PASSOU — craque custa ${transferCostPct.toFixed(0)}% da verba, clube não quebra. Impacto no caixa final: R$${delta.toFixed(1)}M`;
  }
  console.log(verdict);

  // Write report
  const report = [
    '=== Verificação Fase 5.3 — Compra do Craque Mais Caro ===',
    `Data: ${new Date().toISOString()}`,
    '',
    `Comprador: ${buyer.name} (rep ${buyer.reputation})`,
    `Alvo: ${craque.name} ${craque.surname} (CA ${craque.currentAbility})`,
    `Valor de mercado: R$${craque.marketValue}M`,
    `Budget inicial: R$${buyer.budget.toFixed(1)}M`,
    `Custo da transferência: R$${fee}M (${transferCostPct.toFixed(1)}% do budget)`,
    '',
    `Controle (sem compra): ${control.bankrupted ? 'quebrou' : 'sobreviveu'} (R$${control.finalBudget.toFixed(1)}M)`,
    `Com compra: ${withPurchase.bankrupted ? 'quebrou' : 'sobreviveu'} (R$${withPurchase.finalBudget.toFixed(1)}M)`,
    `Veredito: ${verdict}`,
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, 'verify_transfer_report.txt'), report);
  console.log(`\nRelatório salvo: backend/verify_transfer_report.txt`);
}

main().catch(console.error);
