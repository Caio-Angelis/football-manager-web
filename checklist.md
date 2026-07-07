# Checklist — Novas Funcionalidades e Melhorias

> Gerado a partir de uma análise completa do projeto (backend: motor de jogo, slices, helpers, salas online; frontend: todas as telas, store e client).
> Todos os problemas listados foram **verificados no código real** — os arquivos e linhas citados existem.
> Ordem sugerida: faça as correções 1–3 primeiro (integridade/anti-trapaça), depois intercale melhorias e funcionalidades.

---

## 🆕 Funcionalidades novas (5)

### [ ] F1 — Envelhecimento, declínio e aposentadoria de jogadores (arco de carreira)

**O que é:** Hoje os jogadores têm idade fixa para sempre: `startNextSeason` não envelhece ninguém, não há declínio físico nem aposentadoria, e `seasonGoals`/`seasonAssists` são zerados sem guardar histórico. Um elenco bom é bom eternamente — não existe pressão de longo prazo para renovar o time.

**O que fazer:**
- [ ] Em `startNextSeason` (`backend/src/store/slices/core.ts`), incrementar `age` de todos os jogadores (+1 por temporada).
- [ ] Aplicar declínio gradual de atributos físicos a partir dos ~30 anos (ex.: −1 a −2 em pace/stamina/strength por temporada, acelerando após 33), reaproveitando o sistema de `attributeHistory` que já existe em `slices/attributes.ts`.
- [ ] Aposentadoria: aos 35+ com atributos baixos, jogador anuncia aposentadoria ao fim da temporada (mensagem no inbox na metade da temporada para o usuário se planejar); removê-lo do elenco em `startNextSeason`.
- [ ] Guardar estatísticas de carreira acumuladas (`careerGoals`, `careerAssists`, `careerApps` em `types/player.ts`) antes de zerar as da temporada.
- [ ] Bônus de veterania: jogadores 32+ com moral alta dão pequeno boost de treino aos jovens do mesmo setor (integra com o sistema de social groups de `DynamicsView`).

**Por que agrega:** É a mudança que mais multiplica a rejogabilidade — cria ciclo de reconstrução de elenco, valoriza a base (F1 + academia) e dá propósito ao mercado a cada temporada.

**Como testar:** simular 3 temporadas via `headless_sim.ts`; verificar idades +3, atributos de um jogador de 33 anos caindo, pelo menos uma aposentadoria e stats de carreira acumulando.

---


### [ ] F5 — Central de Estatísticas: histórico da temporada + comparação de jogadores

**O que é:** Não existe nenhuma tela para consultar o passado: sem histórico navegável dos seus 38 jogos, sem artilharia da liga, sem comparar dois jogadores lado a lado antes de contratar. O `SeasonSummaryModal` é só um modal de fim de temporada. Os dados já existem no estado (`matches` guarda os últimos 200 jogos com relatórios; jogadores têm `seasonGoals`/`ratings`).

**O que fazer:**
- [ ] Nova rota/tela "Estatísticas" no `App.tsx` com três abas:
- [ ] **Histórico de jogos:** lista dos jogos do seu time na temporada (rodada, adversário, placar, sua nota média), clicável para reabrir o `PostMatchReportView` que já existe.
- [ ] **Líderes da liga:** artilheiros, assistentes e melhores notas médias de TODOS os times (os campos já existem em cada `Player`); destaque para os do seu elenco.
- [ ] **Comparador de jogadores:** escolher 2 jogadores (do elenco ou do mercado — respeitando a máscara de scouting já aplicada por `maskPlayerAttributes`) e ver atributos lado a lado com barras (`StatBar.tsx` já existe), valor, salário, idade, forma. Botão "Comparar" no `PlayerDetailPanel.tsx` e no `ScoutReportCard.tsx`.
- [ ] Gráfico de evolução do jogador usando o `attributeHistory` que o backend já grava (recharts já é dependência).

**Por que agrega:** é a funcionalidade de maior valor percebido por esforço — quase tudo é leitura de dados que o backend já produz; melhora diretamente a decisão de compra/venda (coração do jogo).

**Como testar:** jogar 5+ rodadas, abrir a central e conferir histórico completo, artilharia coerente com a tabela e comparação com atributos mascarados para jogador não-scoutado.

---

## 💡 Funcionalidades inovadoras (10) — além do padrão do gênero

> Ideias que nenhum "clone de FM" costuma ter — todas ancoradas em sistemas que o projeto **já possui** (imprensa, dinâmica social, atributos ocultos hoje não usados, salas online, motor minuto a minuto, `MatchPitch2D`/`MomentumChart`).

### [ ] F6 — Carreira de treinador: demissão, mercado de técnicos e reputação

**O que é:** Hoje você É o clube — se o board se irrita, nada acontece. A inversão: você é um **treinador com carreira própria**. Vai mal → é demitido → vira desempregado no mesmo universo do save → recebe propostas de outros clubes (inclusive da Série B, com F3) e continua a MESMA temporada em outro time. O jogo nunca acaba num "game over"; ele muda de cadeira.

**O que fazer:**
- [ ] `managerReputation` (0–100) no `GameState`: sobe com títulos/superação de expectativa, desce com demissões. O `boardSatisfaction` (já existe em `slices/promises.ts`) abaixo de um limiar por N semanas → demissão (mensagem dramática no inbox + tela própria).
- [ ] Desempregado: o tempo continua correndo (você assiste a rodada como espectador); a cada semana, clubes com técnico "sob pressão" (mesma métrica aplicada aos times de IA) podem te oferecer o cargo — a qualidade do clube ofertante depende da sua reputação.
- [ ] Ao assumir outro clube no meio da temporada: herda elenco/orçamento/expectativa dele — o `selectTeam` já permite trocar o time focado; o trabalho é preservar a continuidade do universo (nada é resetado).
- [ ] "Ultimato" antes da demissão: o board dá 5 rodadas com meta explícita (ex.: 8 pontos) — tensão narrativa via inbox/imprensa.

**Por que impressiona:** transforma derrota em história em vez de "carregar o save". Nenhum sistema novo pesado: é orquestração de `boardSatisfaction` + `selectTeam` + inbox.

**Como testar:** perder 8 seguidas → ultimato → demissão → receber 2 propostas em 3 semanas → assumir outro clube e ver o universo intacto (tabela, artilharia, seu ex-time seguindo com IA).

---

### [ ] F7 — Vestiário vivo: conversas 1-a-1 e drama emergente usando os atributos ocultos

**O que é:** A análise do código mostrou que atributos ocultos como **ambição, lealdade e resistência à pressão são gerados mas nunca usados**. Este recurso os transforma no motor de um "vestiário vivo": jogadores pedem conversas, exigem transferência, vazam insatisfação para a imprensa e formam panelinhas — e você responde num chat 1-a-1 estilo mensageiro, com escolhas de tom.

**O que fazer:**
- [ ] Gatilhos semanais no `advanceWeek` lendo os atributos ocultos: ambicioso + time fora do G6 → pede conversa; leal + banco há 5 jogos → aceita conversar antes de explodir; baixa resistência à pressão + 3 derrotas → rende mal (já afeta o motor via forma).
- [ ] Tela de conversa no `DynamicsView` (ou no `PlayerDetailPanel`): 3–4 falas possíveis por situação (prometer minutos → cria uma **promessa real** no sistema de `promises.ts` que já existe e já cobra prazo; ser duro → risco de moral, chance de resposta brava conforme personalidade).
- [ ] Vazamentos: conversa mal resolvida com jogador de baixa lealdade → manchete na imprensa na semana seguinte (`press.ts` já tem infraestrutura de notícias) → `mediaPressure` sobe.
- [ ] Efeito de rede via grupos sociais (já existem em `social.ts`): tratar mal um líder de grupo contamina a moral dos liderados.

**Por que impressiona:** é o tipo de profundidade emergente que gera as melhores histórias ("meu camisa 10 vazou pra imprensa e o vestiário rachou") — e o custo é baixo porque promessas, grupos sociais, imprensa e moral **já existem**; falta só ligar os fios com os atributos que hoje são peso morto.

**Como testar:** criar jogador ambicioso/desleal num time ruim → em ≤5 semanas ele pede conversa; prometer titularidade e não cumprir → promessa quebrada + vazamento na imprensa + moral do grupo social dele caindo.

---

### [ ] F8 — "Jornal da Rodada": primeira página gerada proceduralmente toda semana

**O que é:** Em vez de um inbox de texto corrido, toda segunda-feira o jogador abre um **jornal esportivo diagramado** — manchete principal, foto do lance (recorte do `MatchPitch2D`), colunas de rumor, tabela do dia e nota de opinião do colunista que ama/odeia você conforme o `mediaPressure`.

**O que fazer:**
- [ ] Gerador de manchetes no backend (`helpers/press.ts`): templates parametrizados por eventos reais da rodada (goleada, zebra, hat-trick, sequência invicta, crise) com tom variando pelo `fanMood`/`mediaPressure` — ex.: "MASSACRE NO CLÁSSICO: {time} atropela por {placar}".
- [ ] Componente `NewspaperView.tsx`: layout de jornal (CSS puro — colunas, serifa, foto em P&B) montado com dados que já existem (`postMatchReport`, standings, artilharia, rumores de transferência do `aiManager`).
- [ ] Colunista fixo com "personalidade" persistente: implicância ou simpatia por você evolui com resultados — vira um antagonista de longo prazo.
- [ ] Botão "compartilhar": renderizar a primeira página em imagem (canvas → PNG) para mandar no grupo — de graça em marketing espontâneo do jogo.

**Por que impressiona:** muda a **sensação** do jogo inteiro sem tocar no motor — o feedback semanal vira um artefato com cara de mundo real, e o export em imagem é viral por natureza.

**Como testar:** jogar uma rodada com goleada → manchete coerente com o placar real; perder 3 seguidas → tom do colunista muda; exportar PNG e conferir legibilidade.

---


---

### [ ] F10 — Modo Fantasy Draft online: leilão/snake draft de TODOS os jogadores da liga

**O que é:** Variante de sala online onde, em vez de cada humano escolher um **clube pronto**, todos os ~500 jogadores da liga vão para um pool e os humanos montam elencos do zero via **snake draft com teto salarial** (1º-2º-3º / 3º-2º-1º…). Times de IA ficam com o resto. Universos únicos a cada sala — o "meta" de qual clube é mais forte deixa de existir.

**O que fazer:**
- [ ] Novo `roomMode: 'classic' | 'fantasy'` na criação da sala (`roomManager.ts`); no modo fantasy, `startGame` despe os clubes escolhíveis e monta o pool de jogadores.
- [ ] Draft por turnos com relógio (45s por escolha, auto-pick do melhor disponível por posição se estourar — o polling de 2s da sala já suporta turno a turno); teto salarial obrigatório força escolhas reais em vez de "pega os 11 melhores".
- [ ] Validação de elenco mínimo (2 GK, 5 DEF…) antes de liberar o `begin`; jogadores não draftados são distribuídos aos times de IA por reputação.
- [ ] Reusar `DraftScreen.tsx` com visão de pool: filtros por posição, busca, "melhores disponíveis" — e o placar de quem pegou quem (a parte social/zoeira é metade da graça).

**Por que impressiona:** transforma o multiplayer num jogo próprio com rejogabilidade infinita e conversa de grupo garantida ("você deixou o artilheiro passar na rodada 3!") — e reaproveita draft, salas, escopos e mercado já construídos nas Fases 1–7 do PlanoOnline.

**Como testar:** sala fantasy com 3 humanos → draft completo em turnos com relógio → todos com elenco válido dentro do teto → temporada roda normalmente com transferências entre humanos funcionando.

---

### [ ] F11 — Guerra psicológica no PvP: coletivas que atingem o rival humano

**O que é:** No online, a imprensa vira **arma entre humanos**. Antes de um confronto humano×humano, cada técnico pode dar declarações públicas sobre o rival ("o time deles não aguenta pressão") — que aparecem no jornal/inbox do adversário e aplicam efeitos REAIS: pressão na moral dos jogadores de baixa personalidade dele, ou efeito reverso (motivação extra) se o alvo tiver líderes fortes no vestiário. O alvo pode responder na própria coletiva — rebater, ironizar ou ignorar.

**O que fazer:**
- [ ] Nas semanas de confronto humano×humano (detectável no calendário da sala), habilitar 1 "declaração pré-jogo" por técnico: 4 tons (provocar, elogiar de propósito, pressionar o árbitro/contexto, silêncio) via infraestrutura de coletivas que já existe (`press.ts` + `PressCenter.tsx`).
- [ ] Resolução no fechamento da rodada (`advanceRoomWeek`): efeito na moral/pressão do alvo calculado pelos atributos de personalidade dos jogadores dele (resistência à pressão — os mesmos de F7) e pela resposta escolhida — provocar um vestiário cascudo DEVE sair pela culatra.
- [ ] Tudo público no jornal da sala (F8): os outros humanos leem a treta — pressão social real entre amigos.
- [ ] Limite duro (1 declaração/semana, só contra adversário direto) para ser tempero, não spam.

**Por que impressiona:** é interação humano×humano **fora do gramado** — a parte que os jogos do gênero nunca entregam em multiplayer. Mecanicamente é pequeno (um modificador de moral + mensagens), mas socialmente é enorme.

**Como testar:** sala com 2 humanos se enfrentando; A provoca, B responde "ironizar" → ambos veem a troca no jornal; moral dos jogadores frágeis de B cai e o efeito aparece no relatório pós-jogo.

---

### [ ] F12 — Árvore de perks do treinador (meta-progressão entre saves)

**O que é:** Um perfil persistente de treinador **fora do save**: cada temporada concluída rende XP (título > meta batida > temporada completada) que destrava perks numa árvore de 3 ramos — Formador (juventude), Negociador (mercado), Motivador (vestiário). Começar um save novo nunca mais é começar do zero absoluto.

**O que fazer:**
- [ ] Perfil em arquivo próprio via `saveService.ts` (`manager_profile.json`, fora dos slots) com XP, perks e recordes de carreira (títulos, aproveitamento, maior goleada).
- [ ] ~12 perks de efeito pequeno e legível, plugados em pontos que já existem: Formador I = +1 qualidade média da intake da base (`youth.ts`); Negociador I = IA aceita ofertas 5% menores (`aiManager.ts`); Motivador I = gritos do `MatchCenter` 20% mais eficazes; etc. Nada acima de ~10% para não quebrar o balanceamento validado pelo `balance.test.ts`.
- [ ] Tela "Meu Treinador" na home (antes de escolher save): árvore visual, XP, recordes e o histórico de clubes (conecta com F6 — a reputação pode viver aqui).
- [ ] XP ganho só ao FIM da temporada (anti-farm de save-scum: recompensa concluir, não repetir).

**Por que impressiona:** dá razão para "mais uma temporada" e cria identidade do jogador através dos saves — meta-progressão é padrão em roguelikes e quase inédita em manager games.

**Como testar:** completar uma temporada → XP creditado no perfil; gastar em Formador I → próxima intake de base mensuravelmente melhor; apagar o save → perfil intacto.

---

### [ ] F13 — Preleção e conversa de intervalo com reação por personalidade

**O que é:** Os dois momentos sagrados do futebol que o jogo pula: a **preleção** (antes do apito) e o **vestiário no intervalo**. Uma escolha de discurso em cada momento — com o pulo do gato: a MESMA fala funciona diferente para cada jogador, conforme personalidade (F7), placar e favoritismo. "Vamos pra cima!" inflama os jovens e irrita o veterano calejado.

**O que fazer:**
- [ ] Preleção no `PreMatchBriefing.tsx` (a tela já existe!): 4 tons (confiança, cautela, desafio, pressão) → modificador individual de moral/forma para os 90 minutos, calculado por jogador (personalidade × contexto de favoritismo que o `preMatchAnalysis.ts` já computa).
- [ ] Intervalo: o `MatchCenter` já pausa no minuto 45 esperando "Continuar 2º tempo" — inserir aí o painel de team talk (mesmos 4 tons + opção "bronca em jogador específico" com nota < 6).
- [ ] Feedback imediato e legível: lista de reações ("Fulano: motivado 🔥 / Beltrano: nervoso 😰") para o jogador APRENDER o vestiário dele — errar a mão em sequência tem custo real.
- [ ] Efeito honesto no motor: modificador de ±5% na performance da metade seguinte (o `simulateFullMatch`/geração de minuto já aceita modificadores de moral).

**Por que impressiona:** adiciona a camada emocional/ritual do futebol nos dois pontos de maior tensão da experiência — e o custo é baixo porque a pausa do intervalo, a análise pré-jogo e o sistema de moral já existem; é conteúdo + um modificador.

**Como testar:** dar bronca num time que está ganhando de 3×0 → reações majoritariamente negativas e queda visível de rendimento no 2º tempo; discurso de confiança como azarão → azarões sensíveis à pressão rendem acima da média.

---

### [ ] F14 — Probabilidade de vitória ao vivo + cine-replay dos gols no MatchPitch2D

**O que é:** Duas camadas de espetáculo na partida ao vivo: (1) uma curva de **probabilidade de vitória em tempo real** (estilo win-probability da NBA/NFL) que reage a gol, expulsão e pressão — o coração do espectador sobe e desce junto; (2) **replay animado dos gols**: a sequência do lance (origem da jogada → assistência → finalização) desenhada como animação de setas/bola no `MatchPitch2D` que já existe.

**O que fazer:**
- [ ] Backend: junto de cada minuto gerado, calcular `winProbability` (função barata: força dos times + placar + minuto + homem a mais/menos) e anexar ao estado da partida ao vivo.
- [ ] Frontend: novo traço no `MomentumChart.tsx` (que já plota o momentum) com a probabilidade — marcadores nos eventos-chave (gol, vermelho) para contar a história do jogo numa imagem.
- [ ] Replay: o motor já registra eventos com jogadores envolvidos; enriquecer o evento de gol com 2–3 "passos" posicionais (zona de origem, zona da assistência, ponto da finalização — as zonas já existem no conceito de `ZoneIcon`/heat map) e animar no `MatchPitch2D` com CSS/SVG transitions (bola percorrendo os pontos, ~4s).
- [ ] Pós-jogo: galeria "Gols da partida" no `PostMatchReportView` — cada gol re-assistível; a curva de probabilidade final vira o resumo emocional da partida.

**Por que impressiona:** é o upgrade de "ler um log" para "assistir futebol". A curva de probabilidade cria tensão mensurável ("estávamos com 8% e viramos!") e o replay dá memória visual aos momentos — os dois com dados que o motor já produz ou quase.

**Como testar:** partida com virada → curva mostra o vale e a recuperação com marcadores corretos; gol sofrido/marcado → replay animado coerente com o texto do lance; performance ok em partida com 5+ gols.

---

### [ ] F15 — Desafios semanais da comunidade: mesmo cenário, mesma semente, ranking

**O que é:** Toda semana, um **cenário-desafio** igual para todo mundo: "Assuma o lanterna na rodada 25, com 3 titulares lesionados e -20M de orçamento. Escape do rebaixamento." Mesma semente de aleatoriedade para todos (mesmo calendário, mesmas lesões-base) → a diferença é só a SUA gestão. Ao terminar, sua pontuação vai para um ranking com nome/apelido.

**O que fazer:**
- [ ] Motor de semente: trocar `Math.random()` do fluxo de simulação por um PRNG com seed injetável (ex.: mulberry32, ~10 linhas) — passo que também destrava replays determinísticos e testes reprodutíveis do motor (bônus técnico enorme para o projeto todo).
- [ ] Formato de cenário declarativo (JSON): time, semana inicial, modificadores (orçamento, lesões, moral), objetivo e função de pontuação (pontos conquistados + bônus por metas). Gerar o estado aplicando os modificadores sobre `initGame` com a seed do desafio.
- [ ] Rota `POST /api/challenges/:id/result` no servidor (a infra de servidor com estado já existe — `roomManager` é o modelo): valida e guarda `{apelido, pontuação}`; `GET` devolve o top 50. Persistir num JSON simples via `saveService`.
- [ ] Tela "Desafio da Semana" na home: descrição dramática do cenário, botão jogar, ranking ao lado. 3 desafios curados à mão para lançar (escape do Z4, milagre da copa com F2, vender-para-sobreviver).

**Por que impressiona:** cria a dimensão competitiva assíncrona — todo mundo no MESMO problema, comparação justa, assunto no grupo toda semana. E o pré-requisito (motor com seed) paga a si mesmo em testabilidade e nos replays de F9.

**Como testar:** dois navegadores jogando o mesmo desafio sem interferir → mesmo calendário e lesões-base nos dois; pontuações diferentes conforme decisões; ranking ordena e persiste após restart do servidor.

---

## 🔧 Correções e melhorias (10)

### [ ] C1 — 🔴 SEGURANÇA: `updateTeam` aceita o objeto `Team` inteiro do cliente sem validação nenhuma

**Problema (verificado):** Em `backend/src/store/storeHelpers.ts:70-76`, `updateTeam` grava direto no estado o objeto que o cliente mandou — e **retorna antes** da validação Zod que todas as outras ações passam. O cliente pode enviar `budget: 999999`, `reputation: 100` ou um elenco inteiro inventado. No online, `routes/rooms.ts` só confere se o `teamId` é o do próprio jogador — os campos continuam livres. É a dívida anotada no próprio `PlanoOnline.md` (Fase 4/10).

**Correção:**
- [ ] Fazer whitelist dos campos que o frontend legitimamente edita via `updateTeam` (táticas: `tacticsConfig`, `startingXI`, papéis/instruções, `squadStatus`) e mesclar só esses sobre o time atual do servidor, ignorando o resto (`budget`, `reputation`, `squad`, `scouts`, níveis etc.).
- [ ] Adicionar schema Zod para `updateTeam` em `validation/schemas.ts` cobrindo os campos permitidos.
- [ ] (Etapa 2, opcional) Substituir `updateTeam` por ações granulares (`setTactics`, `setStartingXI`) e deprecar o envio do objeto inteiro.

**Teste:** via devtools, mandar `updateTeam` com `budget` alterado → o orçamento no servidor não muda; salvar tática pela UI continua funcionando (single-player e online).

---

### [ ] C2 — 🔴 BUG: `team.leaguePosition` é sorteado aleatoriamente e nunca sincronizado com a tabela real

**Problema (verificado):** `leaguePosition` nasce como `Math.floor(Math.random() * 20) + 1` em `backend/src/utils/dataLoader.ts:377` e `utils/playerGenerator.ts:395`, e **nenhum código o atualiza depois** (a ação `setLeaguePosition` de `slices/promises.ts:207` existe mas ninguém a chama). Consequências reais: a UI exibe posição errada (`App.tsx:155`, `MatchCenter.tsx:416/431`, `DynamicsView.tsx:216`) e a IA decide renovações de contrato com base em posição aleatória (`helpers/aiManager.ts:434` — `team.leaguePosition <= 8`).

**Correção:**
- [ ] No `advanceWeek` (`slices/core.ts`), após recalcular a tabela, gravar `leaguePosition` real em cada um dos 20 times a partir dos standings (uma linha num map).
- [ ] Inicializar como a posição do sorteio da tabela (ou 0/`—` até a rodada 1) em vez de aleatório.
- [ ] Conferir os consumidores: `aiManager.ts:434`, telas do frontend e `promises.ts` passam a receber valor verdadeiro; remover `setLeaguePosition` se ficar sem uso.

**Teste:** avançar 3 rodadas e comparar a posição mostrada no header do clube/MatchCenter com a tabela da liga — devem ser idênticas para todos os times.

---

### [ ] C3 — BUG DE GAMEPLAY: contrato expirado não tem efeito — jogador atua para sempre de graça

**Problema (verificado):** Em `backend/src/store/slices/core.ts:458-471`, quando `contractEnd` chega a 0 só é enviada uma mensagem de inbox. O jogador segue no elenco, joga, treina e pode até ser vendido — para sempre. Não existe agência livre nem pressão real para renovar.

**Correção:**
- [ ] Definir a regra: ao expirar, jogador vira **agente livre** — sai do elenco ao fim da temporada (mais suave) ou imediatamente após N semanas de carência (mais duro). Sugestão: sair em `startNextSeason`, com avisos no inbox nas semanas 30/34/38.
- [ ] Enquanto expirado e não renovado: bloquear escalação OU aplicar penalidade forte de moral/forma (escolher e documentar).
- [ ] Agentes livres ficam contratáveis sem taxa de transferência no mercado (`TransferMarket` — só salário/luvas), inclusive pela IA (`aiManager` já renova contratos; ensiná-lo a assinar agentes livres).
- [ ] Renovação pelo usuário já existe no fluxo de promessas/contratos — garantir que renovar antes do fim zera o risco.

**Teste:** editar um save com `contractEnd: 2`, avançar 3 semanas → avisos chegam; virar a temporada sem renovar → jogador saiu do elenco e aparece como agente livre no mercado.

---

### [ ] C4 — Erros de API engolidos no frontend: o usuário nunca fica sabendo que uma ação falhou

**Problema (verificado):** Em `frontend/src/store/gameStore.ts`, praticamente todas as ~40 mutations seguem o padrão `apiAction(...).then(syncFromResponse).catch(err => console.error(...))` (ex.: linha 808). Se o backend recusar ou a rede falhar, a UI fica como se tivesse funcionado — transferência "feita" que não existe, tática "salva" que não salvou.

**Correção:**
- [ ] Criar um handler central de erro no `gameStore.ts` (ou no `api/client.ts`) que dispara o `Toast.tsx` **que já existe** com mensagem amigável ("Ação falhou: {motivo}") em vez de só `console.error`.
- [ ] Nas ações críticas (comprar/vender jogador, salvar jogo, avançar semana), retornar o erro ao componente para ele poder reagir (re-habilitar botão, manter modal aberto).
- [ ] Adicionar `AbortSignal.timeout(15000)` nos `fetch` de `api/client.ts` (hoje não há timeout — requisição pendurada trava a UI indefinidamente) e tratar timeout com a mesma toast.

**Teste:** derrubar o backend com o jogo aberto e tentar salvar tática → toast de erro aparece em ≤15s e a UI não finge sucesso.

---

### [ ] C5 — Polling do modo online: duplicado, sem backoff e sem feedback de desconexão

**Problema (verificado):** `App.tsx` (~linha 269) e `RoomView.tsx` (~linha 75) fazem polling independente da mesma sala a cada 2s — quando os dois estão montados são 2 requisições/2s por cliente. Não há backoff em falha (rede fora = spam de erros silenciosos), não há aviso de "conexão perdida", e no reingresso o `RoomView` engole o 404 (sala encerrada) deixando o usuário num loader infinito.

**Correção:**
- [ ] Centralizar o polling da sala num único lugar (hook `useRoomPolling` compartilhado ou deixar só o `App.tsx` responsável e o `RoomView` consumir o mesmo estado).
- [ ] Backoff exponencial em falhas consecutivas (2s → 4s → 8s, reset no sucesso).
- [ ] Banner "Reconectando…" quando 2+ polls seguidos falharem; ao voltar, some sozinho.
- [ ] No reingresso (`RoomView.tsx:42-46`), tratar 404 explicitamente: limpar sala salva (`forgetRoom`) e voltar para `/online` com toast "A sala foi encerrada".

**Teste:** entrar numa sala em 2 abas e conferir no Network que há 1 polling por aba; desligar o backend → banner aparece e a frequência cai; religar → recupera; encerrar a sala pelo dono → o convidado volta ao `/online` com aviso (sem loader infinito).

---

### [ ] C6 — Processamento semanal automático no online roda só no escopo do host

**Problema (documentado no próprio projeto):** `PlanoOnline.md` (limitação "c" do MVP) — no fechamento da rodada online, parcelas, bônus, progresso de scout e humor da torcida são processados **no escopo do host**, não por jogador. Na prática: parcelas a pagar/receber dos outros humanos podem não ser creditadas/debitadas na semana certa e missões de scout deles não progridem no avanço automático.

**Correção:**
- [ ] Em `advanceRoomWeek` (`backend/src/rooms/roomManager.ts`), iterar sobre **cada humano** fazendo `loadScope(teamId)` → processar a fatia semanal dele (parcelas via `pendingInstallments`, bônus, `scoutMissions`, `fanMood`) → `saveScope(teamId)`, em vez de processar uma vez só com o escopo do host.
- [ ] Extrair do `advanceWeek` a função "processar semana do escopo de um humano" para poder chamá-la por jogador sem duplicar lógica (`slices/core.ts` já recebe `humanTeamIds` — é completar a migração começada na Fase 5).
- [ ] Cobrir com um teste de API: 2 humanos, um com parcela a receber e outro com missão de scout ativa → fechar rodada → ambos os escopos atualizados.

**Teste:** sala com 2 jogadores; jogador B (não-host) vende jogador parcelado; avançar 4 rodadas → B recebeu as parcelas no orçamento e a missão de scout de B progrediu.

---

### [ ] C7 — Robustez dos controles da partida ao vivo (loop de simulação e substituições)

**Problema (verificado em revisão):** Em `frontend/src/components/match/MatchCenter.tsx`:
1. O efeito do loop ao vivo (~linhas 350–362) depende de `matches[liveMatchWatching]?.isLive` e lê estado via `useGameStore.getState()` dentro do intervalo — o efeito re-executa a cada mudança do array `matches` e pode ler estado defasado entre ticks (velocidade/pausa do 2º tempo ficam frágeis).
2. O seletor de substituição (~linhas 294–298) monta os "em campo" a partir do `startingXI` original — não desconta expulsos nem já substituídos, permitindo escolher para sair um jogador que nem está mais em campo.

**Correção:**
- [ ] Estabilizar o loop: guardar o índice/id da partida ao vivo e um booleano `isLive` em estado próprio; usar `useRef` para o timer e depender só de valores estáveis no array de dependências.
- [ ] Derivar "em campo" do estado real da partida (XI inicial − expulsos − substituídos + que entraram), que o backend já reporta nos eventos (`MatchAction` de cartão vermelho/substituição).
- [ ] Backend (`slices/match.ts`): validar substituição — recusar entrada de jogador lesionado/expulso e saída de quem não está em campo (hoje só valida o limite de 5 trocas).

**Teste:** partida ao vivo com expulsão → o expulso não aparece no seletor "sai"; tentar via devtools substituir um expulso → backend recusa; mudar a velocidade da partida não duplica o timer (sem minutos pulando).

---

### [ ] C8 — Dividir o `TransferMarket.tsx` (1.651 linhas) em subcomponentes

**Problema (verificado):** `frontend/src/components/transfer/TransferMarket.tsx` é o maior arquivo do projeto — mercado, ofertas recebidas, negociação/contraproposta, parcelas, bônus, empréstimos, shortlist e relatórios de scout num componente só. Qualquer mudança no mercado arrisca quebrar outra aba, e re-render de qualquer pedaço re-renderiza tudo.

**Correção:**
- [ ] Extrair por responsabilidade, sem mudar comportamento: `OffersInbox.tsx` (ofertas recebidas + respostas), `NegotiationPanel.tsx` (contraproposta/parcelas/bônus), `LoanPanel.tsx`, `ShortlistPanel.tsx`, `MarketBrowser.tsx` (busca/filtros/lista).
- [ ] Promover `InstallmentClauseDisplay` e `PlayerBonusDisplay` (hoje internos, ~linhas 14–65) para `components/transfer/` exportados — o `OnlineTransfers.tsx` e o Inbox podem reutilizá-los em vez de duplicar.
- [ ] Manter o estado no componente-pai/store; os filhos recebem props. Meta: nenhum arquivo da pasta acima de ~400 linhas.

**Teste:** typecheck + smoke test (`npm run test:smoke`) verdes; fluxo completo manual: buscar → ofertar → contraproposta → fechar com parcelas → conferir no financeiro.

---

### [ ] C9 — Autosave + versionamento de saves

**Problema (verificado):** `backend/src/services/saveService.ts` tem 2 slots manuais em JSON puro, sem número de versão. Se o schema do estado mudar (e vai mudar — vide F1–F4), o save antigo quebra o load sem mensagem útil. E como só existe save manual, um crash custa horas de jogo.

**Correção:**
- [ ] Adicionar `schemaVersion` no `SaveSlot` (`types/saves.ts`) e uma etapa de migração no `loadSaveFromDisk`: mapa `{ 1: migrateV1toV2, ... }` aplicado em sequência; save de versão desconhecida → erro claro no frontend ("save incompatível"), não crash.
- [ ] Autosave: gravar num slot reservado (slot 0, oculto da UI de saves) a cada avanço de semana — o `advanceWeek` é o ponto único; oferecer "Continuar (autosave)" na tela inicial.
- [ ] Preencher campos novos com defaults na migração (ex.: `careerGoals: 0`) para os saves atuais continuarem válidos quando F1 entrar.

**Teste:** salvar, editar o JSON para uma versão antiga simulada, carregar → migração roda e o jogo abre; matar o processo no meio da sessão → "Continuar" restaura a última semana avançada.

---

### [ ] C10 — Blindar o cálculo de força do time contra atributos ausentes (NaN)

**Problema (verificado em revisão):** `calculateTeamStrength` em `backend/src/store/helpers/matchEngine.ts` (~linhas 47–64) acessa `player.technical.passing` etc. sem fallback. Um jogador com atributos parciais — possível via save antigo, jogador mascarado por scouting ou dado gerado incompleto — produz `NaN`, e `NaN` contamina silenciosamente o placar e as odds da partida inteira.

**Correção:**
- [ ] Fallback nos acessos: `player.technical?.passing ?? 10` (ou uma função `attr(p, 'technical', 'passing')` usada nos três grupos técnico/mental/físico).
- [ ] `Number.isFinite()` de guarda no resultado final de `calculateTeamStrength`; se inválido, logar o time/jogador ofensor e usar força média (50) em vez de propagar NaN.
- [ ] Aproveitar e revisar os outros consumidores de atributos do motor (`simulateFullMatch`, ratings pós-jogo) com o mesmo helper.
- [ ] Teste unitário em `src/tests/` (padrão vitest já existe): jogador sem bloco `physical` → força do time continua finita e no intervalo esperado.

**Teste:** rodar o novo teste + `headless_sim.ts` numa temporada completa sem nenhum `NaN` em placares/ratings.

---

## 📌 Descartados da análise (para registro)

Itens apontados na investigação mas **verificados como já corretos** no código — não fazer:
- ~~Arredondamento de parcelas cobra a mais~~ — a 1ª parcela já absorve o resto (`slices/transfer.ts:60` e `:770`).
- ~~Decremento duplo de `contractEnd`~~ — há guarda `if (humans.includes(team.id)) return team` (`slices/core.ts:666`).
- ~~Rota offline `/api/action` sem validação Zod~~ — `runAction` compartilhado já valida (`storeHelpers.ts:83-94`).
- ~~Parcela pode furar o piso de orçamento~~ — já existe checagem `budget >= p.amount` com inadimplência (`slices/core.ts:571-586`).
