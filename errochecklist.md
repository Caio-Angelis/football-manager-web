# 🐞 Checklist de Erros — Bugs encontrados no projeto

> Auditoria completa de caça a bugs (motor do jogo, camada online/HTTP e frontend).
> **Cada item foi verificado no código real** — arquivos e linhas conferidos. Uma amostra dos críticos foi re-checada manualmente.
> Formato de cada erro: **onde** · **o problema** · **como corrigir (passo a passo)** · **o que usar** · **por que melhora**.
>
> Convenção de severidade:
> - 🔴 **CRÍTICO** — trapaça/exploit ou corrompe o save; corrigir primeiro.
> - 🟠 **ALTO** — quebra uma funcionalidade que o jogador usa direto, ou dinheiro/tabela erram.
> - 🟡 **MÉDIO** — bug real, mas em caminho menos comum ou de impacto contido.
> - ⚪ **BAIXO** — polimento, caso raro, ou mascarado por outro caminho.
>
> Não confundir com o `checklist.md` (funcionalidades novas). Aqui é só **conserto do que já existe**.

---

## 🔴 CRÍTICOS

### [x] E-01 — Roubo de jogador de graça no online: `reserveTeam`/`youthAcademy` são compartilhados entre todos da sala

**Onde:** `backend/src/rooms/roomManager.ts:54-62` (lista `SCOPED_KEYS`) + `backend/src/store/slices/youth.ts:95-116`.

**Problema:** A lista de chaves "por jogador" que a sala troca a cada request **não inclui** `reserveTeam`, `youthAcademy`, `youthIntakeCompleted`, `pressConferences`, `transferAgreements`, `injuryHistory`, `fatigueLog`, `completedTransfers`, `socialTree`. Essas ficam no store compartilhado — visíveis e **graváveis por qualquer jogador**. Exploit confirmado: jogador A manda `addPlayerToReserve(craqueId)` (tira o craque do elenco dele para o `reserveTeam` compartilhado); jogador B, cujo time acabou de ser focado pelo `focusTeam`, manda `promoteFromReserve(craqueId)` → o craque materializa no elenco de B, **de graça, sem mexer em orçamento nenhum**. O mesmo vale para roubar prospectos da base do rival (`promoteYouthPlayer`), e o `projectState` ainda entrega a todos os dados de base/reservas/imprensa de A.

**Como corrigir (passo a passo):**
1. Adicionar as chaves ausentes ao array `SCOPED_KEYS` em `roomManager.ts:54-62`: `reserveTeam`, `youthAcademy`, `youthIntakeCompleted`, `pressConferences`, `transferAgreements`, `injuryHistory`, `fatigueLog`, `completedTransfers`, `socialTree`.
2. A maquinaria de `loadScope`/`saveScope`/`snapshotScope` já itera sobre `SCOPED_KEYS` com `structuredClone` — não precisa de mais nada; cada jogador passa a ter o seu próprio `reserveTeam`/`youthAcademy`.
3. Conferir que nada no `initGame` da sala dependia dessas chaves serem globais.

**O que usar:** a própria infra de escopo que já existe (`SCOPED_KEYS` + `structuredClone`). Zero código novo.

**Por que melhora:** fecha um roubo de elenco sem custo — o exploit mais grave do multiplayer — e para de vazar dados privados (base, imprensa, histórico) dos rivais.

---

### [x] E-02 — Save em memória corrompido: estado é guardado por referência e depois mutado no lugar

**Onde:** `backend/src/store/slices/saves.ts:27-33` (guarda `teams`/`matches` por referência) + mutações in-place em `core.ts:448-451`, `helpers/training.ts:6-15`, `helpers/aiManager.ts:272-276`.

**Problema:** `saveGame` grava `gameState: { teams: state.teams, matches: state.matches, ... }` — **referências**, não cópias. O processamento semanal depois muta esses mesmos objetos no lugar (`team.squad = ...`, `updated.physical.stamina = ...`, `team.tactic = ...`). Como `loadGame` restaura do `state.saveSlots` **em memória** (não do disco), salvar e avançar algumas semanas e depois carregar devolve uma quimera: semana/partidas do momento do save, mas elencos já fatigados/treinados/com contrato decrementado. Só um restart do servidor (que relê do disco) dá um load limpo.

**Como corrigir (passo a passo):**
1. Em `saveGame` (`saves.ts:27`), fazer cópia profunda do estado antes de guardar: `gameState: structuredClone({ ...os campos ... })` (ou `JSON.parse(JSON.stringify(...))` se houver algo não clonável).
2. Uma linha resolve independentemente dos hábitos de mutação do resto do código.
3. (Opcional/robustez) padronizar as mutações semanais para criar cópias — mas não é necessário para o fix.

**O que usar:** `structuredClone` (nativo no Node 17+, já usado no `roomManager`).

**Por que melhora:** salvar deixa de destruir silenciosamente o save; carregar volta exatamente ao ponto salvo. É integridade de dados básica.

---

### [x] E-03 — Qualquer jogador online pode jogar qualquer partida (e contar o resultado em dobro)

**Onde:** `backend/src/routes/rooms.ts:158-162` (lista `ROOM_FORBIDDEN_ACTIONS`) + `backend/src/store/slices/match.ts:15-18` (`simulateMatch` sem checagem de dono).

**Problema:** A lista de ações proibidas na sala **não inclui nenhuma ação de partida**. No online, todas as partidas deveriam ser simuladas no fechamento da rodada (`advanceRoomWeek`), mas nada impede um jogador de mandar `simulateMatch` / `generateLiveMatchMinute` / `substitutePlayer` / `applyShout` numa partida — inclusive na do rival. Isso muta as estatísticas compartilhadas dos times; depois, quando a rodada fecha, o `advanceWeek` regenera e re-simula a mesma rodada → **o confronto conta duas vezes** na tabela. É também "grieffável": A decide o resultado da partida de B mexendo na escalação ao vivo de B.

**Como corrigir (passo a passo):**
1. Adicionar a `ROOM_FORBIDDEN_ACTIONS` (`rooms.ts:158`): `simulateMatch`, `generateLiveMatchMinute`, `finishMatch`, `substitutePlayer`, `applyShout`, `applyMatchIntervention`.
2. Como o MVP online já simula tudo no fechamento (comentário em `core.ts:361-363`), essas ações não têm por que ser chamadas por request individual.
3. Esconder/desabilitar no frontend os botões que disparam essas ações em modo sala (ver E-16).

**O que usar:** o mecanismo de denylist que já existe (`ROOM_FORBIDDEN_ACTIONS`).

**Por que melhora:** elimina dupla contagem na tabela e o grief de decidir o jogo alheio; o resultado passa a sair só do fechamento coordenado.

---

## 🟠 ALTOS

### [x] E-04 — Tabela da liga perde os resultados do 1º turno a partir da ~rodada 20 (cap de 200 partidas alimenta a classificação)

**Onde:** `backend/src/store/slices/core.ts:369-372` + `helpers/league.ts:32-71`.

**Problema:** A classificação é recalculada **exclusivamente** a partir do array de partidas (`calculateLeagueStandings`), mas esse array é cortado em `slice(-200)`. Com 20 times são 10 jogos/rodada = 380 por temporada de 38 rodadas. Da rodada ~20 em diante, o corte descarta os jogos mais antigos e pontos/jogos/saldo de todos os times começam a **encolher** — a tabela exibida (e tudo que depende dela: zona de rebaixamento, lógica de IA que checa `played >= 5`, premiação por posição final, resumo da temporada) reflete só uma janela móvel de ~20 rodadas no returno inteiro.

**Como corrigir (passo a passo):**
1. Parar de recalcular a tabela a partir do array cortado. Usar os campos cumulativos que `applyMatchResultToTeams` já mantém em cada time (`points/played/won/drawn/lost/goalsFor/goalsAgainst`).
2. Alterar `calculateLeagueStandings` para montar a tabela a partir desses campos do time, OU manter um acumulador de standings que só recebe o delta da rodada.
3. Manter o `slice(-200)` só para o histórico de partidas exibido, sem que ele alimente a classificação.

**O que usar:** os campos de estatística que já existem em `Team`.

**Por que melhora:** a tabela volta a ser correta o ano inteiro; rebaixamento, premiação e decisões de IA param de usar números encolhidos.

---

### [x] E-05 — Elenco fica com 10 jogadores para sempre quando um titular sai (o `startingXI` nunca é limpo)

**Onde:** `backend/src/store/slices/transfer.ts:588-592` (e o mesmo padrão em `buyPlayer`, `acceptOffer`, `loanPlayer`, `activateReleaseClause`, `youth.ts:addPlayerToReserve`, e todas as transferências de IA em `aiManager.ts:182,539,682`).

**Problema:** Nenhum caminho de venda/empréstimo remove o jogador do `team.startingXI` — só do `squad`. O resolvedor do motor (`matchEngine.ts:117-124`) descarta os IDs que não acham jogador e só cai no fallback `squad.slice(0,11)` se a lista resolver para **zero**. Resultado: quando um titular é vendido (venda do usuário, raid da IA na cláusula do usuário, ou negócio IA×IA), o time joga todas as partidas seguintes com 10 (ou menos). O `healTeamsXI` só roda em `initGame`/`loadGame`.

**Como corrigir (passo a passo):**
1. Criar/usar um helper `ensureElevenXI(team)` que remove do `startingXI` os IDs que não estão mais no `squad` e completa até 11 com os melhores disponíveis.
2. Chamá-lo nos dois times afetados após **cada** mutação de elenco (venda, compra, empréstimo, cláusula, reservas).
3. Alternativa mais barata e abrangente: rodar `healTeamsXI(teams)` no topo do `advanceWeek`, garantindo XI válido para todos antes de simular a rodada.

**O que usar:** o `healTeamsXI` que já existe (só passar a chamá-lo no avanço semanal).

**Por que melhora:** times param de jogar em inferioridade numérica fantasma; a força de IA e do usuário deixa de degradar ao longo da temporada.

---

### [x] E-06 — Empréstimos entre IAs viram transferência permanente (o `LoanDeal` é jogado fora)

**Onde:** `backend/src/store/helpers/aiManager.ts:735-739` e `750-754`.

**Problema:** `processAILoans` move o jogador para o clube que toma emprestado e retorna `newLoans`, mas o `AIWeeklyResult` **não tem campo de empréstimos** e o `advanceWeek` nunca adiciona esses empréstimos a `state.activeLoans`. Como `processLoans` (que devolve jogadores no fim do prazo) só olha `activeLoans`, o jogador **nunca volta**: o "empréstimo" virou uma transferência permanente por 5–15% do valor de mercado.

**Como corrigir (passo a passo):**
1. Adicionar `newLoans: LoanDeal[]` ao tipo `AIWeeklyResult` e retorná-lo de `processAIWeekly`.
2. No `advanceWeek` (`core.ts`), mesclar `aiResult.newLoans` em `updatedActiveLoans` **antes** de `processLoans` rodar.
3. Conferir que `processLoans` devolve corretamente o jogador ao clube de origem no fim do prazo.

**O que usar:** o tipo `LoanDeal` e o `activeLoans`/`processLoans` que já existem.

**Por que melhora:** empréstimos de IA passam a ter prazo e retorno reais, em vez de sangrar elencos permanentemente.

---

### [x] E-07 — Aceitar a contraproposta do clube fecha a transferência pelo preço ANTIGO (mais baixo)

**Onde:** `frontend/src/components/transfer/TransferMarket.tsx:463-477` (`handleAcceptCounter`) e `437-443` (`handleFinalizeTransfer`).

**Problema:** Ao clicar "Aceitar R$ 14M" numa contraproposta, o `handleAcceptCounter` **não atualiza** `offerAmount` (que continua nos R$10M originais). Na fase de contrato, `handleFinalizeTransfer` faz `parseFloat(offerAmount)` → envia `acceptOffer(..., 10, ...)`. O jogador é comprado por 10, não 14; o banner (linha ~1528) ainda mostra o valor errado. Curiosamente o botão "Renegociar" já faz `setOfferAmount(String(counterPrice))` — o caminho de aceitar é que esqueceu.

**Como corrigir (passo a passo):**
1. Em `handleAcceptCounter`, dentro do `if (result.status === 'accepted')`, adicionar `setOfferAmount(String(negotiationResult.counterPrice));`.
2. Conferir que o banner e o resumo de contrato leem esse mesmo valor.

**O que usar:** o setter `setOfferAmount` já existente.

**Por que melhora:** o clube passa a receber o valor que aceitou; corrige um furo de dinheiro direto no fluxo mais usado do mercado.

---

### [x] E-08 — Uma troca de posições nas Táticas colapsa o `startingXI` para 1-2 jogadores em times recém-criados

**Onde:** `frontend/src/components/tactics/TacticsView.tsx:332-339` (e `swapBenchToSlot`, 343-357).

**Problema:** Após um swap, o novo `startingXI` é reconstruído **só** a partir de `playerRoles`. Mas o backend cria os times com `playerRoles: []` (`playerGenerator.ts:19`) — o XI mostrado vem do fallback `startingXI` em `starters`. Logo, o primeiro arrasta/clica escreve 1-2 roles e regrava `startingXI` com apenas esses 1-2 IDs, **descartando silenciosamente os outros 9-10 titulares**. Isso contamina `findInjuredInXI`, força do time, escalação na simulação e o `MatchPitch2D`.

**Como corrigir (passo a passo):**
1. Reconstruir `xi` a partir do array derivado `starters` **com o swap já aplicado**, não a partir de `roles` sozinho.
2. Garantir que todo slot ocupado da formação tenha uma role preenchida antes de reconstruir o `startingXI` (preencher a partir do XI atual quando `playerRoles` estiver vazio).
3. Testar em time novo: um único swap deve manter 11 titulares.

**O que usar:** o próprio array `starters` que a tela já calcula (linhas ~207-226).

**Por que melhora:** impede corrupção de escalação no primeiro toque nas táticas — bug que afeta praticamente todo save novo.

---

### [x] E-09 — Busca de jogadores no mercado está morta (debounce se alimenta do valor antigo)

**Onde:** `frontend/src/components/transfer/TransferMarket.tsx:279-289`.

**Problema:** `filterRef` espelha `debouncedFilter` (que começa `''`), não `filter`. Ao digitar, `filter` muda, mas o timer dispara `setDebouncedFilter(filterRef.current)` = `''`. `debouncedFilter` nunca muda, então o filtro por nome (linha ~324, `if (debouncedFilter) ...`) nunca ativa. **A caixa de busca não faz nada.**

**Como corrigir (passo a passo):**
1. Trocar o corpo do timer por `setTimeout(() => setDebouncedFilter(filter), 300)`.
2. Deletar `filterRef` e o `useEffect` que o mantém (linhas 279-282).
3. Dependência do efeito continua `[filter]`.

**O que usar:** o padrão de debounce direto sobre o estado `filter`.

**Por que melhora:** devolve a busca do mercado — funcionalidade central que hoje está completamente quebrada.

---

### [x] E-10 — Todo o inbox privado semanal dos humanos cai no inbox do HOST (vazamento + perda de mensagem)

**Onde:** `backend/src/store/slices/core.ts:445-542` (gera mensagens por-humano numa lista única) + `roomManager.ts:459-462` (salva só no escopo do host).

**Problema:** O loop semanal gera mensagens privadas (lesões, risco médico, contrato expirando) para **cada** time humano, mas empilha tudo num único `newInboxMessages`, mesclado em `finalInbox`. No online, `advanceRoomWeek` carrega só o escopo do host, chama `advanceWeek` e salva só o escopo do host. Resultado: a lesão do atacante de B ("🏥 Relatório Médico — jogador de B") aparece no inbox do **host** (intel privada do rival) e B nunca fica sabendo.

**Como corrigir (passo a passo):**
1. No `advanceWeek`, coletar as mensagens num `Record<teamId, InboxMessage[]>` (cada `push` já sabe o `hid` do humano).
2. Expor esse mapa no retorno do avanço.
3. Em `advanceRoomWeek`, distribuir cada lista para o escopo do dono via o helper `pushInbox(room, teamId, msg)` que já existe (`roomManager.ts:252-256`).

**O que usar:** o `pushInbox` por-jogador já existente.

**Por que melhora:** cada humano recebe as próprias notícias e para de vazar a situação do elenco rival para o host.

---

### [x] E-11 — `payInstallment` retorna uma Promise tratada como booleano — sempre "pago com sucesso"

**Onde:** `frontend/src/components/transfer/TransferMarket.tsx:892-899` + `frontend/src/store/gameStore.ts:520-525`.

**Problema:** `payInstallment` retorna `apiAction(...).then(...)` — uma Promise, sempre "truthy". O componente faz `const success = payInstallment(...)` e cai sempre no ramo de sucesso, mesmo quando o pagamento falha por orçamento. O usuário vê "Parcela paga com sucesso!" mesmo sem ter pago.

**Como corrigir (passo a passo):**
1. Tornar o handler `async` e usar `const success = await payInstallment(...)`.
2. Fazer `payInstallment` no `gameStore` retornar o resultado real do backend (booleano de sucesso), não a Promise encadeada crua.
3. Aí o ramo "Orçamento insuficiente" volta a ser alcançável.

**O que usar:** `async/await` + retorno tipado do store.

**Por que melhora:** o feedback de pagamento passa a ser verdadeiro — essencial num sistema de parcelas.

---

## 🟡 MÉDIOS

### [x] E-12 — Bônus de venda (sell-on) nunca dispara: procura o jogador vendido no próprio elenco do vendedor

**Onde:** `backend/src/store/slices/core.ts:621-624` (idêntico em `transfer.ts:931-935`).

**Problema:** `incomingBonuses` só existe para jogadores que o usuário **acabou de vender** (o `acceptIncomingTransfer` remove o jogador do elenco do usuário na mesma ação). Mas o gatilho procura o jogador em `userTeamForBonus.squad` (o elenco do vendedor) — busca que sempre falha. Todo bônus fica `triggered: false` para sempre e o dinheiro prometido nunca é pago.

**Como corrigir (passo a passo):**
1. Procurar o jogador em todos os elencos: `state.teams.flatMap(t => t.squad).find(p => p.id === b.playerId)` — ou, melhor, no elenco do clube comprador (`offer.fromTeam`).
2. Aplicar o mesmo fix nos dois locais (`core.ts` e `transfer.ts:checkBonuses`).

**O que usar:** `flatMap` sobre `state.teams`.

**Por que melhora:** bônus de gols/jogos/assistências passam a pagar de fato, fechando dinheiro prometido que hoje evapora.

---

### [x] E-13 — Contraproposta ao vender: caminho sem saída E pede valor MENOR que a oferta

**Onde:** `backend/src/store/slices/transfer.ts:746-748` (+ `821-826`).

**Problema:** Dois erros confirmados: (1) o usuário é o **vendedor**; uma contraproposta deveria pedir **mais** que `offer.offerPrice`, mas o código faz `offer.offerPrice * (1 - reduction)` → pede 20-30% **a menos** (sinal invertido). (2) Nada resolve `counterOffers` — não existe passo de IA aceitando/recusando; e `negotiateCounterOffer` remove a oferta original de `incomingTransfers`/`deferredTransfers`, então clicar "Negociar" **destrói o negócio para sempre** e deixa uma contraproposta `pending` vazando.

**Como corrigir (passo a passo):**
1. Trocar `(1 - reduction)` por `(1 + reduction)`.
2. Adicionar um passo de resolução no `advanceWeek`: a IA aceita a contraproposta com probabilidade baseada na razão preço/valor e, se aceitar, executa a venda como `acceptIncomingTransfer`.
3. Não remover a oferta original até a contraproposta ser resolvida (ou recolocá-la se recusada).

**O que usar:** o fluxo de `acceptIncomingTransfer` já existente para consumar a venda.

**Por que melhora:** negociar como vendedor passa a fazer sentido (pedir mais) e deixa de queimar o negócio.

---

### [x] E-14 — Rodada de abertura duplicada: time do usuário termina a temporada com 39 jogos, os demais com 38

**Onde:** `backend/src/store/slices/core.ts:117` (initGame) + `363-372` (primeiro advance).

**Problema:** `initGame` cria uma rodada "Semana 1" completa com `currentWeek 0`. No primeiro `advanceWeek` (`newWeek = 1`), `finalizePendingUserMatch` completa a partida do usuário dessa rodada inicial e aplica às estatísticas, e depois uma **segunda** rodada "Semana 1" é gerada. Os jogos de IA da rodada inicial nunca são simulados e são descartados, mas o do usuário é contado → usuário e seu adversário da rodada-0 jogam 39 partidas de liga enquanto os outros 18 times jogam 38 (pontos e `played` desiguais na tabela).

**Como corrigir (passo a passo):**
1. Escolher uma das duas: (a) não gerar partidas no `initGame` — começar na semana 0 com fixture vazio; ou (b) fazer o primeiro `advanceWeek` **reutilizar** a rodada inicial em vez de gerar uma nova semana-1.
2. Ajustar `calculateLeagueStandings`/`finalizePendingUserMatch` conforme a escolha.
3. Testar que, ao fim da temporada, todos os 20 times têm o mesmo número de jogos.

**O que usar:** ajuste na sequência `initGame` ↔ primeiro `advanceWeek`.

**Por que melhora:** iguala o número de jogos de todos os times — tabela justa, sem vantagem/desvantagem artificial de pontos.

---

### [x] E-15 — `completeYouthIntake` ignora o flag `youthIntakeCompleted` — intake de base infinito e grátis

**Onde:** `backend/src/store/slices/scouting.ts:141-156`, disparado por `helpers/inbox.ts:29-33`.

**Problema:** `generateInboxMessage` pode gerar uma mensagem `'youth'` em qualquer semana, e cada clique em "Convocar" adiciona mais 8 jovens ao elenco. O flag `youthIntakeCompleted` — que existe justamente para impedir isso e é respeitado pelo intake automático da semana 1 — **nunca é lido aqui**. Elenco e folha salarial podem ser inflados indefinidamente.

**Como corrigir (passo a passo):**
1. Adicionar no topo de `completeYouthIntake`: `if (state.youthIntakeCompleted) return;`.
2. Setar `youthIntakeCompleted: true` ao concluir o intake manual (como o automático faz).
3. Recalcular `wageBill` após adicionar os jovens (ver E-25).

**O que usar:** o flag `youthIntakeCompleted` que já existe no estado.

**Por que melhora:** fecha um exploit de elenco/folha ilimitados; a base passa a ser 1x por temporada como pretendido.

---

### [x] E-16 — Botões "Continuar"/"Avançar Semana" no online chamam ação 403 (controles mortos)

**Onde:** `frontend/src/components/ui/PageHeader.tsx:65-68` (em toda página) + `frontend/src/components/match/MatchCenter.tsx:714-717`.

**Problema:** Numa sala, `apiAction('advanceWeek')` bate em `ROOM_FORBIDDEN_ACTIONS` → 403. O store pisca `isAdvancing: true`, captura o erro e reseta — o botão não faz nada, enquanto a barra correta ("Estou pronto") do ready-check está noutro lugar. São dois botões proeminentes que parecem avançar a rodada e ficam mortos.

**Como corrigir (passo a passo):**
1. Passar/consultar um flag `online` (via `getActiveRoom()`) em `PageHeader` e `MatchCenter`.
2. Em modo sala, esconder esses botões (ou trocá-los pelo botão de ready-check).
3. Combinar com E-03: também bloquear `simulateMatch` no servidor para o "Iniciar Partida" não pré-simular o jogo.

**O que usar:** `getActiveRoom()` já existente no `client.ts`.

**Por que melhora:** remove controles enganosos no multiplayer; o jogador usa só o fluxo de ready-check.

---

### [x] E-17 — Chute de meta / rebote de falta e pênalti colocam a bola no lado ERRADO do campo

**Onde:** `backend/src/store/helpers/matchEngine.ts:2028-2035` (e inversões iguais em 1444-1448, 1579-1583, 1747-1751).

**Problema:** Convenção do motor (linha 1845): mandante ataca para `ballPos=1`, visitante para `0`. Após um chute perdido do mandante, o tiro de meta do visitante deveria reiniciar perto do gol do visitante (`ballPos ≈ 0.9`). O código põe `0.1` — que para o visitante equivale a `attackProgress = 0.9`, ou seja, o time que defende é **teleportado para dentro da área adversária** com chance de chute imediata, e a bola vai para um atacante. Simétrico para o visitante. Todo chute perdido/falta defendida/pênalti defendido presenteia o rival com uma chance imediata — o motor foi "calibrado" em torno desse volume inflado de gols.

**Como corrigir (passo a passo):**
1. Inverter as constantes: `side === 'home' ? 0.9 : 0.1` (tiro de meta sai de perto do próprio gol do time que defende).
2. Aplicar a mesma inversão nos ramos de escanteio/falta/rebote de pênalti (linhas citadas).
3. Rerodar `headless_sim.ts` e reajustar a calibração de gols se o volume cair (esperado).

**O que usar:** só a correção das constantes de posição.

**Por que melhora:** para de dar chances instantâneas absurdas ao adversário a cada bola parada; placares ficam realistas.

---

### [x] E-18 — Jogador expulso continua em campo

**Onde:** `backend/src/store/helpers/matchEngine.ts:1893-1916` (aplica o vermelho) vs `1205-1224` (seleção de jogadores).

**Problema:** O `sentOff` só alimenta os modificadores agregados de chute/pressão. Nem `pickPlayerWithBall`, nem `pickDefender`, `pickScorer`, cobrador de bola parada ou `calculatePlayerMatchRatings` filtram `state.sentOff`. Um expulso continua passando, defendendo, batendo escanteio e **fazendo gol** o resto da partida (só o `substitutePlayer` checa expulsão).

**Como corrigir (passo a passo):**
1. Passar `state.sentOff` para os helpers de seleção de jogador em `simulateMinute`.
2. Filtrar esses IDs do XI nesses helpers (`.filter(p => !sentOff[side].includes(p.id))`).
3. Zerar/limitar `minutesPlayed` do expulso a partir do minuto do cartão em `calculatePlayerMatchRatings`.

**O que usar:** o `state.sentOff` que o motor já mantém.

**Por que melhora:** expulsão passa a ter consequência real (jogar com 10), como no futebol de verdade.

---

### [x] E-19 — `degradedCondition` pós-lesão fica travado quase a temporada toda seguinte (`lastInjuryWeek` não é resetado)

**Onde:** `backend/src/store/helpers/injury.ts:284-308` + `core.ts:937-987` (`startNextSeason`).

**Problema:** `startNextSeason` zera a semana, mas não limpa `player.lastInjuryWeek`/`degradedCondition`. Um jogador lesionado na semana 35 da temporada N fica com `weeksRecovering = 0 - 35 = -35` na temporada N+1, então a condição degradada fica presa no nível inicial (até +20 de risco de lesão) até a nova temporada alcançar a semana ~35. Mesma classe de bug afeta as comparações de `fatigueLog.week`.

**Como corrigir (passo a passo):**
1. Em `startNextSeason`, limpar `lastInjuryWeek` e `degradedCondition` de todos os jogadores (ou marcar recuperado).
2. Alternativa robusta: guardar semanas absolutas (`season * 38 + week`) em vez de relativas, eliminando o problema para lesão E fadiga.

**O que usar:** limpeza no `startNextSeason` (fix rápido) ou semana absoluta (fix definitivo).

**Por que melhora:** jogadores começam a temporada nova sãos, sem risco de lesão fantasma herdado.

---

### [x] E-20 — Uma exceção no fechamento da rodada "trava" a sala para sempre (`isAdvancing` preso, sem try/finally)

**Onde:** `backend/src/store/slices/core.ts:177,206` + `routes/rooms.ts:113-116` e `195-198`.

**Problema:** `isAdvancing` (chave **não** escopada) só é resetado no fim bem-sucedido do `advanceWeek`. Se qualquer helper lançar exceção no meio, a request dá 500, o `saveScope` do host é pulado e os flags de ready ficam `true`. Todo ready-check seguinte chama `advanceWeek`, que **retorna silenciosamente** no `if (state.isAdvancing) return` — o `advanceRoomWeek` não percebe (retorno void), reseta os readys e reporta sucesso, mas a semana nunca mais avança. Trava permanente e invisível. O mesmo padrão sem `finally` em `POST /:code/action` faz uma escrita parcial (mutações escopadas descartadas, mutações compartilhadas persistidas).

**Como corrigir (passo a passo):**
1. Envolver o corpo do `advanceWeek` num `try/finally` que sempre reseta `isAdvancing`.
2. Nas rotas, envolver os pares `loadScope … saveScope` em `try/finally` para o escopo ser salvo (ou descartado de forma consistente) mesmo com erro.
3. Fazer `advanceRoomWeek` verificar que `currentWeek` realmente incrementou antes de zerar os flags de ready.

**O que usar:** `try/finally` padrão.

**Por que melhora:** um erro pontual deixa de brickar a sala inteira; o estado nunca fica meio-escrito.

---

### [x] E-21 — `lastWeekRef` não é resetado ao trocar de sala (resync pulado + modal de resultado indevido)

**Onde:** `frontend/src/App.tsx:229` e `248-261`.

**Problema:** O ref sobrevive à saída da sala. Cenário A: sair da sala A na semana 5 e entrar na sala B também na semana 5 → `currentWeek === lastWeekRef.current` → o resync por mudança de semana **nunca dispara** para a sala B. Cenário B: reentrar numa sala com semana diferente → `prevWeek !== -1` já é verdade no primeiro poll, então um modal `OnlineRoundResult` de uma partida antiga aparece logo na entrada.

**Como corrigir (passo a passo):**
1. Resetar `lastWeekRef.current = -1` no topo do efeito (ou no cleanup) quando `online?.code` muda.
2. Testar entrar em duas salas na mesma semana e conferir que o resync roda na segunda.

**O que usar:** cleanup do `useEffect` reagindo a `online?.code`.

**Por que melhora:** estado da sala nova sincroniza sempre; some o modal-fantasma na entrada.

---

### [x] E-22 — Hooks condicionais: `return` antes de `useSortable`/`useMemo` (risco de crash "Rendered fewer hooks")

**Onde:** `frontend/src/components/finance/FinanceView.tsx:18-24` e `dynamics/DynamicsView.tsx:70-76`.

**Problema:** Há `if (!team) return <...>` **antes** das chamadas `useSortable`/`useMemo`. Se `team` alternar entre definido/indefinido enquanto o componente está montado (ex.: `syncFromResponse` do online trocando `teams` no meio, ou troca de time), o React lança "Rendered fewer hooks than expected" e o ErrorBoundary engole a página.

**Como corrigir (passo a passo):**
1. Mover o `if (!team) return ...` para **depois** de todas as chamadas de hooks.
2. Tornar os hooks tolerantes a `team` ausente (`team?.squad ?? []`).

**O que usar:** regra dos Hooks (chamadas incondicionais no topo).

**Por que melhora:** elimina um crash de tela em cenários de troca/sync de time.

---

### [x] E-23 — `SaveSlot` usa `setTimeout` fixo em vez da Promise (corrida com backend lento)

**Onde:** `frontend/src/components/saves/SaveSlot.tsx:41-59` e `62-69`.

**Problema:** O save chama `store.saveGame(slot)` e checa o resultado num `setTimeout(200ms)`; se a API demora mais, mostra "Erro ao salvar" mesmo tendo salvo (e a rejeição não é tratada — sem `.catch`). No load, `navigate('/elenco')` dispara após 300ms fixos; se demorar mais, `selectedTeam` ainda é null e o roteador sem-time redireciona para `/`, e o clique parece não fazer nada.

**Como corrigir (passo a passo):**
1. Tornar `saveGame`/`loadGame` no store retornarem Promises que resolvem com sucesso/estado.
2. No componente, `await store.saveGame(slot)` e só então checar/mostrar mensagem; navegar no `.then()` do `loadGame`.
3. Adicionar `.catch` para mostrar erro real.

**O que usar:** `async/await` sobre as ações do store.

**Por que melhora:** save/load deixam de depender de tempo mágico; some o "erro" falso e o clique que não navega.

---

### [x] E-24 — Crash ao selecionar jogador do mercado que deixou de existir (non-null assertion)

**Onde:** `frontend/src/components/transfer/TransferMarket.tsx:647-652`.

**Problema:** `getFullName(marketPlayers.find(m => m.player.id === selectedPlayerId)?.player!)` — o `!` força não-nulo. Se o jogador selecionado sai do mercado entre a seleção e o re-render (comprado por cláusula, vendido ao seu clube, avanço de semana no online via polling), o `find` retorna `undefined`, `getFullName` acessa `.surname` de undefined e a tela quebra. `selectedPlayerId` nunca é invalidado quando `teams` muda.

**Como corrigir (passo a passo):**
1. `const sel = marketPlayers.find(...); {sel ? getFullName(sel.player) : '—'}`.
2. Limpar `selectedPlayerId` quando o ID não existir mais (efeito reagindo a `marketPlayers`).

**O que usar:** guarda condicional em vez de `!`.

**Por que melhora:** evita crash de página numa interação comum do mercado (e no polling online).

---

### [x] E-25 — `wageBill` não é recalculado em movimentos de reserva/base (folha salarial errada)

**Onde:** `backend/src/store/slices/youth.ts:95-100` (`addPlayerToReserve`), `110-115` (`promoteFromReserve`), `58-66` (`promoteYouthPlayer`).

**Problema:** Toda transferência chama `recalcWageBill`, mas essas três ações que mexem no elenco não. `weeklyWages(team.wageBill)`, cobrado no `advanceWeek`, usa um valor defasado: mandar um jogador caro para a reserva continua cobrando o salário dele; promover um sai de graça até o próximo recalc não relacionado.

**Como corrigir (passo a passo):**
1. Em cada uma das três ações, ao gravar o novo `squad`, também gravar `wageBill: recalcWageBill({ ...t, squad: newSquad })`.
2. É o mesmo one-liner que `completeYouthIntake` já usa.

**O que usar:** o helper `recalcWageBill` existente.

**Por que melhora:** folha salarial passa a refletir o elenco real; finanças param de cobrar/omitir salários errados.

---

### [x] E-26 — Rate limit de 120/min por IP quebra o polling multiplayer atrás de um NAT/proxy

**Onde:** `backend/src/middleware/rateLimiter.ts:9-10,22-23` + ausência de `app.set('trust proxy', ...)` no `server.ts`.

**Problema:** O cliente online faz polling de `GET /:code` e `GET /:code/state` a cada ~2s → ~60 req/min por jogador. Dois jogadores na mesma Wi-Fi (mesmo IP público) estouram os 120/min e tomam 429 → o polling para, o heartbeat para, o cleanup marca como desconectado e a sala pode ser apagada. Atrás de um reverse proxy, `req.ip` é o IP do proxy → **todos** os usuários compartilham um único balde de 120/min.

**Como corrigir (passo a passo):**
1. Chavear o limiter por `x-player-id` (já validado como UUID) com fallback para IP.
2. Elevar o teto para acomodar o polling legítimo (ou isentar as rotas de polling `GET`).
3. Configurar `app.set('trust proxy', 1)` conforme o deploy, para `req.ip` ser o IP real do cliente.

**O que usar:** o próprio middleware, chaveado por player-id.

**Por que melhora:** vários jogadores atrás do mesmo IP conseguem jogar; some o falso "desconectado" por rate limit.

---

## ⚪ BAIXOS

### [x] E-27 — `projectState` sem time retorna estado completo, mascarado contra `selectedTeam` velho (janela do draft)

**Onde:** `backend/src/routes/rooms.ts:148-153` + `roomManager.ts:405-407` + `storeHelpers.ts:27-31`.

**Problema:** Durante o `drafting`, um jogador que ainda não escolheu chama `GET /:code/state` → `myTeamId` é null → `stripRivalTeam` não roda (orçamentos/salários expostos) e `focusTeam` é no-op, então `selectedTeam` é o do **requester anterior**, cujo elenco volta com atributos totalmente sem máscara. Inalcançável depois que o status vira `playing`, mas ativo o draft inteiro.

**Como corrigir (passo a passo):**
1. Em `projectState`, quando `myTeamId` for null, aplicar `stripRivalTeam` em **todos** os times e limpar `selectedTeam` antes de mascarar (ou mascarar com `knowledge = 0` para todos).

**O que usar:** o `stripRivalTeam` já existente, aplicado a todos.

**Por que melhora:** fecha vazamento de finanças/atributos durante o draft.

---

### [x] E-28 — Flag `connected` só vira na varredura de 5 min (trava ready-check e apaga sala viva)

**Onde:** `backend/src/rooms/roomManager.ts:524-537`.

**Problema:** (a) Quem fecha a aba aparece `connected: true` por até ~6 min e, como `allPlayersReady` só ignora quem está `!connected`, **trava a rodada** para todos nessa janela. (b) Se todos os notebooks dormem por uma varredura (>60s sem heartbeat cada), `everyoneGone` fica true e a sala **com jogo em andamento é apagada na hora** → todos tomam 404. Um minuto ruim basta, pois a deleção não tem carência.

**Como corrigir (passo a passo):**
1. Calcular conectividade na leitura (`connected = now - lastSeen < STALE_PLAYER_MS`) em vez de guardar flag.
2. Só apagar em `everyoneGone` após uma carência maior (ex.: 15+ min desde o `lastSeen` mais recente).

**O que usar:** cálculo derivado de `lastSeen`.

**Por que melhora:** desconexão passa a contar como pronto rápido, e a sala não some por um cochilo momentâneo.

---

### [x] E-29 — Duplo "pronto" (double-click) avança duas semanas em sala de 1 humano

**Onde:** `backend/src/routes/rooms.ts:111-115` + `roomManager.ts:430` (`rp.ready = ready ?? !rp.ready`).

**Problema:** Numa sala de 1 humano (ou no último jogador), o cliente manda dois `/ready` sem booleano explícito (double-click/retry). Primeiro: ready→true, semana avança, flags resetam. Segundo: toggle → true de novo → `allPlayersReady` → **segundo avanço**, pulando uma semana que o jogador nunca viu.

**Como corrigir (passo a passo):**
1. Exigir `ready` booleano explícito no corpo (rejeitar `undefined`), ou ignorar um ready que chega logo após os flags terem sido resetados sem `ready: true` explícito.
2. No frontend, desabilitar o botão de ready enquanto a request está em voo.

**O que usar:** validação estrita do corpo + desabilitar botão.

**Por que melhora:** impede pular semana por clique duplo.

---

### [x] E-30 — Score de custo-benefício da IA é constante (o termo de preço sempre vale 20)

**Onde:** `backend/src/store/helpers/aiManager.ts:132-137`.

**Problema:** `a.player.marketValue / Math.max(a.player.marketValue, 1)` é 1 para qualquer valor ≥ 1 (o gerador garante ≥ 0.1, e ≥ 1 para quem vale comprar), então os dois scores viram `CA - 20`: a ordenação é puramente por CA e o **preço nunca é considerado**. A IA sempre mira o de maior CA, ignorando custo.

**Como corrigir (passo a passo):**
1. Dividir pelo orçamento do comprador: `CA - (mv / Math.max(buyer.budget, 1)) * peso`.
2. Calibrar o peso para o preço influenciar de fato o ranking.

**O que usar:** o orçamento do time comprador no denominador.

**Por que melhora:** a IA passa a pesar preço vs qualidade, em vez de só perseguir o CA mais alto.

---

### [x] E-31 — Gerador procedural produz CA ≈ 1000–2000 (5–10× fora da escala 0–200)

**Onde:** `backend/src/utils/playerGenerator.ts:86-107`.

**Problema:** Atributos têm média 1–20, então `calculateOverall` retorna 10–200 (o comentário diz 1–100, errado), e `calculateCA` multiplica por 10 de novo → CA 100–2000, enquanto `generatePA` limita PA ≤ 200 (CA ≫ PA quebra a escala usada em todo lugar). Só alcançável no fallback sem banco de dados (o intake/promoção de base sobrescrevem CA), mas nesse modo todos os limiares de IA/motor enlouquecem.

**Como corrigir (passo a passo):**
1. `calculateCA` deve ser `overall + Math.random() * 10` (o `overall` já é ~10–200), casando com a escala `overall100 * 2` do `dataLoader`.
2. Corrigir o comentário de escala em `calculateOverall`.

**O que usar:** alinhar com a escala do `dataLoader`.

**Por que melhora:** o modo fallback (sem dados) passa a gerar jogadores em escala coerente com o resto do motor.

---

### [x] E-32 — Tática `balanced` é estritamente dominada (mesmo ataque da `defensive`, defesa pior) — **SUSPEITO**

**Onde:** `backend/src/store/helpers/matchEngine.ts:221-224` e `239-242`.

**Problema:** `balanced` (padrão de todos os 20 times) recebe 0.88 de ataque **e** 0.88 de defesa — mesmo ataque da `defensive`, mas defesa muito pior (0.88 vs 1.20). Trocar para `defensive` é upgrade puro; `balanced` nunca é escolha racional. Parece copy-paste do 0.88 no ramo fallback. (Marcado suspeito: pode ser tuning proposital, mas a relação de dominância indica bug.)

**Como corrigir (passo a passo):**
1. Definir `balanced` como neutro: ataque ~1.0 e defesa ~1.0 (ou ao menos ataque 1.0).
2. Rerodar `balance.test.ts`/`headless_sim.ts` e reajustar se preciso.

**O que usar:** ajuste dos multiplicadores.

**Por que melhora:** a tática padrão deixa de ser uma armadilha; escolhas táticas passam a ter trade-off real.

---

### [x] E-33 — Sessão de prevenção dispara dois POSTs dependentes concorrentes — **SUSPEITO**

**Onde:** `frontend/src/components/training/TrainingView.tsx:527-528`.

**Problema:** `schedulePreventionSession(session)` e `applyPreventionSession()` são disparados como fire-and-forget em sequência. Se o `apply` chegar ao servidor antes do `schedule`, aplica a sessão anterior (ou nenhuma). A ordem costuma se manter, mas nada garante.

**Como corrigir (passo a passo):**
1. Encadear: `await schedulePreventionSession(session); await applyPreventionSession();` (handler async).
2. Ou criar uma ação única no backend que agenda+aplica atomicamente.

**O que usar:** `async/await` ou ação combinada.

**Por que melhora:** garante que a prevenção aplicada é a que foi agendada.

---

### [x] E-34 — `briefingMatchIndex` não é resetado na virada de semana

**Onde:** `frontend/src/components/match/MatchCenter.tsx:343-348`.

**Problema:** O efeito que zera estados na virada de `currentWeek` **não** limpa `briefingMatchIndex`. No online a semana pode virar por baixo via polling; o `PreMatchBriefing` aberto passa a apontar para o jogo que agora ocupa aquele índice no array `matches` que cresceu.

**Como corrigir (passo a passo):**
1. Adicionar `setBriefingMatchIndex(null)` ao efeito de reset por `[currentWeek]`.

**O que usar:** o próprio efeito de reset já existente.

**Por que melhora:** a tela de pré-jogo não aponta para o adversário errado após virar a rodada.

---

### [x] E-35 — "Responder" na coletiva de imprensa sem guarda de envio em andamento — **SUSPEITO**

**Onde:** `frontend/src/components/press/PressCenter.tsx:229-234`.

**Problema:** `answerPressQuestion` é fire-and-forget e o botão fica habilitado até o store completar o round-trip; um double-click envia a mesma resposta duas vezes (respostas duplicadas em `conference.responses`, efeito dobrado dependendo do backend).

**Como corrigir (passo a passo):**
1. Desabilitar o botão enquanto há resposta pendente para aquele `question.id` (estado local `answeringId`).

**O que usar:** flag local de "respondendo".

**Por que melhora:** evita resposta duplicada e efeito dobrado na imprensa/moral.

---

### [x] E-36 — `?? 50` depois de `parseFloat` deixa "NaN" vazar para o input de salário

**Onde:** `frontend/src/components/transfer/TransferMarket.tsx:394-399`.

**Problema:** `parseFloat('')` é `NaN`, e `NaN ?? 50` continua `NaN` (o `??` só pega null/undefined). Limpar o campo de salário e clicar "80%" → o input vira a string literal "NaN".

**Como corrigir (passo a passo):**
1. `const parsed = parseFloat(salaryOffer); const base = contractNegotiationResult?.expectedSalary ?? (Number.isFinite(parsed) ? parsed : 50);`

**O que usar:** `Number.isFinite` em vez de `??` para números.

**Por que melhora:** o campo de salário nunca fica "NaN".

---

### [x] E-37 — Salário dividido por 1000 em 3 componentes (número errado no elenco inteiro)

**Onde:** `frontend/src/components/squad/SquadTable.tsx:217`, `squad/PlayerCard.tsx:126`, `squad/PlayerDetailPanel.tsx:150`.

**Problema:** O tipo diz `salary: number; // em milhares de R$ por semana` e o `FinanceView` renderiza certo como `R$ {player.salary}K/sem`. Mas esses três componentes fazem `(player.salary / 1000).toFixed(1)}K` → um jogador de 85K/sem aparece como "R$ 0.1K". Divisão indevida (o valor já está em milhares).

**Como corrigir (passo a passo):**
1. Trocar `(player.salary / 1000).toFixed(1)` por `player.salary` nos três arquivos (formato `R$ {player.salary}K`).
2. Conferir alinhamento com `FinanceView` e o comentário do tipo em `types/game.ts:122`.

**O que usar:** o mesmo formato do `FinanceView` (fonte da verdade).

**Por que melhora:** salários corretos no card, na tabela e no painel do jogador — hoje todos mostram ~1000× menos.

---

## ✅ Verificados como corretos (não são bugs — registro para não reinvestigar)

- **Fluxo de dinheiro das ofertas humano×humano** (`makeHumanOffer`/`respondHumanOffer`/`executeHumanTransfer`) — orçamento checado no aceite, débito/crédito único, segundo aceite dá 409, corrida de ofertas serializa. Limpo.
- **Corrida do draft pick** — síncrona; segundo a escolher toma 409.
- **Barras de `boardSatisfaction`** `(x+100)/2` no Dashboard/Inbox — escala é −100..100; fórmula correta.
- **Campos zerados da projeção de rival** (`budget`/`wageBill`/`salary`/`morale`/`fitness`/`form`) — nenhum consumidor do frontend divide por eles; degrada só cosmeticamente.
- **Preço negativo em `OnlineTransfers`** — rejeitado no servidor (`z.number().positive()`).
- **Intervalos/efeitos do `MatchPitch2D`** — todos com cleanup correto.
- **Arredondamento de parcelas / duplo decremento de contrato / Zod na rota offline / piso de orçamento em parcelas** — já corretos (falsos positivos de análises anteriores).

---

## Ordem de ataque sugerida

1. **Críticos (E-01, E-02, E-03)** — exploit de roubo, dupla contagem de partida e corrupção de save. São os que quebram o jogo.
2. **Altos de dinheiro/tabela (E-04, E-07, E-05, E-06)** — tabela encolhendo, preço errado na contraproposta, time com 10, empréstimo permanente.
3. **Altos de UI quebrada (E-08, E-09, E-11)** — táticas colapsando XI, busca morta, feedback de parcela mentiroso.
4. **Médios** conforme o fluxo que você for mexer.
5. **Baixos** em lote quando tocar nos arquivos vizinhos.
