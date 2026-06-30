# Football Manager Web — Como o Jogo Funciona

## Visão Geral

Football Manager Web é um simulador de gestão de futebol inspirado no Football Manager. O jogador assume o controle de um clube do Brasileirão e é responsável por todas as decisões: táticas, transferências, treino, finanças e dinâmica do plantel. O objetivo é conduzir o clube ao longo de uma temporada de 38 rodadas, buscando o título, classificação para torneios continentais ou evitando o rebaixamento.

O jogo roda com arquitetura cliente-servidor: um backend em Express mantém todo o estado do jogo em memória, e o frontend em React consome esse estado via API REST. Todas as regras e simulações acontecem no backend. O jogo suporta até **3 temporadas consecutivas** — ao final de cada uma, um resumo é exibido e o usuário pode iniciar a próxima temporada com os stats resetados.

---

## Estrutura da Temporada

- **Duração:** 38 rodadas (semanas) por temporada, representando um campeonato de pontos corridos. O jogo suporta até 3 temporadas consecutivas.
- **Times:** 20 clubes reais do Brasileirão Série A 2025, carregados a partir de arquivos JSON com dados reais (jogos, gols, assistências, atributos). Se o database não estiver disponível, o jogo gera 8 times procedurais como fallback.
- **Calendário:** A cada rodada, os 20 times são embaralhados e pareados dois a dois, gerando 10 partidas por semana.
- **Classificação:** Calculada após cada rodada, ordenando por pontos, saldo de gols e gols pró.
- **Zonas da tabela:**
  - **Título (Libertadores):** Top 4 (classificação para torneios continentais)
  - **Sul-Americana:** 5º ao 8º lugar
  - **Zona segura:** 9º ao antepenúltimo lugar
  - **Rebaixamento:** Últimos 3 colocados (marcados como rebaixados ao final da temporada, na semana 38)
- **Fim de temporada:** Ao completar 38 rodadas, o jogo exibe um **resumo de fim de temporada** (colocação final, zona, artilheiro e líder de assistências do time). O usuário pode iniciar a próxima temporada, que reseta os stats dos times, **limpa todo o estado de transferências e scouting** (incomingTransfers, transfers, counterOffers, deferredTransfers, inbox, scoutReports, pendingInstallments, incomingBonuses, transferAgreements, scoutMissions, shortlist, scoutRecommendations, activeLoans, biddingWars, fanMood, mediaPressure) e gera novo calendário. Após a 3ª temporada, o jogo é encerrado (`gameOver`).

---

## Sistema de Partidas

### Partida do Usuário vs. Partidas da IA

- **Partidas do usuário:** Ficam **pendentes** a cada rodada. O usuário pode jogá-las ao vivo no Centro de Partidas, com visualização 2D em tempo real (campo com discos representando os 22 jogadores, bola animada, placar ao vivo). Se o usuário avançar a semana sem jogar, a partida é **auto-finalizada** na próxima rodada usando o motor de simulação.
- **Partidas dos outros times:** São **simuladas automaticamente** quando o usuário avança a semana. O resultado é calculado instantaneamente e aplicado à classificação.

### Motor de Simulação (Passo a Passo)

Todas as partidas — tanto as do usuário quanto as dos times AI — usam o mesmo motor de simulação **minuto a minuto**, com cada minuto gerando ações individuais (passe, drible, chute, desarme, interceptação). O motor funciona assim:

1. **Posse inicial:** Determinada pela qualidade de passe dos titulares. O time com melhor média de passe tem mais chance de começar com a bola.
2. **A cada minuto**, o portador da bola decide entre três ações:
   - **Chutar:** Quanto mais perto do gol adversário, maior a probabilidade. A chance de gol depende de finalização, técnica, compostura do atacante vs. reflexos, posicionamento e concentração do goleiro. Chutes de longe são menos precisos; chutes de perto são mais difíceis de defender.
   - **Driblar:** Mais provável quando sob pressão defensiva. Sucesso depende de drible, técnica, agilidade, velocidade do atacante vs. desarme, marcação, força e antecipação do defensor.
   - **Passar:** Ação mais comum. Sucesso depende de passe, técnica, compostura, visão e decisões do passador, além do primeiro toque do receptor. A pressão defensiva reduz a precisão. Passes curtos aumentam a precisão; passes diretos reduzem.
3. **Posição da bola:** A bola se move no campo (0 = gol de casa, 1 = gol de visitante). Pases e dribles bem-sucedidos avançam a bola. Erros causam interceptação ou bola solta.
4. **Cruzamentos:** Ocorrem ocasionalmente quando a bola está na ponta do ataque. O sucesso depende do atributo de cruzamento do jogador.
5. **Faltas e cartões:** Após um desarme, há 25% de chance de falta. 15% de chance de cartão amarelo se houver falta. Faltas em zona perigosa (>65% do campo de ataque) disparam cobrança de falta com `simulateFreeKick` (tiro direto, cruzamento, curto ou bola longa). Faltas na área (8% chance) resultam em pênalti via `simulatePenalty`.
6. **Escanteios:** Após defesa do goleiro (20% chance) ou chute para fora na zona de ataque (35% chance), dispara `simulateCornerKick` com cobrança configurável (1º poste, 2º poste, área, curto, borda). A qualidade do cruzamento (`crossing`), cabeceio do alvo (`heading` + `jumping`) e defesa (`marking` + `heading` + `jumping` + `commandOfArea` + `aerialReach` do goleiro) determinam a chance de gol.
7. **Laterais:** 5% de chance por minuto de lateral, cobrado pelo estilo configurado (curto, longo, rápido).

### Bônus Tático e Multiplicadores de Tática

As configurações táticas do time afetam diretamente a simulação em duas camadas:

**Bônus tático base (getTacticalBonus):**
- Tática `attacking`: +4% de bônus base
- Tática `defensive`: +8% de bônus base
- **Mentalidade ofensiva:** +5%; mentalidade defensiva: +4%
- **Contra-pressionamento:** +3%; contra-ataque: +4%
- **Linha alta/linha de engajamento alta:** +2% a +3%
- **Pressão alta:** +3%; desarme agressivo: +2%
- **Ritmo rápido:** +3%; passes curtos: +2%
- **Levar bola à área:** +2%; armadilha de impedimento: +1%

**Multiplicadores de força por tática (aplicados após o bônus):**
- **Attacking:** Ataque ×1.12, Defesa ×0.85 — forte ofensivamente, fraco defensivamente
- **Balanced:** Ataque ×0.88, Defesa ×0.88 — penalidade em ambos para compensar flexibilidade
- **Defensive:** Ataque ×0.88, Defesa ×1.20 — fraco ofensivamente, forte defensivamente

A pressão defensiva sobre o portador também é afetada pela intensidade de pressão, contra-pressionamento e linha de engajamento do time defensor.

### Bolas Paradas (Set Pieces)

O sistema de bolas paradas é totalmente configurável na aba **Set pieces** da tela de Táticas e tem efeito direto na simulação de partidas. A configuração é persistida em `tacticsConfig.setPieces` (tipo `SetPiecesConfig`).

**Ataque:**
- **Escanteios:** 5 tipos de cobrança — 1º Poste (mais preciso, chance alta), 2º Poste (mais arriscado, chance menor), Área (equilibrado), Curto (posse segura, baixa chance de gol), Borda (chute de fora da área). O cobrador é selecionado por `crossing`; o alvo/cabeçador por `heading` + `jumping`. Se não houver jogador designado, o sistema auto-seleciona o melhor atributo.
- **Faltas:** 4 tipos — Tiro Direto (chance de gol baseada em `freeKicks` + `technique` + `finishing` + `longShots` + `composure` vs. `reflexes` + `positioning` do goleiro, modificado pela barreira), Cruzamento (bola na área para o melhor cabeçador), Curto (posse), Bola Longa (bola longa na área). A distância do gol afeta a precisão do tiro direto.
- **Laterais:** 3 estilos — Curto (posse), Longo (bola na área), Rápido (contra-ataque).
- **Pênaltis:** Cobrador designado por `finishing` + `composure`. Conversão base ~76%, modificada por atributos do cobrador vs. goleiro (`reflexes` + `oneOnOne`). Range: 55%-92%.

**Defesa:**
- **Escanteios defensivos:** Marcação Individual (+15% eficiência), Zonal (base), Misto (+8%). Opção de Contra-ataque (60% chance de sair rápido após afastar a bola, mas -3% na chance de criar chance adversária).
- **Faltas defensivas:** Marcação Individual (+10%), Zonal (base), Misto (+5%). Barreira Pequena (+15% chance de gol adversário), Média (neutro), Grande (-15% chance de gol adversário).

**Integração no motor:**
- `simulateMatchResult` (simulação rápida): bônus de set pieces adicionado ao lambda (gols esperados) — `setPieceStrength(attack) - setPieceStrength(defense)`, clamp -0.15 a +0.25
- `simulateMinute` (simulação passo a passo): escanteios após defesa (20%) ou chute fora (35% no ataque); faltas em zona perigosa (>65%); pênaltis (8% na área); laterais (5% por minuto)
- Atributos relevantes: `crossing`, `heading`, `jumping`, `freeKicks`, `finishing`, `composure`, `technique`, `longShots`, `marking`, `commandOfArea`, `aerialReach`, `reflexes`, `oneOnOne`, `positioning`

### Centro de Inteligência Pré-Jogo (Pre-Match Intelligence Center)

Antes de simular uma partida, o usuário pode acessar o **Intelligence Center** — uma análise preditiva que roda **500 simulações Monte Carlo** usando o mesmo motor de partida (`simulateMatchResult`) para gerar:

- **Probabilidade de resultado:** % de vitória casa, empate, vitória fora
- **Placar mais provável:** resultado com maior frequência nas 500 simulações
- **Gols esperados (xG):** média de gols por time arredondada
- **Força dos times:** `calculateTeamStrength` para casa e fora
- **Duelos decisivos:** comparações diretas entre melhores jogadores por posição:
  - Atacante (casa) vs Defensor (fora)
  - Meio-campo (casa) vs Meio-campo (fora)
  - Goleiro (casa) vs Atacante (fora)
  - Defensor (casa) vs Contra-atacante (fora)
  - Vantagem indicada quando diferença de rating > 5 pontos
- **Forma recente:** últimos 5 jogos (V/E/D) com pontuação (V=3, E=1, D=0)
- **Recomendação tática:** mentalidade sugerida (Ofensivo, Defensivo, Equilibrado, Cauteloso, Positivo) com:
  - Abordagem tática (linha defensiva, pressão, ritmo)
  - Justificativa baseada em diferença de força, forma e tática adversária
  - Nível de risco (baixo, médio, alto)
- **Nível de confiança:** maior probabilidade entre os três resultados
- **Vantagem de jogar em casa:** +12% (HOME_ADVANTAGE = 1.12)

A análise é gerada sob demanda via `getPreMatchAnalysis(matchIndex)` e exibida em um modal rico no `MatchCenter`.

### Intervenções do Usuário em Partida Ao Vivo

- **Substituições:** Máximo de 5 por partida por time.
- **Gritos (boost):** O usuário pode dar instruções que aplicam um bônus temporário ao seu time — mais chance de chutar e driblar, menos pressão sentida. O time adversário com boost exerce mais pressão.

### Avaliação de Jogadores por Partida

Ao final de cada partida, todos os 22 titulares recebem uma nota (4.0 a 10.0) baseada em:

- **Gols marcados:** +1.15 por gol
- **Assistências:** +0.65 por assistência
- **Goleiros:** +1.0 por clean sheet (não sofrer gols); -0.4 por gol sofrido
- **Zagueiros:** +0.6 por clean sheet; -0.22 por gol sofrido; +bônus por desarmes e interceptações
- **Meias:** +bônus por gols do time e precisão de passe
- **Atacantes:** +bônus por gols do time; -0.4 se não marcar nenhum gol
- **Vitória:** +0.4; **Derrota:** -0.35
- **Forma e condição física** influenciam a nota
- **Teto de qualidade** baseado na habilidade atual (CA) do jogador, com exceção para quem marca 2+ gols (teto mínimo de 9.5)

O melhor jogador da partida é destacado como "Melhor em Campo".

### Relatório Pós-Partida

Ao final de cada partida, é gerado um **relatório pós-jogo** com análise tática:

- **Mapa de calor:** Grid 3×3 (defesa/meio/ataque × esquerda/centro/direita) mostrando a distribuição de ações de cada time no campo, com intensidade visual (4 níveis).
- **Insights táticos:** Observações positivas, negativas e neutras sobre o desempenho de cada time (ex: domínio de posse, eficiência ofensiva, fragilidade defensiva).
- **Comentários do assistente:** Conselhos táticos, sobre jogadores e formação (ex: sugestão de mudança de mentalidade, alerta sobre jogador em má fase).
- **Breakdown de passes:** Passes certos vs. errados por time.
- **Zonas de ataque:** Distribuição de ações ofensivas por flanco (esquerda/centro/direita).

O relatório é exibido no Centro de Partidas após a conclusão da partida (ao vivo ou simulada).

### Interface do Centro de Partidas

- **Cards de partida:** badges de status (Agendada/Ao Vivo/Finalizada) com cores semânticas, tag "Seu Jogo" para partidas do usuário, placar com VS central
- **Placar ao vivo:** scoreboard com nomes dos times + barra de progresso de minuto (0-90')
- **Estatísticas:** barras de comparação dual (casa em azul, fora em âmbar) para xG, posse, chutes, passes
- **Ratings de jogadores:** badges circulares coloridos por faixa de nota (9+ verde, 7-8 lime, 5-6 amarelo, 3-4 laranja), grid responsivo, destaque para jogador da partida
- **Classificação:** marcadores coloridos por zona (Libertadores roxo, Sul-Americana âmbar, Rebaixamento vermelho) + legenda

### Estatísticas de Partida

A partida gera estatísticas coerentes:
- **xG (Gols Esperados):** Acumulado a cada chute, baseado na posição da bola e finalização do atacante
- **Posse de bola:** Calculada pela proporção de ações de cada time
- **Chutes e chutes no alvo:** Contabilizados em tempo real
- **Passes e precisão de passe:** Contabilizados por time
- **Eventos:** Gols, defesas, escanteios, faltas, cartões, pênaltis e laterais, ordenados por minuto

---

## IA Adversária (AI Manager)

Os 19 clubes controlados pela IA tomam **decisões ativas** a cada avanço de semana, tornando a liga dinâmica e realista:

### Transferências AI-vs-AI

- Ocorrem apenas durante **janelas de transferência**: semanas 1-12 (verão) e 20-26 (inverno).
- Cada time AI avalia seu elenco, identifica a posição mais fraca e busca jogadores em outros clubes (excluindo o time do usuário).
- A probabilidade de tentar uma compra depende da reputação do clube e posição na tabela (times maiores e em melhor posição são mais ativos; times na zona de rebaixamento também são mais ativos para reforçar o elenco).
- O vendedor decide se aceita com base em profundidade do elenco e importância do jogador. Jogadores-chave só são vendidos se a oferta for 150%+ do valor e o clube tiver pouca reposição.
- Transferências notáveis (craques ou entre grandes clubes) geram mensagens no inbox do usuário.

### Ajustes Táticos

- A cada 4 semanas, os times AI ajustam táticas com base na posição na tabela e forma recente:
  - **Zona de rebaixamento:** 50% attacking (mentalidade ofensiva, pressão alta, linha alta, ritmo rápido), 30% balanced (postura equilibrada), 20% defensive (postura cautelosa para segurar resultado).
  - **Zona de título:** Mantém equilíbrio; em boa fase, 40% de chance de adotar mentalidade positiva; em má sequência, recua para balanced.
  - **Zona intermediária:** 50% de chance de mudar para defensivo após sequência de derrotas; volta ao equilíbrio em boa forma.
- **Demissão de técnico:** Se um time AI tiver 5 derrotas consecutivas, há 40% de chance de demitir o técnico. O novo técnico pode adotar attacking (40%) ou balanced (60%), com nova formação.
- Ajuste ocasional de formação com base no elenco disponível (a cada 8 semanas).

### Renovação de Contrato

- Jogadores com contrato vencendo (≤10 semanas) são renovados automaticamente pela IA.
- Jogadores importantes (Key Player / Regular Starter) têm 85% de chance de renovação; demais dependem do desempenho do time.
- Salário renovado com aumento de 5-20%.

---

## Sistema de Transferências

### Visão Geral

O mercado de transferências permite comprar e vender jogadores entre os 20 clubes. O sistema simula negociações realistas com ofertas, contra-ofertas, parcelamentos, bônus e acordos contratuais.

### Comprar Jogadores

Existem duas formas de comprar:

1. **Compra Direta (`buyPlayer`):** Paga o valor de mercado do jogador à vista ou parcelado.
   - **À vista:** Deduz o valor total do orçamento.
   - **Parcelado:** Paga 30% de entrada + parcelas restantes a cada 4 semanas (2 a 4 parcelas). O vendedor recebe 80% do valor (20% vai para custos/agentes).
   - O jogador comprado entra no elenco com status "Rotação".

2. **Fazer Oferta (`makeOffer`):** Inicia uma negociação com o time vendedor. O resultado pode ser:
   - **Aceito:** O time aceita a oferta.
   - **Contra-oferta:** O time propõe um valor diferente.
   - **Recusado:** O time recusa a oferta.
   - **Desistência:** O time encerra a negociação (após 3+ rodas de negociação).

### Vontade do Jogador

Cada jogador tem um nível de vontade de mudar de clube (0-100), que afeta a negociação:

- **Jovens (< 21 anos):** -15 (preferem ficar)
- **Veteranos (> 29 anos):** +20 (querem rotação)
- **Status no plantel:** "Excesso" (+25), "Rotação" (+10), "Jogador Chave" (-15)
- **Moral baixa (< 40):** +20; **Moral alta (> 75):** -10
- **Reputação do comprador vs. vendedor:** Diferença positiva aumenta a vontade

A vontade reduz a "teimosia" do vendedor — quanto mais o jogador quer sair, mais flexível o clube é na negociação.

### Lógica de Aceitação de Ofertas

A probabilidade de aceitação depende de:
- **Ratio oferta/valor de mercado:**
  - **≥ 100%:** 92% de chance de aceitação (menos teimosia do vendedor)
  - **90-100%:** 55% aceita, 35% contra-oferta, 10% recusa
  - **75-90%:** 50% contra-oferta, 50% recusa
  - **60-75%:** 20% contra-oferta, 80% recusa
  - **< 60%:** Recusa categorica
- **Teimosia do vendedor:** Baseada na reputação do clube (0.01 a 1.0)
- **Fadiga de negociação:** A cada rodada após a primeira, o vendedor fica 5% menos flexível. Após 3 rodadas, há chance de desistência (12% na 3ª, 24% na 4ª).
- **Máximo de 4 rodas** de negociação.

### Negociação de Contrato

Após o time aceitar a oferta, o jogador precisa concordar com o contrato. O salário esperado depende:
- **Salário atual** do jogador
- **Fator de prêmio:** Jogadores com pouca vontade de sair pedem mais (até 150% do salário atual); jogadores com muita vontade aceitam menos (até 80%)
- A negociação de contrato segue a mesma lógica de aceitação/contra-oferta/recusa, com máximo de 4 rodas.

### Ofertas Recebidas (Venda de Jogadores)

- A cada avanço de semana, há **35% de chance** de um time adversário fazer uma oferta por um jogador do seu elenco.
- A oferta inclui: preço (80% a 120% do valor de mercado), proposta de contrato (salário, duração, cláusula), método de pagamento (à vista ou parcelado) e possivelmente bônus.
- O usuário pode **aceitar, rejeitar, adiar ou contra-propor**.
  - **Adiar:** A oferta fica pendente e pode ser reinstada ou rejeitada depois.
  - **Contra-oferta:** O usuário propõe 20-30% menos que o valor original, com novo método de pagamento e bônus.

### Parcelas e Bônus

- **Parcelas:** Para transferências acima de R$ 10M, o pagamento pode ser parcelado em 3 a 6 vezes, com vencimento a cada 4 semanas. O pagamento é automático se houver orçamento; se não, a parcela fica vencida e gera alerta no inbox. Cada cláusula de parcelamento tem um campo `direction` que indica se o usuário deve pagar (`payable`) ou receber (`receivable`) — quando o usuário vende um jogador e o comprador paga em parcelas, as parcelas são marcadas como `receivable` e o usuário recebe o dinheiro automaticamente.
- **Bônus de performance:** Podem ser incluídos nas ofertas (gols, aparições, assistências, títulos, performance). Os bônus são verificados a cada semana com base em **estatísticas reais** do jogador: gols (`seasonGoals >= threshold`), assistências (`seasonAssists >= threshold`), aparições (`team.played >= threshold`), títulos (`league position == 1`), performance (`form >= threshold`). Uma vez disparados, o usuário pode reclamá-los para receber o valor.

### Acordos Contratuais

Cada transferência gera um **acordo contratual** completo com:
- Salário semanal (100-150% do salário anterior)
- Duração do contrato (1 a 4 anos, em semanas)
- Cláusula de rescisão (120-150% do valor da transferência)
- Possivelmente bônus de performance (40% de chance)
- Histórico de alterações (criação, término, etc.)

### Histórico de Transferências

Todas as transferências concluídas são registradas com: jogador, time de origem, valor, método de pagamento, duração do contrato, salário e semana da transferência.

### Empréstimos

O sistema suporta empréstimos de jogadores entre clubes:

- **`loanPlayer`:** Empresta um jogador de outro clube. Define taxa de empréstimo, contribuição salarial semanal, duração em semanas e opção de compra (opcional ou obrigatória).
- **`recallLoanedPlayer`:** Recalla um jogador emprestado antes do fim do contrato.
- **`buyLoanedPlayer`:** Ativa a opção de compra de um jogador emprestado, pagando a taxa acordada.
- O empréstimo reduz as semanas restantes a cada `advanceWeek()`. Quando chega a zero, o empréstimo é concluído automaticamente.
- O jogador emprestado entra no elenco do time destinatário durante o período do empréstimo.

### Cláusulas de Rescisão

- **`activateReleaseClause`:** Permite contratar um jogador pagando diretamente sua cláusula de rescisão (`contractClause`), desde que o orçamento do clube seja suficiente.
- A cláusula bypassa a negociação normal — o jogador é transferido imediatamente.
- Disponível como botão nos cards de jogadores no Mercado.

### Guerra de Ofertas (Bidding Wars)

Quando o usuário faz uma oferta por um jogador, outros clubes podem competir:

- **`raiseBid`:** Aumenta a oferta do usuário em uma guerra de ofertas ativa.
- **`withdrawBid`:** Retira a oferta do usuário da guerra.
- Cada guerra tem um número máximo de rodadas. O usuário pode aumentar ou retirar a qualquer momento.
- As ofertas dos clubes AI são visíveis na aba "Guerra de Ofertas".
- O status pode ser: ativo, vencido (won), perdido (lost) ou retirado (withdrawn).

---

## Sistema de Scouting (Olheiros)

### Visão Geral

Cada time possui 2 olheiros (Sênior e Júnior) com atributos de **avaliação de habilidade** e **avaliação de potencial** (escala 1-20). Os olheiros podem ser designados para observar jogadores de outros times.

### Conhecimento de Jogadores

O conhecimento sobre cada jogador é um valor de 0 a 100 que determina quanta informação você vê:

- **< 25:** Atributos completamente desconhecidos (nulo)
- **25-75:** Atributos mostrados como intervalo (ex: "12-16"), baseado na capacidade do olheiro
- **> 75:** Atributos exatos revelados

O CA (habilidade atual) é arredondado em blocos de 20 até 50% de conhecimento. O PA (potencial) só é revelado com 75%+ de conhecimento.

### Missões de Scouting

- O usuário designa um olheiro para observar um jogador por um número de semanas.
- A cada semana, o conhecimento aumenta em **8 + judgingAbility/2** pontos.
- Quando o conhecimento cruza **50%**, um relatório parcial é gerado e enviado ao inbox.
- Quando o conhecimento cruza **100%**, um relatório final é gerado com nota de recomendação (A a F).
- A missão termina quando o conhecimento chega a 100 ou as semanas acabam.
- **Scout sem alvo:** Quando chamado sem `playerId`, o sistema embaralha todos os candidatos disponíveis (sem relatório existente) e seleciona 3 aleatoriamente, evitando que os mesmos jogadores sejam sempre observados.

### Relatórios de Scout

Os relatórios incluem:
- CA e PA estimados (com margem de erro baseada no olheiro)
- Intervalos de atributos (passe, técnica, finalização, velocidade, resistência)
- Estrelas de potencial (1-5, baseado em PA)
- Confiabilidade do relatório (1-5, baseada no olheiro)
- **Nota de recomendação (A a F):** Compara o jogador com a média do elenco do usuário:
  - **A:** Jogador muito acima do nível do elenco (≥ 130%)
  - **B:** Boa contratação (≥ 115%)
  - **C:** No nível do elenco (≥ 100%)
  - **D:** Contratação de risco (≥ 85%)
  - **E:** Não recomendado (≥ 70%)
  - **F:** Não contratar (< 70%)

### Shortlist

O usuário pode manter uma lista de jogadores observados para acompanhamento:

- **`addToShortlist(playerId, priority?, notes?)`:** Adiciona um jogador à shortlist com prioridade (alta, média, baixa) e notas opcionais.
- **`removeFromShortlist(playerId)`:** Remove um jogador da shortlist.
- **`getShortlist()`:** Retorna a lista atual.
- A shortlist é exibida na aba "Shortlist" do Mercado de Transferências, ordenada por prioridade.
- Cada entrada mostra dados do jogador (posição, idade, valor, clube) e botão para negociar diretamente.
- Botão ☆/★ disponível nos cards do Mercado para adicionar/remover da shortlist.

### Recomendações de Scouts

Scouts podem gerar recomendações automáticas de jogadores:

- **`ScoutRecommendation`:** Inclui jogador, posição, idade, CA/PA estimados, clube atual, valor estimado, nota (A-F), motivo da recomendação, scout responsável e semana.
- **`dismissScoutRecommendation(recommendationId)`:** Dispensa uma recomendação (marca como `dismissed`).
- Exibidas na aba "Recomendações" do Mercado de Transferências.

### Experiência de Scouts

Cada scout possui campos de experiência que evoluem ao longo do jogo:

- **`experience`:** Pontos de experiência acumulados. A cada missão concluída, o scout ganha experiência.
- **`missionsCompleted`:** Número total de missões concluídas.
- O painel de olheiros na aba Scouting mostra esses valores com barra de progresso.
- Scouts com mais experiência tendem a gerar relatórios mais precisos.

---

## Sistema de Táticas

### Formações e Escalação

O usuário pode arrastar e soltar jogadores nas posições do campo. As formações disponíveis incluem 4-4-2, 4-3-3, 3-5-2, 5-2-2. Cada posição tem um **role** (função) e um **duty** (dever) que afetam o desempenho.

A escalação de titulares oferece múltiplas formas de troca:
- **Auto-preencher (Plus / Sugestão de seleção / Escolha rápida):** preenche automaticamente os 11 slots com os melhores jogadores por posição (ordenados por `currentAbility`), com fallback para qualquer jogador disponível se não houver candidato da posição ideal.
- **Drag-and-drop:** arrasta um titular para outro slot no campo 2D para trocar jogadores entre posições (`swapSlots`).
- **Setas de navegação (↑/↓ na topbar):** ciclam formações sequencialmente sem precisar abrir o painel de edição.
- **Salvar (ícone Download):** salva o jogo no slot 1 com feedback visual de status.

O campo 2D vertical exibe marcadores com camisa, código do role e duty, coloridos por linha (GK/DEF verde, MID âmbar, FWD vermelho). O banco lateral mostra os nomes reais dos reservas. A tabela de seleção à direita permite filtrar entre titulares e elenco completo (botão Filter).

### Sub-abas da tela de Táticas

- **Overview / Player:** tabela completa de seleção com titulares por slot + reservas
- **Opposition:** análise do próximo adversário (nome, casa/fora)
- **Roles:** tabela de papéis e funções por slot da formação
- **Set pieces:** painel completo de bolas paradas (Ataque: escanteios com cobrança + cobrador + alvo, faltas com cobrança + cobrador, laterais com estilo, pênaltis com cobrador; Defesa: marcação de escanteios + contra-ataque, marcação de faltas + barreira)
- **Numbers:** placeholder (a implementar)

### Instruções Táticas

O sistema tático tem três fases:

1. **Em Posse:**
   - Largura de ataque (estrito, equilibrado, largo)
   - Estilo de passe (curto, misto, direto)
   - Ritmo (lento, equilibrado, rápido)
   - Foco lateral (esquerda, direita, nenhum)
   - Toggles: levar bola à área, cruzar das laterais, assumir mais riscos

2. **Em Transição:**
   - Ao perder a posse: contra-pressionar ou recuar
   - Ao ganhar a posse: contra-atacar ou manter estrutura

3. **Sem Posse:**
   - Linha de engajamento (alta, média, baixa)
   - Linha defensiva (alta, média, baixa)
   - Intensidade de pressão (baixa, média, alta)
   - Estilo de desarme (agressivo ou contido)
   - Toggle: armadilha de impedimento

### Mentalidade

7 níveis disponíveis: Muito Defensivo → Defensivo → Cauteloso → Equilibrado → Positivo → Ofensivo → Muito Ofensivo. A mentalidade afeta o bônus tático aplicado na simulação de partidas.

### Instruções Individuais

Cada jogador pode receber instruções individuais por posição, com roles específicos para GK, DEF, MID e FWD.

---

## Sistema de Treino

### Plano Semanal

O usuário define um plano de treino semanal em uma grade de 7 dias × 3 períodos (Manhã, Tarde, Noite). Os tipos de treino são:

- **Físico:** Melhora resistência e velocidade. Causa mais fadiga e risco de lesão. Aumenta carga acumulada.
- **Técnico:** Melhora passe, técnica e finalização. Fadiga moderada. Reduz carga acumulada.
- **Coesão:** Aumenta moral do jogador. Fadiga baixa.
- **Médico/Recuperação:** Restaura condição física (+10), reduz carga acumulada, acelera recuperação de lesão (-2 dias).
- **Leve:** Recuperação leve (+3 de condição, reduz carga).

### Progressão de Atributos e CA

A cada semana, o treino é aplicado a todos os jogadores não-lesionados **dentro do `set()` batched de `advanceWeek`**, garantindo que as alterações de treino não sejam sobrescritas pelo estado local e evitando múltiplos re-renders:
- O foco do treino (físico, técnico, coesão, médico/recuperação, leve) é passado diretamente para `updatePlayerAttributes` — cada tipo aplica seus efeitos corretamente (ex: médico restaura condição e acelera recuperação de lesão, leve faz recuperação leve).
- A melhoria é aleatória (0.2 a 1.0 por semana), limitada a 20 (teto da escala).
- **Current Ability (CA):** Após cada sessão de treino, o CA é recalculado com base no ganho de atributos, modulado por um **fator de idade**:
  - < 21 anos: ×1.5 (jovens evoluem 50% mais rápido)
  - 21-23 anos: ×1.2
  - 24-27 anos: ×0.8
  - 28-30 anos: ×0.4
  - 31+ anos: ×0.1 (praticamente estagnado)
  - Fórmula: `CA_novo = min(potentialAbility, 200, CA_anterior + (improvement × 0.5) × ageFactor)` — **respeita o teto de PA** do jogador
- Snapshots semanais registram a progressão de atributos para visualização.

### Fadiga e Carga

- **Carga acumulada:** Aumenta com treino físico (+8 por sessão). Reduz com treino técnico (-4), coesão (-2), recuperação (-10) ou leve (-5).
- **Dias físicos consecutivos:** Treinar físico em dias seguidos aumenta exponencialmente o risco de lesão.
- **Condição física:** Cai com treino físico (-8), técnico (-3), coesão (-2). Sobe com recuperação (+10) ou leve (+3).
- **Decaimento semanal:** A cada avanço de semana, a carga acumulada decai em 5, a condição física aumenta em 5 (recuperação natural) e os dias físicos consecutivos diminuem em 1. Esta lógica é centralizada no helper compartilhado `applyFatigueDecayToPlayer` (em `backend/src/store/helpers/injury.ts`), usado tanto por `advanceWeek` quanto por `applyFatigueDecay`.

---

## Sistema de Lesões

### Estrutura da Lesão

A lesão de um jogador é representada no objeto `injury` com os seguintes campos:
- `active`: boolean — se a lesão está ativa
- `daysRemaining`: dias restantes para recuperação
- `totalDays`: duração total original da lesão (para cálculo de progresso)
- `type`: tipo da lesão (`muscle`, `ligament`, `joint`, `ankle`, `knee`, `groin`)
- `severity`: `minor`, `moderate` ou `severe`
- `source`: origem da lesão (`training`, `match`, `random`)

### Cálculo de Risco

O risco de lesão de cada jogador é calculado semanalmente via `calculatePlayerInjuryRisk` com base em:

- **Já lesionado:** Retorna 0 (não está sujeito a novas lesões)
- **Tendência a lesões** (atributo oculto, 1-10): 0-30% de risco base
- **Dias físicos consecutivos:** Risco cresce exponencialmente (1.5^dias × 5%)
- **Carga acumulada acima de 5:** +3% por ponto excedente
- **Condição física baixa (< 50):** +0.3% por ponto abaixo de 50
- **Recuperação necessária:** +15%
- **Lesões anteriores não recuperadas:** +10% cada
- **Fadiga alta (> 60):** +15%; fadiga moderada (> 40):** +8%
- **Idade:** ≥32 anos +10%; 28-31 anos +5%
- **Condição degradada pós-lesão:** +6% a +20% dependendo do nível

**Redutores:**
- **Nível das instalações:** Até -20% (2% por nível)
- **Nível da equipe médica:** Até -15% (1.5% por nível)

### Níveis de Risco

- **Baixo:** < 30%
- **Moderado:** 30-59%
- **Alto:** 60-79% (gera alerta no inbox sugerindo descanso)
- **Crítico:** ≥ 80% (gera alerta urgente sugerindo substituição imediata)

### Geração de Lesões (Centralizada)

Toda lesão é gerada pela função centralizada `generateInjuryForPlayer` (em `backend/src/store/helpers/injury.ts`), garantindo consistência entre treino, partida e eventos aleatórios:

- **Severity roll:** Baseado em `Math.random() × 100 + proneness × 5 + risk × 0.3`
  - < 50: **minor** (5-12 dias)
  - 50-79: **moderate** (13-27 dias)
  - ≥ 80: **severe** (28-69 dias)
- **Multiplicadores de duração:**
  - Idade ≥32: ×1.3; 28-31: ×1.15
  - Condição física < 40: ×1.2
  - Redução por staff/facilities: `staffLevel × 0.5 + facilitiesLevel × 0.3` (mínimo 3 dias)
- **Tipo de lesão:** Aleatório entre `muscle`, `ligament`, `joint`, `ankle`, `knee`, `groin`
- **Efeitos colaterais:** Registra no `injuryHistory`, define `lastInjuryWeek`, aplica `degradedCondition` (severe→minimal, moderate→low, minor→moderate), reduz fitness em 15

**Fontes de lesão:**
- **Treino físico:** Chance baseada em proneness, carga e fitness. Usa `generateInjuryForPlayer` com source `training`.
- **Roll semanal (advanceWeek):** Chance de 2% base + `risk × 0.08%` por jogador não lesionado. Usa `generateInjuryForPlayer` com source `random`. Gera mensagem no inbox com tipo, severidade e dias.
- **Inbox não gera mais lesões aleatórias:** O case `injury` foi removido de `generateInboxMessage`. Lesões agora são geradas apenas pelo sistema de risco.

### Cura Semanal (Centralizada)

A cura de lesões é processada por `healInjuryForPlayer` durante `advanceWeek`:

- **Taxa base:** 7 dias por semana
- **Bônus de staff:** `+staffLevel × 0.5` dias
- **Bônus de facilities:** `+facilitiesLevel × 0.3` dias
- **Penalidade de idade:** ≥32 anos ×0.8; 28-31 anos ×0.9
- **Penalidade de severidade:** Se `daysRemaining > totalDays × 0.5` (primeira metade da lesão): severe ×0.7, moderate ×0.85
- **Ao curar:** Marca a lesão mais recente não recuperada no `injuryHistory` como `fullyRecovered: true`, restaura fitness em +15

**Recuperação por treino:** Sessões médico/recuperação reduzem `daysRemaining` em 2 dias (via `reduceInjuryFromRecoveryTraining`). Sessões médico no `applyPreventionSession` reduzem em 3 dias.

### Condição Degradada Pós-Lesão

Após a recuperação, o jogador tem uma **condição degradada** que melhora gradualmente:
- **Progressão:** minimal → low → moderate → good → removida
- **Timeline:** minimal após 4+ semanas → low; low após 2+ semanas → moderate; moderate após 1+ semana → good; após 8+ semanas → removida
- Centralizada em `updateDegradedConditionForPlayer` (em `backend/src/store/helpers/injury.ts`)

### Decaimento de Fadiga (Semanal)

A cada avanço de semana, `applyFatigueDecayToPlayer` aplica recuperação natural:
- **Fitness:** +5 (recuperação durante descanso)
- **Carga acumulada:** -5
- **Dias físicos consecutivos:** -1
- **Recovery needed:** Limpo se fitness > 30 e carga ≤ 20

### Outras Regras

- Jogadores lesionados não participam de treinos e não podem jogar.
- **Todas as ações de lesão e treino** buscam jogadores **apenas no time selecionado** (`state.selectedTeam`).
- **Recuperação na tela de treino:** O botão "Recuperar" foi removido do Monitor de Fadiga. A recuperação acontece pela cura automática semanal e por sessões de treino médico/recuperação.
- **`recoverInjuredPlayer`:** Marca apenas a lesão mais recente não recuperada no `injuryHistory` (não todas), e restaura fitness para mínimo 40 + 10.
- **`getInjuryReport`:** Usa os dados armazenados na lesão (`type`, `severity`, `daysRemaining`, `totalDays`) em vez de derivar deterministicamente por hash do playerId. Progresso de recuperação calculado como `100 - (daysRemaining / totalDays × 100)`.

---

## Classificação e Liga

### Cálculo

A classificação é recalculada após cada rodada, considerando todas as partidas completadas:
- **Pontos:** Vitória = 3, Empate = 1, Derrota = 0
- **Desempate:** Saldo de gols → Gols pró
- **Forma:** Últimos 5 resultados (W/D/L) exibidos ao lado de cada time

### Zonas

- **Título (Top 4):** Classificação para torneios continentais
- **Europa (5º-8º):** Zona intermediária
- **Segura (9º ao antepenúltimo):** Sem risco
- **Rebaixamento (Últimos 3):** Marcados como rebaixados ao final da temporada (semana 38)

---

## Finanças

### Fórmulas Centralizadas (shared finance helper)

Todas as fórmulas financeiras estão centralizadas em `backend/src/store/helpers/finance.ts` (backend) e espelhadas em `frontend/src/utils/finance.ts` (frontend). Isso garante consistência entre simulação, UI e relatórios.

### Valor de Mercado e Salário de Jogadores

- **Valor de mercado** (`calculateMarketValue`): Escala exponencial baseada no overall (0-100):
  - Overall < 60: aleatório (0 a 1M)
  - 60-69: `(o-60) × 0.8 + aleatório` (até ~8M)
  - 70-77: `(o-70) × 3 + 8 + aleatório` (até ~30M)
  - 78-84: `(o-78) × 10 + 30 + aleatório` (até ~95M)
  - 85+: `(o-85) × 25 + 95 + aleatório` (até ~200M+)
- **Salário semanal** (`calculatePlayerSalary`): `max(5, marketValue × 20 + aleatório)` em milhares

### Receitas e Despesas Semanais

A cada avanço de semana, o orçamento do clube é atualizado:

- **Receitas:**
  - Bilheteira: `(reputação/50)² × 1.5` por semana
  - Patrocínio: `(reputação/50)² × 1.2` por semana
- **Despesas:**
  - Salários (semanal): `wageBill × (12/52)` — folha mensal prorrateada
  - Infraestruturas: `facilitiesLevel × 0.2` por semana
- **Balanço semanal:** `bilheteira + patrocínio - salários - infraestruturas`

### Orçamento e Limite Salarial

- **Orçamento do time** (`calculateTeamBudget`): `(reputação/30)² × 20 + aleatório` (em milhões)
- **Orçamento de transferências** (`calculateTransferBudget`): `40% a 60% do orçamento total`
- **Limite salarial recomendado** (`calculateWageLimit`): `60% da renda mensal estimada`
  - Renda mensal = `(bilheteira + patrocínio) × 52/12`
  - Se a folha salarial exceder o limite, é exibido alerta "Folha acima do limite recomendado"

### Gestão Financeira

- **Orçamento de transferência:** Usado para comprar jogadores. Reduz com compras à vista ou entrada de parceladas.
- **Folha salarial:** Soma de todos os salários do elenco (`recalcWageBill`). Recalculada automaticamente após transferências.
- **Ajuste de salários:** O usuário pode ajustar o salário individual de cada jogador via slider na tela de Finanças.
- **Projeção:** O sistema projeta o balanço financeiro para as próximas 6 semanas.
- **Parcelas vencidas:** Se o orçamento não cobrir uma parcela, ela fica vencida e gera alerta no inbox.
- **Relatório financeiro** (`FinancialReport`): Inclui `facilityCosts` como campo distinto de despesa.

---

## Dinâmica do Plantel

### Hierarquia

O plantel tem uma hierarquia visualizada em pirâmide:
- **Líderes:** Jogadores com maior influência no grupo
- **Jogadores importantes:** Nível intermediário
- **Outros:** Restante do elenco

### Grupos Sociais

Cada jogador pertence a um grupo social baseado em afinidade (nacionalidade, idade, posição). A árvore social mostra as conexões entre jogadores e influencia a moral do grupo. As conexões entre jogadores são atualizadas de forma imutável, preservando o contrato de imutabilidade do Zustand.

**Visualização:** Cards em grid responsivo com avatar de grupo (👤/👥), avatares circulares com iniciais por jogador, barra de coesão com gradiente (moral média do grupo), badges de posição e status do plantel, accent gradient no topo por grupo (até 6 cores). Hover com elevação e sombra. Layout adaptativo para mobile.

### Promessas

O usuário pode fazer promessas a jogadores (ex: "vai jogar mais", "vamos contratar reforços"). Cada promessa tem um prazo (countdown) que decrementa a cada semana. Promessas não cumpridas afetam a moral e a confiança do jogador.

### Moral e Dinâmica Semanal

A cada avanço de semana, a moral de todos os jogadores é atualizada por um sistema de **dinâmica de vestiário** com 6 motores. As conexões entre jogadores são **bidirecionais** — ao atualizar a força de uma conexão A→B, a conexão B→A também é atualizada/criada.

1. **Promessas expiradas:** -12 de moral por promessa não cumprida.
2. **Tempo de jogo vs. status:** Key Player no banco: -8; Regular Starter no banco: -5; titular jogando: +2; Excesso no elenco: -3.
3. **Forma do time:** 4+ vitórias nos últimos 5: +5; 3 vitórias: +3; 4+ derrotas: -6; 3 derrotas: -4 (modulado por idade — jovens mais resilientes, veteranos mais afetados).
4. **Cascata do capitão:** Se o capitão (maior liderança) tiver moral <40, aliados diretos perdem moral (-4 a -10 dependendo da gravidade).
5. **Cascata de grupo social:** Se a moral média de um grupo social for <40, membros com moral mais alta convergem para baixo (-3 a -5).
6. **Regressão à média:** Moral extrema tende ao centro — euforia (>85) diminui -1; fundo do poço (<20) recupera +2; moral baixa (<35) recupera +1.

Além disso, o treino de coesão (+5 por sessão) e o status no plantel continuam afetando a moral.

---

## Sistema de Coletiva de Imprensa

### Visão Geral

O treinador pode participar de coletivas de imprensa antes e depois das partidas. As respostas dadas aos jornalistas afetam a moral do elenco, a satisfação da diretoria, o humor da torcida e a pressão midiática.

### Tipos de Coletiva

- **Pré-jogo:** Disponível antes de cada partida do usuário. Perguntas sobre o adversário, táticas, forma do time e expectativas.
- **Pós-jogo:** Disponível após a partida. Perguntas sobre o resultado, desempenho, polêmicas e controvérsias.
- **Geral:** Coletiva sem contexto de partida, focada em transferências, diretoria e objetivos da temporada.

### Perguntas

Cada coletiva gera 3-4 perguntas contextualizadas, sorteadas de um banco de templates com as seguintes categorias:

- **match_preview / match_review:** Expectativas e análise do jogo
- **transfer:** Mercado de transferências
- **player_form:** Forma de jogadores específicos (referencia um jogador do elenco)
- **tactics:** Escolhas táticas e esquema de jogo
- **board:** Relação com a diretoria
- **rivalry:** Rivalidades e clássicos
- **injury:** Lesões no elenco
- **season_goals:** Objetivos da temporada
- **controversy:** Situações polêmicas (arbitragem, vestiário)

Cada pergunta tem um **tom** (agressivo, neutro, amigável, provocativo) que influencia como os efeitos são calculados. O tom é determinado pelo perfil do jornalista (cada um tem um bias) e pelo template da pergunta.

### Respostas

O treinador escolhe uma resposta entre 5 tons possíveis, cada um com 3 variantes de texto:

- **Elogiar (praise):** Aumenta moral (+3) e humor da torcida (+2), reduz pressão midiática (-1)
- **Defensivo (defensive):** Neutro na moral, leve aumento de pressão midiática (+1)
- **Crítico (critical):** Reduz moral (-4), aumenta pressão midiática (+3), torcida não gosta (-2)
- **Diplomático (diplomatic):** Pequeno aumento de moral (+1), melhora relação com diretoria (+2), reduz pressão (-2)
- **Desviar (deflect):** Leve redução de moral (-1), diretoria não gosta (-1), mídia pressiona (+2)

### Modificadores Contextuais

- Responder **crítico** a pergunta **agressiva/provocativa** → +2 pressão midiática extra
- Responder **diplomático** a pergunta **agressiva** → -1 pressão midiática, +1 diretoria
- Responder **evasivo** a pergunta **agressiva** → +2 pressão midiática
- Elogiar em resposta a pergunta **amigável** → +2 moral extra
- Elogiar jogador específico → +2 moral extra para aquele jogador
- Criticar jogador específico → -3 moral extra para aquele jogador
- Postura firme em clássico (elogiar/crítico) → +2 humor da torcida

### Efeitos Totais

Os efeitos de cada resposta são somados e limitados a ±10 por coletiva. Ao concluir, uma **manchete** é gerada automaticamente baseada no tom geral das respostas. A **satisfação da diretoria** (`boardSatisfaction`) é clampada no range **-100 a 100** (não 0-100).

### Pular Coletiva

Pular uma coletiva gera +3 de pressão midiática (a mídia interpreta como falta de transparência).

### Humor da Torcida (Fan Mood)

- Valor de 0 a 100 (50 = neutro)
- Sentimentos: eufórica (85+), feliz (70+), satisfeita (55+), neutra (45+), preocupada (30+), irritada (15+), furiosa (<15)
- Tendência: subindo, estável, caindo
- **Decaimento semanal:** Resultados recentes afetam o humor — 3+ vitórias: +3; 2 vitórias: +1; 3+ derrotas: -5; 2 derrotas: -2. Regressão à média: >70: -1; <30: +2.
- **Impacto financeiro:** Torcida feliz aumenta receita de bilheteria em até +20%; torcida brava reduz em até -15% (modificador `getFanMoodRevenueModifier`)

### Pressão Midiática (Media Pressure)

- Valor de 0 a 100 (**50 = inicial/neutro**)
- Níveis: baixa (<25), moderada (25-49), alta (50-74), intensa (75+)
- **Valor inicial do jogo:** 50 (baixa) — consistente com a documentação (50 = neutro)
- **Decaimento semanal:** -2 por semana (a pressão diminui naturalmente sem novos incidentes)
- **Impacto no desempenho:** Pressão intensa: -5% na força do time; alta: -3%; moderada: -1% (modificador `getMediaPressurePerformanceModifier`)

### Integração com advanceWeek

A cada avanço de semana, `processWeeklyPressDecay` é chamado ao final do processamento para atualizar o humor da torcida (baseado na forma recente) e reduzir a pressão midiática.

---

## Caixa de Entrada (Inbox)

A cada semana, o sistema gera mensagens contextuais para o inbox:

- **Transferências:** Ofertas recebidas, bônus ativados, parcelas vencidas
- **Lesões:** Alertas de risco alto/crítico, jogadores lesionados
- **Sugestões:** Recomendações de descanso, substituição
- **Diretoria:** Expectativas da diretoria, cobranças por resultados
- **Base:** Jogadores juvenis promovidos
- **Treino:** Progressão de atributos, fadiga
- **Financeiro:** Relatórios financeiros, alertas de orçamento

As mensagens podem ter ações associadas (aceitar oferta, responder à diretoria, etc.).

---

## Diretoria

- **Expectativa:** Define o que a diretoria espera do time, baseada na **distribuição relativa** das reputações dentro da liga (percentis):
  - Top 10% por reputação → Título
  - Próximos 30% → G4 / Libertadores
  - Próximos 40% → Meio de tabela
  - Bottom 20% → Evitar rebaixamento
  - Calculado por `assignBoardExpectations(teams)` em `initGame()`, após todos os times serem carregados/gerados
- **Satisfação:** Varia de 0 a 100, baseada nos resultados e nas respostas do usuário às mensagens da diretoria
- **Promessas da diretoria:** Objetivos com prazo (ex: "alcançar top 4 até a semana 20")

---

## Base de Juvenis

- Na **semana 1** de cada temporada, uma fornada de 6 jogadores juvenis é gerada automaticamente e adicionada ao elenco.
- A qualidade dos juvenis depende do nível das instalações de base do clube.
- O usuário pode promover jogadores da base para o elenco principal. Ao promover, os atributos técnicos, mentais e físicos do jovem são copiados diretamente (preservando o desenvolvimento da academia).
- Existe também uma equipe reserva para desenvolvimento de jogadores.

---

## Visualização 2D de Partidas

### Campo e Jogadores

- O campo é renderizado em 2D com discos coloridos representando os 22 jogadores titulares.
- As cores dos times são derivadas deterministicamente do nome do clube (hash → hue), com correção se as cores forem iguais.
- O time da casa ataca para a direita; o visitante para a esquerda.

### Movimento Dinâmico

A cada "tick" da bola (~700ms), os 22 jogadores recalculam suas posições com um modelo de 5 camadas:

1. **Shift de bloco:** Toda a equipe avança (atacando) ou recua (defendendo) proporcional ao progresso da bola.
2. **Comportamento individual por posição:** GK acompanha a bola lateralmente; laterais sobem no ataque; meias cobrem todo o meio-campo; atacantes fazem runs diagonais.
3. **Pressing:** Jogador mais próximo da bola persegue ativamente; segundo mais próximo faz cobertura.
4. **Espaçamento:** Jogadores não-envolvidos se abrem para o lado oposto da bola.
5. **Limites por posição:** GK restrito à área; zagueiros até meio-campo; meias quase todo o campo; atacantes do meio-campo ao gol adversário.
6. **Micro-jitter:** Movimento natural aleatório de ±2%.

### Celebração de Gols

Quando há gol, a bola corre para o gol, os jogadores do time atacante avançam, o disco do autor pisca em dourado, e um letreiro "GOL!" com o nome aparece. Ao fim da celebração, todos voltam às posições base.

---

## Saves

- **2 slots** de save disponíveis.
- Os saves são armazenados como arquivos JSON no disco do servidor.
- Cada save registra: time selecionado, semana atual, temporada e timestamp.
- O usuário pode salvar, carregar e deletar saves a qualquer momento.

---

## Tema Visual

- **3 modos:** Claro, Escuro, Sistema (segue a preferência do sistema operacional)
- A preferência é armazenada em localStorage e aplicada antes da renderização do React (anti-flash).
- O design segue uma estética funcional e densa, inspirada em ferramentas reais de gestão esportiva — não em jogos casuais.
- **Design tokens:** Cores definidas em `oklch()` com fallbacks hex para navegadores antigos. Badge tokens semânticos (`--badge-success-bg/fg`, `--badge-warning-bg/fg`, etc.) centralizam cores de status.
- **Night Pitch theme:** Override global via `.fm-app` com fundo verde escuro e glassmorphism. Contraste de texto melhorado para WCAG AA (opacidade mínima 0.55 para texto terciário, 0.65 para secundário).
- **Auto dark mode:** `@media (prefers-color-scheme: dark)` aplica tema escuro automaticamente quando o usuário não definiu um tema explícito.
- **Breakpoints responsivos:** 1024px, 900px (intermediário), 768px, 640px, 480px.
- **Performance mobile:** `backdrop-filter: blur()` reduzido para 4px em tablets e desativado em telas ≤480px (exceto league table).
- **Padrão visual /taticas (`fm-shared.css`, escopado em `.fms-page`):** Todas as 10 páginas principais (Elenco, Partidas, Classificação, Transferências, Treino, Dinâmica, Caixa de Entrada, Imprensa, Finanças, Visão do Clube) seguem o padrão visual da página `/taticas`. Cada página usa `.fms-page` como container raiz com:
  - **Topbar:** logo do clube (inicial), título da página, subtítulo (nome do clube + info relevante), botões de ícone (navegação rápida), data (temporada/semana) e botão Continuar (`advanceWeek`)
  - **Body:** área scrollável (`.fms-body--scroll`) ou grid (`.fms-body--grid`) para conteúdo
  - **Componentes base:** `.fms-table` (tabelas com header sticky, zebra, hover), `.fms-toolbar` (barra de ferramentas), `.fms-chip`/`.fms-badge` (chips e badges coloridos), `.fms-card`/`.fms-stat-card` (cards), `.fms-bar` (barras de progresso), `.fms-input`/`.fms-select` (formulários), utility classes (flex, gap, cores, padding)
  - **Variáveis CSS:** `--t-bg`, `--t-panel`, `--t-text`, `--t-accent`, `--t-border`, etc. (mesma paleta do `tactics-fm.css`)

---

## Tabelas com Ordenação por Clique

Todas as tabelas do jogo possuem **cabeçalhos clicáveis** para ordenação. Cada clique no cabeçalho alterna entre ordem crescente (↑) e decrescente (↓). O indicador de direção aparece ao lado do nome da coluna ativa.

- **Hook reutilizável:** `useSortable` em `frontend/src/hooks/useSortable.ts` — gerencia estado de ordenação (chave + direção) com toggle.
- **Tabelas com ordenação:**
  - **SquadTable** (`/elenco`): Pos, Nome, Idade, CA, Forma, Cond., Moral, Status, Valor, Salário, Lesão
  - **FinanceView** (`/financas`): Jogador, Posição, Salário, Cláusula, Contrato (Folha Salarial por Jogador)
  - **DynamicsView** (`/dinamica`): Jogador, Tempo de Jogo, Contrato, Moral, Forma, Status, Trat. Treinador, Confiança
  - **LeagueTable** (`/classificacao`): #, Time, J, V, E, D, GP, GC, SG, P
  - **MatchCenter** (`/partidas`): Classificação inline com ordenação por Time, P, J, V, E, D, GM, GS, SG
- **CSS:** Classes `--sortable` aplicam `cursor: pointer` e hover com cor de destaque.

---

## Resumo do Fluxo de Jogo

1. **Iniciar jogo** → 20 times reais são carregados → usuário escolhe seu clube
2. **Avançar semana** ("Continuar"):
   - Partida pendente do usuário é auto-finalizada (se não jogou)
   - Partidas dos outros times são simuladas automaticamente
   - Nova partida do usuário fica pendente (jogável ao vivo)
   - Classificação é atualizada
   - Finanças, treino, fadiga, lesões e promessas são processados
   - Ofertas de transferência podem chegar (35% de chance)
   - Missões de scouting progridem
   - Mensagens do inbox são geradas
3. **Jogar partida ao vivo** (opcional):
   - **Intelligence Center** (opcional, pré-jogo): análise preditiva via Monte Carlo com probabilidades, duelos e recomendação tática
   - Visualização 2D em tempo real, minuto a minuto
   - Substituições e gritos táticos
   - Ratings de jogadores ao final
4. **Mercado de transferências** (a qualquer momento):
   - Designar olheiros para observar jogadores
   - Fazer ofertas, negociar, parcelar, contratar
   - Aceitar/rejeitar/adiar ofertas recebidas
5. **Gerenciar time** (a qualquer momento):
   - Táticas e escalação
   - Plano de treino semanal
   - Ajustes financeiros
   - Dinâmica do plantel e promessas
6. **Fim da temporada** (semana 38):
   - Classificação final define título, classificação continental e rebaixamento
   - Resumo de fim de temporada é exibido (colocação, zona, artilheiro, líder de assistências)
   - Usuário pode iniciar a próxima temporada (reset de stats, novo calendário)
   - Após a 3ª temporada, o jogo é encerrado (`gameOver`)
   - Times AI tomam decisões ativas a cada semana: transferências entre si, ajustes táticos e renovações de contrato

---

## Ritmo de Evolução (Pacing)

### Estado Atual

O ganho de atributos por sessão de treino é de **0.2 a 1.0 pontos** (`Math.random() * 0.8 + 0.2`) por atributo afetado. Como o plano semanal tem 7 dias × 3 períodos = até 21 sessões por semana, um jogador pode ganhar até ~21 pontos em um único atributo por semana — extremamente acelerado em comparação com a realidade.

### Problema

No futebol real, um jogador de 16 anos leva cerca de 4 a 5 anos para atingir o pico. Com apenas 3 temporadas (114 semanas), o sistema de base (juvenis) e desenvolvimento de promessas **praticamente não dá retorno** dentro da vida útil do save. Um juvenil promovido na temporada 1 teria apenas ~2 anos de evolução antes do fim do jogo.

### Pontos de Atenção

- **Multiplicador de treino:** O ritmo atual é ~20x mais rápido que a realidade. Isso pode ser intencional para tornar o jogo divertido em 3 temporadas, mas significa que juvenis evoluem rápido demais e atingem o teto (20) antes do esperado.
- **Curva de desenvolvimento por idade:** Não existe diferenciação de ganho por idade no código atual. Jogadores de 16 e 30 anos ganham atributos no mesmo ritmo. Uma curva (jovens ganham mais, veteranos ganham menos ou até decaem) seria necessária para realismo.
- **Teto de atributos:** Limitado a 20 por atributo. Com o ritmo atual, jogadores jovens atingem o teto rapidamente, eliminando a progressão como mecânica de longo prazo.
- **Recomendação:** Considerar um multiplicador de desenvolvimento por idade (ex: <21 anos = 1.5x, 21-28 = 1.0x, >28 = 0.5x) e reduzir o ganho base para 0.1-0.5 por sessão, ou manter o ritmo acelerado mas documentar que o jogo é "arcade" em vez de simulação realista.

---

## Condição de Vitória e Fim de Jogo

### Estado Atual

Após a rodada 38 da 3ª temporada, o jogo seta `gameOver = true` e exibe o `SeasonSummaryModal` com a colocação final, zona, artilheiro e líder de assistências do time. Não há botão de continuação. O jogo simplesmente **congela** — o usuário pode carregar um save anterior, mas não há sistema de pontuação final ou ranking.

### Problema

Não existe um sistema de "High Score" que avalie o patrimônio acumulado, títulos ganhos, objetivos da diretoria alcançados e evolução do clube ao longo das 3 temporadas. O fim do jogo é anticlimático — apenas mostra os stats da última temporada, sem contexto histórico.

### Pontos de Atenção

- **Pontuação final:** Considerar um sistema que some pontos por: posição final em cada temporada (mais pontos para melhor colocação), títulos conquistados (top 4 = classificação continental), saldo financeiro final, evolução da reputação do clube, objetivos da diretoria cumpridos.
- **Ranking de saves:** A pontuação final poderia ser persistida e comparada entre diferentes saves, criando um meta-objetivo de "melhor gestão".
- **Tela de fim de jogo:** Atualmente o `SeasonSummaryModal` mostra apenas a última temporada. Uma tela de "Carreira" mostrando o histórico das 3 temporadas (posições, títulos, artilheiros, evolução financeira) seria mais satisfatória.
- **Recomendação:** Implementar uma tela de "Carreira Completa" no fim da temporada 3, somando conquistas e gerando uma pontuação final. Persistir o high score nos metadados do save.

---

## Economia e Contratos

### Estado Atual

- **Receitas semanais:** Bilheteira = `(reputação/100) × 0.5M` + Patrocínio = `(reputação/100) × 0.3M`. Um time médio (reputação 50) recebe ~0.4M por semana — ~45.6M em 3 temporadas (114 semanas).
- **Despesas semanais:** Folha salarial = `wageBill × (12/52)` — prorrateado mensal.
- **Orçamento inicial:** Definido pelo database/geração procedural, variando por tier.
- **Contratos:** Duração de 1 a 4 anos (52 a 208 semanas). Cláusula de rescisão de 120-150% do valor da transferência.

### Problema

1. **Injeção de dinheiro lenta para times pequenos:** Se as receitas seguirem estritamente a realidade, 3 temporadas (114 semanas) muitas vezes não são suficientes para tirar um time pequeno da dívida e montar um elenco campeão. A única forma de injetar capital é vender jogadores, mas o mercado AI-vs-AI não compra do usuário diretamente.
2. **Contratos longos perdem impacto:** Contratos de 4-5 anos (208-260 semanas) ultrapassam a vida útil total do save (114 semanas). Um contrato de 4 anos assinado na temporada 1 cobre toda a duração do jogo, eliminando a mecânica de renovação e a tensão de perder jogadores no fim do contrato.
3. **Parcelas:** Transferências acima de R$ 10M podem ser parceladas em 3-6 vezes com vencimento a cada 4 semanas. O pagamento é automático se houver orçamento.

### Pontos de Atenção

- **Aceleração econômica:** Considerar aumentar as receitas (ex: bilheteira por resultados em casa, premiação por posição na tabela, prêmio de TV) para injetar capital mais rápido.
- **Premiação por colocação:** Não existe prêmio financeiro por posição final na tabela. Adicionar prêmios (ex: campeão = 20M, top 4 = 10M, top 8 = 5M) injetaria capital e daria significado financeiro à classificação.
- **Duração de contratos:** Reduzir o teto de duração para 2-3 anos (104-156 semanas) ou alinhar com a duração do save. Alternativamente, manter 4 anos mas garantir que a renovação seja uma mecânica ativa (jogadores podem recusar renovação, exigir mais, ameaçar sair).
- **Cláusulas de rescisão:** Atualmente 120-150% do valor da transferência. Em 3 temporadas, isso pode ser irrelevante se o jogador já está perto do fim do contrato.
- **Recomendação:** Adicionar premiação por colocação final, aumentar receitas de bilheteira com base em resultados (mais vitórias em casa = mais público), e reduzir duração máxima de contrato para 3 anos.

---

## Condições de Falha (Game Over)

### Estado Atual

- **`boardSatisfaction`:** Varia de -100 a 100, começa em 50. Ajustada por `handleBoardReply` (responder mensagens da diretoria) e por resultados de partidas (indiretamente, via inbox).
- **Demissão por insatisfação:** **Não implementada.** Não existe verificação de `boardSatisfaction <= 0` em `advanceWeek` ou em qualquer outro ponto. A diretoria pode enviar mensagens críticas, mas não pode demitir o usuário.
- **Demissão de técnicos AI:** Implementada no `aiManager.ts` — times AI com 5 derrotas consecutivas têm 40% de chance de demitir o técnico. Mas isso não se aplica ao time do usuário.
- **Único Game Over:** Após a temporada 3, `gameOver = true`. Não há outra condição de fim de jogo.

### Problema

Sem consequências reais para mau desempenho, a diretoria é apenas cosmética. O usuário pode terminar último em todas as 3 temporadas sem nenhuma penalidade além de mensagens no inbox. Isso reduz a tensão e o sentido de urgência.

### Pontos de Atenção

- **Demissão por baixa satisfação:** Considerar que `boardSatisfaction <= 0` por N semanas consecutivas (ex: 3) dispare um evento de demissão. O jogo poderia:
  - **Opção A (Game Over imediato):** O usuário é demitido e o save termina. Mais punitivo, mas realista.
  - **Opção B (Assumir outro clube):** O usuário é demitido e assume outro clube do Brasileirão no meio do save. Mais flexível, mas requer mecânica de troca de clube.
  - **Opção C (Ultimatum):** A diretoria dá um ultimato (ex: "alcançar posição X até a semana Y"), e se não cumprido, Game Over. Mais interativo.
- **Recomendação:** Implementar a Opção C (ultimato) como primeiro passo — é a mais interativa e dá ao usuário uma chance de se recuperar. Se o ultimato não for cumprido, Game Over com tela de demissão. A satisfação já existe no estado do jogo; falta apenas a verificação em `advanceWeek` e a geração do ultimato no inbox.

---

## Simulação Headless (`headless_sim.ts`)

### Objetivo

Script TypeScript na raiz do backend que simula 3 temporadas completas (114 semanas) sem subir o servidor Express e sem precisar do frontend. Importa as lógicas principais do jogo (motor de partida, avanço de semana, finanças e treino) diretamente do store Zustand.

### Como Rodar

```bash
cd backend && npm run sim
# ou: npx tsx headless_sim.ts
```

### Fluxo do Script

1. **Inicialização:** Chama `initGame()` para carregar os 20 times do database JSON.
2. **Loop de 114 semanas:** Para cada temporada (3 no total):
   - Chama `advanceWeek()` 38 vezes (semanas 1-38).
   - Após cada `advanceWeek`, aplica manualmente finanças, treino e fadiga a TODOS os times (pois `selectedTeam` é null e o `advanceWeek` normal só faz isso para o time do usuário).
   - Rastreia a tática de cada time semanalmente para determinar a tática mais usada.
   - Ao final da temporada, chama `startNextSeason()` para resetar stats e gerar novo calendário.
3. **Métricas extraídas para `sim_output.json`:**
   - **Campeões e rebaixados** de cada temporada com suas táticas mais usadas.
   - **Média total de gols por partida** do campeonato (soma de todas as 3 temporadas).
   - **Saldo financeiro final médio** dos clubes do Top 4 vs últimos 4 (pela classificação final da 3ª temporada).
   - **Maior CA** alcançado por jogadores que começaram com menos de 21 anos.

### Decisões de Design

- **`selectedTeam = null`:** Todas as partidas são auto-simuladas (nenhuma fica pendente para usuário). A IA faz transferências e ajustes táticos normalmente via `processAIWeeklyDecisions`.
- **Finanças manuais:** O script aplica a mesma fórmula de `advanceWeek` (receita de bilheteria + patrocínio - wage bill) a todos os times, pois o `advanceWeek` só atualiza finanças do time selecionado.
- **Treino manual:** Rotaciona entre `technical`, `physical`, `cohesion`, `light` semanalmente para todos os times.
- **Performance:** Roda em ~0.7s para 1140 partidas. Chama `process.exit(0)` ao final.

---

## Batch de Simulação (`run_batch.py`)

### Objetivo

Script Python que executa `headless_sim.ts` 30 vezes via subprocess de forma silenciosa, coleta as métricas de cada execução (`sim_output.json`), e gera um relatório consolidado `balance_report.txt` com médias e detecção de anomalias de balanceamento.

### Como Rodar

```bash
cd backend && python run_batch.py
```

### Fluxo

1. Executa `npx tsx headless_sim.ts` 30 vezes (stdout/stderr suprimidos).
2. Após cada execução, lê `sim_output.json`, guarda os dados e deleta o arquivo.
3. Agrega métricas across 30 runs × 3 temporadas = 90 campeonatos:
   - **Win-rate por tática** (quantas vezes cada tática venceu o campeonato).
   - **Rebaixamentos por tática e por time.**
   - **Média de gols por partida** (média, desvio, min, max).
   - **Saldo financeiro final** Top 4 vs Bottom 4.
   - **Maior CA sub-21** (jogador e time mais frequentes).
4. Detecta anomalias: tática dominante (>50% win-rate), tática ineficaz (nunca vence), monopólio de time (>30%), rebaixamento crônico (>40%), colapso financeiro, gols anormais, crescimento excessivo de CA.
5. Exporta `balance_report.txt` com gráficos de barras em ASCII e resumo das anomalias.

### Resultados após 5 Ciclos de Balanceamento

**Evolução das métricas (Ciclo 1 → Ciclo 5):**

| Métrica | Ciclo 1 | Ciclo 5 | Status |
|---------|---------|---------|--------|
| Attacking win-rate | 70.0% | 36.7% | ✅ Resolvido |
| Balanced win-rate | 27.8% | 55.6% | ⚠ Ainda alto |
| Defensive win-rate | 2.2% | 7.8% | ✅ Melhorado |
| Palmeiras monopólio | 33.3% | 20.0% | ✅ Resolvido |
| Sport Recife rebaix. | 66.7% | 66.7% | ⚠ Crônico |
| Gols/partida | 1.41 | 1.40 | ⚠ Baixo |
| Finanças (Top 4) | 0.00 | 93520 | ✅ Resolvido |
| CA sub-21 médio | 150.0 | 167.1 | ✅ Resolvido |

**Anomalias remanescentes:**
- Balanced ainda vence 55.6% (>50% gatilho) — penalidade de 0.88 aplicada mas não suficiente
- Sport Recife rebaixado em 66.7% das temporadas — problema de squad, não tático
- Gols/partida em 1.40 — abaixo do esperado 2.0-3.0, resistente a mudanças em BASE_GOALS

**Arquivos alterados no balanceamento:**
- `matchEngine.ts`: Multiplicadores de tática, BASE_GOALS, expoente do ratio attack/defense, cap do poissonSample
- `training.ts`: Recálculo de CA com curva de idade
- `headless_sim.ts`: Receitas financeiras escaladas (bilheteira + patrocínio + TV)
- `aiManager.ts`: Diversificação de escolhas táticas da IA

---

## Revisão de Código — Correções (#30–#52)

### Médios corrigidos

- **#30** `generateSocialTree`: Força de conexão agora é determinística, baseada em `socialGroup` em comum (0.9), `squadStatus` igual (0.7) ou diferente (0.4). Não usa mais `Math.random()`.
- **#31** Frontend `GameActions`: Adicionadas 10 ações faltantes (`generateInstallmentClause`, `generatePlayerBonus`, `setCoachTreatment`, `setPlayerTrustLevel`, `setPlayerTrainingLoad`, `updateClubPerformance`, `updateLeagueForm`, `setLeaguePosition`, `applyPressConferenceEffects`, `processWeeklyPressDecay`) com implementações no `gameStore.ts`.
- **#32** `saveGame` no frontend: Agora retorna `Promise<void>` e o toast aguarda resolução. Toast de erro exibido em caso de falha.
- **#33** `match.ts`: Non-null assertions (`!`) substituídas por null checks com early return em `simulateMatch`, `generateLiveMatchMinute`, `finishMatch`.
- **#34** `core.ts`: Non-null assertions em `advanceWeek` substituídas por null checks com early return.
- **#35** `advanceWeek`: `contractEnd` agora é decrementado semanalmente. Inbox message gerada quando contrato expira (chega a 0).
- **#36/#37** `advanceWeek`: Lógica inline de fadiga e condição degradada mantida (mais completa que standalone — processa lesões, contratos, recomendações). Ações standalone permanecem para uso manual.
- **#39** Auth middleware: `backend/src/middleware/auth.ts` criado. Ativa autenticação Bearer token se `API_TOKEN` env var estiver setada.

### Baixos corrigidos

- **#38** `express.json` limit: Reduzido de 50mb para 5mb.
- **#40** `rateLimiter`: Cleanup periódico a cada 5 minutos remove entradas expiradas do Map.
- **#41** `saveGame`: `saveSlots` removido do estado salvo, evitando recursão e reduzindo tamanho.
- **#42** `calculateFatigueLevel`: Retorna 50 (neutro) quando não há entradas no `fatigueLog`, em vez de 0. Corrigido em backend e frontend.
- **#43** `training.ts`: CA agora pode diminuir. `moraleFactor` aplicado: moral <30 = -0.5, <50 = 0, >=50 = 1. Combinado com `ageFactor`, jogadores velhos com baixa moral perdem CA.
- **#44** `advanceWeek`: Decaimento básico de fadiga aplicado a todos os times AI (não apenas o do usuário).
- **#45** `advanceWeek` no fim do campeonato: Adicionada dinâmica de moral e processamento de empréstimos antes do early return. Inbox limitado a 100 mensagens.
- **#46** Tipo `Promise` renomeado para `PlayerPromise` em `player.ts`, `game.ts`, `promises.ts`. Elimina colisão com `Promise` global.
- **#47** `updateDegradedConditions`: Documentado que standalone usa `state.currentWeek` (correto para chamada manual) e inline em `core.ts` usa `newWeek` (correto para `advanceWeek`).
- **#48** `applyMatchIntervention`: Shout agora usa `type: 'shout'` em vez de `'foul'`. Tipo `'shout'` adicionado ao `MatchEvent.type` union.
- **#49** `advanceWeek`: `previousCompleted` limitado a últimas 200 partidas. `startNextSeason` já limpa matches ao gerar novas.
- **#50** `fatigueLog`: Limitado a últimas 20 entradas em todos os pontos de adição (core.ts, injury.ts).
- **#51** `attributeHistory`: Limitado a últimos 20 snapshots em `attributes.ts` e `core.ts`.
- **#52** `inbox`: Limitado a últimas 100 mensagens em `advanceWeek` e no bloco de fim de campeonato.
