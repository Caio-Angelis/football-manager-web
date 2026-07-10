# Regras de Transferências

## Visão Geral

O mercado de transferências permite comprar e vender jogadores entre os 20 clubes. O sistema simula negociações realistas com ofertas, contra-ofertas, parcelamentos, bônus e acordos contratuais.

---

## Comprar Jogadores

Existem duas formas de comprar:

### 1. Compra Direta (`buyPlayer`)

Paga o valor de mercado do jogador à vista ou parcelado:

- **À vista:** Deduz o valor total do orçamento.
- **Parcelado:** Paga 30% de entrada + parcelas restantes a cada 4 semanas (2 a 4 parcelas). O vendedor recebe 80% do valor (20% vai para custos/agentes).
- O jogador comprado entra no elenco com status "Rotação".

### 2. Fazer Oferta (`makeOffer`)

Inicia uma negociação com o time vendedor. O resultado pode ser:

- **Aceito:** O time aceita a oferta.
- **Contra-oferta:** O time propõe um valor diferente.
- **Recusado:** O time recusa a oferta.
- **Desistência:** O time encerra a negociação (após 3+ rodadas de negociação).

---

## Vontade do Jogador

Cada jogador tem um nível de vontade de mudar de clube (0-100), que afeta a negociação:

| Fator | Modificador |
|-------|-------------|
| Jovens (< 21 anos) | -15 (preferem ficar) |
| Veteranos (> 29 anos) | +20 (querem rotação) |
| Status "Excesso" | +25 |
| Status "Rotação" | +10 |
| Status "Jogador Chave" | -15 |
| Moral baixa (< 40) | +20 |
| Moral alta (> 75) | -10 |
| Reputação comprador > vendedor | + (diferença positiva) |

A vontade reduz a "teimosia" do vendedor — quanto mais o jogador quer sair, mais flexível o clube é na negociação.

---

## Lógica de Aceitação de Ofertas

A probabilidade de aceitação depende do ratio oferta/valor de mercado:

| Ratio Oferta/Mercado | Resultado |
|----------------------|-----------|
| ≥ 100% | 92% aceita |
| 90-100% | 55% aceita, 35% contra-oferta, 10% recusa |
| 75-90% | 50% contra-oferta, 50% recusa |
| 60-75% | 20% contra-oferta, 80% recusa |
| < 60% | Recusa categórica |

**Teimosia do vendedor:** Baseada na reputação do clube (0.01 a 1.0).

**Fadiga de negociação:** A cada rodada após a primeira, o vendedor fica 5% menos flexível. Após 3 rodadas, há chance de desistência (12% na 3ª, 24% na 4ª).

**Máximo de 4 rodadas** de negociação.

---

## Negociação de Contrato

Após o time aceitar a oferta, o jogador precisa concordar com o contrato. O salário esperado depende:

- **Salário atual** do jogador
- **Fator de prêmio:** Jogadores com pouca vontade de sair pedem mais (até 150% do salário atual); jogadores com muita vontade aceitam menos (até 80%)
- A negociação de contrato segue a mesma lógica de aceitação/contra-oferta/recusa, com máximo de 4 rodadas.

---

## Ofertas Recebidas (Venda de Jogadores)

Ofertas da IA pelo elenco do usuário **não usam mais 35% fixo**. A cada semana, `maybeGenerateIncomingTransfer` avalia crises posicionais dos clubes AI:

- **Crise posicional** (`detectPositionalCrises`): titular lesionado (14/30/60+ dias), profundidade baixa, reserva muito inferior ao titular fora.
- **Alvos preferidos:** reservas/altos CA do usuário que resolvem a crise; jogadores com `transferRequest` ativo ou status Excess.
- **Chance de oferta** escala com o score (urgência + upgrade de CA + reputação), tipicamente 18–85% quando há candidato forte.
- **Preço agressivo:** crise alta ou clube elite (rep ≥ 80) → premium ~115–140% do mercado; jogador pedindo saída → desconto (`askingPriceDiscount`, tipicamente 65–85% do mercado).
- Fallback raro (~12%): oferta oportunista se não houver match de necessidade.
- O usuário pode **aceitar, rejeitar, adiar ou contra-propor**. Recusar oferta de jogador com pedido ativo agrava a cascata social.

---

## Pedidos de Transferência (Transfer Request)

Jogadores com moral destruída ou promessas quebradas podem pedir saída publicamente (`processTransferRequests`, após a dinâmica de moral semanal):

| Gatilho | Chance aproximada |
|---------|-------------------|
| Moral < 28 | 35–75% (pior moral = mais chance) |
| Titular chave/regular no banco com moral < 35 | ~35% |
| Ambition alta + moral < 32 | ~25% |
| Promessa quebrada + moral < 40 | +20pp |

Efeitos:
- Status vira **Excess**; `transferRequest.active = true` com desconto de venda.
- Inbox de alta prioridade anuncia o pedido.
- Enquanto não vender: moral do jogador continua caindo; **cascata** em `teamMates` e mesmo `socialGroup` (−3 a −6/semana).
- IA mira esses jogadores com ofertas abaixo do mercado; recusar ofertas piora ainda mais o vestiário.

---

## Empréstimos

O sistema suporta empréstimos de jogadores entre clubes:

- **`loanPlayer`:** Empresta um jogador de outro clube. Define taxa de empréstimo, contribuição salarial semanal, duração em semanas e opção de compra (opcional ou obrigatória).
- **`recallLoanedPlayer`:** Recalla um jogador emprestado antes do fim do contrato.
- **`buyLoanedPlayer`:** Ativa a opção de compra de um jogador emprestado, pagando a taxa acordada.
- O empréstimo reduz as semanas restantes a cada `advanceWeek()`. Quando chega a zero, o empréstimo é concluído automaticamente.
- O jogador emprestado entra no elenco do time destinatário durante o período do empréstimo.
- Status do empréstimo: `active`, `completed`, `recalled`, `bought`.

---

## Cláusulas de Rescisão

- **`activateReleaseClause`:** Permite contratar um jogador pagando diretamente sua cláusula de rescisão (`contractClause`), desde que o orçamento do clube seja suficiente.
- A cláusula **bypassa a negociação normal** — o jogador é transferido imediatamente.
- Disponível como botão nos cards de jogadores no Mercado.

---

## Guerra de Ofertas (Bidding Wars)

Quando o usuário faz uma oferta por um jogador, outros clubes podem competir:

- **`raiseBid`:** Aumenta a oferta do usuário em uma guerra de ofertas ativa.
- **`withdrawBid`:** Retira a oferta do usuário da guerra.
- Cada guerra tem um número máximo de rodadas. O usuário pode aumentar ou retirar a qualquer momento.
- As ofertas dos clubes AI são visíveis na aba "Guerra de Ofertas".
- Status: `active`, `won`, `lost`, `withdrawn`.

---

## Histórico de Transferências

Todas as transferências concluídas são registradas com: jogador, time de origem, valor, método de pagamento, duração do contrato, salário e semana da transferência.

---

## Transferências Adiadas

- **`deferTransfer`:** Adia uma oferta recebida. A oferta fica pendente.
- **`reinstateDeferredTransfer`:** Reinsta uma oferta adiada.
- **`rejectDeferredTransfer`:** Rejeita uma oferta adiada.

---

## Janelas de Transferência

As transferências AI-vs-AI ocorrem apenas durante janelas específicas:

- **Janela de verão:** Semanas 1-12
- **Janela de inverno:** Semanas 20-26

---

## Reset de Transferências

Ao iniciar uma nova temporada (`startNextSeason`), todo o estado de transferências é limpo:
- incomingTransfers, transfers, counterOffers, deferredTransfers
- pendingInstallments, incomingBonuses, transferAgreements
- activeLoans, biddingWars
- inbox, scoutReports, scoutMissions, shortlist, scoutRecommendations
