# Regras de Táticas

## Formações e Escalação

O usuário pode arrastar e soltar jogadores nas posições do campo. As formações disponíveis incluem:

- 4-4-2
- 4-3-3
- 3-5-2
- 5-2-2

Cada posição tem um **role** (função) e um **duty** (dever) que afetam o desempenho.

---

## Formas de Escalação

### Auto-preencher (Plus / Sugestão de Seleção / Escolha Rápida)

Preenche automaticamente os 11 slots com os melhores jogadores por posição (ordenados por `currentAbility`), com fallback para qualquer jogador disponível se não houver candidato da posição ideal.

### Drag-and-drop

- **Entre titulares:** Arrasta um titular para outro slot no campo 2D para trocar jogadores entre posições (`swapSlots`).
- **Banco ↔ Campo:** Arrasta um reserva do banco lateral para uma posição titular no campo 2D e eles invertem — o reserva assume a vaga e o titular cai para o banco automaticamente (`swapBenchToSlot`). Também funciona arrastando do campo para o banco.
- **Tabela ↔ Campo:** Arrasta qualquer reserva da tabela de seleção à direita (incluindo jogadores fora do banco de 7) para uma posição titular no campo 2D — mesmo efeito de inversão via `swapBenchToSlot`.
- Highlight visual azul indica o alvo do drop.

### Navegação

- **Setas ↑/↓ na topbar:** Ciclam formações sequencialmente sem precisar abrir o painel de edição.
- **Salvar (ícone Download):** Salva o jogo no slot 1 com feedback visual de status.

---

## Campo 2D Vertical

Exibe marcadores com camisa, código do role e duty, coloridos por linha:
- **GK/DEF:** Verde
- **MID:** Âmbar
- **FWD:** Vermelho

O banco lateral mostra os nomes reais dos reservas e é **draggable**. A tabela de seleção à direita permite filtrar entre titulares e elenco completo (botão Filter).

---

## Sub-abas da Tela de Táticas

| Aba | Conteúdo |
|-----|----------|
| Overview / Player | Tabela completa de seleção com titulares por slot + reservas |
| Opposition | Análise do próximo adversário (nome, casa/fora) |
| Roles | Tabela de papéis e funções por slot da formação |
| Set pieces | Painel completo de bolas paradas (ataque e defesa) |
| Numbers | Placeholder (a implementar) |

---

## Instruções Táticas

O sistema tático tem três fases:

### 1. Em Posse

- **Largura de ataque:** estrito, equilibrado, largo
- **Estilo de passe:** curto, misto, direto
- **Ritmo:** lento, equilibrado, rápido
- **Foco lateral:** esquerda, direita, nenhum
- **Toggles:** levar bola à área, cruzar das laterais, assumir mais riscos

### 2. Em Transição

- **Ao perder a posse:** contra-pressionar ou recuar
- **Ao ganhar a posse:** contra-atacar ou manter estrutura

### 3. Sem Posse

- **Linha de engajamento:** alta, média, baixa
- **Linha defensiva:** alta, média, baixa
- **Intensidade de pressão:** baixa, média, alta
- **Estilo de desarme:** agressivo ou contido
- **Toggle:** armadilha de impedimento

---

## Mentalidade

7 níveis disponíveis, do mais defensivo ao mais ofensivo:

1. Muito Defensivo
2. Defensivo
3. Cauteloso
4. Equilibrado
5. Positivo
6. Ofensivo
7. Muito Ofensivo

A mentalidade afeta o bônus tático aplicado na simulação de partidas:
- **Mentalidade ofensiva:** +5% de bônus
- **Mentalidade defensiva:** +4% de bônus

---

## Instruções Individuais

Cada jogador pode receber instruções individuais por posição, com roles específicos para GK, DEF, MID e FWD. Armazenados em `tacticsConfig.playerRoles`.

---

## Bolas Paradas (Set Pieces)

Configuradas na aba **Set pieces** e persistidas em `tacticsConfig.setPieces` (tipo `SetPiecesConfig`).

### Ataque

**Escanteios** — 5 tipos: 1º Poste, 2º Poste, Área, Curto, Borda. Cobrador por `crossing`; alvo por `heading` + `jumping`.

**Faltas** — 4 tipos: Tiro Direto, Cruzamento, Curto, Bola Longa. Cobrador por `freeKicks` + `technique` + `finishing` + `longShots` + `composure`.

**Laterais** — 3 estilos: Curto, Longo, Rápido.

**Pênaltis** — Cobrador por `finishing` + `composure`. Conversão base ~76%, range 55%-92%.

### Defesa

**Escanteios defensivos:**
- Marcação Individual (+15% eficiência), Zonal (base), Misto (+8%)
- Contra-ataque: 60% chance de sair rápido, -3% chance adversária

**Faltas defensivas:**
- Marcação Individual (+10%), Zonal (base), Misto (+5%)
- Barreira: Pequena (+15% gol adversário), Média (neutro), Grande (-15% gol adversário)

### Atributos Relevantes

`crossing`, `heading`, `jumping`, `freeKicks`, `finishing`, `composure`, `technique`, `longShots`, `marking`, `commandOfArea`, `aerialReach`, `reflexes`, `oneOnOne`, `positioning`
