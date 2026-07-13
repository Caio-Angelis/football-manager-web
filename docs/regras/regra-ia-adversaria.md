# Regras da IA Adversária (AI Manager)

## Visão Geral

Os 19 clubes controlados pela IA tomam **decisões ativas** a cada avanço de semana, tornando a liga dinâmica e realista. O processamento é feito por `processAIWeeklyDecisions` (em `backend/src/store/helpers/aiManager.ts`).

---

## Transferências AI-vs-AI

- Ocorrem apenas durante **janelas de transferência**: semanas 1-12 (verão) e 20-26 (inverno).
- Cada time AI avalia seu elenco, identifica a posição mais fraca e busca jogadores em outros clubes (excluindo o time do usuário).
- A probabilidade de tentar uma compra depende da reputação do clube e posição na tabela:
  - Times maiores e em melhor posição são mais ativos
  - Times na zona de rebaixamento também são mais ativos para reforçar o elenco
- O vendedor decide se aceita com base em:
  - Profundidade do elenco
  - Importância do jogador
  - Jogadores-chave só são vendidos se a oferta for **150%+** do valor e o clube tiver pouca reposição
- Transferências notáveis (craques ou entre grandes clubes) geram mensagens no inbox do usuário.

---

## Ativação de Cláusulas de Rescisão

- Ocorre apenas durante **janelas de transferência**.
- Cada time AI tem **5% de chance por semana** de tentar ativar uma cláusula de rescisão.
- O time identifica sua posição mais fraca e busca jogadores em outros clubes com cláusula acessível (≤ orçamento do comprador).
- A cláusula deve ser **≤ 150% do valor de mercado** do jogador para ser considerada.
- O jogador deve ser um upgrade (CA > média da posição + 5).
- Vontade do jogador considera diferença de reputação entre clubes e entre jogador e clube comprador (via `reputationGapImpact`).
- Se o jogador for do time do usuário, o inbox notifica com prioridade alta.
- Transferências notáveis (CA > 130) também geram inbox.

---

## Empréstimos AI-vs-AI

- Ocorrem apenas durante **janelas de transferência**.
- Cada time AI tem **8% de chance por semana** de tentar um empréstimo.
- O time busca jogadores com status **Excess** ou **Young Talent** em outros clubes (excluindo o time do usuário como cedente).
- O jogador deve ter CA ≥ média da posição - 5.
- **Taxa de empréstimo:** 5-15% do valor de mercado.
- **Duração:** 16-26 semanas.
- **Cláusula de compra opcional:** 50% de chance, valor de 110-130% do mercado (não obrigatória).
- **Contribuição salarial:** 50-100% do salário do jogador.
- Empréstimos de jogadores com CA > 120 geram mensagens no inbox.

---

## Assinatura de Agentes Livres

- Ocorre apenas durante **janelas de transferência**.
- Cada time AI tem **20% de chance por semana** de tentar assinar um agente livre.
- Máximo de **30 jogadores** por elenco.
- O time identifica sua posição mais fraca e busca agentes livres que preencham a necessidade (CA ≥ média da posição - 5).
- Verifica reputação: jogador de rep alta pode recusar clube de rep baixa.
- A folha salarial não pode exceder **50% do orçamento** após a assinatura.
- **Contrato:** 52-156 semanas (1-3 temporadas).
- Assinaturas de jogadores com CA > 120 geram mensagens no inbox.

---

## Ajustes Táticos

A cada **4 semanas**, os times AI ajustam táticas com base na posição na tabela e forma recente:

### Zona de Rebaixamento

| Tática | Probabilidade | Postura |
|--------|---------------|---------|
| Attacking | 50% | Mentalidade ofensiva, pressão alta, linha alta, ritmo rápido |
| Balanced | 30% | Postura equilibrada |
| Defensive | 20% | Postura cautelosa para segurar resultado |

### Zona de Título

- Mantém equilíbrio
- Em boa fase: **40%** de chance de adotar mentalidade positiva
- Em má sequência: recua para balanced

### Zona Intermediária

- **50%** de chance de mudar para defensivo após sequência de derrotas
- Volta ao equilíbrio em boa forma

---

## Demissão de Técnico

- Se um time AI tiver **5 derrotas consecutivas**, há **40% de chance** de demitir o técnico.
- O novo técnico pode adotar:
  - Attacking: 40% de chance
  - Balanced: 60% de chance
- O novo técnico traz nova formação.

> **Nota:** A demissão de técnico aplica-se apenas aos times AI. O time do usuário não pode ser demitido (ver `regra-diretoria.md`).

---

## Renovação de Contrato

- Jogadores com contrato vencendo (≤ 10 semanas) são renovados automaticamente pela IA.
- **Jogadores importantes** (Key Player / Regular Starter): **85%** de chance de renovação
- **Demais jogadores:** Dependem do desempenho do time
- Salário renovado com aumento de **5-20%**

---

## Ajuste de Formação

- Ajuste ocasional de formação com base no elenco disponível a cada **8 semanas**.
