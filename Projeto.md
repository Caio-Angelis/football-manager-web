# Football Manager Web - Visão do Projeto

## 🎯 Conceito Principal

**Football Manager Web** é um jogo estilo Football Manager simplificado, projetado para rodar 100% no navegador (frontend), sem necessidade de backend ou servidor.

A filosofia central é **minimalismo funcional**:
- Interface 2D puramente baseada em HTML/CSS (sem Canvas, WebGL ou renderização pesada)
- Elementos visuais simplificados em formato de botões e cards
- Foco em gameplay de gestão de time, simulação de partidas e transferências
- Performance otimizada para rodar em qualquer navegador moderno

## 🎮 Funcionalidades Planeadas

### Fase 1 - MVP (Atual)
- ✅ Seleção de time ao iniciar
- ✅ Visualização de elenco com cards 2D
- ✅ Simulação de partidas baseada em atributos
- ✅ Classificação automática
- ✅ Mercado de transferências básico
- ✅ Configuração de táticas e formações

### Fase 2 - Expansão Planeada

#### 📊 Sistema de Liga Avançado
- **Múltiplas divisões** - Campeonato com descenso/subida entre divisões
- **Torneios paralelos** - Copa regional, campeonato estadual
- **Escalação automática** - Sugestão de time titular baseada em forma
- **Análise pós-jogo** - Estatísticas detalhadas por partida (chutes, posse, etc.)

#### 💰 Sistema de Transferências Completo
- **Negociação dinâmica** - Sistema de ofertas e contra-ofertas
- **Avaliação de mercado** - Previsão de valor baseada em idade, forma e atributos
- **Scouting** - Relatórios sobre jogadores de outros times
- **Contratos** - Renegociação, renovação e expiração de contratos
- **Finanças** - Orçamento dinâmico baseado em resultados

#### 🏋️ Sistema de Treinamento
- **Progressão de atributos** - Melhoria dos jogadores via treinamento
- **Sistemas de treino** - Foco em diferentes atributos (velocidade, chute, passe)
- **Prevenção de lesões** - Gerenciamento de carga física
- **Desenvolvimento de jovens** - Academia de jovens talentos

#### 🎯 Sistema de Formação
- **Campo visual 2D** - Representação visual dos jogadores no campo
- **Interatividade** - Arrastar e soltar jogadores para mudar posições
- **Sistema de roles** - Definição de papéis (líder, ponta, pivô)
- **Análise de compatibilidade** - Sugestão automática de formações

#### 📈 Progressão do Jogador
- **Morale e Form dinâmicos** - Atributos que mudam baseado em resultados
- **Experiência** - Melhoria com idade e tempo de jogo
- **Especializações** - Trajets de desenvolvimento (jogador técnico, físico, líder)

### Fase 3 - Expansão Future

#### 🌍 Expansão de Conteúdo
- **Base de dados expandida** - 1000+ jogadores, 500+ times
- **Jogadores reais** - Dados reais com licenças
- **Diferentes ligas** - Brasileiro, Europeu, Sul-Americano
- **Histórico de jogadores** - Carreira completa de cada jogador

#### 🤖 Sistema de IA
- **Treinador adversário** - Oponente com táticas variáveis
- **Gerenciamento financeiro automático** - AI que gerencia outros times
- **Sistema de scouting inteligente** - Sugestões baseadas em necessidades do time

#### 📱 Multiplataforma
- **PWA (Progressive Web App)** - Instalável como app nativo
- **Sincronização cloud** - Backup e restore via serviço cloud
- **Modo offline** - Funcionalidade sem internet

## 🎨 Filosofia de Design

### Interface 2D Minimalista
- **Botões** - Toda interação através de botões simples
- **Barras de atributo** - Stats representados como barras horizontais coloridas
- **Cards** - Informações dos jogadores em cards visuais
- **Tabelas** - Classificação e dados organizados em tabelas limpas

### Performance
- **Sem Canvas/WebGL** - Renderização puramente HTML/CSS
- **Componentes leves** - Sem dependências pesadas
- **Estado local** - Tudo rodando no cliente
- **Carregamento instantâneo** - Sem loading screens

## 🔧 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Build | Vite 6 |
| Framework | React 19 |
| Linguagem | TypeScript 5.6 |
| State Management | Zustand 5 |
| Styling | CSS puro com variáveis |
| Dados | JSON estático |
| Persistência | localStorage |

## 📐 Arquitetura

```
┌─────────────────────────────┐
│         UI Layer            │
│  (React Components 2D)      │
├─────────────────────────────┤
│       Game Engine           │
│  (Simulação, Transferências) │
├─────────────────────────────┤
│       Data Layer            │
│  (JSON estáticos)           │
├─────────────────────────────┤
│      Storage Layer          │
│  (localStorage)             │
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
| MVP | ✅ Feito | 3 times, 18 jogadores, 4 formações |
| Expansão | Planeado | 100+ times, 500+ jogadores, Copa |
| Completo | Future | Multiplayer, IA avançada, dados reais |

## 📝 Licença

Este projeto é pessoal e educacional. O código é aberto para estudo e referência.

---

**Versão:** 0.1.0  
**Status:** MVP Implementado  
**Última atualização:** Junho 2026
