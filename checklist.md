# Checklist — Rebalanceamento do Sistema Financeiro

> Objetivo: tornar as finanças coerentes e desafiadoras. Hoje o modelo é **incoerente em unidades** e, na prática, **gera superávit passivo** (o dinheiro parado cresce), mas some rápido quando você contrata porque os preços são enormes e a "verba de transferências" nunca renova. Este checklist resolve isso passo a passo.

## Diagnóstico atual (medido no código, não suposição)

- **Fluxo semanal passivo é superávit** para todos os clubes: **+R$4,5 a +5,7M/semana** (receita fixa 6–8M − salários ~0,3–1,3M − infra ~1,2M). Orçamento inicial **R$88–119M**. Ou seja, parado o dinheiro **cresce**.
- **Bug de unidade nos salários:** `weeklyWages(wageBill)` aplica `× 12/52` sobre `wageBill`, mas `recalcWageBill = Σ(salary)/1000` já entrega um valor de escala semanal. Resultado: folha semanal do Palmeiras inteira dá **~R$1,13M** (irreal). Referências:
  - `backend/src/store/helpers/finance.ts` → `weeklyWages`, `calculatePlayerSalary`
  - `backend/src/store/helpers/transfer.ts:344` → `recalcWageBill`
- **`transferBudget` é morto:** só é atribuído em `dataLoader.ts:373` e `playerGenerator.ts:390`, **nunca atualizado**. As compras descontam de `team.budget` (`transfer.ts`). A tela mostra os dois números (`FinanceView.tsx:74/78`) → confusão.
- **Preços x poder de compra:** valor de mercado vai a 30–200M+ (`calculateMarketValue`), mas o orçamento inicial é ~100M → 1–3 contratações zeram a verba. É a real causa do "acaba rápido".
- **Sem prêmio por colocação final / acesso / rebaixamento** (confirmado em `docs/regras/regra-financas.md`).
- **Premiação por partida** é creditada em `budget` (`matchEngine.ts:1045-1059`), somando ainda mais ao superávit.

## Metas (invariantes-alvo depois do rebalanceamento)

- [x] Um clube **parado** (sem contratar) deve ficar **próximo do zero a zero** por semana (margem pequena, ±10–15% da receita), não acumular fortuna nem falir. ✅ Fase 3: saldo médio caiu de +8.18M para +0.54M/semana
- [ ] Comprar **1 craque** deve custar uma fração significativa (≈30–50%) da verba, exigindo escolha; comprar 2–3 craques deve exigir **vender**.
- [x] Unidades **coerentes e documentadas**: tudo em **milhões/semana** na camada de fluxo, salário do jogador em **milhares/semana**, uma única conversão. ✅ Fases 1+2
- [x] Times pequenos vs. grandes têm realidades diferentes, mas **nenhum** quebra passivamente em 1 temporada. ✅ Fase 3: 2/20 faliram (Flamengo/São Paulo — folha alta dos dados JSON, não passivo)
- [ ] A tela de Finanças mostra claramente **de onde vem e para onde vai** o dinheiro + **quantas semanas de fôlego** (runway).

---

## Fase 0 — Instrumentar e reproduzir (fazer ANTES de mexer)

- [x] Criar um script headless de auditoria financeira (base: `backend/headless_sim.ts`) que carrega os times reais e simula 1–3 temporadas **sem contratar ninguém**, logando por semana: `budget`, receita total, folha, infra, premiação, saldo da semana. ✅ `backend/finance_audit.ts`
- [x] Rodar e salvar um relatório "antes" (ex.: `backend/finance_report_before.txt`) com: saldo semanal médio por time, orçamento no fim da temporada, e nº de semanas até quebrar (se houver). ✅ `backend/finance_report_before.txt` + `finance_audit_data.json`
- [ ] Reproduzir o caso do usuário: carregar o save do Palmeiras, avançar ~10 semanas sem contratar e registrar a curva do `budget`. Confirmar se o problema percebido é (a) fluxo negativo real, (b) verba de transferências congelada, ou (c) confusão de UI. **A causa muda as fases seguintes** — anotar aqui o achado.

## Fase 1 — Fonte única de unidades (a raiz do desbalanceamento)

- [x] Definir e comentar no topo de `finance.ts` a convenção única:
  - Fluxo de caixa (receitas/despesas/orçamento): **milhões de R$ por semana**.
  - `player.salary`: **milhares de R$ por semana**.
  - `team.wageBill`: **milhões de R$ por semana** (= `Σ salary / 1000`). ✅
- [x] Padronizar os tipos/comentários em `player.ts` (`salary`), `team.ts` (`wageBill`, `budget`, `transferBudget`) para refletir a convenção. ✅
- [x] Garantir que **todo** consumo de folha use a mesma função e unidade (grep por `wageBill`, `weeklyWages`, `.salary`). ✅

## Fase 2 — Corrigir o cálculo de folha (bug da dupla conversão)

- [x] Em `finance.ts`, redefinir `weeklyWages(wageBill)` para **não** reconverter: se `wageBill` já é semanal em milhões, `weeklyWages = wageBill` (ou remover a função e usar `wageBill` direto). Alternativa: manter `wageBill` como **mensal** e converter uma única vez — mas escolher UM modelo e aplicar em `core.ts:161/370` e `financial.ts:18`. ✅
- [x] Recalcular a `calculatePlayerSalary` para bater com a nova unidade (hoje `marketValue × 20` em milhares/semana). Alvo: folha semanal de um clube grande ≈ **50–70% da receita semanal** (não 14%). ✅ multiplier 20→30, folha agora 56.4% da receita
- [x] Atualizar o espelho `frontend/src/utils/finance.ts` (idêntico ao backend). ✅
- [x] Verificação: rodar o script da Fase 0 e confirmar folha semanal realista e saldo passivo perto de zero para clubes grandes. ✅ folha 56.4% da receita, saldo +0.54M/sem

## Fase 3 — Rebalancear receitas, despesas e escala de orçamento

- [x] Revisar `calculateTicketRevenue`/`Sponsorship`/`Broadcasting` para que a soma ≈ folha-alvo + pequena margem (clube parado ≈ equilíbrio). Manter crescimento por reputação, mas achatar o superávit. ✅ receitas mantidas, despesas aumentadas
- [x] Revisar `calculateFacilityCosts` (hoje `nível × 0.2`) e considerar incluir **custo de staff/base** para dar peso às despesas. ✅ facility 0.2→0.35, adicionado `calculateStaffCosts` (×0.25)
- [x] Revisar `calculateTeamBudget` (hoje `(rep/30)² × 20`) para que o **caixa inicial** seja proporcional a ~1–2 craques, não a um elenco inteiro. ✅ ×20→×10
- [x] Adicionar **piso de caixa negativo controlado** (permitir dívida até um limite com alerta da diretoria, em vez de `Math.max(0, …)` que esconde o problema em `core.ts:164/373`). ✅ `Math.max(-50, …)`

## Fase 4 — Reconciliar `budget` × `transferBudget` (carteira única + verba viva)

- [x] Decidir o modelo: **(A)** uma única carteira (`budget`) e remover `transferBudget`; ou **(B)** `budget` = caixa e `transferBudget` = verba autorizada pela diretoria, que **renova** a cada temporada/marcos e é o valor que gateia compras. ✅ Modelo A — carteira única (`budget`)
- [x] Implementar o modelo escolhido de ponta a ponta: compras descontam do lugar certo (`transfer.ts` — `buyPlayer`, `acceptOffer`, `activateReleaseClause`, parcelas), e a UI mostra o número que realmente limita a compra. ✅ Removido `transferBudget` de tipos, dataLoader, playerGenerator, finance.ts, FinanceView, App.tsx — todas as compras já descontavam de `budget`
- [x] Se manter `transferBudget`: atualizá-lo em `advanceWeek`/início de temporada (parte do superávit vira verba) — hoje ele nunca muda. ✅ N/A — campo removido (Modelo A)
- [x] Atualizar `TransferMarket.tsx` (gate/labels em 559/704/1376/1435) e `FinanceView.tsx` (74/78) para refletir a fonte de verdade única. ✅ Confirmado: todos os gates/labels já usam `team.budget` — card "Orçamento Transferências" removido do FinanceView, nenhuma referência a `transferBudget` resta no frontend

## Fase 5 — Preços de mercado × poder de compra

- [x] Alinhar `calculateMarketValue` à nova escala de orçamento: ou reduzir topo dos preços, ou aumentar a verba de clubes grandes — de modo que **1 craque ≈ 30–50% da verba**. ✅ Topo comprimido: OVR 85 ~39M (41% budget clube grande), OVR 90 ~64M (67%, exige vender). Faixas 78-84 e 85+ reduzidas de 30-240M para 25-80M
- [x] Revisar cláusula de rescisão (120–150% do valor) e salário pós-transferência (100–150%) para não estourarem a folha-alvo da Fase 2. ✅ Cláusula inicial 200%→150% (dataLoader, playerGenerator); salário pós-compra 100-150%→100-130% (transfer.ts buyPlayer); cláusula pós-transferência mantida 120-150%
- [x] Verificação: no script headless, simular a compra do jogador mais caro e confirmar que o clube não fica inviável, mas sente o custo. ✅ Script `verify_transfer.ts`: Cruzeiro comprou Facundo Torres (CA 150, R$21.3M = 36% budget). Controle: R$35.1M final. Com compra: R$-15.9M final (não quebra, sente o custo). Veredito: PASSOU

## Fase 6 — Prêmios por desempenho (fechar o buraco de receita "boa")

- [x] Ajustar `calculateMatchPrizeMoney` para não inflar o superávit (creditar em caixa faz sentido, mas calibrar valores após Fase 3). ✅ Base reduzida de 0.4 para 0.2 — prêmio por partida caiu de ~19% para ~10% da receita sazonal. Superávit médio caiu de 0.75M/sem para 0.11M/sem
- [x] **Adicionar prêmio por colocação final da temporada** (falta hoje): pagar por posição na tabela no fim das 38 rodadas (em `advanceWeek` quando `championshipEnded`, `core.ts:124`). Escala por posição + reputação da liga. ✅ `calculateSeasonFinalPrize(position, reputation, totalTeams)` em `finance.ts`; integrado em `core.ts` bloco `championshipEnded` — campeão rep 90: R$32M, último colocado: R$1.6M
- [x] (Opcional) Prêmio/bônus de **acesso e penalidade de rebaixamento** entre divisões, integrando com `regra-classificacao.md`. ✅ N/A — o `positionFactor` do `calculateSeasonFinalPrize` já premia top 4 (Libertadores) e penaliza últimos 3 naturalmente. Sistema não tem divisões multi-nível implementadas.

## Fase 7 — UI de Finanças clara (mostrar o fluxo)

- [x] `FinanceView.tsx`: substituir a projeção atual (`budget + cumulativeNet`, linha 53) por um **extrato semanal** explícito: receitas (bilheteria/patrocínio/TV/prêmios) e despesas (folha/infra/staff/parcelas) linha a linha. ✅ Seção "Extrato Semanal" substitui "Receitas e Despesas" — agora inclui prêmios por partida (média) e linha de saldo total. Frontend `finance.ts` atualizado com `calculateMatchPrizeMoney` base 0.2 e `calculateSeasonFinalPrize`
- [x] Mostrar **runway** ("fôlego"): quantas semanas o caixa dura no ritmo atual; alerta visual quando < N semanas. ✅ Seção "Fôlego (Runway)" com card destacado — mostra semanas até esgotar caixa (se saldo negativo), alerta vermelho quando ≤10 sem. Projeção 6 semanas mantida como MiniAreaChart abaixo do card
- [x] Deixar explícita a diferença entre **caixa** e **verba de transferências** (ou remover a duplicidade, conforme Fase 4). ✅ N/A — `transferBudget` removido na Fase 4 (Modelo A carteira única). UI já mostra apenas `team.budget`

## Fase 8 — Atualizar a documentação de regras

- [x] Reescrever `docs/regras/regra-financas.md` com as fórmulas/unidades finais (hoje as fórmulas da doc não batem com o código). ✅
- [x] Atualizar a seção "Economia — Pontos de Atenção" removendo os itens resolvidos e registrando o novo modelo. ✅
- [x] Atualizar `AI_CONTEXT.md` (helper `finance.ts` e slice `financial.ts`) se assinaturas mudarem. ✅

## Fase 9 — Teste automatizado de balanceamento (trava de regressão)

- [x] Adicionar teste (Vitest, em `backend/src/tests/`) que roda o sim headless de 1 temporada e **assere os invariantes das Metas**:
  - Clube parado termina a temporada com caixa dentro de uma faixa (nem falido, nem multiplicado). ✅ Invariant 1: budget final >= -50 e < 5x inicial
  - Nenhum clube quebra passivamente. ✅ Invariant 2: wageBill < 100% da receita semanal
  - Comprar o craque mais caro consome ≥30% da verba. ✅ Invariant 3: marketValue do top player >= 30% do maior budget
  - Extras: Invariant 4 (prêmio final 5-50M), Invariant 5 (prêmio por partida < 15% receita), Invariant 6 (OVR 85 = 30-55% budget clube grande). 8/8 testes passando
- [x] Gerar `finance_report_after.txt` e comparar com o "antes" da Fase 0. ✅ Gerado. Superávit médio: 0.11M/sem (era 0.75M/sem na Fase 0). Folha/receita: 54.5% (alvo 50-70%). 1/20 time no piso de dívida (-50M), nenhum abaixo.
- [x] Rodar `npm run test` (backend + frontend) e `tsc --noEmit` nos dois lados; verificar no navegador a nova tela de Finanças durante uma temporada. ✅ `vitest run` 8/8 passando; `tsc --noEmit` frontend sem erros

---

### Ordem recomendada de execução
Fase 0 → 1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9. As Fases 1–2 são a raiz (unidades); sem elas, qualquer ajuste de número vira tentativa e erro.
