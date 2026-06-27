# Checklist de Transferências — Análise e Melhorias

## 🔴 Crítico

- [x] 1. `onDefer` da aba Ofertas não implementado
- **Arquivo:** `src/components/transfer/TransferMarket.tsx` linha 409
- **Problema:** `onDefer={() => {}}` é um callback vazio — não faz nada
- **Solução:** Implementar função `deferTransfer` no store e chamar no componente

- [x] 2. Busca de jogador por ID não localiza em todas as equipes
- **Arquivo:** `src/components/transfer/TransferMarket.tsx` função `getPlayerName`
- **Problema:** A função `getPlayerName` busca jogadores em todas as equipes, mas quando um jogador é vendido e já não está em nenhuma equipe, retorna apenas o `playerId`
- **Solução:** Adicionar fallback com nome mais descritivo — ✅ Implementado `Jogador Vendido (ID_short)`

- [x] 3. Botão "Atribuir Olheiro" não faz navegação ou popup
- **Arquivo:** `src/components/transfer/TransferMarket.tsx` linhas 355, 371
- **Problema:** O botão `assignScout` no componente não tem estado associado para selecionar qual jogador será escutado
- **Solução:** Implementar modal ou seleção de jogador para atribuição — ✅ Implementado: estado `selectedPlayerId`, feedback visual com barra de confirmação, função `assignScout` aceita `playerId` opcional

## 🟡 Importante

- [x] 4. Limite arbitrário de jogadores no mercado
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** `filteredPlayers.slice(0, 24)` limita a exibição para 24 jogadores sem paginação
- **Solução:** Adicionar paginação ou "load more" — ✅ Implementado: estado `marketPage`, botão "Carregar Mais", contador de jogadores exibidos, reset automático ao alterar filtro

- [x] 5. Sem feedback visual ao aceitar oferta
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** `acceptIncomingTransfer` e `rejectIncomingTransfer` não retornam nada — sem toast ou feedback
- **Solução:** Adicionar toast de confirmação — ✅ Implementado: handlers `handleAcceptTransfer` e `handleRejectTransfer` com toasts de sucesso/warning, integrado via prop `addToast` do App

- [x] 6. Contadores de tabs inconsistentes
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** Contagem de itens muda dependendo de estado (agora vs históricos), pode ser enganoso
- **Solução:** Implementado toggle "Mostrar Todos/Pendentes" para alternar entre contadores precisos

- [x] 7. Sem ordenação em listas de transferências/parcelas/bónus
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** Listas são renderizadas em ordem de chegada sem ordenação por data ou valor
- **Solução:** Ordenar por data ou importância — ✅ Implementado: ordenação por `deferredAt` em adiados, próximo vencimento em parcelas, ativação em bónus, e ordem alfabética em ofertas/scouting

## 🟢 Melhoria

- [x] 8. Sem debounce na busca de jogadores
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** Busca em cada keystroke sem debounce
- **Solução:** Adicionar debounce de 300ms — ✅ Implementado: estado `filter` para feedback imediato, `debouncedFilter` convertido via `useEffect` com 300ms timeout, `useRef` para evitar re-renders desnecessários, filtro usa `debouncedFilter` para renderização

- [x] 9. Sem persistência de estado da aba selecionada
- **Arquivo:** `src/components/transfer/TransferMarket.tsx` linha 228
- **Problema:** Ao sair e voltar da aba Transferências, sempre abre no Mercado
- **Solução:** Salvar em localStorage qual aba estava aberta — ✅ Implementado: `useState` com factory que lê `localStorage.getItem('fm_activeTab')`, `setActiveTab` atualiza o localStorage ao alterar aba, validação de valores válidos (market, scouting, offers, deferred, installments, bonuses, agreements)

- [x] 10. Sem filtragem por posição no mercado
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** Não havia filtro por posição de jogador no mercado
- **Solução:** Implementar seletor de posição — ✅ Implementado: estado `positionFilter`, dropdown com opções GK/DEF/MID/FWD, filtro aplicado em `filteredPlayers`, reset ao fazer busca de texto, contador de jogadores atualiza ao mudar filtro

- [x] 11. Ordenação por valor de mercado ou posição implementada
- **Arquivo:** `src/components/transfer/TransferMarket.tsx`
- **Problema:** Jogadores apareciam em ordem aleatória de equipes
- **Solução:** Implementado: estado `sortBy` (marketValue/position/name), `sortDesc` para direção, seletor de ordenação na UI, botão toggle ↑↓, ordenação aplicada em `sortedPlayers`, reset automático ao alterar ordenação

- [x] 12. Sem histórico de transferências realizadas
- **Arquivo:** `src/store/gameStore.ts`, `src/types/game.ts`, `src/components/transfer/TransferMarket.tsx`, `src/styles-supplement.css`
- **Problema:** Não havia registro de transferências concluídas no histórico
- **Solução:** ✅ Implementado — Interface `CompletedTransfer` adicionada ao types, campo `completedTransfers` ao `GameState`, ação `getCompletedTransfers` ao `GameActions`, registro automático ao fazer `buyPlayer`, nova aba "Realizados" no TransferMarket com visualização de todos os detalhes da transferência (nome, posição, idade, nacionalidade, valor, método de pagamento, contrato, salário, semana), CSS completo para cards, ordenação por data (mais recentes primeiro), contador na aba

## 📋 Resumo

| Prioridade | Count |
|------------|-------|
| 🔴 Crítico | 3 |
| 🟡 Importante | 4 |
| 🟢 Melhoria | 5 |