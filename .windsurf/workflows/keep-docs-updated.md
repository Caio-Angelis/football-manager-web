---
description: Manter projeto.md e AI_CONTEXT.md sempre atualizados apos mudancas no codigo
---

# Regra: Manter `projeto.md` e `AI_CONTEXT.md` sempre atualizados

## Quando aplicar

Esta regra deve ser executada **sempre** que uma alteracao de codigo for feita no projeto `football-manager-web`, incluindo:

- Novas features ou sistemas implementados
- Mudancas na arquitetura (novos arquivos, slices, helpers, rotas, componentes)
- Alteracoes em tipos de dominio (`backend/src/types/`)
- Alteracoes no motor de partida, transferencias, treino, lesões, financas, scouting, etc.
- Novos arquivos de teste ou configuracao
- Mudancas no frontend (novos componentes, rotas, stores, hooks)
- Alteracoes na estrutura de pastas
- Correcoes de bugs que mudam comportamento documentado

## O que atualizar

### `AI_CONTEXT.md`

Arquivo de contexto tecnico para a IA. Atualizar:

1. **Estrutura de arquivos** — adicionar/remover arquivos e diretorios
2. **Stack** — se novas dependencias forem adicionadas
3. **Slices e Helpers** — se novos slices/helpers forem criados ou funcoes alteradas
4. **Tipos de dominio** — se novos tipos forem adicionados ou alterados
5. **API REST** — se novas rotas ou actions forem adicionadas
6. **Frontend** — se novos componentes, rotas ou stores forem criados
7. **Dessincronizacao** — se actions forem adicionadas/removidas do backend ou frontend
8. **Progresso estimado** — atualizar percentual se aplicavel

### `projeto.md`

Arquivo de documentacao de design e regras do jogo. Atualizar:

1. **Sistemas** — se a mecanica de um sistema foi alterada (partidas, transferencias, treino, etc.)
2. **Regras** — se parametros numericos foram alterados (bonus, probabilidades, limites)
3. **Fluxo de jogo** — se o fluxo principal foi modificado
4. **Pontos de atencao** — se problemas foram resolvidos ou novos identificados
5. **Novas secoes** — se um sistema inteiramente novo foi implementado

## Como atualizar

1. Apos concluir qualquer alteracao de codigo, ler as secoes relevantes de `projeto.md` e `AI_CONTEXT.md`
2. Comparar o estado atual do codigo com a documentacao
3. Atualizar apenas as secoes afetadas — nao reescrever o arquivo inteiro
4. Manter o estilo e formato existentes (portugues, markdown, tabelas quando apropriado)
5. Se a alteracao nao afeta nenhum documento (ex: refactor puro, correcao de typo), nao e necessario atualizar

## Excecoes

- Alteracoes puramente cosmeticas (formatacao, whitespace) nao exigem atualizacao
- Arquivos de teste que nao mudam a arquitetura nao exigem atualizacao do `projeto.md`
- Comentarios ou documentacao inline nao exigem atualizacao separada
