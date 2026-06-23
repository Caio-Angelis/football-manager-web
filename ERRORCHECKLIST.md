# Error Checklist — Football Manager Web

Checklist gerado a partir de testes manuais automatizados via **Chrome DevTools MCP** (jun/2026).  
Cada item inclui severidade, como reproduzir, causa provável e passos de correção.

Legenda de status: `[ ]` pendente · `[~]` parcial · `[x]` corrigido

---

## Crítico

### [x] 1. Crash em `SaveSlot` ao voltar para a tela inicial

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Crítico — derruba a aplicação |
| **Arquivo** | `src/components/saves/SaveSlot.tsx` |
| **Console** | `TypeError: Cannot read properties of undefined (reading 'teamName')` |
| **Error Boundary** | Sim — mensagem enganosa: *"estado corrompido"* |

**Como reproduzir**
1. Gerar clubes → Assumir comando
2. Clicar **💾 Save 1** (ou **💾 Save 2**) na sidebar
3. Clicar **← Voltar**
4. A tela de saves tenta renderizar e a app quebra

**Causa**  
`getSaveSlots()` em `gameStore.ts` retorna `SaveSlotMetadata[]` (só metadados), mas `SaveSlot.tsx` trata o retorno como `SaveSlot[]` completo e acessa `saveSlot.metadata.teamName`. Como `saveSlot` **já é** o metadata, `.metadata` é `undefined`.

```ts
// gameStore.ts — retorna metadata
getSaveSlots: () => (state.saveSlots ?? []).map(s => s.metadata)

// SaveSlot.tsx — espera objeto com .metadata (incorreto)
saveSlot.metadata.teamName
```

**Como consertar (recomendado — mudança mínima)**

Em `SaveSlot.tsx`, renomear e usar o metadata diretamente:

```tsx
import type { SaveSlotMetadata } from '../../types/game';

// ...
const metadata = store.getSaveSlots().find(s => s.slotNumber === slotNumber);
const isSlotActive = metadata !== undefined;

// No JSX:
Save {slotNumber} — {metadata.teamName}
T{metadata.currentSeason} · Semana {metadata.currentWeek}
Salvo em: {formatDate(metadata.savedAt)}

// Em handleSave, após salvar:
const saved = store.getSaveSlots().find(s => s.slotNumber === slotNumber);
if (saved && onSaveSlot) {
  onSaveSlot(saved); // ver item 2 sobre o tipo do callback
}
```

**Alternativa**  
Alterar `getSaveSlots()` para retornar `SaveSlot[]` completos e atualizar o tipo em `src/types/game.ts`. Mais invasivo; só vale se outros consumidores precisarem do `gameState`.

**Verificação**
- [ ] Save pela sidebar → Voltar → painel de saves exibe nome do time sem crash
- [ ] **Carregar** no slot restaura o jogo
- [ ] **Excluir** remove o slot e mostra estado "Vazio"
- [ ] Nenhum erro no console ao ciclo save → voltar → carregar

---

## Alto

### [x] 2. Tipo incorreto no callback `onSaveSlot`

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Alto — bug latente / contrato quebrado |
| **Arquivos** | `src/components/saves/SaveSlot.tsx`, `src/App.tsx` |

**Problema**  
`onSaveSlot` está tipado como `(slot: SaveSlotType) => void`, mas após o save o código passa o retorno de `getSaveSlots()` — que é `SaveSlotMetadata`, não `SaveSlot` completo.

**Como consertar**

```tsx
// SaveSlot.tsx
import type { SaveSlotMetadata } from '../../types/game';

interface SaveSlotProps {
  slotNumber: 1 | 2;
  onSaveSlot?: (metadata: SaveSlotMetadata) => void;
}

// App.tsx
const handleSaveSlotSelect = (_metadata: SaveSlotMetadata) => {
  // opcional: navegar automaticamente após carregar save
};
```

**Verificação**
- [ ] `npm run build` sem erros de tipo
- [ ] Callback recebe objeto com `teamName`, `currentWeek`, `savedAt`

---

### [ ] 3. `handleSaveSlotSelect` é placeholder — Carregar não integra com fluxo da UI

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Alto — funcionalidade incompleta |
| **Arquivo** | `src/App.tsx` |

**Problema**  
`handleSaveSlotSelect` está vazio. `loadGame()` atualiza o store, mas não há feedback visual nem garantia de que o usuário entenda que o save foi carregado. Após **Carregar**, `selectedTeam` é restaurado e a UI deve ir para o jogo — confirmar que isso ocorre de forma confiável após corrigir o item 1.

**Como consertar**

```tsx
const handleSaveSlotSelect = () => {
  // selectedTeam é setado por loadGame(); a App re-renderiza automaticamente
  // Opcional: toast de confirmação
};

// Em SaveSlot, após loadGame():
const handleLoad = () => {
  if (metadata) {
    store.loadGame(slotNumber);
    onSaveSlot?.(metadata);
  }
};
```

**Verificação**
- [ ] Na tela inicial, **Carregar** abre o jogo com o time e semana corretos
- [ ] Dados (elenco, partidas, inbox) restaurados do slot

---

### [ ] 4. Botões **💾 Save 1/2** na sidebar não dão feedback

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Alto — UX / usuário não sabe se salvou |
| **Arquivo** | `src/App.tsx` |

**Problema**  
Os botões da sidebar chamam `saveGame(1|2)` diretamente, sem toast nem mensagem. O componente `SaveSlot` na tela inicial tem feedback, mas a sidebar não.

**Como consertar**

Opção A — reutilizar toast existente (`src/components/ui/Toast.tsx`):

```tsx
const [toast, setToast] = useState<string | null>(null);

<Button onClick={() => {
  useGameStore.getState().saveGame(1);
  setToast('✅ Save 1 salvo!');
}}>💾 Save 1</Button>
```

Opção B — extrair lógica de save de `SaveSlot` para um hook `useSaveGame()` compartilhado entre sidebar e painel de saves.

**Verificação**
- [ ] Clicar Save na sidebar mostra confirmação
- [ ] Save persiste após F5

---

## Médio

### [ ] 5. Mensagem enganosa no Error Boundary

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Médio — diagnóstico incorreto |
| **Arquivo** | `src/components/ui/ErrorBoundary.tsx` |

**Problema**  
Qualquer erro de renderização mostra *"estado corrompido"* e apaga **todo** o `localStorage` ao clicar em recarregar — inclusive saves válidos criados antes do bug.

**Como consertar**

- Diferenciar erros de código vs. estado inválido (ex.: checar se `error.message` contém padrões conhecidos)
- Oferecer dois botões: **Tentar novamente** (só `reset()` do boundary) e **Limpar dados** (remove localStorage)
- Não apagar saves automaticamente em todo crash

```tsx
reset(soft = true) {
  this.setState({ hasError: false, error: null });
  if (!soft) {
    localStorage.removeItem('fm-game-storage-v3');
    localStorage.removeItem('fm-save-slots-v3');
    window.location.reload();
  }
}
```

**Verificação**
- [ ] Erro de renderização não apaga saves sem confirmação explícita
- [ ] Texto da UI não culpa o usuário por "estado corrompido" em bugs de código

---

### [ ] 6. Botões de partida **Substituição** / **Gritos à Equipa** inacessíveis fora do contexto ao vivo

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Médio — UX / acessibilidade |
| **Arquivo** | `src/components/match/MatchCenter.tsx` |

**Problema**  
Botões aparecem no DOM mas ficam não interativos (ou ocultos) quando não há partida ao vivo. Testes automatizados falharam ao clicar fora do contexto.

**Como consertar**

- Usar `disabled` + `aria-disabled="true"` quando indisponíveis
- Ou não renderizar até `matchInProgress === true`
- Tooltip: *"Disponível durante partida ao vivo"*

**Verificação**
- [ ] Sem partida ao vivo: botões desabilitados ou ocultos com indicação clara
- [ ] Durante partida simulada: ambos clicáveis sem timeout

---

### [ ] 7. Ações da Inbox só aparecem com mensagem selecionada

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Médio — UX |
| **Arquivo** | `src/components/inbox/InboxView.tsx` |

**Problema**  
**Ver Relatório**, **Arquivar** e **Marcar como Lido** não existem no DOM até selecionar um item — comportamento correto, mas pode parecer botão quebrado em testes superficiais.

**Como consertar (opcional)**

- Estado vazio com texto: *"Selecione uma mensagem para ver ações"*
- Ou manter botões visíveis com `disabled` até haver seleção

**Verificação**
- [ ] Com mensagem selecionada, os três botões funcionam
- [ ] Estado vazio comunica o que fazer

---

## Baixo

### [ ] 8. 404 no console — favicon ausente

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Baixo |
| **Console** | `Failed to load resource: 404 (Not Found)` |
| **Arquivo** | `index.html` |

**Causa**  
Navegador solicita `/favicon.ico` automaticamente; o projeto não define favicon.

**Como consertar**

Adicionar em `index.html`:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>" />
```

Ou colocar `public/favicon.ico` e referenciar com `<link rel="icon" href="/favicon.ico" />`.

**Verificação**
- [ ] Console sem 404 de favicon após reload

---

### [ ] 9. Campos de formulário sem `id` ou `name` (acessibilidade)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Baixo — a11y / Lighthouse |
| **Arquivos** | Principalmente `src/components/tactics/TacticsView.tsx` (~54–83 ocorrências no teste) |
| **Issue DevTools** | *"A form field element should have an id or name attribute"* |

**Como consertar**

Para cada `<select>`, `<input type="checkbox">` e `<input type="text">`:

```tsx
<label htmlFor={`tactic-width-${playerId}`}>Largura</label>
<select id={`tactic-width-${playerId}`} name={`tactic-width-${playerId}`} ...>
```

Em checkboxes de instruções individuais, usar `id` + `htmlFor` no `<label>` ou `aria-label` descritivo.

**Verificação**
- [ ] Lighthouse / DevTools Issues: contagem de campos sem id/name reduzida a zero nas telas principais
- [ ] Navegação por teclado e leitores de tela melhoradas

---

### [ ] 10. HMR: export incompatível em `InboxView`

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Baixo — só afeta dev |
| **Console (Vite)** | `Could not Fast Refresh ("BOARD_REPLY_CATEGORIES" export is incompatible)` |
| **Arquivo** | `src/components/inbox/InboxView.tsx` |

**Como consertar**

Mover `BOARD_REPLY_CATEGORIES` para arquivo separado (ex.: `inboxConstants.ts`) e importar em `InboxView.tsx`, para que o módulo exporte apenas o componente React.

**Verificação**
- [ ] Editar `InboxView.tsx` não força full page reload no dev

---

## Resumo executivo

| # | Item | Severidade | Esforço |
|---|------|------------|---------|
| 1 | Crash `SaveSlot` / `metadata.teamName` | Crítico | ~15 min |
| 2 | Tipo `onSaveSlot` | Alto | ~5 min |
| 3 | Fluxo Carregar save na tela inicial | Alto | ~20 min |
| 4 | Feedback Save na sidebar | Alto | ~30 min |
| 5 | Error Boundary apaga dados à toa | Médio | ~45 min |
| 6 | Botões de partida fora de contexto | Médio | ~20 min |
| 7 | Ações da Inbox sem seleção | Médio | ~15 min |
| 8 | Favicon 404 | Baixo | ~5 min |
| 9 | Campos sem id/name (a11y) | Baixo | ~1–2 h |
| 10 | HMR InboxView | Baixo | ~10 min |

**Ordem sugerida de correção:** 1 → 2 → 3 → 4 → 5 → 6 → 8 → 7 → 9 → 10

---

## Comandos úteis para revalidar

```bash
# Build de produção (erros de tipo)
npm run build

# Testes automatizados existentes
npm test

# Dev server para teste manual / MCP
npm run dev
```

**Fluxo de regressão manual (pós-correção do item 1)**  
Gerar clubes → Assumir → Save 1 → Voltar → ver painel de saves → Carregar → jogar uma partida → Save 2 → F5 → Carregar slot 2.

---

*Última atualização: testes Chrome DevTools MCP, jun/2026.*
