# AI Context - Football Manager Web

## Visão Geral do Projeto

**Football Manager Web** é um jogo de gestão de futebol estilo Football Manager, 100% frontend (React + TypeScript), sem backend. Interface 2D minimalista com botões e cards.

**Localização:** `/home/caio/Área de trabalho/TestesLLMLOCAL/`

---

## 📁 Estrutura de Arquivos e Funções

### Configuração e Entry Points

**`package.json`** - Gerenciamento de dependências
- Dependências: React 19, Zustand 5
- DevDependencies: Vite 6, TypeScript 5.6, React types
- Scripts: `dev` (vite), `build` (tsc + vite), `preview`

**`vite.config.ts`** - Configuração do build
- Plugin React ativado
- Build otimizado para produção

**`tsconfig.json`** - Configuração TypeScript
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode habilitado

**`index.html`** - HTML principal
- Entry point do browser
- Inclui React root container
- Script module pointing to `/src/main.tsx`

**`src/main.tsx`** - Entry point React
- Renderiza o componente App dentro de React.StrictMode
- Mount em elemento com id="root"

---

### Types e Interfaces

**`src/types/game.ts`** - Definições de tipos TypeScript
- `Player`: ID, nome, posição, idade, nacionalidade, 6 atributos (1-100), overall, valor de mercado, salário, moral, forma
- `Team`: ID, nome, divisão, liga, estatísticas (pontos, jogos, vitórias), elenco, formação, tática
- `Match`: Home/Away team, gols, data, status
- `TransferOffer`: Oferta de transferência
- `GameState`: Estado global do jogo

---

### Dados Estáticos

**`src/data/players.json`** - Base de dados de jogadores
- 18 jogadores pré-definidos
- Divididos em: 2 GKs, 5 DEFs, 5 MIDs, 4 FWDs
- Cada jogador tem todos os atributos e metadata

**`src/data/teams.json`** - Base de dados de times
- 3 times: Flamengo, Palmeiras, Corinthians
- Cada time tem 7 jogadores no elenco
- Formação e tática pré-definidas

---

### Game Engine e State

**`src/store/gameStore.ts`** - Estado global + Engine do jogo (Zustand)
- Usa persistência via `zustand/middleware` com localStorage
- Funções principais:
  - `selectTeam()`: Seleciona o time do jogador
  - `advanceWeek()`: Gera novas partidas da semana
  - `simulateMatch()`: Simula uma partida e atualiza classificação
- Funções auxiliares internas:
  - `generateWeekMatches()`: Gera calendário de partidas
  - `simulateMatchResult()`: Algoritmo de simulação baseado em força dos times
  - `calculateTeamStrength()`: Média ponderada dos overall dos jogadores

---

### Componentes UI

**`src/components/ui/Button.tsx`** - Componente de botão reutilizável
- Props: onClick, disabled, variant (primary/secondary/success), children, className
- Classes CSS: fm-button, fm-button--variant, fm-button--disabled

**`src/components/ui/StatBar.tsx`** - Barra horizontal de atributo
- Props: label, value, maxValue (default 100), showValue
- Color coding automático baseado no valor (verde >80, amarelo >40, vermelho <20)

**`src/components/squad/PlayerCard.tsx`** - Card visual do jogador
- Mostra: posição (colorida), nome, idade, nacionalidade, overall
- Renderiza 6 StatBars para atributos
- Footer com valor de mercado e salário
- Botão de ação opcional

**`src/components/squad/SquadView.tsx`** - Tela de elenco
- Agrupa jogadores por posição (GK, DEF, MID, FWD)
- Renderiza PlayerCard para cada jogador
- Header com info do time

**`src/components/match/MatchCenter.tsx`** - Tela de partidas
- Lista partidas da semana
- Botão "Simular" aparece apenas para partidas do jogador
- Tabela de classificação abaixo
- Botão "Avançar Semana"

**`src/components/transfer/TransferMarket.tsx`** - Tela de transferências
- Lista jogadores disponíveis (não no elenco)
- Filtro de busca por nome
- Botão "Comprar" em cada jogador
- Orçamento fixo de R$ 15M (simulado)

**`src/components/tactics/TacticsView.tsx`** - Tela de táticas
- 4 formações: 4-4-2, 4-3-3, 3-5-2, 5-2-2
- 3 táticas: attacking, defensive, balanced
- Visualização 2D do campo com jogadores

**`src/components/TeamSelection.tsx`** - Tela de seleção de times
- Mostra todos os times disponíveis
- Cada time tem nome, divisão, formação, tamanho do elenco
- Botão "Jogar" para selecionar

**`src/App.tsx`** - Componente raiz
- Verifica se time foi selecionado
- Se não: mostra TeamSelection
- Se sim: mostra sidebar + tela ativa
- Sidebar com 4 opções: Elenco, Partidas, Transferências, Táticas

---

### Estilos

**`src/styles.css`** - CSS completo do projeto
- Variáveis CSS para tema (cores, fontes, spacing)
- Layout principal: App com sidebar + main
- Estilos para todos os componentes
- Grid layouts responsivos
- Hover effects e transições

---

## 🔄 Fluxo de Dados

```
User → App.tsx → TeamSelection (se não selecionou time)
     → Sidebar (se selecionou)
     → SquadView | MatchCenter | TransferMarket | TacticsView
     ↓
gameStore.ts (Zustand)
     ↓
players.json + teams.json
     ↓
localStorage (persistência)
```

---

## 🎮 Regras de Jogo

1. **Seleção:** Escolha um time ao iniciar
2. **Partidas:** Avance semanas, simule partidas do seu time
3. **Classificação:** Atualizada automaticamente após simulação
4. **Transferências:** Compre jogadores do mercado (simulado)
5. **Táticas:** Configure formação e tática

---

## ⚙️ Comandos Úteis

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build produção
npm run build

# Preview produção
npm run preview
```

---

## 📊 Estatísticas do Projeto

- **Total de arquivos:** 20+
- **Linhas de código:** ~3,000
- **Componentes React:** 9
- **Jogadores:** 18
- **Times:** 3
- **Formações:** 4
- **Táticas:** 3
- **Tamanho do bundle:** ~150KB (minificado)

---

## 🔑 Pontos de Extensibilidade

1. **Adicionar jogadores:** Editar `src/data/players.json`
2. **Adicionar times:** Editar `src/data/teams.json`
3. **Expandir engine:** Adicionar funções em `src/store/gameStore.ts`
4. **Novas telas:** Criar componente novo + adicionar ao App.tsx
5. **Mudar estilos:** Editar `src/styles.css`

---

**Última atualização:** Junho 2026
