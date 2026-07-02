# Regras de Saves

## Slots de Save

- **2 slots** de save disponíveis (slot 1 e slot 2).
- Os saves são armazenados como **arquivos JSON no disco do servidor** em `backend/saves/save_slot_{1,2}.json`.

---

## Metadados do Save

Cada save registra:
- Time selecionado
- Semana atual
- Temporada atual
- Timestamp

---

## Operações

| Operação | Função | Descrição |
|-----------|--------|-----------|
| Salvar | `saveGame(slot)` | Persiste o estado no disco via `persistSave()` |
| Carregar | `loadGame(slot)` | Restaura estado do disco via `loadSaveFromDisk()` |
| Deletar | `deleteSave(slot)` | Remove arquivo do disco (silencioso se não existir) |

---

## Persistência

- **Estado do jogo:** Em memória no backend (Zustand sem persist). Hidratado dos saves ao iniciar o servidor via `hydrateSavesFromDisk()`.
- **Saves em disco:** Arquivos JSON. `saveSlots` é removido do estado salvo para evitar recursão e reduzir tamanho.
- **Tema:** `fm-theme-pref` em localStorage (`light` | `dark` | `system`) — independente dos saves.

---

## Restauração de Estado

Ao carregar um save, `loadGame` restaura:
- Estado completo do jogo (times, partidas, transferências, etc.)
- `pressConferences` (coletivas de imprensa)
- `fanMood` (humor da torcida)
- `mediaPressure` (pressão midiática)

---

## Comandos

- **Sidebar:** Botões "💾 Save 1" e "💾 Save 2" gravam via `saveGame()`.
- **Landing page:** Painel de saves com botões Carregar e Excluir.
- **Tela de Táticas:** Ícone Download salva no slot 1 com feedback de status.
