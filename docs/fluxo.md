# Fluxos de Navegação — Football Manager Web

## 📋 Visão Geral

Aplicação single-page com navegação lateral (sidebar) e múltiplas telas.

---

## 1️⃣ FLUXO: INICIAR JOGO (Sem Save)

```
Tela Inicial
    │
    ├─→ Botão "Gerar clubes" (se não há clubes)
    │
    ├─→ Clicar em um time (card ou botão "Assumir comando")
    │   └─→ Tela principal (Squad)
    │
    └─→ Clicar em outro "Gerar nova liga"
        └─→ Reseta e mostra novos times
```

**Componentes:** `App.tsx`, `TeamSelection.tsx`

---

## 2️⃣ FLUXO: CARregar/SAVAR SAVE

### Criar novo save
```
Tela Principal (qualquer tela)
    │
    └─→ Sidebar → Botão "💾 Save 1" ou "💾 Save 2"
        └─→ Toast: "💾 Save 1 salvo!"
```

### Carregar save existente
```
Tela Inicial (sem time selecionado)
    │
    ├─→ Painel "Saves" → Clicar em slot vazio
    │   └─→ Toast: "❌ Selecione um time primeiro!"
    │
    └─→ Slot com save → Botão "Carregar"
        └─→ Toast: "Save 1 carregado — [Time]"
        └─→ Tela principal (Squad)
```

### Excluir save
```
Slot com save
    │
    └─→ Botão "Excluir" → "Sim" (confirma)
        └─→ Save excluído
```

**Componentes:** `SaveSlot.tsx`, `App.tsx`

---

## 3️⃣ FLUXO: NAVIGAÇÃO PRINCIPAL (Sidebar)

```
Qualquer tela (durante o jogo)
    │
    └─→ Sidebar (menu lateral)
        │
        ├─→ 👥 Elenco (Squad)
        ├─→ ⚽ Partidas (MatchCenter)
        ├─→ 📊 Classificação (LeagueTable)
        ├─→ 🔄 Transferências (TransferMarket)
        ├─→ 📋 Táticas (TacticsView)
        ├─→ 🏋️ Treino (TrainingView)
        ├─→ 📊 Dinâmica (DynamicsView)
        ├─→ 📬 Caixa de Entrada (InboxView)
        ├─→ 💰 Finanças (FinanceView)
        └─→ 🏢 Visão do Clube
```

### Botões da Sidebar (rodapé)
```
├─→ ← Voltar        → Deseleciona time (volta à tela inicial)
├─→ 🏠 Início       → Vai para tela Squad
├─→ Continuar ▶     → advanceWeek (avança uma semana)
├─→ 💾 Save 1       → Salva no slot 1
└─→ 💾 Save 2       → Salva no slot 2
```

**Componentes:** `App.tsx` (NAV_ITEMS)

---

## 4️⃣ FLUXO: PARTIDAS (MatchCenter)

### Simulação normal
```
Tela Partidas
    │
    └─→ Lista de partidas (Próximas Partidas)
        │
        ├─→ Partida não completada (user)
        │   └─→ Botão "Simular Partida"
        │       └─→ Partida concluída
        │
        └─→ Partida concluída
            └─→ Botão "Ver Detalhes"
                └─→ Modal com:
                    ├── Score final
                    ├── Eventos (gols, cartões, substituições)
                    ├── Estatísticas (posse, chutes, passes)
                    ├── Live Data Hub
                    └── Jogador da Partida (⭐)
```

### Partida ao vivo (live)
```
Partida concluída → Botão "Ver Detalhes"
    │
    └─→ Botão "Iniciar" (dentro do modal de detalhes)
        └─→ Partida ao vivo (90 minutos, avança a cada 2s)
            │
            ├─→ Botão "Finalizar" → Pula direto para o fim
            └─→ Botão "Reativar Partida" → Retoma live
```

### Intervenção durante partida
```
Tela Partidas (partida não completada)
    │
    └─→ Seção "Intervenção"
        │
        ├─→ Botão "Substituição" → applyMatchIntervention('substitution')
        └─→ Botão "Gritos à Equipa" → applyMatchIntervention('shout')
```

### Avançar semana
```
Tela Partidas
    │
    └─→ Botão "Avançar Semana"
        └─→ Gera novas partidas, atualiza classificação
```

**Componentes:** `MatchCenter.tsx`

---

## 5️⃣ FLUXO: CAIXA DE ENTRADA (InboxView)

### Navegação principal
```
Tela Inbox
    │
    ├─→ Filtros (topo)
    │   ├─→ Tipo: Todas, Transferência, Lesão, Sugestão, Diretoria, Base, Treino, Financeiro
    │   └─→ Prioridade: Todas, Alta, Média, Baixa
    │
    └─→ Lista de mensagens filtradas
```

### Fluxo por tipo de mensagem

#### 💰 Transferência
```
Mensagem de transferência
    │
    └─→ Ações disponíveis:
        ├─→ Aceitar
        ├─→ Recusar
        ├─→ Negociar
        └─→ Adiar
```

#### 🏥 Lesão
```
Mensagem de lesão
    │
    └─→ Botão "Ver Relatório"
        └─→ Abre modal de relatório médico:
            ├── Jogador, posição, tipo de lesão
            ├── Gravidade (leve/moderada/grave)
            ├── Dias de afastamento
            ├── Progresso de recuperação
            ├── Tratamento recomendado
            └─→ Prognóstico
```

#### 💡 Sugestão (staff técnico)
```
Mensagem de sugestão
    │
    └─→ Ações: Aplicar / Dispensar / Marcar como Lido
```

#### 👔 Diretoria
```
Mensagem da diretoria
    │
    └─→ Botão "Responder"
        └─→ Abre modal de resposta:
            ├── Mostra mensagem original
            ├── Seleciona categoria (geral, treino, táticas, elenco, etc.)
            ├── textarea com limite de 500 caracteres
            ├── Mostra barra de satisfação atual
            └─→ Botão "Enviar Resposta"
```

#### 🌱 Base juvenil
```
Relatório de categorias de base
    │
    └─→ Ações: Convocar / Ignorar / Marcar como Lido
```

#### 🏋️ Treino
```
Relatório de treinamento
    │
    └─→ Ações: Ver Detalhes / Marcar como Lido
```

#### 📊 Financeiro
```
Relatório financeiro
    │
    └─→ Botão "Ver Relatório"
        └─→ Abre modal financeiro:
            ├── Orçamento, folha salarial, lucro
            ├── Receitas (bilheteria, patrocínio)
            ├── Despesas (salários, outros)
            ├── Transferências (gastos, recebidos)
            ├── Dias até deadline
            └─→ Barra de status financeiro
```

**Componentes:** `InboxView.tsx`, `constants.ts`

---

## 6️⃣ FLUXO: TRANSFERÊNCIAS (TransferMarket)

```
Tela Transferências
    │
    └─→ Lista de jogadores disponíveis
        │
        └─→ Botão "Comprar" / "Vender" em cada jogador
```

**Componentes:** `TransferMarket.tsx`

---

## 7️⃣ FLUXO: TÁTICAS (TacticsView)

```
Tela Táticas
    │
    └─→ Visualização da formação
        │
        └─→ Botões para ajustar posição/tática de cada jogador
```

**Componentes:** `TacticsView.tsx`

---

## 8️⃣ FLUXO: TREINO (TrainingView)

```
Tela Treino
    │
    └─→ Opções de treino disponíveis
        │
        └─→ Botão para aplicar treino (ex: físico, tático, técnico)
```

**Componentes:** `TrainingView.tsx`

---

## 9️⃣ FLUXO: CLASSIFICAÇÃO (LeagueTable)

```
Tela Classificação
    │
    └─→ Tabela com:
        ├── Posição, nome, pontos, jogos, vitórias, empates, derrotas
        ├── Gols marcados, gols sofridos, saldo
        └─→ Destaque para time selecionado
```

**Componentes:** `LeagueTable.tsx`

---

## 🔟 FLUXO: FINANÇAS (FinanceView)

```
Tela Finanças
    │
    └─→ Resumo financeiro:
        ├── Orçamento atual
        ├── Receita/despesa
        ├── Folha salarial
        └─→ Histórico de transações
```

**Componentes:** `FinanceView.tsx`

---

## 1️⃣1️⃣ FLUXO: DINÂMICAS (DynamicsView)

```
Tela Dinâmica
    │
    └─→ Visualização de dinâmica de equipe
        │
        └─→ Indicadores de moral, coesão, etc.
```

**Componentes:** `DynamicsView.tsx`

---

## 1️⃣2️⃣ FLUXO: VISÃO DO CLUBE

```
Tela Visão do Clube
    │
    └─→ Informações do clube:
        ├── Nome, divisão, liga
        ├── Reputação
        ├── Expectativa da diretoria
        ├── Nível de instalações
        ├── Base juvenil
        ├── Scouting
        └─→ Número de jogadores no elenco
```

**Componentes:** `App.tsx` (inline)

---

## 🔄 FLUXO: AVANÇAR TEMPO (GLOBAL)

```
Qualquer tela (durante o jogo)
    │
    ├─→ Sidebar → Botão "Continuar ▶"
    │   └─→ advanceWeek()
    │       └─→ Gera novas partidas, atualiza standings
    │
    └─→ Tela Partidas → Botão "Avançar Semana"
        └─→ Mesma funcionalidade
```

**Componentes:** `App.tsx`, `MatchCenter.tsx`, `gameStore.ts`

---

## 📊 RESUMO DE TELAS

| Icon | ID | Componente | Descrição |
|------|---|------------|-----------|
| 👥 | squad | SquadView | Elenco do time |
| ⚽ | match | MatchCenter | Partidas e simulação |
| 📊 | league | LeagueTable | Classificação |
| 🔄 | transfer | TransferMarket | Transferências |
| 📋 | tactics | TacticsView | Táticas e formação |
| 🏋️ | training | TrainingView | Treino |
| 📊 | dynamics | DynamicsView | Dinâmica de equipe |
| 📬 | inbox | InboxView | Caixa de entrada |
| 💰 | finance | FinanceView | Finanças |
| 🏢 | club | App.tsx (inline) | Visão do clube |

**Total: 10 telas de jogo + 2 telas iniciais (Team Selection + Save Slots)**

---

## ⚡ ATALHOS E AÇÕES RÁPIDAS

1. **Voltar para home**: Sidebar → Botão "🏠 Início"
2. **Voltar ao início**: Sidebar → Botão "← Voltar"
3. **Avançar semana**: Sidebar → "Continuar ▶" OU Tela Partidas
4. **Salvar rápido**: Sidebar → "💾 Save 1" ou "💾 Save 2"
5. **Ver mensagens**: Sidebar → "📬 Caixa de Entrada"
