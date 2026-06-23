# Football Manager Web - Visão do Projeto

## 🎯 Conceito Principal

**Football Manager Web** é um jogo estilo Football Manager simplificado, projetado para rodar 100% no navegador (frontend), sem necessidade de backend ou servidor.

A filosofia central é **minimalismo funcional**:
- Interface 2D puramente baseada em HTML/CSS (sem Canvas, WebGL ou renderização pesada)
- Elementos visuais simplificados em formato de botões e cards
- Foco em gameplay de gestão de time, simulação de partidas e transferências
- Performance otimizada para rodar em qualquer navegador moderno

## 🎮 Funcionalidades Implementadas (Fase 1 — Expandida)

### Core
- ✅ Seleção de time com geração procedural (8 clubes: 4 Série A + 4 Série B)
- ✅ Visualização de elenco com tabela e painel de detalhes
- ✅ Simulação de partidas ao vivo (minuto a minuto) com intervenções
- ✅ Classificação automática e calendário round-robin
- ✅ Persistência em localStorage (Zustand persist)

### Transferências
- ✅ Mercado com scouting e nevoeiro de atributos
- ✅ Ofertas recebidas, contra-ofertas e negociação
- ✅ Parcelas, bónus por performance e acordos contratuais

### Táticas e Treino
- ✅ Formações com drag-and-drop, roles/duties e instruções coletivas (3 fases)
- ✅ Plano de treino semanal com progressão de atributos visível
- ✅ Prevenção de lesões e monitor de fadiga

### Gestão
- ✅ Caixa de entrada com ações funcionais (lesão, diretoria, financeiro, juventude)
- ✅ Dinâmica de plantel: hierarquia, árvore social, promessas com countdown
- ✅ Finanças com projeção e controle interativo de salários

## 🎮 Funcionalidades Planeadas (Fase 2)

#### 📊 Sistema de Liga Avançado
- **Múltiplas divisões** — descenso/subida entre divisões
- **Torneios paralelos** — Copa regional, campeonato estadual
- **Escalação automática** — sugestão de time titular baseada em forma
- **Análise pós-jogo** — estatísticas detalhadas por partida

#### 💰 Sistema de Transferências Avançado
- **Avaliação de mercado** — previsão de valor dinâmica
- **Renegociação de contratos** — renovação e expiração

#### 🤖 Sistema de IA
- **Treinador adversário** — oponente com táticas variáveis
- **Gerenciamento financeiro automático** — AI que gerencia outros times

### Fase 3 — Expansão Future
- Base de dados expandida (1000+ jogadores, 500+ times)
- PWA instalável + sincronização cloud
- Multiplayer

## 🎨 Filosofia de Design

### Interface 2D Minimalista
- **Botões** — toda interação através de botões simples
- **Barras de atributo** — stats representados como barras horizontais coloridas
- **Cards** — informações dos jogadores em cards visuais
- **Tabelas** — classificação e dados organizados em tabelas limpas

### Performance
- **Sem Canvas/WebGL** — renderização puramente HTML/CSS
- **Componentes leves** — sem dependências pesadas
- **Estado local** — tudo rodando no cliente
- **Build de produção** — ~373 KB JS gzip ~104 KB

## 🔧 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Build | Vite 6 |
| Framework | React 19 |
| Linguagem | TypeScript 5.6 |
| State Management | Zustand 5 (persist) |
| Styling | CSS puro com variáveis (`--fm-*`) |
| Dados | Geração procedural (`playerGenerator.ts`) |
| Persistência | localStorage (`fm-game-storage-v3`) |

## 📐 Arquitetura

```
┌─────────────────────────────┐
│         UI Layer            │
│  (React Components 2D)      │
├─────────────────────────────┤
│       Game Engine           │
│  (gameStore.ts ~2600 linhas) │
├─────────────────────────────┤
│    Procedural Generator     │
│  (playerGenerator.ts)       │
├─────────────────────────────┤
│      Storage Layer          │
│  (localStorage via Zustand)  │
└─────────────────────────────┘
```

## 🎯 Público-Alvo

- **Fãs de jogos de gestão de futebol**
- **Desenvolvedores que querem estudar o código**
- **Jogadores casuais que querem algo simples**
- **Educadores que querem demonstrar React/TypeScript**

## 📋 Roadmap

| Fase | Timeline | Conteúdo |
|------|----------|----------|
| MVP Expandido | ✅ ~92% | 8 times procedurais, 9 telas, live match, transferências completas |
| Expansão | Planeado | 100+ times, copa, IA adversária |
| Completo | Future | Multiplayer, PWA, dados reais |

## 📝 Licença

Este projeto é pessoal e educacional. O código é aberto para estudo e referência.

---

**Versão:** 0.1.0  
**Status:** Fase 1 Expandida (~92% da spec)  
**Última atualização:** Junho 2026
