# Regras de Dinâmica do Plantel

## Hierarquia

O plantel tem uma hierarquia visualizada em pirâmide:

- **Líderes:** Jogadores com maior influência no grupo
- **Jogadores importantes:** Nível intermediário
- **Outros:** Restante do elenco

---

## Grupos Sociais

Cada jogador pertence a um grupo social baseado em afinidade (nacionalidade, idade, posição). A árvore social mostra as conexões entre jogadores e influencia a moral do grupo.

### Força de Conexão

Determinística, baseada em:
- `socialGroup` em comum: 0.9
- `squadStatus` igual: 0.7
- `squadStatus` diferente: 0.4

Não usa `Math.random()` — a mesma combinação de jogadores sempre gera a mesma força de conexão.

### Atualização Bidirecional

As conexões entre jogadores são **bidirecionais** — ao atualizar a força de uma conexão A→B, a conexão B→A também é atualizada/criada. As conexões são atualizadas de forma imutável, preservando o contrato de imutabilidade do Zustand.

### Visualização

Cards em grid responsivo com:
- Avatar de grupo (👤/👥)
- Avatares circulares com iniciais por jogador
- Barra de coesão com gradiente (moral média do grupo)
- Badges de posição e status do plantel
- Accent gradient no topo por grupo (até 6 cores)
- Hover com elevação e sombra
- Layout adaptativo para mobile

---

## Promessas

O usuário pode fazer promessas a jogadores (ex: "vai jogar mais", "vamos contratar reforços"). Cada promessa tem:

- **Prazo (countdown):** Decrementa a cada semana em `updatePromiseCountdown()`
- **Promessas não cumpridas:** Afetam a moral (-12 por promessa expirada) e a confiança do jogador
- **Verificação:** `checkPromiseDeadlines()` verifica prazos expirados

---

## Moral e Dinâmica Semanal

A cada avanço de semana, a moral de todos os jogadores é atualizada por `applyWeeklyMoraleDynamics` — sistema de **dinâmica de vestiário** com **6 motores**:

### Motor 1 — Promessas Expiradas

- **Promessa não cumprida:** -12 de moral por promessa

### Motor 2 — Tempo de Jogo vs. Status

| Situação | Efeito |
|----------|--------|
| Key Player no banco | -8 |
| Regular Starter no banco | -5 |
| Titular jogando | +2 |
| Excesso no elenco | -3 |

### Motor 3 — Forma do Time

| Forma nos últimos 5 | Efeito |
|---------------------|--------|
| 4+ vitórias | +5 |
| 3 vitórias | +3 |
| 4+ derrotas | -6 |
| 3 derrotas | -4 |

Modulado por idade — jovens mais resilientes, veteranos mais afetados.

### Motor 4 — Cascata do Capitão

Se o capitão (maior liderança) tiver moral < 40, aliados diretos perdem moral:
- -4 a -10 dependendo da gravidade

### Motor 5 — Cascata de Grupo Social

Se a moral média de um grupo social for < 40, membros com moral mais alta convergem para baixo:
- -3 a -5

### Motor 6 — Regressão à Média

Moral extrema tende ao centro:
- Euforia (> 85): diminui -1
- Fundo do poço (< 20): recupera +2
- Moral baixa (< 35): recupera +1

---

## Pedidos de Transferência

Após a dinâmica semanal de moral, `processTransferRequests` pode forçar um pedido público de saída:

- **Apenas times humanos** são processados (times AI não geram pedidos de transferência).
- Moral < 28, titular no banco insatisfeito, ambition alta, ou promessa quebrada recente.
- Jogador vai para status Excess + `transferRequest` (desconto de 15–35% no valor de venda).
- Cascata social: colegas (`teamMates` / mesmo `socialGroup`) perdem moral enquanto o pedido não for resolvido.
- Ver detalhes em `regra-transferencias.md`.

---

## Outros Efeitos na Moral

- **Treino de coesão:** +5 por sessão
- **Status no plantel:** Continua afetando a moral
- **Coletivas de imprensa:** Respostas afetam moral (ver `regra-imprensa.md`)
- **Gritos em partida:** Encourage, Demand, Praise, Calm afetam moral
