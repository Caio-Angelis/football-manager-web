# Regras de Scouting (Olheiros)

## Visão Geral

Cada time possui **2 olheiros** (Sênior e Júnior) com atributos de **avaliação de habilidade** e **avaliação de potencial** (escala 1-20). Os olheiros podem ser designados para observar jogadores de outros times.

---

## Conhecimento de Jogadores

O conhecimento sobre cada jogador é um valor de **0 a 100** que determina quanta informação você vê:

| Conhecimento | Informação Exibida |
|--------------|-------------------|
| < 25 | Atributos completamente desconhecidos (nulo) |
| 25-75 | Atributos mostrados como intervalo (ex: "12-16"), baseado na capacidade do olheiro |
| > 75 | Atributos exatos revelados |

- O **CA** (habilidade atual) é arredondado em blocos de 20 até 50% de conhecimento.
- O **PA** (potencial) só é revelado com **75%+** de conhecimento.

---

## Missões de Scouting

- O usuário designa um olheiro para observar um jogador por um número de semanas.
- A cada semana, o conhecimento aumenta em **8 + judgingAbility/2** pontos.
- Quando o conhecimento cruza **50%**, um relatório parcial é gerado e enviado ao inbox.
- Quando o conhecimento cruza **100%**, um relatório final é gerado com nota de recomendação (A a F).
- A missão termina quando o conhecimento chega a 100 ou as semanas acabam.
- **Scout sem alvo:** Quando chamado sem `playerId`, o sistema embaralha todos os candidatos disponíveis (sem relatório existente) e seleciona 3 aleatoriamente, evitando que os mesmos jogadores sejam sempre observados.

---

## Relatórios de Scout

Os relatórios incluem:

- **CA e PA estimados** (com margem de erro baseada no olheiro)
- **Intervalos de atributos** (passe, técnica, finalização, velocidade, resistência)
- **Estrelas de potencial** (1-5, baseado em PA)
- **Confiabilidade do relatório** (1-5, baseada no olheiro)
- **Nota de recomendação (A a F):** Compara o jogador com a média do elenco do usuário:

| Nota | Critério | Significado |
|------|----------|-------------|
| A | ≥ 130% da média do elenco | Jogador muito acima do nível |
| B | ≥ 115% | Boa contratação |
| C | ≥ 100% | No nível do elenco |
| D | ≥ 85% | Contratação de risco |
| E | ≥ 70% | Não recomendado |
| F | < 70% | Não contratar |

---

## Shortlist

O usuário pode manter uma lista de jogadores observados para acompanhamento:

- **`addToShortlist(playerId, priority?, notes?)`:** Adiciona um jogador à shortlist com prioridade (alta, média, baixa) e notas opcionais.
- **`removeFromShortlist(playerId)`:** Remove um jogador da shortlist.
- **`getShortlist()`:** Retorna a lista atual.
- A shortlist é exibida na aba "Shortlist" do Mercado de Transferências, ordenada por prioridade.
- Cada entrada mostra dados do jogador (posição, idade, valor, clube) e botão para negociar diretamente.
- Botão ☆/★ disponível nos cards do Mercado para adicionar/remover da shortlist.

---

## Recomendações de Scouts

Scouts podem gerar recomendações automáticas de jogadores:

- **`ScoutRecommendation`:** Inclui jogador, posição, idade, CA/PA estimados, clube atual, valor estimado, nota (A-F), motivo da recomendação, scout responsável e semana.
- **`dismissScoutRecommendation(recommendationId)`:** Dispensa uma recomendação (marca como `dismissed`).
- Exibidas na aba "Recomendações" do Mercado de Transferências.

---

## Experiência de Scouts

Cada scout possui campos de experiência que evoluem ao longo do jogo:

- **`experience`:** Pontos de experiência acumulados. A cada missão concluída, o scout ganha experiência.
- **`missionsCompleted`:** Número total de missões concluídas.
- O painel de olheiros na aba Scouting mostra esses valores com barra de progresso.
- Scouts com mais experiência tendem a gerar relatórios mais precisos.
