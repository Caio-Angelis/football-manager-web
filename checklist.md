# Checklist — Revisão Completa de CSS (styles.css, styles-supplement.css, styles-mobile.css)

## styles.css (5.009 linhas) — Estilos Base e Globais

### Design Tokens e Variáveis CSS
- [x] Variáveis de cor (`--color-primary`, `--color-success`, `--color-warning`, `--color-danger`)
- [x] Variáveis de tipografia (fontes, tamanhos, pesos)
- [x] Variáveis de espaçamento, raios de borda, sombras
- [x] Variáveis de glassmorphism (`--glass-bg`, `--glass-border`, `--glass-shadow`)
- [x] Variáveis de gradientes e timings de animação (`--motion-normal`, `--motion-fast`)

### Sidebar e App Shell
- [x] Logo com texto em gradiente
- [x] Indicador de borda ativa estilo Apple
- [x] Ponto pulsante "ao vivo" (live dot)
- [x] Estado recolhido da sidebar (collapsed)

### Player Cards
- [x] Efeito 3D no hover
- [x] Badges de posição com gradiente
- [x] Glassmorphism nos cards
- [x] Barras de atributos

### Squad View
- [x] Tabela com cabeçalho glassmorphism
- [x] Sublinhados animados para títulos de seção
- [x] Toolbar, busca, filtros, menu de ordenação
- [x] Badges de posição, células de nome, display de CA/PA
- [x] Badges de status (key player, regular, rotation, young talent, excess)
- [x] Badges de lesão

### Match Center
- [x] Cards de partida
- [x] Modal de detalhes da partida
- [x] Live data hub
- [x] Eventos de partida (gol/finalização/falta/defesa/etc.)
- [x] Estatísticas de partida
- [x] Live view com animações
- [x] Controles de velocidade
- [x] Botões de finalizar e detalhes

### Transfer Market (base)
- [x] Cabeçalhos e chips de orçamento
- [x] Cards de jogadores no mercado
- [x] Cards de relatório de olheiro
- [x] Cards de oferta de transferência
- [x] Displays de cláusulas de parcelamento
- [x] Displays de bônus

### Team Selection / Landing Page
- [x] Seção hero
- [x] Anéis de reputação
- [x] Displays de métricas
- [x] Skeleton loading
- [x] Efeitos de hover
- [x] Background night pitch
- [x] Topbar, layout (full/aside), actions
- [x] Elementos de marca (mark, title, tagline)
- [x] Painel aside com estilos de save slot

### Tactics View (base)
- [x] Container glassmorphism
- [x] Cards de formação com fundo gradiente
- [x] Pontos de jogador com glow
- [x] Formação visual arrastável
- [x] Campo realista com gradiente e listas de grama cortada (mowed stripes)

### Training View
- [x] Calendário, estilos de dia/sessão
- [x] Tipos de treino com estados ativos
- [x] Risco de lesão (low/moderate/high/critical)
- [x] Monitor de fadiga
- [x] Progressão de atributos com barras de delta

### Dynamics View
- [x] Níveis de hierarquia
- [x] Tabela de satisfação
- [x] Métricas de desempenho do clube
- [x] Visualização de árvore social (nós raiz, nós de jogador, conexões, legenda de força de aresta)
- [x] Lista de promessas
- [x] Badges de forma (W/D/L)

### Finance View
- [x] Cards de resumo (positivo/negativo)
- [x] Medidor de controle de salários
- [x] Livro-razão financeiro (linhas de receita/despesa)
- [x] Tabela de salários
- [x] Gráfico financeiro
- [x] Projeção de 6 semanas

### Inbox View
- [x] Cards de mensagem com glassmorphism
- [x] Modais de mensagem
- [x] Modais de relatório de lesão/financeiro
- [x] Board reply (select, textarea, char count, satisfaction bar)

### League View
- [x] Grid da tabela
- [x] Badges de zona (title/europe/safe/relegation)
- [x] Badges de forma (W/D/L)
- [x] Destaque do time do usuário
- [x] Legenda

### Save Slot System
- [x] Estados ativo/vazio
- [x] Badges, chips, toasts
- [x] Informações do time
- [x] Botões de ação (load/save/create/delete) com confirmação

### Error Boundary
- [x] Ícone de shake animado
- [x] Título com gradiente
- [x] Botões de ação

### Animações
- [x] Skeleton shimmer
- [x] Transições de página suaves (enter/exit)
- [x] Animações de stagger
- [x] `fm-slide-up`, `fm-stagger-in`
- [x] Media queries de reduced motion

---

## styles-supplement.css (6.051 linhas) — Estilos Suplementares

### App Shell e Sidebar (suplementar)
- [x] Estado recolhido da sidebar
- [x] Logo, season, footer
- [x] Ícones/rótulos de itens da sidebar
- [x] Botões (primary, continue, home, save)

### Club View
- [x] Cabeçalho
- [x] Seção de informações com glassmorphism

### Toast System
- [x] Container, toast, ícone, conteúdo, mensagem, botão de dispensar
- [x] Animação slide-in

### Landing Page (suplementar)
- [x] Background night pitch
- [x] Topbar, layout (full/aside), actions
- [x] Elementos de marca (mark, title, tagline)
- [x] Painel aside com estilos de save slot
- [x] Ajustes responsivos

### Squad View (suplementar)
- [x] Cabeçalho, season, tabela
- [x] Toolbar, input de busca, botões de filtro, menu de ordenação
- [x] Grid da tabela, badges de posição, células de nome
- [x] Display de CA/PA, barras, badges de status, badges de lesão

### Player Detail Panel
- [x] Drawer fixo (400px de largura)
- [x] Overlay
- [x] Variante bottom-sheet para mobile
- [x] Seção de identidade, badge de posição, badge de overall
- [x] Barras de status, display de lesão
- [x] Grid de atributos, linhas de contrato
- [x] Pill de status do elenco, lista de promessas

### Player Card Extras
- [x] Meta, posições secundárias, itens de status
- [x] Lesão, valor de mercado/salário, botão de ação

### Transfer Market (suplementar base)
- [x] Abas, busca, select de status
- [x] Lista de jogadores, carregar mais
- [x] Feedback, valor, overlay de fog
- [x] Cards de oferta/acordo de transferência

### Transfer Offer/Agreement Details
- [x] Cabeçalhos, nomes de jogador
- [x] Grid de detalhes, rótulos/valores de detalhe
- [x] Ações, lista de bônus, tags de bônus
- [x] Histórico, resumo de parcelamentos
- [x] Displays de parcelamento/bônus, itens de pagamento

### Scout Report
- [x] Grid, card com glassmorphism
- [x] Cabeçalho, posição, meta
- [x] Barras de atributos, efeito fog
- [x] Rodapé, confiabilidade

### Inbox Extras
- [x] Tempo de mensagem
- [x] Botão de fechar modal, tags de tipo
- [x] Seções de relatório de lesão/financeiro, grids, barras de progresso
- [x] Board reply (select, textarea, char count, satisfaction bar)

### Match Center Extras
- [x] Controles, standings, botão de detalhes, botão de finalizar

### Tactics Supplement
- [x] Nome do time, lista de formações, mentalidade
- [x] Abas de fase, grupos de instrução, toggles de instrução
- [x] Instruções multi-valor, grid de roles
- [x] Cards de seletor de role do jogador, instruções individuais

### Training Supplement
- [x] Cabeçalho de seção, botão de toggle
- [x] Grid de risco de lesão, grid de fadiga
- [x] Botões de prevenção
- [x] Progressão de atributos (toolbar, hint, grid, barras de delta, estado sem histórico)

### Finance Supplement
- [x] Cards financeiros (highlight, label, value)
- [x] Controle de salários (labels do medidor, track, fill, estado over)
- [x] Grid de projeção (6 semanas)

### Dynamics Supplement
- [x] Badges de forma (W/D/L)
- [x] Estilos de nós da árvore social

### Empty State e Theme Toggle
- [x] Mensagem de estado vazio (ícone, texto, hint)
- [x] Theme toggle (estilo radio com estado checked, variante sidebar)
- [x] Ajustes responsivos

### Dark Theme (data-theme="dark")
- [x] Override completo de variáveis usando `oklch()`
- [x] `color-scheme: dark`
- [x] Primária, sucesso, aviso, perigo, texto, superfície, fundo, borda, glass, gradientes, sombras

### Completed Transfers
- [x] Cabeçalho da seção, lista
- [x] Cards de transferência com badges de status (cash/installments)
- [x] Grid de detalhes, linha de meta, responsividade

### Night Pitch Theme Override (maior seção — ~1.040 linhas)
- [x] `.fm-app`: Fundo com gradiente radial (verde escuro), listras de grama cortada
- [x] Overrides de variáveis CSS (superfície, fundo, texto, borda, glass, sombras)
- [x] Sidebar: Glassmorphism verde escuro com blur
- [x] Todos os containers de view: Fundo transparente, scroll interno
- [x] Títulos: Branco sólido (remove gradiente do texto)
- [x] Tabelas, inputs, statbars: Fundos brancos semi-transparentes
- [x] Player cards: Badges de posição com gradiente verde, borda verde no overall
- [x] Badges de status: Cores semi-transparentes (key player=âmbar, regular=verde, rotation=branco, young talent=roxo, excess=vermelho)
- [x] Eventos de partida: Fundos coloridos semi-transparentes
- [x] Botões de filtro/toggle, cards de formação, tipos de treino: Acento verde quando ativo
- [x] Squad table: Linhas semi-transparentes, acento verde para selecionado/chips
- [x] League table: Badges de zona com cores semi-transparentes, destaque do time do usuário em verde
- [x] Transfer market: Abas, busca, fog, cards de oferta — todos tematizados
- [x] Match live view, controles de velocidade, lista de ações, painel de intervenção
- [x] Finance: Linhas do razão, barras do gráfico, semanas de projeção, cards de highlight
- [x] Modals: Glassmorphism verde escuro com blur
- [x] Inbox: Badges de não lidos, ícones de mensagem, feedback de ação
- [x] Player detail panel: Glassmorphism verde escuro
- [x] Save slots: Tematizado para dark mode
- [x] Scrollbar: Thumb branco semi-transparente
- [x] Atributo de progressão: Deltas positivo/negativo coloridos
- [x] Load more do mercado de transferências
- [x] Labels de relatório de lesão/financeiro
- [x] Error boundary
- [x] Theme toggle na sidebar

### Negotiation Modal
- [x] Overlay, modal com cabeçalho (texto gradiente), botão de fechar
- [x] Card de informações do jogador
- [x] Formulário de oferta com inputs
- [x] Status do resultado (accepted/rejected/countered/walked_away)
- [x] Ações de contraproposta
- [x] Painel de histórico (rounds, preços, status)
- [x] Barra de willingness (disposição do clube)
- [x] Display de rodadas
- [x] Botões de oferta rápida (quick offers)
- [x] Aviso de orçamento (budget warning)
- [x] Pré-visualização de contrato (contract preview)

### Transfer Market Polish
- [x] Barra de filtros com glassmorphism
- [x] Selects de posição/status/ordenação
- [x] Toggle de ordenação
- [x] Abas com container glassmorphism
- [x] Barra de seleção
- [x] Mensagens de feedback
- [x] Cabeçalhos de seção (h2)
- [x] Fog card com overlay borrado
- [x] Carregar mais (load more)
- [x] Cards de oferta/acordo com glassmorphism + hover
- [x] Cards de cláusula de parcelamento
- [x] Cards de bônus (triggered/claimed)
- [x] Cards de relatório de olheiro com glassmorphism + hover
- [x] Displays de parcelamento/bônus dentro de ofertas
- [x] Layouts de seção com animações
- [x] Estado vazio (empty state)
- [x] Cards de transferência concluída com glassmorphism

### Tactics View Redesign
- [x] Cabeçalho com badges de formação/tática
- [x] Badges de tática (attacking/defensive/balanced)
- [x] Navegação por abas
- [x] Grid de conteúdo
- [x] Seções, seção de formação (sem padding)
- [x] Botões de seletor de formação
- [x] Seletor de tática
- [x] Mentalidade como pills horizontais
- [x] Abas de fase
- [x] Toggles de instrução com checkboxes
- [x] Instruções multi-valor com dropdowns
- [x] Chips de seletor de jogador
- [x] Cards de seletor de role do jogador
- [x] Instruções individuais com checkboxes
- [x] Visual do campo com aspect ratio
- [x] Responsividade mobile (abas scrolláveis, grid 1 coluna, chips scrolláveis)

### Season Summary Modal
- [x] Overlay, modal com cabeçalho (ícone de season)
- [x] Body: nome do time, display de posição, badge de zona
- [x] Grid de estatísticas (3 colunas)
- [x] Premiações (awards)
- [x] Final season
- [x] Footer com botão primário

### Transfer Market — Novas Abas

#### Loans (Empréstimos)
- [x] Seção e lista de empréstimos
- [x] Cards de empréstimo com glassmorphism + hover
- [x] Badges de status (active/completed/recalled/bought)
- [x] Grid de detalhes, ações
- [x] Estados de opacidade para completed/recalled/bought

#### Shortlist
- [x] Seção e lista de shortlist
- [x] Cards de shortlist com glassmorphism + borda esquerda colorida por prioridade
- [x] Prioridade (high=vermelho, medium=âmbar, low=verde)
- [x] Badges de prioridade
- [x] Notas em itálico
- [x] Ações (adicionar/remover/promover)

#### Recommendations
- [x] Seção e lista de recomendações
- [x] Cards de recomendação com glassmorphism + hover
- [x] Badges de nota (A-F com cores)
- [x] Grid de detalhes, texto de razão, meta, ações

#### Bidding Wars
- [x] Seção e lista de guerras de ofertas
- [x] Cards de bidding com glassmorphism + borda esquerda (won/lost/withdrawn)
- [x] Badges de status (active/won/lost/withdrawn)
- [x] Lista de competidores
- [x] Input de lance, ações

#### Scouts Panel
- [x] Painel de scouts com grid
- [x] Cards de scout (nome, badge, stats, barra de progresso)
- [x] Estado assigned (borda primária)

### Responsividade das Novas Abas
- [x] Grid de detalhes em coluna única no mobile (768px)
- [x] Grid de scouts em coluna única no mobile
- [x] Input de bidding em largura total no mobile

---

## styles-mobile.css (611 linhas) — Overrides Responsivos

### Breakpoint Tablet (1024px)
- [x] Sidebar estreita para 220px
- [x] Ajustes de padding

### Breakpoint Mobile (768px)
- [x] Sidebar → barra de navegação inferior (fixed, horizontal scroll, itens com ícone+label)
- [x] Conteúdo principal com padding inferior (72px)
- [x] Squad table com scroll horizontal
- [x] League table com ocultação de colunas
- [x] Transfer market em coluna única
- [x] Tactics formations grid ajustado
- [x] Training/Finance grids colapsam
- [x] Match center controls empilham
- [x] Player detail panel → bottom sheet
- [x] Scout reports em coluna única
- [x] Inbox actions empilham
- [x] Toast acima da navegação inferior
- [x] Tamanhos de botão ajustados
- [x] Dynamics social tree ajustado
- [x] Club view ajustado
- [x] Landing page responsiva
- [x] Redução de tamanho de headings
- [x] Touch scrolling (`-webkit-overflow-scrolling: touch`)

### Breakpoint Small Mobile (640px)
- [x] League table oculta mais colunas
- [x] Transfer market tabs com scroll horizontal

### Breakpoint Very Small Mobile (480px)
- [x] Squad table → modo card (linhas viram colunas flex)
- [x] Actionbar → botões empilhados em largura total
- [x] Finance projection → coluna única
- [x] Landing page mais compactada
- [x] Headings ainda mais reduzidos

---

## Padrões de Arquitetura CSS

- [x] Nomenclatura BEM-like: `fm-component__element--modifier`
- [x] Variáveis CSS centralizadas como design tokens
- [x] Glassmorphism: `backdrop-filter: blur()` + fundos semi-transparentes + bordas sutis
- [x] Night Pitch theme aplicado globalmente via `.fm-app`
- [x] Dark theme separado via `[data-theme="dark"]`
- [x] Animações: `fm-slide-up`, `fm-stagger-in`, skeleton shimmer, transições de página, hover transforms
- [x] Estratégia responsiva: Overrides mobile-first em arquivo separado, padrão de bottom nav, modo card para telas pequenas
- [x] Sem preprocessor CSS: CSS puro com `@import` no `main.tsx`

---

## Itens Pendentes / Pontos de Atenção

- [ ] Verificar consistência de variáveis CSS entre `styles.css` e `styles-supplement.css` (alguns valores hard-coded em vez de usar variáveis)
- [ ] Auditar uso de `oklch()` para compatibilidade com navegadores antigos
- [ ] Verificar duplicação de estilos entre `styles.css` e `styles-supplement.css` (ex: negotiation modal aparece em ambos)
- [ ] Considerar consolidação de overrides do Night Pitch theme (alguns componentes têm overrides redundantes)
- [ ] Avaliar performance de `backdrop-filter: blur()` em dispositivos móveis de baixo desempenho
- [ ] Verificar acessibilidade: contraste de cores no Night Pitch theme (texto branco em fundos verdes escuros)
- [ ] Validar breakpoints: gap entre 768px e 1024px pode precisar de ajustes intermediários
- [ ] Considerar adicionar `@media (prefers-color-scheme: dark)` para auto-detectar tema do sistema
