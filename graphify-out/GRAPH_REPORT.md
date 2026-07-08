# Graph Report - .  (2026-07-08)

## Corpus Check
- 327 files · ~629,376 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3929 nodes · 9104 edges · 183 communities (152 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Live Browser DOM
- CSS Style Checks
- API Client Layer
- Match Engine
- AI Weekly Results
- Match Center UI
- Visual Findings
- Game Constants
- Svelte Injection
- Session Snapshots
- Screenshot Library
- Player Card UI
- CSP Detection
- AI Manager
- Live Commit Edits
- Future Features
- CLI Main
- Design System Detection
- Impeccable Config
- Hook Library
- Configure Bar
- Browser Script Parts
- Svelte CSS
- Market Value & Salary
- Anti-Pattern Detection
- Manual Apply
- Dynamics View
- Hook Admin
- Hook Before Edit
- Steer Processing
- Press Center UI
- CSS Cascade
- Init Flow
- Live Insert
- League & Press Logic
- Context Directives
- Design System Merge
- Game Store
- Design HTML Builder
- Design Parser
- Backend Config
- Live Accept
- Finance Audit
- Copy Edit Agent
- Headless Simulation
- Visual Contrast Analysis
- Room Manager
- Manual Edit Evidence
- Dashboard Charts
- Live Action Reference
- Completion & Poll
- Frontend Dependencies
- Inbox View
- Brand & Params Panel
- Manual Apply State
- Insert UI
- Auth & Error Middleware
- Impeccable Hooks
- Live Discard Edits
- Codex Visual Direction
- Directory Discovery
- Room Player Readiness
- Save Service
- Partidas Rules Index
- Browser Color Comparison
- Edit Count & Budget
- Annotation & Pin Builder
- Team Selection UI
- Live Server Polling
- Target Selection Args
- Project Root Resolution
- Element Quality Checks
- Frontend TSConfig
- AI Context Doc
- Backend TSConfig
- Balance Report
- Typography Checks
- Adapt Reference
- Animate Reference
- Clarify Reference
- Colorize Reference
- Critique Reference
- Delight Reference
- Document Reference
- Onboard Reference
- Overdrive Reference
- Polish Reference
- Shape Reference
- Typeset Reference
- Training Critique Early
- Game Flow Doc
- Finance Rules
- Injury Rules
- Tactics Rules
- Transfer Rules
- Training Rules
- Color Blending Utils
- Param Defaults & Cycling
- Audit Reference
- Brand Reference
- Interaction Design
- Training Critique Late
- Dynamics Rules
- Match Rules
- Layout Reference
- Optimize Reference
- General Rules
- Press Rules
- Context Signals
- Browser Design System
- DOM Element Utils
- Steer Focus Debug
- Event Validation
- Training View UI
- Bolder Reference
- Critique Storage
- Visual Contrast Findings
- Frontend Package Config
- Morale Dynamics
- Distill Reference
- Harden Reference
- Live Browser Helpers
- Session Store
- Error Boundary
- Theme Toggle
- Game Store API
- Quieter Reference
- Motion & Layout Checks
- Palette Utils
- Pin Generator
- Schemas & Validation
- Inline Ignores
- Finding Ignore Filters
- Scouting Rules
- Subagent Prompts
- Selector Generation
- Post Match Report UI
- Extract Reference
- Keep Docs Updated
- Classification Rules
- Save Rules
- Workspace Parsing
- Scan Target Normalization
- Youth Rules
- Toast UI
- Generated File Detection
- Detect Module
- Hook Module
- JSON Generator Script
- Training Screenshot
- Training Screenshot Viewport
- Finance Report After
- Finance Report Before
- Verify Transfer Report
- Club Cards Screenshot
- Club Selection Screenshot
- Dark Mode Screenshot
- Main Screenshot
- Atletico Mineiro Badge
- Bahia Badge
- Botafogo Badge
- Bragantino Badge
- Ceara Badge
- Corinthians Badge
- Cruzeiro Badge
- Flamengo Badge
- Fluminense Badge
- Fortaleza Badge
- Gremio Badge
- Internacional Badge
- Juventude Badge
- Mirassol Badge
- Palmeiras Badge
- Santos Badge
- Sao Paulo Badge
- Sport Recife Badge
- Vasco Da Gama Badge
- Vitoria Badge

## God Nodes (most connected - your core abstractions)
1. `el()` - 55 edges
2. `useGameStore` - 44 edges
3. `Skill` - 43 edges
4. `createCoreSlice()` - 42 edges
5. `GameState` - 40 edges
6. `Ai Context` - 40 edges
7. `runHook()` - 32 edges
8. `Player` - 31 edges
9. `Team` - 30 edges
10. `setLiveState()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `StatBar()` --indirect_call--> `v()`  [INFERRED]
  frontend/src/components/match/MatchCenter.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `calculateTeamStrength()` --indirect_call--> `v()`  [INFERRED]
  backend/src/store/helpers/matchEngine.ts → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `finalizePendingUserMatch()` --indirect_call--> `v()`  [INFERRED]
  backend/src/store/slices/core.ts → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `MiniAreaChart()` --indirect_call--> `v()`  [INFERRED]
  frontend/src/components/charts/MiniAreaChart.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `Ai Context` --references--> `Partidas`  [EXTRACTED]
  AI_CONTEXT.md → .devin/workflows/partidas.md

## Import Cycles
- 2-file cycle: `backend/src/types/game.ts -> backend/src/types/saves.ts -> backend/src/types/game.ts`

## Communities (183 total, 31 thin omitted)

### Community 0 - "Live Browser DOM"
Cohesion: 0.03
Nodes (131): acceptedDomAlreadyClean(), addManualContextText(), applyPlaceholderSizingStyles(), applySvelteComponentVariantStyle(), averageRgb01(), bindEditBadgeProxy(), bufferToBase64(), buildColorModels() (+123 more)

### Community 1 - "CSS Style Checks"
Cohesion: 0.04
Nodes (102): borderColorsFromStyle(), borderWidthsFromStyle(), checkBorders(), checkClippedOverflow(), checkColors(), checkCreamPalette(), checkElementAIPaletteDOM(), checkElementBorders() (+94 more)

### Community 2 - "API Client Layer"
Cohesion: 0.07
Nodes (64): apiAction(), apiGet(), apiPost(), apiRoomState(), beginRoom(), clearActiveRoom(), closeRoom(), createRoom() (+56 more)

### Community 3 - "Match Engine"
Cohesion: 0.08
Nodes (71): ATTACK_WEIGHT, attackQuality(), attr(), autoSelectCornerTaker(), autoSelectCornerTarget(), autoSelectFreeKickTaker(), autoSelectPenaltyTaker(), avgDefined() (+63 more)

### Community 4 - "AI Weekly Results"
Cohesion: 0.08
Nodes (61): AIWeeklyResult, GenerateInboxContext, ScoutMissionResult, Get, Set, BoardReply, BoardReplyEffect, BoardReplyOption (+53 more)

### Community 5 - "Match Center UI"
Cohesion: 0.04
Nodes (52): ACTION_ICON, ActionIcon(), CommentaryFeed(), commentaryLine(), FixtureCard(), FORM_CLASS, MatchActionDisplay(), MatchCenter() (+44 more)

### Community 6 - "Visual Findings"
Cohesion: 0.06
Nodes (68): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), browserColorsClose(), browserDesignSystemConfig() (+60 more)

### Community 7 - "Game Constants"
Cohesion: 0.04
Nodes (64): BOARD_REPLY_CATEGORIES, InstallmentClauseDisplay(), PlayerBonusDisplay(), ScoutReportCard(), ScoutReportCardProps, TransferAgreementDisplay(), SquadStatusOptions, TransferMarket() (+56 more)

### Community 8 - "Svelte Injection"
Cohesion: 0.09
Nodes (68): abortSvelteComponentInjection(), applyEditing(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+60 more)

### Community 9 - "Session Snapshots"
Cohesion: 0.07
Nodes (62): applyOriginalAttrsToSvelteAnchor(), applySavedSessionMeta(), buildInsertPlaceholderSnapshotFromDom(), checkpointPayload(), clampVariantIndex(), clearHandled(), commitAcceptedSvelteComponentToDom(), elementMatchesOriginalMarkup() (+54 more)

### Community 10 - "Screenshot Library"
Cohesion: 0.08
Nodes (57): _(), ae(), be(), bt(), Ce(), Ct(), de(), dt() (+49 more)

### Community 11 - "Player Card UI"
Cohesion: 0.06
Nodes (44): PlayerCard(), PlayerCardProps, getOverall(), PlayerDetailPanel(), PlayerDetailPanelProps, STATUS_LABELS, POSITION_ORDER, SORT_OPTIONS (+36 more)

### Community 12 - "CSP Detection"
Cohesion: 0.07
Nodes (50): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+42 more)

### Community 13 - "AI Manager"
Cohesion: 0.11
Nodes (45): autoSave(), analyzeSquadNeeds(), getWeakestPosition(), isTransferWindow(), processAIContracts(), processAIFreeAgentSignings(), processAILoans(), processAIReleaseClauses() (+37 more)

### Community 14 - "Live Commit Edits"
Cohesion: 0.10
Nodes (50): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+42 more)

### Community 15 - "Future Features"
Cohesion: 0.04
Nodes (48): Checklist, [ ] F10 — Modo Fantasy Draft online: leilão/snake draft de TODOS os jogadores da liga, [ ] F11 — Guerra psicológica no PvP: coletivas que atingem o rival humano, [ ] F12 — Árvore de perks do treinador (meta-progressão entre saves), [ ] F13 — Preleção e conversa de intervalo com reação por personalidade, [ ] F14 — Probabilidade de vitória ao vivo + cine-replay dos gols no MatchPitch2D, [ ] F15 — Desafios semanais da comunidade: mesmo cenário, mesma semente, ranking, [ ] F1 — Envelhecimento, declínio e aposentadoria de jogadores (arco de carreira) (+40 more)

### Community 16 - "CLI Main"
Cohesion: 0.09
Nodes (39): confirm(), detectCli(), formatFindings(), formatFindingSummary(), handleStdin(), printUsage(), loadDesignSystemForCwd(), parseFrontmatter() (+31 more)

### Community 17 - "Design System Detection"
Cohesion: 0.10
Nodes (47): addColorObject(), addDesignColor(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii(), addTypographyFonts(), canonicalDesignFindingKey() (+39 more)

### Community 18 - "Impeccable Config"
Cohesion: 0.10
Nodes (47): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), colorIgnoreKey(), DEFAULT_DETECTION_CONFIG, DETECTOR_CONFIG_KEYS (+39 more)

### Community 19 - "Hook Library"
Cohesion: 0.07
Nodes (45): ACK_EXTS, applyConfigSource(), applyDetectorConfigSource(), applyPatchText(), clampByte(), cloneDefaultConfig(), CO_SCAN_STYLE_NAMES, colorIgnoreKey() (+37 more)

### Community 20 - "Configure Bar"
Cohesion: 0.09
Nodes (47): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+39 more)

### Community 21 - "Browser Script Parts"
Cohesion: 0.09
Nodes (43): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), acknowledgePendingEvent(), activeSessionSummaries(), agentPollingConnected() (+35 more)

### Community 22 - "Svelte CSS"
Cohesion: 0.10
Nodes (44): applyLegacyDeferredAcceptsOnStartup(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts(), bakeParamValuesInCss(), buildInsertVariantStub(), buildPropContract(), buildPropsScript() (+36 more)

### Community 23 - "Market Value & Salary"
Cohesion: 0.09
Nodes (38): calculateMarketValue(), calculatePlayerSalary(), calculateTeamBudget(), createYouthSlice(), Get, Set, advanceAndFindUserMatch(), getState() (+30 more)

### Community 24 - "Anti-Pattern Detection"
Cohesion: 0.09
Nodes (36): checkBorders(), checkClippedOverflow(), checkElementBorders(), checkElementBordersDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM(), checkElementItalicSerif(), checkElementItalicSerifDOM() (+28 more)

### Community 25 - "Manual Apply"
Cohesion: 0.10
Nodes (36): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+28 more)

### Community 26 - "Dynamics View"
Cohesion: 0.09
Nodes (33): LeagueTableWrapper(), DynamicsSortKey, DynamicsView(), getCoachTreatmentLabel(), getFormRatingColor(), getInfluenceColor(), getSatisfaction(), HIERARCHY_LEVELS (+25 more)

### Community 27 - "Hook Admin"
Cohesion: 0.14
Nodes (39): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+31 more)

### Community 28 - "Hook Before Edit"
Cohesion: 0.11
Nodes (39): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), done(), escapeRegExp(), findingSignature(), firstMatch() (+31 more)

### Community 29 - "Steer Processing"
Cohesion: 0.10
Nodes (40): applyGlobalBarLabelState(), armPageChatForTyping(), buildSteerProcessingDots(), clearSteerAwaitTimer(), collapsePageChat(), configureVoiceContext(), expandPageChat(), finishVoiceSession() (+32 more)

### Community 30 - "Press Center UI"
Cohesion: 0.06
Nodes (31): CATEGORY_LABELS, FAN_SENTIMENT_COLORS, FAN_SENTIMENT_LABELS, MEDIA_LEVEL_COLORS, MEDIA_LEVEL_LABELS, PressCenter(), PressConferenceCard(), RESPONSE_TONE_COLORS (+23 more)

### Community 31 - "CSS Cascade"
Cohesion: 0.10
Nodes (29): applyStaticDeclaration(), buildBorderOverrideMap(), buildStaticStyleMap(), collectStaticCssRules(), compareStaticPriority(), cssPropToCamel(), expandStaticBoxValues(), expandStaticDeclaration() (+21 more)

### Community 32 - "Init Flow"
Cohesion: 0.05
Nodes (38): Init, Accessibility & Inclusion, Brand & Personality, Init Flow, Interview mode, not confirmation mode, Minimum viable interview, Product, Product Purpose (+30 more)

### Community 33 - "Live Insert"
Cohesion: 0.13
Nodes (35): argVal(), buildInsertWrapperLines(), computeInsertLine(), INSERT_POSITIONS, insertCli(), isInsertPosition(), resolveElementMatch(), buildSvelteComponentCssAuthoring() (+27 more)

### Community 34 - "League & Press Logic"
Cohesion: 0.11
Nodes (30): calculatePressConferenceEffects(), fillTemplate(), generateHeadline(), generatePressConference(), JOURNALISTS, makeId(), pickN(), pickRandom() (+22 more)

### Community 35 - "Context Directives"
Cohesion: 0.10
Nodes (35): buildMissingTargetDirective(), buildResolvedContextDirective(), buildTargetSelectionDirective(), buildUpdateDirective(), cli(), compareSemver(), computeUpdateDirective(), contextSourcePath() (+27 more)

### Community 36 - "Design System Merge"
Cohesion: 0.14
Nodes (30): mergeDesignSystemFindings(), detectUrl(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), runTextContentAnalyzers(), buildStaticWindow(), collectStaticCssText(), detectHtml() (+22 more)

### Community 37 - "Game Store"
Cohesion: 0.09
Nodes (27): createGameStore(), generateScoutReport(), createAttributesSlice(), Get, Set, createInboxSlice(), Get, Set (+19 more)

### Community 38 - "Design HTML Builder"
Cohesion: 0.09
Nodes (36): buildCollapsible(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), copyToClipboard(), cssSafe(), designPanelCss(), escapeHtml() (+28 more)

### Community 39 - "Design Parser"
Cohesion: 0.15
Nodes (33): buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors(), extractComponents() (+25 more)

### Community 40 - "Backend Config"
Cohesion: 0.06
Nodes (33): dependencies, cors, express, react, zod, zustand, devDependencies, eslint (+25 more)

### Community 41 - "Live Accept"
Cohesion: 0.14
Nodes (32): acceptCli(), argVal(), buildCarbonizeReplacement(), decodeHtmlAttr(), deindentContent(), detectCommentSyntax(), escapeRegExp(), expandReplaceRange() (+24 more)

### Community 42 - "Finance Audit"
Cohesion: 0.20
Nodes (26): applyFinancesToAllTeams(), __dirname, __filename, main(), TeamSummary, WeeklySnapshot, applyFinancesToAllTeams(), useGameStore (+18 more)

### Community 43 - "Copy Edit Agent"
Cohesion: 0.14
Nodes (31): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchForPrompt() (+23 more)

### Community 44 - "Headless Simulation"
Cohesion: 0.12
Nodes (27): applyFatigueDecayToAllTeams(), applyTrainingToAllTeams(), __dirname, __filename, getMostUsedTactic(), main(), recordYoungPlayers(), resetTacticTracker() (+19 more)

### Community 45 - "Visual Contrast Analysis"
Cohesion: 0.14
Nodes (30): analyzeVisualContrast(), analyzeVisualContrastCandidate(), checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlow(), checkElementGlowDOM() (+22 more)

### Community 46 - "Room Manager"
Cohesion: 0.12
Nodes (26): advanceRoomWeek(), beginGame(), cleanup, createRoom(), executeHumanTransfer(), genCode(), HumanOffer, isHumanTeam() (+18 more)

### Community 47 - "Manual Edit Evidence"
Cohesion: 0.16
Nodes (26): analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence(), collectSearchFiles(), countOps(), decodeBasicHtml(), escapeRegExp() (+18 more)

### Community 48 - "Dashboard Charts"
Cohesion: 0.18
Nodes (19): MiniAreaChart(), MiniAreaChartProps, Dashboard(), EXPECTATION_LABELS, FORM_COLORS, FORM_LABELS, FORM_SCORE, ZONE_COLORS (+11 more)

### Community 49 - "Live Action Reference"
Cohesion: 0.08
Nodes (26): Live, 1. Read the screenshot (if present), 2. Wrap the element, 3. Load the action's reference, 4. Plan three variants: identity first, then mode, then axes, Handle generate, Insert mode branch, Phase A: Extract the identity (non-skippable) (+18 more)

### Community 50 - "Completion & Poll"
Cohesion: 0.18
Nodes (24): completionAckForAcceptResult(), completionTypeForAcceptResult(), augmentEventWithAcceptHandling(), buildAcceptScriptArgs(), buildPollReplyPayload(), EVENT_TYPES_NEEDING_AGENT_REPLY, fetchNextEvent(), fetchServerStatus() (+16 more)

### Community 51 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, react, react-dom, react-router-dom, recharts, zustand, devDependencies (+17 more)

### Community 52 - "Inbox View"
Cohesion: 0.09
Nodes (19): ACTION_MAP, ActionButton, FinancialReportModalProps, InboxView(), INJURY_TYPE_LABELS, InjuryReportModalProps, MESSAGE_ICONS, MessageActions (+11 more)

### Community 53 - "Brand & Params Panel"
Cohesion: 0.14
Nodes (24): barPaletteForTheme(), brandMarkSvg(), buildParamsPanel(), detectPageTheme(), ensureAgentPollTooltip(), fetchAgentPollingStatus(), formatRangeValue(), hideAgentPollTooltip() (+16 more)

### Community 54 - "Manual Apply State"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 55 - "Insert UI"
Cohesion: 0.11
Nodes (10): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+2 more)

### Community 56 - "Auth & Error Middleware"
Cohesion: 0.13
Nodes (14): authMiddleware(), errorHandler(), notFoundHandler(), RateLimitEntry, rateLimiter(), store, requestLogger(), gameRouter (+6 more)

### Community 57 - "Impeccable Hooks"
Cohesion: 0.09
Nodes (23): Hooks, /impeccable hooks, Constraints, Failure modes, Flow, Intentional findings, Routing, Skill (+15 more)

### Community 58 - "Live Discard Edits"
Cohesion: 0.19
Nodes (19): args, cwd, pageUrlFilter, remaining, compactManualLogText(), summarizeManualApplyFailures(), summarizeManualDiagnostics(), summarizeManualLogFile() (+11 more)

### Community 59 - "Codex Visual Direction"
Cohesion: 0.09
Nodes (22): Codex, After This File, Codex: Visual Direction & Asset Production, Four stop points before code, Step A: Explore Directions with the User, Step B: Generate the Brand Palette First, Step C: Generate 1-3 Visual Mocks Against the Palette, Step D: Approval Loop (+14 more)

### Community 60 - "Directory Discovery"
Cohesion: 0.14
Nodes (22): directChildDirs(), discoverRootsForPattern(), discoverTargetCandidates(), escapeRegExp(), expandSimplePattern(), findTargetExample(), hasFallbackWorkspaceChildren(), isCandidateProjectRoot() (+14 more)

### Community 61 - "Room Player Readiness"
Cohesion: 0.15
Nodes (19): allPlayersReady(), closeRoom(), focusTeam(), getPlayer(), getRoom(), joinRoom(), pickTeam(), Room (+11 more)

### Community 62 - "Save Service"
Cohesion: 0.18
Nodes (17): deleteSaveFromDisk(), ensureSavesDir(), listSaveSlotsFromDisk(), loadAutoSave(), loadSaveFromDisk(), migrateGameState(), migrations, persistSave() (+9 more)

### Community 63 - "Partidas Rules Index"
Cohesion: 0.10
Nodes (21): Partidas, Readme, Arquivos, Regras do Jogo — Índice, Regra Diretoria, Demissão, Expectativas da Diretoria, Promessas da Diretoria (+13 more)

### Community 64 - "Browser Color Comparison"
Cohesion: 0.12
Nodes (21): borderColorsFromStyle(), borderWidthsFromStyle(), browserColorsClose(), browserHasDirectText(), browserRadiusTokens(), browserSampleText(), checkCreamPalette(), checkElementDesignSystemDOM() (+13 more)

### Community 65 - "Edit Count & Budget"
Cohesion: 0.15
Nodes (21): bumpEditCount(), clampGroupedToBudget(), clampToBudget(), dedupeAgainstCache(), depthIsSet(), directiveFooter(), ensureFile(), ensureSession() (+13 more)

### Community 66 - "Annotation & Pin Builder"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 67 - "Team Selection UI"
Cohesion: 0.20
Nodes (17): getExpectationLabel(), getPlaystyleTag(), getStrengthLabel(), TeamDossier(), TeamSelection(), TeamCrest(), TeamCrestProps, getCrestColors() (+9 more)

### Community 68 - "Live Server Polling"
Cohesion: 0.21
Nodes (17): isLiveServerPidReachable(), readLiveServerInfo(), completeCli(), completeThroughServer(), parseArgs(), readServerInfo(), collectManualApplyFiles(), manualApplyReplyCommand() (+9 more)

### Community 69 - "Target Selection Args"
Cohesion: 0.19
Nodes (15): loadContext(), resolveTargetSelection(), safeRead(), parseTargetOptions(), parseTargetPath(), TargetArgError, __dirname, ensureServerRunning() (+7 more)

### Community 70 - "Project Root Resolution"
Cohesion: 0.22
Nodes (18): resolveProjectRoot(), firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+10 more)

### Community 71 - "Element Quality Checks"
Cohesion: 0.14
Nodes (19): checkElementQuality(), checkElementQualityDOM(), checkQuality(), checkRepeatedSectionKickers(), checkRepeatedSectionKickersDOM(), checkRepeatedSectionKickersFromDoc(), cleanInlineText(), collectRepeatedSectionKickerCandidates() (+11 more)

### Community 72 - "Frontend TSConfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 73 - "AI Context Doc"
Cohesion: 0.11
Nodes (18): Ai Context, 🏗️ Arquitetura Cliente-Servidor, 📁 Estrutura de Arquivos, 🧩 Tipos de Domínio (backend/src/types/), AI Context - Football Manager Web, Atualização recente — Treinos UI (2026-07-06), Jogador (player.ts), Lesões (injury.ts) (+10 more)

### Community 74 - "Backend TSConfig"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 75 - "Balance Report"
Cohesion: 0.12
Nodes (17): Balance Report, Projeto, Avaliação de Jogadores por Partida, Bônus Tático e Multiplicadores de Tática, Bolas Paradas (Set Pieces), Centro de Inteligência Pré-Jogo (Pre-Match Intelligence Center), Estrutura da Temporada, Football Manager Web — Como o Jogo Funciona (+9 more)

### Community 76 - "Typography Checks"
Cohesion: 0.18
Nodes (16): checkPageTypography(), checkTypography(), isBrandFontOnOwnDomain(), resolveSerif(), checkStaticPageTypography(), checkPageTypography(), checkTypography(), resolveSerif() (+8 more)

### Community 77 - "Adapt Reference"
Cohesion: 0.12
Nodes (16): Adapt, Assess Adaptation Challenge, Content Adaptation, Desktop Adaptation (Mobile → Desktop), Email Adaptation (Web → Email), Implement Adaptations, Layout Adaptation Techniques, Mobile Adaptation (Desktop → Mobile) (+8 more)

### Community 78 - "Animate Reference"
Cohesion: 0.12
Nodes (16): Animate, Assess Animation Opportunities, CSS Animations, Delight Moments, Entrance Animations, Feedback & Guidance, Implement Animations, JavaScript Animation (+8 more)

### Community 79 - "Clarify Reference"
Cohesion: 0.12
Nodes (16): Clarify, Apply Clarity Principles, Assess Current Copy, Button & CTA Text, Confirmation Dialogs, Empty States, Error Messages, Form Labels & Instructions (+8 more)

### Community 80 - "Colorize Reference"
Cohesion: 0.12
Nodes (16): Colorize, Accent Color Application, Accessibility, Assess Color Opportunity, Background & Surfaces, Balance & Refinement, Borders & Accents, Cohesion (+8 more)

### Community 81 - "Critique Reference"
Cohesion: 0.12
Nodes (16): Critique, Anti-Patterns Verdict, Assessment A: Design Review, Assessment B: Detector + Browser Evidence, Assessment Orchestration, Design Health Score, Generate Combined Critique Report, Hard Invariants (+8 more)

### Community 82 - "Delight Reference"
Cohesion: 0.12
Nodes (16): Delight, Appropriate to Context, Assess Delight Opportunities, Compound Over Time, Delight Amplifies, Never Blocks, Delight Principles, Delight Techniques, Easter Eggs & Hidden Delights (+8 more)

### Community 83 - "Document Reference"
Cohesion: 0.12
Nodes (16): Document, 1. Overview, 2. Colors, Design System: [Project Title], Primary, Scan mode (approach C: auto-extract, then confirm descriptive language), Secondary (optional; omit if the project has only one accent), Step 1: Find the design assets (+8 more)

### Community 84 - "Onboard Reference"
Cohesion: 0.12
Nodes (16): Onboard, Assess Onboarding Needs, Context Over Ceremony, Design Onboarding Experiences, Documentation & Help, Empty State Design, Feature Discovery & Adoption, Guided Tours & Walkthroughs (+8 more)

### Community 85 - "Overdrive Reference"
Cohesion: 0.12
Nodes (16): Overdrive, Animate complex properties, Assess What "Extraordinary" Means Here, For data-heavy interfaces, For functional UI, For performance-critical UI, For visual/marketing surfaces, Interact with the device (+8 more)

### Community 86 - "Polish Reference"
Cohesion: 0.12
Nodes (16): Polish, Color & Contrast, Content & Copy, Design System Discovery, Edge Cases & Error States, Forms & Inputs, Icons & Images, Information Architecture & Flow (+8 more)

### Community 87 - "Shape Reference"
Cohesion: 0.12
Nodes (16): Shape, Anti-Goals, Brief Structure, Constraints, Content & Data, Design Direction, How to use the probes, Important limits (+8 more)

### Community 88 - "Typeset Reference"
Cohesion: 0.12
Nodes (16): Typeset, Assess Current Typography, Classic Typography Principles, Establish Hierarchy, Fix Readability, Font Selection, Improve Typography Systematically, Live-mode signature params (+8 more)

### Community 89 - "Training Critique Early"
Cohesion: 0.12
Nodes (16): 2026 07 06T21 16 06Z  Frontend Src Components Training Trainingview Tsx, [P1] Casual emoji/gradient language clashes with the serious register, [P1] Information overload and unclear hierarchy, [P1] Side-stripe borders encode meaning (absolute ban), [P2] Custom player selection is tedious for large squads, [P2] Inverted "Progressão de Atributos" toggle, Alex (Power User), Anti-Patterns Verdict (+8 more)

### Community 90 - "Game Flow Doc"
Cohesion: 0.12
Nodes (16): Fluxo, 1️⃣ FLUXO: INICIAR JOGO (Sem Save), 2️⃣ FLUXO: CARregar/SAVAR SAVE, 3️⃣ FLUXO: NAVIGAÇÃO PRINCIPAL (Sidebar), 4️⃣ FLUXO: PARTIDAS (MatchCenter), 5️⃣ FLUXO: CAIXA DE ENTRADA (InboxView), 📋 Visão Geral, Avançar semana (+8 more)

### Community 91 - "Finance Rules"
Cohesion: 0.12
Nodes (16): Regra Financas, Despesas Semanais, Gestão Financeira, Limite Salarial Recomendado, Modificador de Humor da Torcida, Orçamento do Time, Orçamento e Limite Salarial, Parcelas de Transferência (+8 more)

### Community 92 - "Injury Rules"
Cohesion: 0.12
Nodes (16): Regra Lesoes, Aumentos de Risco, Cálculo de Risco, Cura Semanal (Centralizada), Efeitos Colaterais, Estrutura da Lesão, Fontes de Lesão, Geração de Lesões (Centralizada) (+8 more)

### Community 93 - "Tactics Rules"
Cohesion: 0.12
Nodes (16): Regra Taticas, 1. Em Posse, 2. Em Transição, 3. Sem Posse, Auto-preencher (Plus / Sugestão de Seleção / Escolha Rápida), Bolas Paradas (Set Pieces), Campo 2D Vertical, Drag-and-drop (+8 more)

### Community 94 - "Transfer Rules"
Cohesion: 0.12
Nodes (16): Regra Transferencias, 1. Compra Direta (buyPlayer), 2. Fazer Oferta (makeOffer), Cláusulas de Rescisão, Comprar Jogadores, Empréstimos, Guerra de Ofertas (Bidding Wars), Histórico de Transferências (+8 more)

### Community 95 - "Training Rules"
Cohesion: 0.12
Nodes (16): Regra Treino, Cálculo do CA (Current Ability), Carga Acumulada, Condição Física, Decaimento Semanal de Fadiga, Dias Físicos Consecutivos, Fadiga e Carga, Fator de Moral (+8 more)

### Community 96 - "Color Blending Utils"
Cohesion: 0.18
Nodes (16): blendRgba(), clampByte(), firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken() (+8 more)

### Community 97 - "Param Defaults & Cycling"
Cohesion: 0.20
Nodes (16): applyParamDefaults(), applyParamValue(), buildCyclingRow(), closedClipPath(), cycleVariant(), getVisibleVariantEl(), hideParamsPanel(), navBtn() (+8 more)

### Community 98 - "Audit Reference"
Cohesion: 0.13
Nodes (15): Audit, 1. Accessibility (A11y), 2. Performance, 3. Theming, 4. Responsive Design, 5. Anti-Patterns (CRITICAL), Anti-Patterns Verdict, Audit Health Score (+7 more)

### Community 99 - "Brand Reference"
Cohesion: 0.13
Nodes (15): Brand, Brand bans (on top of the shared absolute bans), Brand permissions, Brand register, Color, Font selection procedure, Imagery, Layout (+7 more)

### Community 100 - "Interaction Design"
Cohesion: 0.13
Nodes (15): Interaction Design, CSS Anchor Positioning, Destructive Actions: Undo > Confirm, Dropdown & Overlay Positioning, Fixed Positioning Fallback, Focus Rings: Do Them Right, Form Design: The Non-Obvious, Keyboard Navigation Patterns (+7 more)

### Community 101 - "Training Critique Late"
Cohesion: 0.13
Nodes (15): 2026 07 06T21 26 09Z  Frontend Src Components Training Trainingview Tsx, [P0] Button variants are dead code — all CTAs look identical, [P0] Manual calendar edits are silently discarded, [P1] Design-system schism (fm- inside fms-page), [P1] Information architecture — monitoring before planning, [P2] Delta color classes don't match CSS, Anti-Patterns Verdict, Critique: Treinos (TrainingView.tsx) (+7 more)

### Community 102 - "Dynamics Rules"
Cohesion: 0.13
Nodes (15): Regra Dinamica, Atualização Bidirecional, Força de Conexão, Grupos Sociais, Hierarquia, Moral e Dinâmica Semanal, Motor 1 — Promessas Expiradas, Motor 2 — Tempo de Jogo vs. Status (+7 more)

### Community 103 - "Match Rules"
Cohesion: 0.13
Nodes (15): Regra Partidas, 1. Posse Inicial, 2. Ações por Minuto, 3. Posição da Bola, 4. Cruzamentos, 5. Faltas e Cartões, 6. Escanteios, 7. Laterais (+7 more)

### Community 104 - "Layout Reference"
Cohesion: 0.14
Nodes (14): Layout, Assess Current Layout, Break Card Grid Monotony, Choose the Right Layout Tool, Create Visual Rhythm, Establish a Spacing System, Improve Layout Systematically, Live-mode signature params (+6 more)

### Community 105 - "Optimize Reference"
Cohesion: 0.14
Nodes (14): Optimize, Animation Performance, Assess Performance Issues, Core Web Vitals Optimization, Cumulative Layout Shift (CLS < 0.1), First Input Delay (FID < 100ms) / INP (< 200ms), Largest Contentful Paint (LCP < 2.5s), Loading Performance (+6 more)

### Community 106 - "General Rules"
Cohesion: 0.14
Nodes (14): Regra Geral, Avançar Semana (advanceWeek), Condição de Fim de Jogo (Game Over), Database de Times, Database Real, Demissão por Insatisfação da Diretoria, Estrutura da Temporada, Expectativas da Diretoria (+6 more)

### Community 107 - "Press Rules"
Cohesion: 0.14
Nodes (14): Regra Imprensa, Categorias, Decaimento Semanal, Efeitos Totais, Humor da Torcida (Fan Mood), Impacto Financeiro, Modificadores Contextuais, Perguntas (+6 more)

### Community 108 - "Context Signals"
Cohesion: 0.25
Nodes (12): extractRegister(), cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals(), hasCode(), latestCritique() (+4 more)

### Community 109 - "Browser Design System"
Cohesion: 0.16
Nodes (14): browserDesignSystemConfig(), browserFindingsFromMap(), browserPrimaryFont(), checkBrowserDesignSystemSources(), checkElementHeroEyebrow(), checkElementHeroEyebrowDOM(), checkHeroEyebrow(), checkHtmlPatterns() (+6 more)

### Community 111 - "Steer Focus Debug"
Cohesion: 0.29
Nodes (14): attachSteerFocusDebug(), attachSteerFocusGuard(), clearSteerFocusRecoverTimer(), focusConfigureInput(), focusSteerChat(), notePagePointerDown(), pageHasHostTextSelection(), scheduleSteerFocusRecover() (+6 more)

### Community 112 - "Event Validation"
Cohesion: 0.26
Nodes (12): FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidVariantId(), validateAnnotationFields(), validateEvent(), validateInsertGenerate(), validateManualEditEvent() (+4 more)

### Community 113 - "Training View UI"
Cohesion: 0.18
Nodes (13): BLOCK_LABELS, BLOCKS, BlockType, createEmptySession(), DayPattern, DAYS, FOCUS_PATTERNS, generateWeeklySchedule() (+5 more)

### Community 114 - "Bolder Reference"
Cohesion: 0.15
Nodes (13): Bolder, Amplify the Design, Assess Current State, Color Amplification, Composition Boldness, Design-System Lock, Motion & Animation, Plan Amplification (+5 more)

### Community 115 - "Critique Storage"
Cohesion: 0.32
Nodes (11): kebab(), listSnapshotsForSlug(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readTrend(), serializeFrontmatter() (+3 more)

### Community 116 - "Visual Contrast Findings"
Cohesion: 0.18
Nodes (13): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), clearOverlays(), detachOverlay(), disconnectLazyVisualContrastObserver(), postExtensionError(), rememberVisualContrastAnalysis() (+5 more)

### Community 117 - "Frontend Package Config"
Cohesion: 0.15
Nodes (12): devDependencies, concurrently, name, private, scripts, build, dev, dev:backend (+4 more)

### Community 118 - "Morale Dynamics"
Cohesion: 0.42
Nodes (11): applyMoraleRegression(), applyPlayingTimeMorale(), applyPromisePenalties(), applySocialCascade(), applySocialGroupCascade(), applyTeamFormMorale(), applyWeeklyMoraleDynamics(), clamp() (+3 more)

### Community 119 - "Distill Reference"
Cohesion: 0.17
Nodes (12): Distill, Assess Current State, Code Simplification, Content Simplification, Document Removed Complexity, Information Architecture, Interaction Simplification, Layout Simplification (+4 more)

### Community 120 - "Harden Reference"
Cohesion: 0.17
Nodes (12): Harden, Accessibility Resilience, Assess Hardening Needs, Edge Cases & Boundary Conditions, Error Handling, Hardening Dimensions, Input Validation & Sanitization, Internationalization (i18n) (+4 more)

### Community 121 - "Live Browser Helpers"
Cohesion: 0.23
Nodes (10): createLiveBrowserDomHelpers(), activeElementDeep(), appendStyleToLiveUiRoot(), appendToLiveUiRoot(), escapeCssIdent(), getLiveUiElementById(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS (+2 more)

### Community 122 - "Session Store"
Cohesion: 0.27
Nodes (9): applyEvent(), baseSnapshot(), COMPLETED_PHASES, getJournalPath(), getSnapshotPath(), rebuildSnapshotFromJournal(), safeSessionId(), toPendingEvent() (+1 more)

### Community 123 - "Error Boundary"
Cohesion: 0.24
Nodes (5): ErrorBoundary, isLikelyStateError(), Props, State, STATE_CORRUPTION_PATTERNS

### Community 124 - "Theme Toggle"
Cohesion: 0.36
Nodes (9): OPTIONS, ThemeToggle(), ThemeToggleProps, useTheme(), applyTheme(), getStoredThemePreference(), ResolvedTheme, resolveTheme() (+1 more)

### Community 125 - "Game Store API"
Cohesion: 0.35
Nodes (9): gameStore, GameStoreApi, getBestScout(), maskAttributeValue(), maskPlayerAttributes(), extractState(), getActionNames(), runAction() (+1 more)

### Community 126 - "Quieter Reference"
Cohesion: 0.18
Nodes (11): Quieter, Assess Current State, Color Refinement, Composition Refinement, Motion Reduction, Plan Refinement, Refine the Design, Register (+3 more)

### Community 127 - "Motion & Layout Checks"
Cohesion: 0.22
Nodes (11): checkElementMotion(), checkElementMotionDOM(), checkLayout(), checkMotion(), checkPageLayout(), isCardLike(), isCardLikeDOM(), isCardLikeFromProps() (+3 more)

### Community 128 - "Palette Utils"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 129 - "Pin Generator"
Cohesion: 0.25
Nodes (9): __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin(), root, unpin() (+1 more)

### Community 130 - "Schemas & Validation"
Cohesion: 0.22
Nodes (8): actionSchemas, teamUpdateFields, zEmpty, zMatchIndex, zNumber, zNumberNonNeg, zSlot, zString

### Community 131 - "Inline Ignores"
Cohesion: 0.40
Nodes (9): addRules(), applyInlineIgnores(), getSet(), hasDirectives(), isInlineIgnored(), normalizeRule(), parseInlineIgnores(), parseRuleList() (+1 more)

### Community 132 - "Finding Ignore Filters"
Cohesion: 0.36
Nodes (10): cleanIgnoreValueDisplay(), extractFindingIgnoreValue(), extractFindingIgnoreValueRaw(), extractMotionIgnoreValue(), filterFindings(), formatFindingIgnoreCommand(), isIgnoredFindingValue(), normalizeIgnoreRule() (+2 more)

### Community 133 - "Scouting Rules"
Cohesion: 0.22
Nodes (9): Regra Scouting, Conhecimento de Jogadores, Experiência de Scouts, Missões de Scouting, Recomendações de Scouts, Regras de Scouting (Olheiros), Relatórios de Scout, Shortlist (+1 more)

### Community 134 - "Subagent Prompts"
Cohesion: 0.22
Nodes (9): Subagent Prompts Correcoes, Prompt C10 — Blindar calculateTeamStrength contra atributos ausentes (NaN), Prompt C4 — Erros de API engolidos no frontend, Prompt C5 — Polling do modo online: duplicado, sem backoff e sem feedback, Prompt C6 — Processamento semanal online só no escopo do host, Prompt C7 — Robustez dos controles da partida ao vivo (MatchCenter), Prompt C8 — Dividir o TransferMarket.tsx (1.654 linhas) em subcomponentes, Prompt C9 — Autosave + versionamento de saves (+1 more)

### Community 135 - "Selector Generation"
Cohesion: 0.25
Nodes (9): buildSelectorSegment(), generateSelector(), isElementHidden(), isLikelyHashedClass(), postSerializedFindings(), renderBrowserFindings(), scanResultMeta(), serializeFindings() (+1 more)

### Community 136 - "Post Match Report UI"
Cohesion: 0.25
Nodes (8): ADVICE_TYPE_ICON, HeatMapGrid(), INSIGHT_CATEGORY_CLASS, INTENSITY_COLORS, INTENSITY_LABELS, intensityLevel(), HeatMapZone, PostMatchReport

### Community 137 - "Extract Reference"
Cohesion: 0.25
Nodes (8): Extract, Extract Flow, Step 1: Discover the Design System, Step 2: Identify Patterns, Step 3: Plan Extraction, Step 4: Extract & Enrich, Step 5: Migrate, Step 6: Document

### Community 138 - "Keep Docs Updated"
Cohesion: 0.25
Nodes (8): Keep Docs Updated, AI_CONTEXT.md, Como atualizar, Excecoes, O que atualizar, projeto.md, Quando aplicar, Regra: Manter projeto.md e AI_CONTEXT.md sempre atualizados

### Community 139 - "Classification Rules"
Cohesion: 0.25
Nodes (8): Regra Classificacao, Cálculo da Classificação, Cores por Zona, Critérios de Desempate (em ordem), Exibição na Interface, Forma Recente, Pontuação, Zonas da Tabela

### Community 140 - "Save Rules"
Cohesion: 0.25
Nodes (8): Regra Saves, Comandos, Metadados do Save, Operações, Persistência, Regras de Saves, Restauração de Estado, Slots de Save

### Community 141 - "Workspace Parsing"
Cohesion: 0.32
Nodes (8): parseYamlFlowList(), readJson(), readLernaWorkspaces(), readPackageWorkspaces(), readPnpmWorkspaces(), readWorkspacePatterns(), stripYamlInlineComment(), unquoteYamlValue()

### Community 142 - "Scan Target Normalization"
Cohesion: 0.36
Nodes (8): coLocatedStylesheets(), expandScanTargets(), hasPathTraversal(), isInsideProject(), normalizeScanTargets(), parseStaticStyleImports(), STYLE_EXTS, UI_CODE_EXTS

### Community 143 - "Youth Rules"
Cohesion: 0.29
Nodes (7): Regra Base Juvenis, Academia de Juvenis, Equipe Reserva, Fornada de Juvenis (Youth Intake), Problema de Pacing, Promoção de Jogadores, Regras de Base de Juvenis

### Community 144 - "Toast UI"
Cohesion: 0.47
Nodes (5): getToastIcon(), Toast(), ToastContainer(), ToastProps, ToastData

### Community 145 - "Generated File Detection"
Cohesion: 0.70
Nodes (4): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored()

### Community 146 - "Detect Module"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

### Community 147 - "Hook Module"
Cohesion: 0.83
Nodes (3): writeAuditLog(), main(), readStdin()

## Knowledge Gaps
- **1158 isolated node(s):** `COMMON_DEV_PORTS`, `SOURCE_DIRS`, `PRODUCT_NAMES`, `DESIGN_NAMES`, `FALLBACK_DIRS` (+1153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `v()` connect `Screenshot Library` to `Match Engine`, `Match Center UI`, `Design HTML Builder`, `Design Parser`, `Context Signals`, `Browser Design System`, `AI Manager`, `Dashboard Charts`, `Brand & Params Panel`, `CSS Cascade`?**
  _High betweenness centrality (0.286) - this node is a cross-community bridge._
- **Why does `finalizePendingUserMatch()` connect `AI Manager` to `Screenshot Library`, `Match Engine`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `el()` connect `Configure Bar` to `Browser Color Comparison`, `CSS Style Checks`, `Live Browser DOM`, `Param Defaults & Cycling`, `Design System Merge`, `Visual Findings`, `Element Quality Checks`, `Selector Generation`, `Svelte Injection`, `Typography Checks`, `Browser Design System`, `Visual Contrast Analysis`, `Design System Detection`, `Brand & Params Panel`, `CSS Cascade`, `Steer Processing`, `Motion & Layout Checks`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `el()` (e.g. with `browserFindingsFromMap()` and `collectVisualContrastCandidates()`) actually correct?**
  _`el()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **What connects `COMMON_DEV_PORTS`, `SOURCE_DIRS`, `PRODUCT_NAMES` to the rest of the system?**
  _1161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Live Browser DOM` be split into smaller, more focused modules?**
  _Cohesion score 0.029514083716754572 - nodes in this community are weakly interconnected._
- **Should `CSS Style Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.04413919413919414 - nodes in this community are weakly interconnected._