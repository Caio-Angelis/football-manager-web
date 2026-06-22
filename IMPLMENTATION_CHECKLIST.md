# 📋 Checklist de Implementação - Football Manager Web (Especificação Completa)

> Última revisão: cruzado com o código em `src/`. Itens marcados `[x]` só quando existem e funcionam de forma verificável.

---

## ✅ CONCLUÍDO

### 1. Tipos e Interfaces
- [x] **1.1** **src/types/game.ts** - Atualizado completamente
  - [x] **1.1.1** Atributos técnicos (1-20): Cabeceamento, Cruzamentos, Técnica, Finalização, Passe, etc.
  - [x] **1.1.2** Atributos mentais (1-20): Agressividade, Visão, Decisões, Determinação, etc.
  - [x] **1.1.3** Atributos físicos (1-20): Aceleração, Velocidade, Força, Resistência, etc.
  - [x] **1.1.4** Atributos de guarda-redes exclusivos
  - [x] **1.1.5** Atributos ocultos: Consistência, Propensão a Lesões, Ambição, etc.
  - [x] **1.1.6** CA (Current Ability) e PA (Potential Ability) - 1-200
  - [x] **1.1.7** Sistema de contratos com cláusula de rescisão
  - [x] **1.1.8** Sistema de promessas ao jogador
  - [x] **1.1.9** Status do plantel: 'Key Player', 'Regular Starter', 'Rotation', etc.
  - [x] **1.1.10** Dinâmica: teamMates, socialGroup
  - [x] **1.1.11** MatchEvent, MatchStats para partidas detalhadas
  - [x] **1.1.12** InboxMessage, ScoutReport, TrainingSession
  - [x] **1.1.13** Team com finanças, diretoria, táticas avançadas

### 2. Engine Procedural
- [x] **2.1** **src/utils/playerGenerator.ts** - Criado
  - [x] **2.1.1** Banco de nomes por nacionalidade (Brasil, Argentina, Portugal, etc.)
  - [x] **2.1.2** Distribuição normal gaussiana para atributos
  - [x] **2.1.3** Spawner principal de jogadores
  - [x] **2.1.4** Calculador de CA/PA baseado em idade e reputação
  - [x] **2.1.5** Gerador de times procedurais
  - [x] **2.1.6** Youth intake (fornada de jovens) — gerador `generateYouthIntake`
  - [x] **2.1.7** Mapeamento de proficiência por posição
  - [x] **2.1.8** `tacticsConfig` padrão em times gerados

### 3. Game Engine e State (base)
- [x] **3.1** **src/store/gameStore.ts** - Motor principal
  - [x] **3.1.1** Loop de simulação por minuto (90 iterações)
  - [x] **3.1.2** Cálculo de posse influenciado por atributos e estilo de passe
  - [x] **3.1.3** Geração de eventos (gols, chutes, defesas, cantos, faltas)
  - [x] **3.1.4** Estatísticas: xG, posse, chutes, passes
  - [x] **3.1.5** Simulação automática de partidas dos outros times
  - [x] **3.1.6** Sistema de caixa de entrada com mensagens dinâmicas
  - [x] **3.1.7** Função `updatePlayerAttributes` e `applyWeeklyTraining`
  - [x] **3.1.8** Youth intake automático na semana 1 (`advanceWeek`)
  - [x] **3.1.9** Compra/venda, scouting, ofertas recebidas e ações básicas de inbox no store

### 4. Componentes de UI — Base
- [x] **4.1** **src/components/squad/PlayerCard.tsx**
  - [x] **4.1.1** Exibição de CA e PA
  - [x] **4.1.2** Atributos 1-20 com barra de progresso
  - [x] **4.1.3** Status: Forma, Condição Física, Moral
  - [x] **4.1.4** Status de lesão
  - [x] **4.1.5** Atributos exclusivos de GK
  - [x] **4.1.6** Posições secundárias
  - [x] **4.1.7** Salário em formato correto

- [x] **4.2** **src/components/squad/SquadView.tsx**
  - [x] **4.2.1** Exibição de temporada e semana
  - [x] **4.2.2** Mentalidade do time
  - [x] **4.2.3** Contagem de Vitórias/Empates/Derrotas

- [x] **4.3** **src/components/TeamSelection.tsx**
  - [x] **4.3.1** Botão "Nova Partida" para gerar times
  - [x] **4.3.2** Exibição de reputação e orçamento
  - [x] **4.3.3** Times gerados proceduralmente

### 5. App.tsx — Navegação
- [x] **5.1** Telas na sidebar: Elenco, Partidas, Transferências, Táticas, Treino, Dinâmica, Caixa de Entrada, Finanças, Visão do Clube
- [x] **5.2** Botão "Continuar" (avança semana)
- [x] **5.3** Badge de notificações na Caixa de Entrada
- [x] **5.4** Indicador de temporada/semana na sidebar

---

## 🟡 PARCIAL — existe, mas incompleto ou só UI

### 6. MatchCenter.tsx
- [x] **6.1** Exibição de eventos da partida (`MatchEventDisplay`)
- [x] **6.2** Estatísticas (xG, posse, chutes) — `MatchStatsDisplay`
- [x] **6.3** Interfaces `MatchEvent` e `MatchStats`
- [x] **6.4** Modal de detalhes da partida
- [x] **6.5** **Substituição / Gritos à Equipa** — agora funciona em tempo real com live match tracking
- [x] **6.6** **Live Data Hub ao vivo** — exibe dados dinâmicos durante a partida ao vivo
- [x] **6.7** **Tracking de partida ao vivo** — tipos `isLive`, `liveMinute`, `liveEvents`, `liveStats` em Match
- [x] **6.8** **GameStore atualizado** — `simulateMatch` inicia live match; `generateLiveMatchMinute` simula eventos ao vivo
- [x] **6.9** **Intervenções live** — `applyMatchIntervention` modifica partida em andamento sem finalizar
- [x] **6.10** **Estilos CSS** do modal, stats e live hub (`fm-match-details-modal`, `fm-live-data-hub`, `fm-match-stats`, `fm-match-events-list`, etc.)

### 7. TransferMarket.tsx
- [x] **7.1** `ScoutReportCard` com estrelas e confiabilidade
- [x] **7.2** Nevoeiro de atributos (jogador oculto até scouting)
- [x] **7.3** Botão "Atribuir Olheiro" (gera relatórios no store)
- [x] **7.4** `TransferOfferCard` para ofertas recebidas
- [x] **7.5** Exibição de salário, duração e cláusula nas ofertas
- [x] **7.6** Estatuto do plantel na contratação (selector)
- [x] **7.7** Compra e aceitar/recusar ofertas via store
- [ ] **7.8** **Negociação com contra-ofertas** — botão "Negociar" sem lógica
- [ ] **7.9** **Cláusulas parceladas e bónus** — apenas texto estático na UI
- [ ] **7.10** **Acordo contratual completo** na compra (só debita valor e move jogador)

### 8. TacticsView.tsx
- [x] **8.1** Mentalidade da Equipa (7 níveis)
- [x] **8.2** Funções (Roles) e Tarefas (Duties) por posição
- [x] **8.3** Drag and drop no campo (`DraggableFormationVisual`)
- [x] **8.4** Instruções individuais por jogador (UI)
- [ ] **8.5** **Instruções coletivas conforme spec:**
  - [ ] **8.5.1** Em Posse: Largura, Estilo de Passe, Ritmo, Foco
  - [ ] **8.5.2** Em Transição: Contra-Pressão, Contra-Ataque
  - [ ] **8.5.3** Sem Posse: Linha de Engajamento, Pressão, Desarmes
  - *(hoje usa toggles diferentes: `workBallIntoBox`, `highPress`, etc.)*
- [ ] **8.6** **Persistência no store** — ainda usa `useGameStore.getState().teams = ...` em vez de `set()` / `updateTeam`

### 9. InboxView.tsx
- [x] **9.1** Central de notificações estilo email
- [x] **9.2** Filtros por tipo e prioridade
- [x] **9.3** Indicador de lido/não lido
- [x] **9.4** Badge de notificações na sidebar
- [x] **9.5** Modal de detalhes da mensagem
- [x] **9.6** Feedback visual de ação executada
- [x] **9.7** Botões renderizados por tipo de mensagem
- [ ] **9.8** **Ações funcionais completas:**
  - [ ] **9.8.1** Transferência: Aceitar, Recusar, Negociar (só Adiar/arquivar parcial)
  - [ ] **9.8.2** Lesão: Ver Relatório
  - [ ] **9.8.3** Diretoria: Responder
  - [ ] **9.8.4** Financeiro: Ver Relatório
  - [x] **9.8.5** Jovem Promessa: Convocar (via `completeYouthIntake`)
  - [x] **9.8.6** Recomendação de Treino: Aplicar / Marcar Treino (define plano no store)

### 10. TrainingView.tsx
- [x] **10.1** Calendário semanal com 3 blocos diários
- [x] **10.2** Tipos de treino: Físico, Técnico, Coesão
- [x] **10.3** Monitor de fadiga por jogador
- [ ] **10.4** Prevenção de lesões (lógica no engine, sem UI dedicada)
- [ ] **10.5** Progressão de atributos visível na tela

### 11. DynamicsView.tsx
- [x] **11.1** Pirâmide de hierarquia básica (por `squadStatus` + liderança)
- [x] **11.2** Tabela de satisfação parcial (tempo de jogo, contrato, moral, forma)
- [x] **11.3** Listagem de grupos sociais
- [ ] **11.4** Tratamento pelo Treinador e Performance do Clube na tabela
- [ ] **11.5** Visualização de árvore social
- [ ] **11.6** Sistema de promessas com contador de dias dinâmico

### 12. FinanceView.tsx
- [x] **12.1** Balanço de receitas/despesas
- [x] **12.2** Gráfico de projeção básico
- [x] **12.3** Tabela de salários
- [x] **12.4** Orçamento de transferências exibido
- [x] **12.5** Receita de bilheteira e patrocínio
- [x] **12.6** Custos de infraestruturas
- [ ] **12.7** Controle interativo da folha salarial

### 13. Styles.css
- [x] **13.1** Estilos para InboxView
- [x] **13.2** Estilos para badge de notificações (sidebar)
- [ ] **13.3** Estilos para TrainingView
- [ ] **13.4** Estilos para DynamicsView
- [ ] **13.5** Estilos para FinanceView
- [ ] **13.6** Estilos para campo de táticas (drag and drop)
- [ ] **13.7** Estilos para modal/stats do MatchCenter
- [ ] **13.8** Estilos para tabela de hierarquia e barras de promessas
- [ ] **13.9** Estilos para botão "Continuar" e indicador de temporada

---

## 🔲 PENDENTE

### 14. Documentação
- [ ] **14.1** **Projeto.md** — atualizar visão, Fase 1 expandida, roadmap
- [ ] **14.2** **AI_CONTEXT.md** — tipos, playerGenerator, gameStore, novos componentes, fluxo de dados

### 15. Testes e Build
- [ ] **15.1** **`npm run build` passa sem erros** — atualmente falha (TacticsView, TransferMarket, gameStore)
- [ ] **15.2** Testar geração procedural de times e jogadores
- [ ] **15.3** Testar simulação de partidas
- [ ] **15.4** Testar sistema de caixa de entrada
- [ ] **15.5** Testar sistema de treino
- [ ] **15.6** Testar sistema de transferência
- [ ] **15.7** Testar sistema de táticas
- [ ] **15.8** Testar sistema de dinâmica
- [ ] **15.9** Testar sistema de finanças
- [ ] **15.10** Verificar persistência no localStorage
- [ ] **15.11** Verificar performance em dispositivos móveis

---

## 📊 RESUMO DE PROGRESSO

|| Categoria | Status | % estimado |
|-----------|--------|------------|
| 1. Tipos e Interfaces | ✅ Completo | 100% |
| 2. Engine Procedural | ✅ Completo | 100% |
| 3. Game Engine (store) | ✅ Base funcional | 85% |
| 4. Componentes base (Elenco, Seleção) | ✅ Completo | 100% |
| 5. App e Navegação | ✅ Completo | 100% |
| 6. MatchCenter | ✅ Quase completo | 90% |
| 7. TransferMarket | 🟡 Parcial | 65% |
| 8. TacticsView | 🟡 Parcial | 60% |
| 9. InboxView | 🟡 Parcial | 55% |
| 10. TrainingView | 🟡 Parcial | 70% |
| 11. DynamicsView | 🟡 Parcial | 45% |
| 12. FinanceView | 🟡 Parcial | 80% |
| 13. Estilos (CSS) | 🟡 Parcial | 25% |
| 14. Documentação | 🔲 Pendente | 0% |
| 15. Testes / Build | 🔲 Pendente | 0% |
| **TOTAL GERAL** | | **~62%** |

---

## 🎯 PRÓXIMOS PASSOS PRIORITÁRIOS

1. **15.1** Corrigir build — erros TypeScript em `TacticsView.tsx`, `TransferMarket.tsx`, `gameStore.ts`
2. **8.5-8.6** TacticsView — usar `updateTeam()` no store; alinhar instruções coletivas com a spec
3. **13.3-13.9** Estilos — Training, Dynamics, Finance, MatchCenter modal, táticas drag-and-drop
4. **9.8.1-9.8.4, 7.8-7.10** Inbox e Transferências — implementar ações reais (negociar, aceitar proposta da inbox, etc.)
5. **6.9** MatchCenter — intervenção em partida ao vivo (sem finalizar imediatamente)
6. **14.1-14.2** Documentação — atualizar `Projeto.md` e `AI_CONTEXT.md`
7. **15.2-15.11** Testes — validar fluxos principais e build de produção
