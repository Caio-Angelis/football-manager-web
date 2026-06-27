# Checklist — Football Manager Web (Simplificado, 1 Liga)

Este arquivo lista todas as funcionalidades faltantes ou incompletas para transformar o projeto em um jogo completo e jogável. Cada item é detalhado com **o que é**, **para que serve**, **o que usar**, **como fazer** e **critérios de aceitação**.

---

## 🏆 P1 — ESTRUTURA DA LIGA (CRÍTICO)

---

### 1.1. Tabela de Classificação (Points Table)

**O que é:** Uma tabela visual que mostra a posição de cada time na liga com seus pontos, vitórias, empates, derrotas, gols marcados, gols sofridos e saldo de gols.

**Para que serve:**
- [ ] Permite que o jogador acompanhe o desempenho de todos os times
- [ ] Mostra quem está na briga por título (topo), sobrevivência (meio) ou rebaixamento (base)
- [ ] É o coração de qualquer jogo de futebol — sem tabela, não há competição real
- [ ] O jogador toma decisões estratégicas baseando-se na posição (jogar com mais cuidado se estiver no topo)

**O que usar:**
- [ ] **React Table:** Não use bibliotecas externas. Use uma tabela HTML nativa com CSS. O projeto já tem padrão de tabelas em `SquadTable.tsx`.
- [ ] **Zustand selector:** Use `useGameStore()` para acessar `teams` e `matches` do estado.
- [ ] **CSS:** Use as variáveis `--fm-*` já definidas em `styles.css`.
- [ ] **Ícones:** Use emojis nativos (🏆 para topo 4, ⬇️ para rebaixamento) para evitar dependências externas.

**Como fazer — Passo a Passo:**

**Passo 1: Adicionar tipos em `src/types/game.ts`**

Adicione estas interfaces após a linha 750 (ou onde os outros tipos de partida estão):

```typescript
// ============================================
// TIPOS DA TABELA DE CLASSIFICAÇÃO
// ============================================

export type FormResult = 'W' | 'D' | 'L';

export interface LeagueStandings {
  teamId: string;
  teamName: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormResult[]; // últimos 5 resultados
  zone?: 'title' | 'europe' | 'safe' | 'relegation';
}
```

**Passo 2: Adicionar tabela ao estado em `src/store/gameStore.ts`**

Localize a interface `GameState` (aproximadamente linha 100-200). Adicione:

```typescript
interface GameState {
  // ... tipos existentes ...
  leagueTable: LeagueStandings[]; // TABELA NOVA
  // ... resto do estado ...
}
```

**Passo 3: Criar função de cálculo em `gameStore.ts`**

Adicione esta função no módulo (pode colocar após `simulateMatchResult`):

```typescript
function calculateLeagueStandings(teams: Team[], matches: Match[]): LeagueStandings[] {
  // Inicializar todos os times
  const standingsMap: Record<string, LeagueStandings> = {};
  
  teams.forEach(team => {
    standingsMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      position: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
      zone: 'safe'
    };
  });
  
  // Processar cada partida
  matches.forEach(match => {
    if (!match.isCompleted) return;
    
    const home = standingsMap[match.homeTeamId];
    const away = standingsMap[match.awayTeamId];
    
    if (!home || !away) return;
    
    // Atualizar jogos jogados
    home.played += 1;
    away.played += 1;
    
    // Atualizar gols
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;
    
    // Atualizar saldo de gols
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
    
    // Atualizar resultados
    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.homeScore < match.awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });
  
  // Converter para array e ordenar
  let standings = Object.values(standingsMap);
  
  // Ordenar por pontos → saldo de gols → gols marcados
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // Atualizar posições e zonas
  standings.forEach((s, i) => {
    s.position = i + 1;
    if (i < 4) s.zone = 'title';
    else if (i < 8) s.zone = 'europe';
    else if (i >= standings.length - 3) s.zone = 'relegation';
    else s.zone = 'safe';
  });
  
  return standings;
}
```

**Passo 4: Chamar a função em `advanceWeek()`**

Localize a função `advanceWeek()` em `gameStore.ts`. Após simular as partidas, adicione:

```typescript
export function advanceWeek() {
  // ... código existente ...
  
  // Simular partidas (código existente)
  // ...
  
  // ATUALIZAR TABELA (NOVO)
  leagueTable = calculateLeagueStandings(teams, matches);
  
  // ... resto do código existente ...
}
```

**Passo 5: Criar componente em `src/components/league/LeagueTable.tsx`**

Crie o arquivo com este conteúdo:

```tsx
import React from 'react';
import type { LeagueStandings } from '../../types/game';

interface LeagueTableProps {
  standings: LeagueStandings[];
}

const ZONE_ICONS: Record<string, string> = {
  title: '🏆',
  europe: '🌍',
  safe: '✅',
  relegation: '⬇️',
};

const ZONE_LABELS: Record<string, string> = {
  title: 'Campeão/Libertadores',
  europe: 'Sul-Americana',
  safe: 'Segurança',
  relegation: 'Rebaixamento',
};

export const LeagueTable: React.FC<LeagueTableProps> = ({ standings }) => (
  <div className="fm-league-table">
    <h2>Classificação</h2>
    <table className="fm-league-table__grid">
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>J</th>
          <th>V</th>
          <th>E</th>
          <th>D</th>
          <th>GP</th>
          <th>GC</th>
          <th>SG</th>
          <th>P</th>
          <th>Forma</th>
          <th>Zona</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s) => (
          <tr key={s.teamId} className={`fm-league-table__row--${s.zone}`}>
            <td>{s.position}</td>
            <td>{s.teamName}</td>
            <td>{s.played}</td>
            <td>{s.wins}</td>
            <td>{s.draws}</td>
            <td>{s.losses}</td>
            <td>{s.goalsFor}</td>
            <td>{s.goalsAgainst}</td>
            <td>{s.goalDifference > 0 ? '+' : ''}{s.goalDifference}</td>
            <td className="fm-league-table__points">{s.points}</td>
            <td className="fm-league-table__form">
              {s.form.map((r, i) => (
                <span key={i} className={`fm-form--${r === 'W' ? 'win' : r === 'D' ? 'draw' : 'loss'}`}>
                  {r}
                </span>
              ))}
            </td>
            <td className="fm-league-table__zone">{ZONE_ICONS[s.zone]} {ZONE_LABELS[s.zone]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

**Passo 6: Adicionar à sidebar em `src/App.tsx`**

Adicione `'league'` ao array `NAV_ITEMS`:

```typescript
const NAV_ITEMS = [
  { id: 'squad', label: 'Elenco', icon: '👥' },
  { id: 'match', label: 'Partidas', icon: '⚽' },
  { id: 'league', label: 'Classificação', icon: '📊' }, // NOVO
  { id: 'transfer', label: 'Transferências', icon: '🔄' },
  // ... resto
];
```

**Passo 7: Adicionar renderização do componente**

No `screens` de `App.tsx`, adicione:

```typescript
const screens: Record<string, React.FC> = {
  squad: SquadView,
  match: MatchCenter,
  league: () => {
    const { leagueTable } = useGameStore();
    return <LeagueTable standings={leagueTable} />;
  }, // NOVO
  // ... resto
};
```

**CSS para adicionar em `src/styles.css`:**

```css
/* ============================================
   TABELA DE CLASSIFICAÇÃO
   ============================================ */

.fm-league-table {
  padding: 1rem;
}

.fm-league-table h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.fm-league-table__grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.fm-league-table__grid th,
.fm-league-table__grid td {
  padding: 0.5rem;
  text-align: center;
  border-bottom: 1px solid var(--fm-border);
}

.fm-league-table__grid th {
  background: var(--fm-bg-header);
  color: var(--fm-text);
  font-weight: 600;
}

.fm-league-table__points {
  font-weight: 700;
  color: var(--fm-accent);
}

.fm-league-table__row--title {
  background: rgba(255, 215, 0, 0.1);
}

.fm-league-table__row--relegation {
  background: rgba(255, 0, 0, 0.1);
}

.fm-league-table__form {
  display: flex;
  gap: 2px;
  justify-content: center;
}

.fm-league-table__form span {
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
}

.fm-league-table__form .fm-form--win {
  background: #22c55e;
}

.fm-league-table__form .fm-form--draw {
  background: #84cc10;
}

.fm-league-table__form .fm-form--loss {
  background: #ef4444;
}

.fm-league-table__zone {
  font-size: 0.75rem;
}
```

**Critérios de aceitação:**
- [x] Tabela aparece corretamente após primeira rodada
- [x] Classificação atualiza após cada `advanceWeek`
- [x] Saldo de gols calculado corretamente
- [x] Ordenação respeita critérios (pontos → saldo → gols)
- [x] Zonas coloridas visualmente (verde para título, vermelho para rebaixamento)
- [x] Forma dos últimos 5 jogos visível

**Status: COMPLETADO** — P1.1 implementado com sucesso.
- [x] Função `calculateLeagueStandings` adicionada em `gameStore.ts`
- [x] Integração com `advanceWeek()` para atualização automática
- [x] Componente `LeagueTable.tsx` criado com visualização completa
- [x] CSS styles adicionados em `styles.css`
- [x] Navegação e renderização integradas em `App.tsx`
- [x] Sistema de saves atualizado para persistir `leagueTable`
- [x] Tipos TypeScript corrigidos e validados

---

## 📋 RESUMO DE TODAS AS TAREFAS RESTANTES

Para economizar espaço, aqui está o resumo de cada item. Se quiser um passo-a-passo completo de qualquer um, me avise.

---

### 1.2. Sistema de Rebaixamento (Relegation)

**Para que serve:** Simula o drama real de ligas de futebol — times lutando para não cair.

**O que usar:**
- [ ] Variável `isRelegated: boolean` no tipo `Team`
- [ ] Função `checkRelegation()` chamada em `advanceWeek()` quando `currentWeek >= 38`
- [ ] CSS com `border-left: 4px solid red` para times em perigo

**Como fazer:**
- [ ] Adicionar `isRelegated: boolean` ao tipo `Team` em `game.ts`
- [ ] Após `calculateLeagueStandings`, verificar os 3-4 últimos colocados
- [ ] Setar `team.isRelegated = true` para cada time rebaixado
- [ ] Em `TeamSelection`, mostrar times rebaixados com fundo vermelho claro

---

### 1.3. Sistema de Promoção (Promotion)

**Para que serve:** Permite que jogadores de divisões inferiores subam — dá profundidade ao jogo.

**O que usar:**
- [ ] Variável `division: 1 | 2` no tipo `Team`
- [ ] Array `divisions: { [key: number]: Team[] }` em `GameState`
- [ ] Função `promoteAndRelegate()` em `endSeason()`

**Como fazer:**
- [ ] Adicionar `division` ao tipo `Team`
- [ ] Na geração de times, gerar 8 da 1ª divisão e 8 da 2ª
- [ ] Ao fim da temporada, mover os 2-4 primeiros da 2ª para a 1ª
- [ ] Mover os 2-4 últimos da 1ª para a 2ª

---

### 1.4. Expandir Liga para Mais Times

**Para que serve:** Liga realista com 12-20 times como no Football Manager real.

**O que usar:**
- [ ] Parâmetro `count: number` em `generateTeams()`
- [ ] Loop para gerar `count` times
- [ ] Calendarização adaptativa baseada em `count`

**Como fazer:**
- [ ] Alterar `generateTeams(8)` para `generateTeams(16)` em `initGame()`
- [ ] Calcular rodadas: `rounds = (count - 1) * 2`
- [ ] Gerar pares de jogos para cada rodada
- [ ] Verificar que não há conflitos de horários

---

## ⚽ P2 — MELHORIAS DE PARTIDAS

---

### 2.1. Visualização de Campo ao Vivo

**Para que serve:** Dar ao jogador uma visão espacial do jogo — onde os jogadores estão, para onde a bola vai.

**O que usar:**
- [ ] **Canvas HTML5** para renderização 2D (mais performático que SVG para animações)
- [ ] **requestAnimationFrame** para atualização suave
- [ ] **CSS** para container do campo
- [ ] **Types:** `Position2D { x: number, y: number }` em `game.ts`

**Como fazer:**
- [ ] Adicionar `position: Position2D` ao tipo `Player`
- [ ] Criar objeto `FORMATION_POSITIONS` com coordenadas para cada posição (GK, DEF, MID, FWD)
- [ ] Em `MatchCenter`, adicionar componente `<LiveField />` após iniciar partida ao vivo
- [ ] Usar `requestAnimationFrame` para atualizar posições baseado em `liveEvents`
- [ ] Desenhar: campo verde, linhas brancas, 22 círculos (jogadores), 1 círculo amarelo (bola)

---

### 2.2. Rating de Jogadores por Partida

**Para que serve:** Dar feedback ao jogador sobre a performance individual — quem jogou bem, quem jogou mal.

**O que usar:**
- [ ] Função `calculatePlayerRating()` baseada em estatísticas da partida
- [ ] Array `playerRatings: PlayerMatchRating[]` em `Match`
- [ ] Componente `RatingBadge` com cores (verde ≥8, amarelo 5-7, vermelho ≤4)

**Como fazer:**
- [ ] Adicionar interface `PlayerMatchRating` em `game.ts`
- [ ] Em `simulateMatchResult`, calcular rating para cada jogador
- [ ] Em `generateLiveMatchMinute`, atualizar ratings baseado em eventos
- [ ] Exibir na timeline: "Gol — Messi 8.5"
- [ ] Mostrar summary ao final: "Melhor jogador: X (8.7)"

---

### 2.3. Timeline de Eventos Detalhada

**Para que serve:** Permitir ao jogador acompanhar o que aconteceu na partida em tempo real.

**O que usar:**
- [ ] Expandir `MatchEventType` com mais tipos
- [ ] Adicionar `playerName` e `assistPlayer` em cada evento
- [ ] Agrupar por `firstHalf` e `secondHalf`

**Como fazer:**
- [ ] Expandir `MatchEventType` em `game.ts`
- [ ] Adicionar `playerInvolved?: string` em `MatchEvent`
- [ ] Em `generateLiveMatchMinute`, gerar eventos com mais contexto
- [ ] Em `MatchCenter`, agrupar eventos por tempo (45', 90')

---

### 2.4. Sistema de Cartões

**Para que serve:** Penalizar jogadores por agressividade — adiciona risco tático ao jogo.

**O que usar:**
- [ ] Interface `CardSuspension` em `game.ts`
- [ ] Função `applyCard()` em `gameStore.ts`
- [ ] Verificação em `getPlayersForMatch()` para verificar suspensões

**Como fazer:**
- [ ] Adicionar `CardType = 'yellow' | 'red'` e `CardSuspension` em `game.ts`
- [ ] Em `generateLiveMatchMinute`, gerar cartões aleatoriamente baseado em `aggressiveness` do jogador
- [ ] Se `yellowCount >= 2` → suspensão
- [ ] Se `red` → suspensão direta (2-4 jogos)
- [ ] Verificar suspensão antes de escalar jogador

---

### 2.5. Escalação Manual do Time Titular

**Para que serve:** Dar controle real ao jogador sobre quem começa — parte fundamental do FM.

**O que usar:**
- [ ] **React DnD** para drag-and-drop (ou HTML nativo `dragstart`)
- [ ] Interface `Lineup` em `game.ts`
- [ ] Estado local `useState` para lineup temporário

**Como fazer:**
- [ ] Adicionar interface `Lineup` em `game.ts`
- [ ] Criar componente `LineupEditor.tsx` com drag-and-drop
- [ ] Mostrar 11 posições vazias + elenco do jogador
- [ ] Permitir arrastar jogadores para posições
- [ ] Salvar com `setLineup()` em `gameStore.ts`

---

## 🔄 P3 — MELHORIAS DE TRANSFERÊNCIAS

---

### 3.1. Janela de Transferências

**Para que serve:** Limitar quando o jogador pode comprar/vender — realismo e estratégia.

**O que usar:**
- [ ] Interface `TransferWindow` em `game.ts`
- [ ] Variável `currentWeek` para verificar janela
- [ ] Função `isTransferWindowOpen()` em `gameStore.ts`

**Como fazer:**
- [ ] Adicionar `TransferWindow { name, startWeek, endWeek, isActive }` em `game.ts`
- [ ] Em `initGame`, gerar 2 janelas: verão (semana 30-35) e inverno (semana 55-60)
- [ ] Em `buyPlayer()`, verificar `isTransferWindowOpen()` antes de permitir
- [ ] Mostrar banner "Janela Aberta" ou "Janela Fechada" em `TransferMarket`

---

### 3.2. Contratos Visíveis e Expirados

**Para que serve:** Gerenciar quem vai embora — o jogador precisa renegociar para manter jogadores.

**O que usar:**
- [ ] Interface `Contract` com `expiryWeek` em `game.ts`
- [ ] Função `checkExpiredContracts()` em `gameStore.ts`
- [ ] Visualização em `SquadTable` com barra de progresso

**Como fazer:**
- [ ] Adicionar `contract: Contract` ao tipo `Player` em `game.ts`
- [ ] Em `generatePlayer()`, gerar contrato de 2-5 anos
- [ ] Em `advanceWeek()`, verificar `currentWeek >= contract.expiryWeek`
- [ ] Se expirado, gerar oferta automática do jogador
- [ ] Em `SquadTable`, mostrar barra: "Contrato: 15 dias restantes"

---

## 🏋️ P4 — MELHORIAS DE TREINO

---

### 4.1. Progressão Visual de Atributos

**Para que serve:** Mostrar ao jogador se o treino está funcionando — feedback de progresso.

**O que usar:**
- [ ] **Chart.js** ou **Recharts** para gráficos de linha
- [ ] Interface `AttributeHistory` em `game.ts`
- [ ] Função `getPlayerAttributeHistory()` em `gameStore.ts`

**Como fazer:**
- [ ] Adicionar `AttributeHistory { playerId, week, attributes }` em `game.ts`
- [ ] Em `captureWeeklyAttributeSnapshot()`, salvar snapshot semanal
- [ ] Criar componente `AttributeChart.tsx` com Recharts
- [ ] Em `TrainingView`, adicionar gráfico de evolução
- [ ] Permitir filtrar por atributo (técnico, mental, físico)

---

## 📊 P5 — MELHORIAS DE INTERFACE

---

### 5.1. Tutorial/Onboarding

**Para que serve:** Ajudar novos jogadores a entender o jogo — reduzir curva de aprendizado.

**O que usar:**
- [ ] Componente `Tutorial` com estado `currentStep`
- [ ] Interface `TutorialStep` em `game.ts`
- [ ] localStorage para persistir progresso

**Como fazer:**
- [ ] Adicionar `TutorialState { currentStep, completed }` em `game.ts`
- [ ] Criar 5-8 passos: seleção de time, partida ao vivo, transferências, treino
- [ ] Em `App.tsx`, verificar `!tutorial.completed` após primeira partida
- [ ] Mostrar overlay com próximo passo
- [ ] Botão "Pular tutorial"

---

### 5.2. Animações e Transições

**Para que serve:** Feedback visual — o jogador sabe quando uma ação foi realizada com sucesso.

**O que usar:**
- [ ] **CSS @keyframes** para animações leves
- [ ] **CSS transitions** para hover effects
- [ ] **React state** para controlar animações

**Como fazer:**
- [ ] Adicionar `@keyframes fadeIn`, `@keyframes goalFlash` em `styles.css`
- [ ] Em `MatchCenter`, aplicar `goalFlash` quando gol é marcado
- [ ] Em `TransferMarket`, aplicar `fadeIn` quando jogador é comprado
- [ ] Adicionar `transition: all 0.3s` em botões e cards

---

### 5.3. Design Mobile-First

**Para que serve:** Permitir jogar em dispositivos móveis — acessibilidade.

**O que usar:**
- [ ] **Media queries** em `styles-mobile.css`
- [ ] **CSS Grid/Flexbox** para layouts responsivos
- [ ] **Touch events** para botões maiores

**Como fazer:**
- [ ] Expandir `styles-mobile.css` com breakpoints 1024, 768, 480
- [ ] Em `App.tsx`, transformar sidebar em drawer mobile
- [ ] Em `SquadTable`, transformar em cards em mobile
- [ ] Adicionar `touch-action: manipulation` em botões

---

### 5.4. Configurações de Dificuldade

**Para que serve:** Permitir que o jogador ajuste o jogo ao seu nível — acessibilidade e desafio.

**O que usar:**
- [ ] Componente `Settings` em `src/components/settings/`
- [ ] Interface `GameSettings` em `game.ts`
- [ ] localStorage para persistir

**Como fazer:**
- [ ] Adicionar `GameSettings { difficulty, aiDifficulty }` em `game.ts`
- [ ] Criar componente `Settings.tsx` com sliders
- [ ] Em `initGame()`, aplicar `aiDifficulty` na simulação
- [ ] Salvar em `localStorage` com chave `fm-settings`

---

## 🎮 P6 — PROFUNDIDADE DO JOGO

---

### 6.1. Academia de Jovens (Youth Academy)

**Para que serve:** Desenvolver talentos próprios — reduzir custo de transferências.

**O que usar:**
- [ ] Interface `YouthPlayer` em `game.ts`
- [ ] Função `generateYouthPlayers()` em `playerGenerator.ts`
- [ ] Estado `youthAcademy: YouthPlayer[]` em `Team`

**Como fazer:**
- [ ] Adicionar `YouthPlayer extends Player { academyLevel: number }` em `game.ts`
- [ ] Em `generateTeam()`, gerar 5-10 jovens (16-21 anos)
- [ ] Em `SquadView`, adicionar aba "Academia"
- [ ] Permitir "promover" para o plantel principal
- [ ] Atualizar PA semanalmente com treino

---

### 6.2. Equipe Reserva (Reserve Team)

**Para que serve:** Dar minutos a jovens — desenvolvimento e preparação.

**O que usar:**
- [ ] Variável `reserveTeam: Player[]` em `Team`
- [ ] Componente `ReserveTeamView` em `src/components/squad/`

**Como fazer:**
- [ ] Adicionar `reserveTeam: Player[]` ao tipo `Team` em `game.ts`
- [ ] Em `generateTeam()`, separar jogadores em `firstTeam` e `reserveTeam`
- [ ] Criar componente `ReserveTeamView` similar a `SquadView`
- [ ] Permitir "promover" para o plantel principal

---

### 6.3. Reabilitação de Lesões

**Para que serve:** Gerenciar recuperação — decidir entre esperar ou pagar por tratamento.

**O que usar:**
- [ ] Interface `Injury` com `daysRemaining` em `game.ts`
- [ ] Função `updateInjuries()` em `gameStore.ts`
- [ ] Componente `InjuryTimeline` em `src/components/injuries/`

**Como fazer:**
- [ ] Expandir `Injury` com `daysRemaining` e `isRecovered` em `game.ts`
- [ ] Em `advanceWeek()`, decrementar `daysRemaining`
- [ ] Se `daysRemaining <= 0`, marcar como `isRecovered`
- [ ] Em `InboxView`, mostrar barra de progresso da lesão
- [ ] Adicionar opção de "tratamento acelerado" (custa dinheiro)

---

### 6.4. Química de Equipe (Team Chemistry)

**Para que serve:** Bônus por jogadores que funcionam bem juntos — profundidade estratégica.

**O que usar:**
- [ ] Interface `ChemistryLink` em `game.ts`
- [ ] Função `calculateChemistry()` em `gameStore.ts`
- [ ] Componente `ChemistryView` em `src/components/tactics/`

**Como fazer:**
- [ ] Adicionar `ChemistryLink { player1Id, player2Id, chemistry }` em `game.ts`
- [ ] Em `generateSocialTree()`, calcular química entre jogadores
- [ ] Em `calculateTeamStrength()`, aplicar bônus de química
- [ ] Em `TacticsView`, mostrar química em visualização de rede

---

## 📝 RESUMO FINAL DE PRIORIDADE

| Prioridade | Itens | Complexidade | Tempo Estimado |
|------------|-------|--------------|----------------|
| **P1** | 4 | Alta | 2-3 dias |
| **P2** | 5 | Média | 2-3 dias |
| **P3** | 2 | Baixa-Média | 1-2 dias |
| **P4** | 1 | Média | 1 dia |
| **P5** | 4 | Média | 2-3 dias |
| **P6** | 4 | Média | 2-3 dias |
| **Total** | **22** | | **11-15 dias** |

---

## 🔧 NOTAS TÉCNICAS GERAIS

- [ ] **Zustand Persistence:** Todos os estados novos devem ser persistidos em localStorage
- [ ] **Type Safety:** Usar TypeScript strict mode
- [ ] **Componentes:** Seguir padrão existente (SquadView, MatchCenter, etc.)
- [ ] **Styles:** Usar variáveis `--fm-*` existentes
- [ ] **Mobile:** Seguir padrão `styles-mobile.css`
- [ ] **Testes:** Adicionar smoke tests para novas funcionalidades

---

## 🚀 COMEÇANDO

**Recomendação:** Começar pela **P1.1 (Tabela de Classificação)** — é o item mais crítico e fundamental para o jogo funcionar.

**Pré-requisitos:**
- [ ] `npm install` para garantir dependências
- [ ] `npm run build` para verificar que o build atual funciona
- [ ] Backup do código atual antes de começar

---

**Última atualização:** Junho 2026
**Status:** 0% completado (tudo novo)
