# Graph Report - ﻿C:\Users\GD_TECH\Documents\Caio\football-manager-web-master  (2026-07-07)

## Corpus Check
- 289 files · ~479,892 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3294 nodes · 8427 edges · 127 communities (124 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 163 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Browser Live Preview
- Design System Checks
- Visual Contrast Analysis
- Match Center UI
- Transfer & Finance Types
- Svelte Component Editing
- Match Simulation Engine
- Design System Detection
- Scout & Transfer UI
- Svelte Anchor Snapshots
- Screenshot Utility
- API Client Layer
- CSP & Framework Detection
- Manual Edits Pipeline
- Impeccable Config
- League Table UI
- Finance Audit & Sim
- Design System Tokens
- Hook Config & Detection
- Configure Bar UI
- Live Browser Server
- Svelte Component Injection
- Injury System
- Dynamics & Morale UI
- Impeccable Commands
- Manual Apply Pipeline
- CSS Cascade Engine
- Hook Admin Panel
- Hook Before Edit Guard
- Page Chat & Voice
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121

## God Nodes (most connected - your core abstractions)
1. `el()` - 55 edges
2. `useGameStore` - 43 edges
3. `createCoreSlice()` - 41 edges
4. `GameState` - 38 edges
5. `runHook()` - 32 edges
6. `setLiveState()` - 29 edges
7. `Team` - 29 edges
8. `detectHtml()` - 28 edges
9. `initGlobalBar()` - 28 edges
10. `collectBrowserFindings()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `StatBar()` --indirect_call--> `v()`  [INFERRED]
  frontend/src/components/match/MatchCenter.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `finalizePendingUserMatch()` --indirect_call--> `v()`  [INFERRED]
  backend/src/store/slices/core.ts → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `MiniAreaChart()` --indirect_call--> `v()`  [INFERRED]
  frontend/src/components/charts/MiniAreaChart.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `TacticalPitch()` --indirect_call--> `W()`  [INFERRED]
  frontend/src/components/ui/TacticalPitch.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- `TacticalPitch()` --indirect_call--> `x()`  [INFERRED]
  frontend/src/components/ui/TacticalPitch.tsx → .claude/skills/impeccable/scripts/modern-screenshot.umd.js

## Import Cycles
- 2-file cycle: `backend/src/types/game.ts -> backend/src/types/saves.ts -> backend/src/types/game.ts`

## Hyperedges (group relationships)
- **Craft Gated Flow (shape to codex to build)** — _claude_skills_impeccable_reference_craft_craft, _claude_skills_impeccable_skill_shape, _claude_skills_impeccable_reference_codex_visual_direction [EXTRACTED 0.90]
- **Refine-to-Polish Handoff Pipeline** — _claude_skills_impeccable_reference_bolder_bolder, _claude_skills_impeccable_reference_distill_distill, _claude_skills_impeccable_reference_harden_harden, _claude_skills_impeccable_reference_layout_layout, _claude_skills_impeccable_skill_polish [INFERRED 0.85]
- **Project Context Setup (init writes PRODUCT.md, DESIGN.md via document)** — _claude_skills_impeccable_reference_init_init, _claude_skills_impeccable_reference_init_product_md, _claude_skills_impeccable_reference_document_design_md, _claude_skills_impeccable_reference_document_document [INFERRED 0.85]
- **Weekly Advance Processing Flow** — ai_context_advance_week, ai_context_match_engine, ai_context_morale_dynamics, ai_context_ai_manager, ai_context_injury_system, ai_context_financial_system, ai_context_training_system [EXTRACTED 1.00]
- **Financial Rebalancing Effort** — checklist_financial_rebalancing, ai_context_financial_system, backend_finance_report_before_audit, backend_finance_report_after_audit, backend_verify_transfer_report_verification, checklist_season_final_prize [EXTRACTED 1.00]
- **Online Multiplayer System** — planoonline_multiplayer_rooms, planoonline_room_manager, planoonline_ready_check, planoonline_scoped_state, planoonline_create_game_store, ai_context_advance_week [EXTRACTED 1.00]
- **Fluxo de Processamento Semanal (advanceWeek)** — docs_regras_regra_geral_advanceweek, docs_regras_regra_treino, docs_regras_regra_financas, docs_regras_regra_lesoes, docs_regras_regra_dinamica_moral_semanal, docs_regras_regra_ia_adversaria, docs_regras_regra_classificacao_calculo, docs_regras_regra_imprensa_media_pressure, docs_regras_regra_scouting_missoes [EXTRACTED 1.00]
- **Fluxo de Dia de Partida** — docs_regras_regra_taticas, docs_regras_regra_partidas_intelligence_center, docs_regras_regra_partidas_motor_simulacao, docs_regras_regra_partidas_avaliacao_jogadores, docs_regras_regra_classificacao_calculo, docs_regras_regra_financas_premiacao, docs_regras_regra_imprensa_coletivas [INFERRED 0.85]
- **Loop Treino → Fadiga → Lesão → Moral** — docs_regras_regra_treino_tipos, docs_regras_regra_treino_fadiga_carga, docs_regras_regra_lesoes_calculo_risco, docs_regras_regra_dinamica_moral_semanal [INFERRED 0.85]

## Communities (127 total, 3 thin omitted)

### Community 0 - "Browser Live Preview"
Cohesion: 0.03
Nodes (131): acceptedDomAlreadyClean(), addManualContextText(), applyPlaceholderSizingStyles(), applySvelteComponentVariantStyle(), averageRgb01(), bindEditBadgeProxy(), bufferToBase64(), buildColorModels() (+123 more)

### Community 1 - "Design System Checks"
Cohesion: 0.05
Nodes (98): borderColorsFromStyle(), borderWidthsFromStyle(), checkClippedOverflow(), checkColors(), checkCreamPalette(), checkElementAIPaletteDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM() (+90 more)

### Community 2 - "Visual Contrast Analysis"
Cohesion: 0.06
Nodes (68): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), analyzeVisualContrast(), analyzeVisualContrastCandidate(), blendRgba(), browserColorsClose(), browserDesignSystemConfig() (+60 more)

### Community 3 - "Match Center UI"
Cohesion: 0.04
Nodes (49): ACTION_ICON, ActionIcon(), CommentaryFeed(), commentaryLine(), FORM_CLASS, MatchCenter(), ordinal(), RATING_COLORS (+41 more)

### Community 4 - "Transfer & Finance Types"
Cohesion: 0.08
Nodes (58): AIWeeklyResult, ScoutMissionResult, Get, Set, BoardReply, FinancialReport, GameActions, GameState (+50 more)

### Community 5 - "Svelte Component Editing"
Cohesion: 0.09
Nodes (68): abortSvelteComponentInjection(), applyEditing(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+60 more)

### Community 6 - "Match Simulation Engine"
Cohesion: 0.09
Nodes (63): ATTACK_WEIGHT, attackQuality(), autoSelectCornerTaker(), autoSelectCornerTarget(), autoSelectFreeKickTaker(), autoSelectPenaltyTaker(), avgDefined(), bestAerialDefender() (+55 more)

### Community 7 - "Design System Detection"
Cohesion: 0.07
Nodes (53): mergeDesignSystemFindings(), detectUrl(), runVisualContrastFallback(), serializeDesignSystemForBrowser(), CSS_IN_JS_EXTENSIONS, detectText(), extFromFilePath(), extractCSSinJS() (+45 more)

### Community 8 - "Scout & Transfer UI"
Cohesion: 0.04
Nodes (58): ScoutReportCard(), ScoutReportCardProps, SquadStatusOptions, TransferMarket(), ActiveScoutMission, AssistantAdvice, BiddingWar, ContractClause (+50 more)

### Community 9 - "Svelte Anchor Snapshots"
Cohesion: 0.07
Nodes (62): applyOriginalAttrsToSvelteAnchor(), applySavedSessionMeta(), buildInsertPlaceholderSnapshotFromDom(), checkpointPayload(), clampVariantIndex(), clearHandled(), commitAcceptedSvelteComponentToDom(), elementMatchesOriginalMarkup() (+54 more)

### Community 10 - "Screenshot Utility"
Cohesion: 0.08
Nodes (57): _(), ae(), be(), bt(), Ce(), Ct(), de(), dt() (+49 more)

### Community 11 - "API Client Layer"
Cohesion: 0.09
Nodes (44): apiAction(), apiGet(), apiPost(), apiRoomState(), beginRoom(), clearActiveRoom(), createRoom(), getActiveRoom() (+36 more)

### Community 12 - "CSP & Framework Detection"
Cohesion: 0.07
Nodes (50): detectCsp(), INLINE_HEADER_SIGNALS, LAYOUT_EXTS, MONOREPO_HELPER_SIGNALS, NUXT_ROUTE_RULES_SIGNALS, NUXT_SECURITY_SIGNALS, SCAN_EXTS, SKIP_DIRS (+42 more)

### Community 13 - "Manual Edits Pipeline"
Cohesion: 0.10
Nodes (50): allEntryIds(), argVal(), buildRepairBatch(), candidatesForEntry(), changedFilesSinceSnapshot(), clearAppliedEntries(), collectApplyOwnedFiles(), collectRollbackFiles() (+42 more)

### Community 14 - "Impeccable Config"
Cohesion: 0.10
Nodes (47): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), colorIgnoreKey(), DEFAULT_DETECTION_CONFIG, DETECTOR_CONFIG_KEYS (+39 more)

### Community 15 - "League Table UI"
Cohesion: 0.06
Nodes (38): LeagueTableWrapper(), FORM_LABELS, formClass(), LeagueTable(), LeagueTableProps, sortInd(), StandingsSortKey, ZONE_LABELS (+30 more)

### Community 16 - "Finance Audit & Sim"
Cohesion: 0.12
Nodes (40): applyFinancesToAllTeams(), __dirname, __filename, main(), TeamSummary, WeeklySnapshot, applyFatigueDecayToAllTeams(), applyFinancesToAllTeams() (+32 more)

### Community 17 - "Design System Tokens"
Cohesion: 0.10
Nodes (46): addColorObject(), addDesignColor(), addRoundedScale(), addRoundedToken(), addSidecarColors(), addSidecarRadii(), addTypographyFonts(), canonicalDesignFindingKey() (+38 more)

### Community 18 - "Hook Config & Detection"
Cohesion: 0.07
Nodes (45): ACK_EXTS, applyConfigSource(), applyDetectorConfigSource(), applyPatchText(), clampByte(), cloneDefaultConfig(), CO_SCAN_STYLE_NAMES, colorIgnoreKey() (+37 more)

### Community 19 - "Configure Bar UI"
Cohesion: 0.09
Nodes (47): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+39 more)

### Community 20 - "Live Browser Server"
Cohesion: 0.09
Nodes (43): assembleLiveBrowserScript(), assertLiveBrowserScriptParts(), LIVE_BROWSER_SCRIPT_PARTS, readLiveBrowserScriptParts(), resolveLiveBrowserScriptParts(), acknowledgePendingEvent(), activeSessionSummaries(), agentPollingConnected() (+35 more)

### Community 21 - "Svelte Component Injection"
Cohesion: 0.10
Nodes (44): applyLegacyDeferredAcceptsOnStartup(), appendCssToSvelteStyle(), appendSanitizedCssRule(), applyDeferredSvelteComponentAccepts(), bakeParamValuesInCss(), buildInsertVariantStub(), buildPropContract(), buildPropsScript() (+36 more)

### Community 22 - "Injury System"
Cohesion: 0.11
Nodes (37): applyFatigueDecayToPlayer(), calculateFatigueLevel(), calculatePlayerInjuryRisk(), generateInjuryForPlayer(), getRiskLevel(), healInjuryForPlayer(), INJURY_TYPE_LABELS, INJURY_TYPES (+29 more)

### Community 23 - "Dynamics & Morale UI"
Cohesion: 0.10
Nodes (35): DynamicsSortKey, DynamicsView(), getCoachTreatmentLabel(), getFormRatingColor(), getInfluenceColor(), getSatisfaction(), HIERARCHY_LEVELS, DiscPos (+27 more)

### Community 24 - "Impeccable Commands"
Cohesion: 0.09
Nodes (42): Adapt Command, Animate Command, Prefers-Reduced-Motion, Audit Command, Bolder Command, Brand Register, Clarify Command, Codex Visual Direction & Assets (+34 more)

### Community 25 - "Manual Apply Pipeline"
Cohesion: 0.10
Nodes (36): addOpToManualApplyChunk(), APPLY_EVENT_HARD_TIMEOUT_MS, APPLY_EVENT_SOFT_DEADLINE_MS, buildManualApplyAgentAction(), clearManualApplyTransaction(), collectManualApplyFiles(), compactManualApplyBatch(), compactManualApplyCandidates() (+28 more)

### Community 26 - "CSS Cascade Engine"
Cohesion: 0.10
Nodes (30): applyStaticDeclaration(), buildBorderOverrideMap(), buildStaticStyleMap(), collectStaticCssRules(), compareStaticPriority(), cssPropToCamel(), expandStaticBoxValues(), expandStaticDeclaration() (+22 more)

### Community 27 - "Hook Admin Panel"
Cohesion: 0.14
Nodes (39): ACTIONS, addIgnoreFile(), addIgnoreRule(), addIgnoreValue(), DETECTOR_CONFIG_KEYS, detectorSection(), fileHasImpeccableHookMarker(), HOOK_MANIFEST_TARGETS (+31 more)

### Community 28 - "Hook Before Edit Guard"
Cohesion: 0.11
Nodes (39): allow(), bumpCursorDenial(), cursorBlockMessage(), deny(), done(), escapeRegExp(), findingSignature(), firstMatch() (+31 more)

### Community 29 - "Page Chat & Voice"
Cohesion: 0.10
Nodes (40): applyGlobalBarLabelState(), armPageChatForTyping(), buildSteerProcessingDots(), clearSteerAwaitTimer(), collapsePageChat(), configureVoiceContext(), expandPageChat(), finishVoiceSession() (+32 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (34): checkBorders(), checkClippedOverflow(), checkElementBorders(), checkElementBordersDOM(), checkElementClippedOverflow(), checkElementClippedOverflowDOM(), checkElementItalicSerif(), checkElementItalicSerifDOM() (+26 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (35): calculateMarketValue(), calculatePlayerSalary(), calculateTeamBudget(), createYouthSlice(), Get, Set, GKAttributes, HiddenAttributes (+27 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (31): calculatePressConferenceEffects(), fillTemplate(), generateHeadline(), generatePressConference(), JOURNALISTS, makeId(), pickN(), pickRandom() (+23 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (35): argVal(), buildInsertWrapperLines(), computeInsertLine(), INSERT_POSITIONS, insertCli(), isInsertPosition(), resolveElementMatch(), buildSvelteComponentCssAuthoring() (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (35): buildMissingTargetDirective(), buildResolvedContextDirective(), buildTargetSelectionDirective(), buildUpdateDirective(), cli(), compareSemver(), computeUpdateDirective(), contextSourcePath() (+27 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (36): buildCollapsible(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), copyToClipboard(), cssSafe(), designPanelCss(), escapeHtml() (+28 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (33): buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors(), extractComponents() (+25 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (33): dependencies, cors, express, react, zod, zustand, devDependencies, eslint (+25 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (32): acceptCli(), argVal(), buildCarbonizeReplacement(), decodeHtmlAttr(), deindentContent(), detectCommentSyntax(), escapeRegExp(), expandReplaceRange() (+24 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (31): applyMockWrites(), buildCopyEditBatchPrompt(), checkFrameworkSourceSyntax(), chooseCopyEditAgent(), COMMAND_AUTH_CACHE, commandAuthed(), commandExists(), compactBatchForPrompt() (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.08
Nodes (26): BLOCK_LABELS, BLOCKS, BlockType, createEmptySession(), DayPattern, DAYS, FOCUS_PATTERNS, generateWeeklySchedule() (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (27): confirm(), detectCli(), formatFindings(), formatFindingSummary(), handleStdin(), printUsage(), loadDesignSystemForCwd(), parseFrontmatter() (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (31): analyzeVisualContrast(), analyzeVisualContrastCandidate(), checkColors(), checkElementAIPaletteDOM(), checkElementColors(), checkElementColorsDOM(), checkElementGlow(), checkElementGlowDOM() (+23 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (21): BOARD_REPLY_CATEGORIES, ACTION_MAP, ActionButton, FinancialReportModalProps, InboxView(), INJURY_TYPE_LABELS, InjuryReportModalProps, MESSAGE_ICONS (+13 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (26): advanceRoomWeek(), beginGame(), cleanup, createRoom(), executeHumanTransfer(), genCode(), HumanOffer, isHumanTeam() (+18 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (20): createGameStore(), createAttributesSlice(), Get, Set, createInboxSlice(), Get, Set, createPromisesSlice() (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (26): analyzeSourceHint(), buildCandidatesForOp(), buildContextHintsByRef(), buildManualEditEvidence(), collectSearchFiles(), countOps(), decodeBasicHtml(), escapeRegExp() (+18 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (24): completionAckForAcceptResult(), completionTypeForAcceptResult(), augmentEventWithAcceptHandling(), buildAcceptScriptArgs(), buildPollReplyPayload(), EVENT_TYPES_NEEDING_AGENT_REPLY, fetchNextEvent(), fetchServerStatus() (+16 more)

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, react, react-dom, react-router-dom, recharts, zustand, devDependencies (+17 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (18): MiniAreaChart(), MiniAreaChartProps, Dashboard(), EXPECTATION_LABELS, FORM_COLORS, FORM_LABELS, FORM_SCORE, ZONE_COLORS (+10 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (20): conditionColor(), CORNER_DELIVERIES, DEFAULT_SET_PIECES, DUTY_ABBR, FORMATION_KEYS, FORMATIONS, FREE_KICK_DELIVERIES, Line (+12 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (20): analyzeSquadNeeds(), getWeakestPosition(), isTransferWindow(), processAIContracts(), processAILoans(), processAIReleaseClauses(), processAITactics(), processAITransfers() (+12 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (24): barPaletteForTheme(), brandMarkSvg(), buildParamsPanel(), detectPageTheme(), ensureAgentPollTooltip(), fetchAgentPollingStatus(), formatRangeValue(), hideAgentPollTooltip() (+16 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (10): canCreateInsert(), clampPlaceholderSize(), computeInsertPosition(), groupSiblingRows(), hitSiblingInsertGap(), horizontalOverlap(), insertCreateDisabledReason(), insertLineCoords() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (19): args, cwd, pageUrlFilter, remaining, compactManualLogText(), summarizeManualApplyFailures(), summarizeManualDiagnostics(), summarizeManualLogFile() (+11 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (22): directChildDirs(), discoverRootsForPattern(), discoverTargetCandidates(), escapeRegExp(), expandSimplePattern(), findTargetExample(), hasFallbackWorkspaceChildren(), isCandidateProjectRoot() (+14 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (21): bumpEditCount(), clampGroupedToBudget(), clampToBudget(), dedupeAgainstCache(), depthIsSet(), directiveFooter(), ensureFile(), ensureSession() (+13 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 59 - "Community 59"
Cohesion: 0.16
Nodes (18): allPlayersReady(), focusTeam(), getPlayer(), getRoom(), joinRoom(), pickTeam(), Room, RoomOpResult (+10 more)

### Community 60 - "Community 60"
Cohesion: 0.14
Nodes (20): borderColorsFromStyle(), borderWidthsFromStyle(), checkCreamPalette(), checkElementGptBorderShadow(), checkElementGptBorderShadowDOM(), checkGptThinBorderWideShadow(), checkQuality(), colorsNearlyMatch() (+12 more)

### Community 61 - "Community 61"
Cohesion: 0.12
Nodes (20): browserColorsClose(), browserDesignSystemConfig(), browserFindingsFromMap(), browserHasDirectText(), browserPrimaryFont(), browserRadiusTokens(), browserSampleText(), checkBrowserDesignSystemSources() (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.21
Nodes (17): isLiveServerPidReachable(), readLiveServerInfo(), completeCli(), completeThroughServer(), parseArgs(), readServerInfo(), collectManualApplyFiles(), manualApplyReplyCommand() (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (15): loadContext(), resolveTargetSelection(), safeRead(), parseTargetOptions(), parseTargetPath(), TargetArgError, __dirname, ensureServerRunning() (+7 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (18): resolveProjectRoot(), firstExisting(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveAnnotationsDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+10 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (15): getExpectationLabel(), getPlaystyleTag(), getStrengthLabel(), TeamDossier(), TeamSelection(), TeamCrest(), TeamCrestProps, getCrestColors() (+7 more)

### Community 66 - "Community 66"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (17): checkPageTypography(), checkStaticPageTypography(), checkBorders(), checkElementBorders(), checkElementBordersDOM(), checkPageTypography(), checkTypography(), resolveSerif() (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (18): Índice de Regras do Jogo, Regra de Classificação e Liga, Forma Recente (últimos 5), Zonas da Tabela (Libertadores/Sul-Americana/Rebaixamento), Expectativas da Diretoria (assignBoardExpectations), Premiação por Partida e Colocação Final, Regra Geral do Jogo, Database de Times (Brasileirão + fallback procedural) (+10 more)

### Community 69 - "Community 69"
Cohesion: 0.16
Nodes (18): Regra de Finanças, Contratos (salário, duração, cláusula), Despesas Semanais (salários, infra, staff), Orçamento e Limite Salarial, Parcelas de Transferência e Bônus de Performance, Salário de Jogadores (calculatePlayerSalary), Valor de Mercado (calculateMarketValue), Regra da IA Adversária (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (16): applyParamDefaults(), applyParamValue(), buildCyclingRow(), closedClipPath(), cycleVariant(), getVisibleVariantEl(), hideParamsPanel(), navBtn() (+8 more)

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (12): deleteSaveFromDisk(), ensureSavesDir(), listSaveSlotsFromDisk(), loadSaveFromDisk(), persistSave(), SAVES_DIR, slotFilePath(), createSavesSlice() (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (15): blendRgba(), clampByte(), firstCssUrl(), getLayerValue(), loadVisualContrastImage(), parseObjectPosition(), parsePositionPair(), parsePositionToken() (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (15): checkElementOversizedH1(), checkElementOversizedH1DOM(), checkElementQuality(), checkElementQualityDOM(), checkOversizedH1(), checkRepeatedSectionKickers(), checkRepeatedSectionKickersDOM(), checkRepeatedSectionKickersFromDoc() (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (10): authMiddleware(), notFoundHandler(), RateLimitEntry, rateLimiter(), store, requestLogger(), gameRouter, roomsRouter (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (12): extractRegister(), cli(), COMMON_DEV_PORTS, devServerSignals(), gatherSignals(), gitSignals(), hasCode(), latestCritique() (+4 more)

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (14): attachSteerFocusDebug(), attachSteerFocusGuard(), clearSteerFocusRecoverTimer(), focusConfigureInput(), focusSteerChat(), notePagePointerDown(), pageHasHostTextSelection(), scheduleSteerFocusRecover() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.26
Nodes (12): FORBIDDEN_MANUAL_EDIT_TEXT_CHARS, INSERT_POSITIONS, isValidId(), isValidVariantId(), validateAnnotationFields(), validateEvent(), validateInsertGenerate(), validateManualEditEvent() (+4 more)

### Community 80 - "Community 80"
Cohesion: 0.32
Nodes (11): kebab(), listSnapshotsForSlug(), main(), nowFilenameStamp(), parseFrontmatter(), readLatestSnapshot(), readTrend(), serializeFrontmatter() (+3 more)

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (13): addBrowserFindings(), addVisualContrastFindings(), addVisualContrastResult(), clearOverlays(), detachOverlay(), disconnectLazyVisualContrastObserver(), postExtensionError(), rememberVisualContrastAnalysis() (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (13): Regra de Base de Juvenis, Fornada de Juvenis (Youth Intake), Problema de Pacing da Base Juvenil, Promoção de Jogadores (promoteYouthPlayer), Cálculo da Classificação (calculateLeagueStandings), advanceWeek (Avançar Semana), Ofertas Recebidas (Venda de Jogadores, 35% semana), Regra de Treino (+5 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (12): devDependencies, concurrently, name, private, scripts, build, dev, dev:backend (+4 more)

### Community 84 - "Community 84"
Cohesion: 0.42
Nodes (11): applyMoraleRegression(), applyPlayingTimeMorale(), applyPromisePenalties(), applySocialCascade(), applySocialGroupCascade(), applyTeamFormMorale(), applyWeeklyMoraleDynamics(), clamp() (+3 more)

### Community 85 - "Community 85"
Cohesion: 0.23
Nodes (10): createLiveBrowserDomHelpers(), activeElementDeep(), appendStyleToLiveUiRoot(), appendToLiveUiRoot(), escapeCssIdent(), getLiveUiElementById(), LIVE_CHROME_MOUNT_CONTRACT, LIVE_UI_COMPONENT_IDS (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.27
Nodes (9): applyEvent(), baseSnapshot(), COMPLETED_PHASES, getJournalPath(), getSnapshotPath(), rebuildSnapshotFromJournal(), safeSessionId(), toPendingEvent() (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.21
Nodes (12): Regra de Partidas, Bolas Paradas (Set Pieces) na Simulação, Bônus Tático e Multiplicadores de Tática, Centro de Inteligência Pré-Jogo (Monte Carlo), Motor de Simulação Minuto a Minuto, Visualização 2D de Partidas, Modelo xG + Poisson, Regra de Táticas (+4 more)

### Community 88 - "Community 88"
Cohesion: 0.24
Nodes (5): ErrorBoundary, isLikelyStateError(), Props, State, STATE_CORRUPTION_PATTERNS

### Community 89 - "Community 89"
Cohesion: 0.36
Nodes (9): OPTIONS, ThemeToggle(), ThemeToggleProps, useTheme(), applyTheme(), getStoredThemePreference(), ResolvedTheme, resolveTheme() (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.20
Nodes (11): Empty State Design, Onboarding Design, Core Web Vitals, Performance Optimization, Design System Discovery, Polish Pass, Product Design Register, Quieter Register (+3 more)

### Community 91 - "Community 91"
Cohesion: 0.35
Nodes (9): gameStore, GameStoreApi, getBestScout(), maskAttributeValue(), maskPlayerAttributes(), extractState(), getActionNames(), runAction() (+1 more)

### Community 92 - "Community 92"
Cohesion: 0.24
Nodes (7): args, buildWeights(), hashUnit(), pickSeed(), seed, SEEDS, weightedPick()

### Community 93 - "Community 93"
Cohesion: 0.25
Nodes (9): __dirname, findHarnessDirs(), generatePinnedSkill(), HARNESS_DIRS, loadCommandMetadata(), pin(), root, unpin() (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.22
Nodes (11): App Header (Football Manager Web), Assumir Comando Button, Club Card Component, Club Stats Grid (Formacao/Elenco/Orcamento/Meta), Continue Career Panel (Continuar carreira), Gerar Nova Liga Button, Reputation Progress Bar, Save Slot Card (Criar Save) (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (10): Keep Docs Updated Rule, Client-Server Architecture, Real Club Database Loader, Football Manager Web (project), Backend Game Store (14 slices), Procedural Player/Team Generator, REST API (/api/action, /api/state), Save System (disk slots) (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.36
Nodes (5): errorHandler(), AppError, ErrorCode, toErrorResponse(), ValidationError

### Community 97 - "Community 97"
Cohesion: 0.36
Nodes (10): cleanIgnoreValueDisplay(), extractFindingIgnoreValue(), extractFindingIgnoreValueRaw(), extractMotionIgnoreValue(), filterFindings(), formatFindingIgnoreCommand(), isIgnoredFindingValue(), normalizeIgnoreRule() (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.24
Nodes (10): Regra de Diretoria, Demissão do Usuário (Não Implementada), Satisfação da Diretoria (boardSatisfaction -100 a 100), Receitas Semanais (bilheteira, patrocínio, transmissão), Condição de Fim de Jogo (Game Over), Demissão de Técnico (times AI), Regra de Coletiva de Imprensa, Coletivas, Perguntas e Respostas (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (10): App Header with FM Logo and Title, Assumir Comando Button, Club Selection Card, Club Stats Grid (Formacao/Elenco/Orcamento/Meta), Continuar Carreira Save Slots Panel, Dark Theme Design Decision, Reputation Progress Bar, Club Selection Screen (Dark Mode) (+2 more)

### Community 100 - "Community 100"
Cohesion: 0.22
Nodes (9): ADVICE_TYPE_ICON, HeatMapGrid(), INSIGHT_CATEGORY_CLASS, INTENSITY_COLORS, INTENSITY_LABELS, intensityLevel(), PostMatchReportView(), HeatMapZone (+1 more)

### Community 101 - "Community 101"
Cohesion: 0.25
Nodes (9): advanceWeek (weekly progression), Injury System, Morale Dynamics (moraleDynamics.ts), Press Conference System, Social Tree & Squad Dynamics, Training System, Navigation Flows, DynamicsView Component (+1 more)

### Community 102 - "Community 102"
Cohesion: 0.25
Nodes (9): Scouting System, Transfer System, Transfer Purchase Verification, Club Draft, createGameStore factory, Online Multiplayer by Rooms, Ready-Check Round Coordination, Room Manager (roomManager.ts) (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (7): actionSchemas, zEmpty, zMatchIndex, zNumber, zNumberNonNeg, zSlot, zString

### Community 104 - "Community 104"
Cohesion: 0.25
Nodes (9): buildSelectorSegment(), generateSelector(), isElementHidden(), isLikelyHashedClass(), postSerializedFindings(), renderBrowserFindings(), scanResultMeta(), serializeFindings() (+1 more)

### Community 105 - "Community 105"
Cohesion: 0.22
Nodes (9): The Border-Not-Shadow Rule, The Density Floor Rule, The One Accent Rule, PageHeader (shared header), statusColors.ts (color source of truth), Club Crest (TeamCrest.tsx), The Training Ground (design system), Brand Personality (authentic/gritty/serious) (+1 more)

### Community 106 - "Community 106"
Cohesion: 0.28
Nodes (9): App Header (Football Manager Web), Choose Your Club Panel, Continue Career Sidebar, Create Save Button, Empty State (No Clubs Generated), Generate Clubs Button, Save Slots (Save 1 / Save 2), Club Selection Screen (+1 more)

### Community 107 - "Community 107"
Cohesion: 0.25
Nodes (9): Career Start / Onboarding Flow, Club Selection Panel (Escolha seu clube), Empty Clubs State (Nenhum clube gerado), Generate Clubs Button (Gerar clubes), App Header / Title Bar, League/Club Generation Feature, Save Slot Card (Vazio / Criar Save), Saves Panel (Save Slots) (+1 more)

### Community 108 - "Community 108"
Cohesion: 0.32
Nodes (8): parseYamlFlowList(), readJson(), readLernaWorkspaces(), readPackageWorkspaces(), readPnpmWorkspaces(), readWorkspacePatterns(), stripYamlInlineComment(), unquoteYamlValue()

### Community 109 - "Community 109"
Cohesion: 0.32
Nodes (8): checkElementTextOverflowDOM(), classSelector(), clippedByInset(), clippedByRect(), expandBoxShorthand(), firstMetricLengthPx(), isScreenReaderOnlyTextStyle(), metricLengthPx()

### Community 110 - "Community 110"
Cohesion: 0.36
Nodes (8): coLocatedStylesheets(), expandScanTargets(), hasPathTraversal(), isInsideProject(), normalizeScanTargets(), parseStaticStyleImports(), STYLE_EXTS, UI_CODE_EXTS

### Community 111 - "Community 111"
Cohesion: 0.33
Nodes (7): AI Manager (aiManager.ts), League Standings, Match Engine (matchEngine.ts), Tactics & Set Pieces, Balance Report (tactic/team win-rates), Balanced Tactic Dominance Anomaly, Season Final Placement Prize

### Community 112 - "Community 112"
Cohesion: 0.47
Nodes (6): Regra de Dinâmica do Plantel, Grupos Sociais e Força de Conexão, Hierarquia do Plantel, Moral Semanal (6 Motores - applyWeeklyMoraleDynamics), Promessas a Jogadores, Intervenções Ao Vivo (Gritos e Substituições)

### Community 113 - "Community 113"
Cohesion: 0.47
Nodes (6): Regra de Lesões, Cálculo de Risco de Lesão (calculatePlayerInjuryRisk), Condição Degradada Pós-Lesão, Cura Semanal (healInjuryForPlayer), Geração de Lesões (generateInjuryForPlayer), Bloqueio de Partida por Lesão no XI

### Community 114 - "Community 114"
Cohesion: 0.40
Nodes (6): Regra de Scouting, Conhecimento de Jogadores (0-100), Missões de Scouting, Olheiros (Sênior e Júnior), Relatórios de Scout (Nota A-F), Shortlist

### Community 115 - "Community 115"
Cohesion: 0.60
Nodes (5): Financial System (finance.ts), Financial Audit (after rebalance), Financial Audit (before rebalance), Financial System Rebalancing Checklist, Single Source of Units (M/week, K/week salary)

### Community 116 - "Community 116"
Cohesion: 0.40
Nodes (5): checkElementHeroEyebrow(), checkElementHeroEyebrowDOM(), checkHeroEyebrow(), isAccentColor(), resolveVarRefs()

### Community 117 - "Community 117"
Cohesion: 0.70
Nodes (4): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored()

### Community 118 - "Community 118"
Cohesion: 0.50
Nodes (3): candidates, detectorPath, __dirname

### Community 119 - "Community 119"
Cohesion: 0.83
Nodes (3): writeAuditLog(), main(), readStdin()

## Knowledge Gaps
- **453 isolated node(s):** `COMMON_DEV_PORTS`, `SOURCE_DIRS`, `PRODUCT_NAMES`, `DESIGN_NAMES`, `FALLBACK_DIRS` (+448 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `v()` connect `Screenshot Utility` to `Community 35`, `Community 36`, `Match Center UI`, `Community 76`, `Community 49`, `Community 116`, `Community 52`, `Injury System`, `CSS Cascade Engine`?**
  _High betweenness centrality (0.339) - this node is a cross-community bridge._
- **Why does `finalizePendingUserMatch()` connect `Injury System` to `Screenshot Utility`, `Match Simulation Engine`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Why does `x()` connect `Screenshot Utility` to `Browser Live Preview`, `Design System Checks`, `Visual Contrast Analysis`, `Community 42`, `Community 60`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `el()` (e.g. with `browserFindingsFromMap()` and `collectVisualContrastCandidates()`) actually correct?**
  _`el()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **What connects `COMMON_DEV_PORTS`, `SOURCE_DIRS`, `PRODUCT_NAMES` to the rest of the system?**
  _463 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Browser Live Preview` be split into smaller, more focused modules?**
  _Cohesion score 0.029514083716754572 - nodes in this community are weakly interconnected._
- **Should `Design System Checks` be split into smaller, more focused modules?**
  _Cohesion score 0.04792079207920792 - nodes in this community are weakly interconnected._