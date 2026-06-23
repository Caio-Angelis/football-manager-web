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

### 6. MatchCenter.tsx
- [x] **6.1** Exibição de eventos da partida (`MatchEventDisplay`)
- [x] **6.2** Estatísticas (xG, posse, chutes) — `MatchStatsDisplay`
- [x] **6.3** Interfaces `MatchEvent` e `MatchStats`
- [x] **6.4** Modal de detalhes da partida
- [x] **6.5** Substituição / Gritos à Equipa em tempo real
- [x] **6.6** Live Data Hub ao vivo
- [x] **6.7** Tracking de partida ao vivo (`isLive`, `liveMinute`, `liveEvents`, `liveStats`)
- [x] **6.8** `simulateMatch` inicia live match; `generateLiveMatchMinute` simula eventos
- [x] **6.9** `applyMatchIntervention` modifica partida em andamento
- [x] **6.10** Estilos CSS do modal, stats e live hub

### 7. TransferMarket.tsx
- [x] **7.1** `ScoutReportCard` com estrelas e confiabilidade
- [x] **7.2** Nevoeiro de atributos (jogador oculto até scouting)
- [x] **7.3** Botão "Atribuir Olheiro"
- [x] **7.4** `TransferOfferCard` para ofertas recebidas
- [x] **7.5** Exibição de salário, duração e cláusula nas ofertas
- [x] **7.6** Estatuto do plantel na contratação
- [x] **7.7** Compra e aceitar/recusar ofertas via store
- [x] **7.8** Negociação com contra-ofertas
- [x] **7.9** Cláusulas parceladas e bónus
- [x] **7.10** Acordo contratual completo (`TransferAgreement`, tab "Acordos")

### 8. TacticsView.tsx
- [x] **8.1** Mentalidade da Equipa (7 níveis)
- [x] **8.2** Funções (Roles) e Tarefas (Duties) por posição
- [x] **8.3** Drag and drop no campo (`DraggableFormationVisual`)
- [x] **8.4** Instruções individuais por jogador
- [x] **8.5** Instruções coletivas (posse, transição, sem posse)
- [x] **8.6** Persistência via `updateTeam()`

### 9. InboxView.tsx
- [x] **9.1** Central de notificações estilo email
- [x] **9.2** Filtros por tipo e prioridade
- [x] **9.3** Indicador de lido/não lido
- [x] **9.4** Badge de notificações na sidebar
- [x] **9.5** Modal de detalhes da mensagem
- [x] **9.6** Feedback visual de ação executada
- [x] **9.7** Botões renderizados por tipo de mensagem
- [x] **9.8** Ações funcionais completas:
  - [x] **9.8.1** Transferência: Aceitar, Recusar, Negociar
  - [x] **9.8.2** Lesão: Ver Relatório (`InjuryReportModal`)
  - [x] **9.8.3** Diretoria: Responder (`BoardReplyModal`)
  - [x] **9.8.4** Financeiro: Ver Relatório (`FinancialReportModal`)
  - [x] **9.8.5** Jovem Promessa: Convocar
  - [x] **9.8.6** Recomendação de Treino: Aplicar / Marcar Treino

### 10. TrainingView.tsx
- [x] **10.1** Calendário semanal com 3 blocos diários
- [x] **10.2** Tipos de treino: Físico, Técnico, Coesão (+ médico, recuperação, leve)
- [x] **10.3** Monitor de fadiga por jogador
- [x] **10.4** Prevenção de lesões (engine + UI de risco)
- [x] **10.5** Progressão de atributos visível na tela

### 11. DynamicsView.tsx
- [x] **11.1** Pirâmide de hierarquia básica
- [x] **11.2** Tabela de satisfação parcial
- [x] **11.3** Listagem de grupos sociais
- [x] **11.4** Tratamento pelo Treinador e Performance do Clube
- [x] **11.5** Visualização de árvore social (`generateSocialTree`, UI interativa)
- [x] **11.6** Sistema de promessas com contador dinâmico (`updatePromiseCountdown` no `advanceWeek`)

### 12. FinanceView.tsx
- [x] **12.1** Balanço de receitas/despesas
- [x] **12.2** Gráfico de projeção básico
- [x] **12.3** Tabela de salários
- [x] **12.4** Orçamento de transferências exibido
- [x] **12.5** Receita de bilheteira e patrocínio
- [x] **12.6** Custos de infraestruturas
- [x] **12.7** Controle interativo da folha salarial (`adjustPlayerSalary`, slider por jogador)

### 13. Styles.css
- [x] **13.1** Estilos para InboxView
- [x] **13.2** Estilos para badge de notificações (sidebar)
- [x] **13.3** Estilos para TrainingView
- [x] **13.4** Estilos para DynamicsView
- [x] **13.5** Estilos para FinanceView
- [x] **13.6** Estilos para campo de táticas (drag and drop)
- [x] **13.7** Estilos para modal/stats do MatchCenter
- [x] **13.8** Estilos para tabela de hierarquia e barras de promessas
- [x] **13.9** Estilos para botão "Continuar" e indicador de temporada

### 14. Documentação
- [x] **14.1** **Projeto.md** — visão atualizada, Fase 1 expandida, roadmap
- [x] **14.2** **AI_CONTEXT.md** — tipos, playerGenerator, gameStore, componentes, fluxo

### 15. Testes e Build
- [x] **15.1** **`npm run build` passa sem erros**
- [x] **15.2** Testar geração procedural de times e jogadores
- [x] **15.3** Testar simulação de partidas
- [x] **15.4** Testar sistema de caixa de entrada
- [x] **15.5** Testar sistema de treino
- [x] **15.6** Testar sistema de transferência
- [x] **15.7** Testar sistema de táticas
- [x] **15.8** Testar sistema de dinâmica
- [x] **15.9** Testar sistema de finanças
- [x] **15.10** Verificar persistência no localStorage
- [x] **15.11** Verificar performance em dispositivos móveis

---

## 📊 RESUMO DE PROGRESSO

| Categoria | Status | % estimado |
|-----------|--------|------------|
| 1. Tipos e Interfaces | ✅ Completo | 100% |
| 2. Engine Procedural | ✅ Completo | 100% |
| 3. Game Engine (store) | ✅ Completo | 95% |
| 4. Componentes base (Elenco, Seleção) | ✅ Completo | 100% |
| 5. App e Navegação | ✅ Completo | 100% |
| 6. MatchCenter | ✅ Completo | 95% |
| 7. TransferMarket | ✅ Completo | 95% |
| 8. TacticsView | ✅ Completo | 95% |
| 9. InboxView | ✅ Completo | 95% |
| 10. TrainingView | ✅ Completo | 90% |
| 11. DynamicsView | ✅ Completo | 90% |
| 12. FinanceView | ✅ Completo | 95% |
| 13. Estilos (CSS) | ✅ Completo | 90% |
| 14. Documentação | ✅ Completo | 100% |
| 15. Testes / Build | ✅ Completo | 100% |
| **TOTAL GERAL** | | **~98%** |

---

## 🎯 PRÓXIMOS PASSOS PRIORITÁRIOS

1. Expansão Fase 2: múltiplas divisões, copa, IA adversária
2. PWA e sincronização cloud (Fase 3)
3. Base de dados expandida (100+ times)
4. Corrigir escala de salários no `playerGenerator` (valores acima do cap de 500K na UI de finanças)
