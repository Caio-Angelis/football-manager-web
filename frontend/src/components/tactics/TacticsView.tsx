import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player, PlayerInstruction, Team } from '../../types/game';

// ============================================================
// HELPERS
// ============================================================

function DEFAULT_PLAYER_INSTRUCTIONS(playerId: string): PlayerInstruction {
  return {
    playerId,
    passMore: false,
    passLess: false,
    shootMore: false,
    shootLess: false,
    dribbMore: false,
    dribbLess: false,
    goGoal: false,
    stayBack: false,
    crossMore: false,
    crossLess: false,
    cutInside: false,
    RunThrough: false,
    playSlower: false,
    playFaster: false,
    throwInMore: false,
    takeMoreRisks: false,
    tackleMore: false,
    tackleLess: false,
    beMoreAggressive: false,
    beFairer: false,
  };
}

// ============================================================
// CONCEITOS DE TÁTICAS AVANÇADAS
// ============================================================

const TEAM_MENTALITY_OPTIONS = [
  { value: 'very defensive', label: '🛡️ Muito Defensivo', description: 'Jogadores jogam para trás' },
  { value: 'defensive', label: '🛡️ Defensivo', description: 'Jogadores jogam um pouco para trás' },
  { value: 'cautious', label: '⚖️ Cauteloso', description: 'Jogadores jogam para trás' },
  { value: 'balanced', label: '⚖️ Equilibrado', description: 'Sem alteração' },
  { value: 'positive', label: '🔥 Positivo', description: 'Jogadores atacam' },
  { value: 'offensive', label: '🔥 Ofensivo', description: 'Jogadores atacam' },
  { value: 'very offensive', label: '🔥 Muito Ofensivo', description: 'Jogadores atacam' },
];

const POSSESSION_OPTIONS = {
  ATTACK_WIDTH: {
    key: 'attackWidth',
    label: 'Largura',
    description: 'Defina a largura do jogo',
    values: [
      { value: 'narrow', label: '🔬 Estreito', description: 'Jogadores jogam mais perto uns dos outros' },
      { value: 'balanced', label: '⚖️ Equilibrado', description: 'Sem alteração' },
      { value: 'wide', label: '📐 Largo', description: 'Jogadores jogam mais perto das laterais' },
    ],
  },
  PASSING_STYLE: {
    key: 'passingStyle',
    label: 'Estilo de Passe',
    description: 'Defina o estilo de passe',
    values: [
      { value: 'short', label: '🔹 Curto', description: 'Jogadores passam mais' },
      { value: 'mixed', label: '🔀 Misto', description: 'Sem alteração' },
      { value: 'direct', label: '🎯 Direto', description: 'Jogadores passam mais para frente' },
    ],
  },
  TEMPO: {
    key: 'tempo',
    label: 'Ritmo',
    description: 'Defina o ritmo do jogo',
    values: [
      { value: 'slow', label: '🐢 Lento', description: 'Jogadores mantêm a posse' },
      { value: 'balanced', label: '⚖️ Equilibrado', description: 'Sem alteração' },
      { value: 'fast', label: '🚀 Rápido', description: 'Jogadores passam mais rápido' },
    ],
  },
  USE_FLANK: {
    key: 'useFlank',
    label: 'Foco',
    description: 'Defina onde focar o jogo',
    values: [
      { value: 'neither', label: '🚫 Nenhum', description: 'Sem alteração' },
      { value: 'left', label: '⬅️ Esquerda', description: 'Jogadores jogam mais pela esquerda' },
      { value: 'right', label: '➡️ Direita', description: 'Jogadores jogam mais pela direita' },
    ],
  },
};

const TRANSITION_OPTIONS = {
  AFTER_LOSING: {
    key: 'afterLosingPossession',
    label: 'Após Perder a Posse',
    description: 'Comportamento imediato ao perder a bola',
    values: [
      { value: 'counterPress', label: '⚡ Contra-Pressionar', description: 'Gegenpress — pressionar imediatamente após perder' },
      { value: 'regroup', label: '🔙 Recuar / Reagrupar', description: 'Recuar e reorganizar o bloco defensivo' },
    ],
  },
  AFTER_GAINING: {
    key: 'afterGainingPossession',
    label: 'Após Ganhar a Posse',
    description: 'Comportamento ao recuperar a bola',
    values: [
      { value: 'counterAttack', label: '🚀 Contra-Atacar', description: 'Transição rápida para o ataque' },
      { value: 'retainStructure', label: '🔒 Manter a Posse', description: 'Manter posse e estrutura ofensiva' },
    ],
  },
};

const NO_POSSESSION_OPTIONS = {
  ENGAGEMENT_LINE: {
    key: 'engagementLine',
    label: 'Linha de Engajamento',
    description: 'Onde o time inicia a pressão',
    values: [
      { value: 'high', label: '⬆️ Alta', description: 'Pressionar no terço defensivo adversário' },
      { value: 'medium', label: '⚖️ Média', description: 'Pressão no meio-campo' },
      { value: 'low', label: '⬇️ Baixa', description: 'Pressionar apenas próximo à área' },
    ],
  },
  DEFENSIVE_LINE: {
    key: 'defensiveLine',
    label: 'Linha Defensiva',
    description: 'Altura do bloco defensivo',
    values: [
      { value: 'high', label: '⬆️ Bloco Alto', description: 'Defesa avançada na quadra' },
      { value: 'medium', label: '⚖️ Bloco Médio', description: 'Linha equilibrada' },
      { value: 'low', label: '⬇️ Bloco Baixo', description: 'Defesa recuada e compacta' },
    ],
  },
  PRESS_INTENSITY: {
    key: 'pressIntensity',
    label: 'Intensidade de Pressão',
    description: 'Frequência de abordagens físicas',
    values: [
      { value: 'low', label: '🐢 Baixa', description: 'Pressão contida, preserva energia' },
      { value: 'medium', label: '⚖️ Média', description: 'Pressão equilibrada' },
      { value: 'high', label: '🔥 Alta', description: 'Pressão intensa e constante' },
    ],
  },
  TACKLING: {
    key: 'tacklingStyle',
    label: 'Desarmes',
    description: 'Abordagem ao desarmar o adversário',
    values: [
      { value: 'aggressive', label: '⚔️ Desarmes Agressivos', description: 'Entrar forte nos desarmes' },
      { value: 'contain', label: '🛡️ Conter o Adversário', description: 'Fechar espaço sem arriscar falta' },
    ],
  },
};

type MultiValueInstruction = {
  key: string;
  label: string;
  description: string;
  values: { value: string; label: string; description: string }[];
};

const INSTRUCTION_PHASES: Record<string, {
  label: string;
  icon: string;
  instructions: { key: string; label: string; description: string }[];
  multiValueInstructions?: MultiValueInstruction[];
}> = {
  POSSESSION: {
    label: 'Em Posse',
    icon: '⚽',
    instructions: [
      { key: 'workBallIntoBox', label: 'Levar Bola à Área', description: 'Jogadores tentam levar a bola à área' },
      { key: 'crossFromWide', label: 'Centro das Laterais', description: 'Jogadores cruzam das laterais' },
      { key: 'takeMoreRisks', label: 'Mais Riscos', description: 'Jogadores assumem mais riscos' },
    ],
    multiValueInstructions: [
      POSSESSION_OPTIONS.ATTACK_WIDTH,
      POSSESSION_OPTIONS.PASSING_STYLE,
      POSSESSION_OPTIONS.TEMPO,
      POSSESSION_OPTIONS.USE_FLANK,
    ],
  },
  TRANSITION: {
    label: 'Em Transição',
    icon: '🔄',
    instructions: [],
    multiValueInstructions: [
      TRANSITION_OPTIONS.AFTER_LOSING,
      TRANSITION_OPTIONS.AFTER_GAINING,
    ],
  },
  NO_POSSESSION: {
    label: 'Sem Posse',
    icon: '🛡️',
    instructions: [
      { key: 'trapOffside', label: 'Armadilha de Impedimento', description: 'Tentar pegar adversários em impedimento' },
    ],
    multiValueInstructions: [
      NO_POSSESSION_OPTIONS.ENGAGEMENT_LINE,
      NO_POSSESSION_OPTIONS.DEFENSIVE_LINE,
      NO_POSSESSION_OPTIONS.PRESS_INTENSITY,
      NO_POSSESSION_OPTIONS.TACKLING,
    ],
  },
};

const ROLES = {
  GK: [
    { value: 'goalkeeper', label: 'Goleiro', description: 'Joga como goleiro tradicional' },
    { value: 'sweeperKeeper', label: 'Sweeper Keeper', description: 'Goleiro de linha alta' },
    { value: 'keeperL1', label: 'Keeper (L1)', description: 'Goleiro com 1 nível' },
    { value: 'keeperL2', label: 'Keeper (L2)', description: 'Goleiro com 2 níveis' },
  ],
  DEF: [
    { value: 'fullBack', label: 'Lateral', description: 'Ataca nas laterais' },
    { value: 'wingBack', label: 'Lateral de Ataque', description: 'Lateral ofensivo' },
    { value: 'centreBack', label: 'Zagueiro', description: 'Defensor central' },
    { value: 'wingBackL1', label: 'Wing Back (L1)', description: 'Lateral de ataque com 1 nível' },
    { value: 'wingBackL2', label: 'Wing Back (L2)', description: 'Lateral de ataque com 2 níveis' },
    { value: 'defensiveL1', label: 'Defensive (L1)', description: 'Defensivo com 1 nível' },
    { value: 'defensiveL2', label: 'Defensive (L2)', description: 'Defensivo com 2 níveis' },
  ],
  MID: [
    { value: 'centralMidfielder', label: 'Volante', description: 'Joga no meio' },
    { value: 'centralMidfielderL1', label: 'CM (L1)', description: 'Volante com 1 nível' },
    { value: 'centralMidfielderL2', label: 'CM (L2)', description: 'Volante com 2 níveis' },
    { value: 'boxToBoxMidfielder', label: 'Meia Atacante', description: 'Ataca e defende' },
    { value: 'deepLyingPlaymaker', label: 'Meia Criativo', description: 'Organiza o jogo' },
    { value: 'advancedPlaymaker', label: 'Meia Ofensivo', description: 'Meia ofensivo' },
    { value: 'invertedWingback', label: 'Lateral Recuado', description: 'Recua para o meio' },
    { value: 'supportL1', label: 'Support (L1)', description: 'Suporte com 1 nível' },
    { value: 'supportL2', label: 'Support (L2)', description: 'Suporte com 2 níveis' },
    { value: 'defensiveMidfielder', label: 'Volante Defensivo', description: 'Defende mais' },
    { value: 'defensiveMidfielderL1', label: 'DM (L1)', description: 'DM com 1 nível' },
    { value: 'defensiveMidfielderL2', label: 'DM (L2)', description: 'DM com 2 níveis' },
  ],
  FWD: [
    { value: 'forward', label: 'Atacante', description: 'Ataca na área' },
    { value: 'striker', label: 'Centrales de Ataque', description: 'Atacante central' },
    { value: 'winger', label: 'Ponta', description: 'Ataca pelas laterais' },
    { value: 'wingerL1', label: 'Winger (L1)', description: 'Ponta com 1 nível' },
    { value: 'wingerL2', label: 'Winger (L2)', description: 'Ponta com 2 níveis' },
    { value: 'attackingMidfielder', label: 'Meia Ofensivo', description: 'Meia ofensivo' },
    { value: 'attackingMidfielderL1', label: 'AM (L1)', description: 'AM com 1 nível' },
    { value: 'attackingMidfielderL2', label: 'AM (L2)', description: 'AM com 2 níveis' },
    { value: 'strikL1', label: 'Striker (L1)', description: 'Atacante com 1 nível' },
    { value: 'strikL2', label: 'Striker (L2)', description: 'Atacante com 2 níveis' },
  ],
};

const DUTIES = [
  { value: 'attack', label: '🔺 Atacar', description: 'Foco em ataques' },
  { value: 'defend', label: '🛡️ Defender', description: 'Foco em defesa' },
  { value: 'balance', label: '⚖️ Equilibrar', description: 'Equilíbrio entre ataque e defesa' },
];

// ============================================================
// COMPONENTE: DraggableFormationVisual - Visualização 2D com Drag-and-Drop
// ============================================================

const DraggableFormationVisual: React.FC<{
  formation: string;
  players: Array<{ id: string; name: string; position: string }>;
  playerPositions: Record<string, number>; // playerId -> slotIndex
  onUpdatePlayerPosition: (playerId: string, slotIndex: number) => void;
}> = ({ formation, players, playerPositions, onUpdatePlayerPosition }) => {
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const currentSlotRef = useRef<number>(0);

  // ponytail: Coords rotacionadas 90° horário — goleiro à esquerda, atacantes à direita.
  // Transformação: newX = 1 - oldY, newY = oldX
  const formationPositions: Record<string, number[][]> = {
    '4-4-2': [
      [0.05, 0.5],
      [0.25, 0.1], [0.25, 0.35], [0.25, 0.65], [0.25, 0.9],
      [0.45, 0.1], [0.45, 0.35], [0.45, 0.65], [0.45, 0.9],
      [0.75, 0.35], [0.75, 0.65],
    ],
    '4-3-3': [
      [0.05, 0.5],
      [0.25, 0.1], [0.25, 0.35], [0.25, 0.65], [0.25, 0.9],
      [0.45, 0.15], [0.45, 0.5], [0.45, 0.85],
      [0.75, 0.15], [0.75, 0.5], [0.75, 0.85],
    ],
    '3-5-2': [
      [0.05, 0.5],
      [0.25, 0.15], [0.25, 0.5], [0.25, 0.85],
      [0.45, 0.1], [0.45, 0.35], [0.45, 0.5], [0.45, 0.65], [0.45, 0.9],
      [0.75, 0.35], [0.75, 0.65],
    ],
    '5-2-2': [
      [0.05, 0.5],
      [0.25, 0.1], [0.25, 0.3], [0.25, 0.5], [0.25, 0.7], [0.25, 0.9],
      [0.45, 0.15], [0.45, 0.85],
      [0.75, 0.35], [0.75, 0.65],
    ],
  };

  const positions = formationPositions[formation] || formationPositions['4-4-2'];

  // Iniciar drag ao clicar em um jogador
  const handleMouseDown = useCallback((e: React.MouseEvent, playerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingPlayerId(playerId);
  }, []);

  // Finalizar drag
  const handleMouseUp = useCallback(() => {
    setDraggingPlayerId(null);
  }, []);

  const handleSlotHover = useCallback((e: React.MouseEvent) => {
    if (!draggingPlayerId || !fieldRef.current) return;
    
    const fieldRect = fieldRef.current.getBoundingClientRect();
    const x = (e.clientX - fieldRect.left) / fieldRect.width;
    const y = (e.clientY - fieldRect.top) / fieldRect.height;

    let nearestSlot = 0;
    let minDistance = Infinity;
    
    positions.forEach(([px, py], index) => {
      const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestSlot = index;
      }
    });

    if (nearestSlot !== currentSlotRef.current) {
      currentSlotRef.current = nearestSlot;
      onUpdatePlayerPosition(draggingPlayerId, nearestSlot);
    }
  }, [draggingPlayerId, positions, onUpdatePlayerPosition]);

  // Obter jogador neste slot
  const getPlayerAtSlot = (slotIndex: number) => {
    return players.find(p => playerPositions[p.id] === slotIndex);
  };

  return (
    <div className="fm-tactics-view__field" ref={fieldRef}>
      <div className="fm-tactics-view__field-inner">
        {positions.map(([x, y], i) => {
          const player = getPlayerAtSlot(i);
          const isDragging = draggingPlayerId === player?.id;
          const isTargetSlot = isDragging;
          
          return (
            <div
              key={i}
              className={`fm-tactics-view__player-dot ${isDragging ? 'fm-tactics-view__player-dot--dragging' : ''} ${isTargetSlot ? 'fm-tactics-view__player-dot--target' : ''}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: isDragging ? 'scale(1.3)' : undefined,
                zIndex: isDragging ? 100 : 1,
              }}
              onMouseDown={(e) => player && handleMouseDown(e, player.id)}
              onMouseMove={handleSlotHover}
              onMouseUp={handleMouseUp}
            >
              <span className="fm-tactics-view__player-number">{i + 1}</span>
              <span className="fm-tactics-view__player-avatar">
                {player?.name.split(' ')[0] || ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: InstructionToggle - Toggle para instruções
// ============================================================

const InstructionToggle: React.FC<{
  instructionKey: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: (key: string) => void;
}> = ({ instructionKey, label, description, selected, onSelect }) => (
  <div className={`fm-instruction-toggle ${selected ? 'fm-instruction-toggle--active' : ''}`}>
    <button
      className="fm-instruction-toggle__button"
      onClick={() => onSelect(instructionKey)}
    >
      <span className="fm-instruction-toggle__check">{selected ? '✓' : ''}</span>
      <div className="fm-instruction-toggle__info">
        <span className="fm-instruction-toggle__label">{label}</span>
        <span className="fm-instruction-toggle__description">{description}</span>
      </div>
    </button>
  </div>
);

// ============================================================
// COMPONENTE: MultiValueInstructionSelector - Seletor de Valor Múltiplo
// ============================================================

const MultiValueInstructionSelector: React.FC<{
  instruction: MultiValueInstruction;
  currentValue: string;
  onSelect: (key: string, value: string) => void;
}> = ({ instruction, currentValue, onSelect }) => (
  <div className="fm-multi-value-instruction">
    <div className="fm-multi-value-instruction__header">
      <span className="fm-multi-value-instruction__label">{instruction.label}</span>
      <span className="fm-multi-value-instruction__description">{instruction.description}</span>
    </div>
    
    <div className="fm-multi-value-instruction__selector">
      <select
        id={`mv-instruction-${instruction.key}`}
        name={`mv-instruction-${instruction.key}`}
        value={currentValue}
        onChange={(e) => onSelect(instruction.key, e.target.value)}
        className="fm-multi-value-instruction__dropdown"
      >
        {instruction.values.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
    
    <div className="fm-multi-value-instruction__current">
      <span className="fm-multi-value-instruction__current-value">
        {instruction.values.find(v => v.value === currentValue)?.label || '—'}
      </span>
      <span className="fm-multi-value-instruction__current-description">
        {instruction.values.find(v => v.value === currentValue)?.description || ''}
      </span>
    </div>
  </div>
);

// ============================================================
// COMPONENTE: PlayerRoleSelector - Seletor de Roles/Duties
// ============================================================

const PlayerRoleSelector: React.FC<{
  player: { id: string; name: string; position: string };
  currentRole: string | null;
  currentDuty: string | null;
  onRoleChange: (playerId: string, role: string) => void;
  onDutyChange: (playerId: string, duty: string) => void;
}> = ({ player, currentRole, currentDuty, onRoleChange, onDutyChange }) => {
  const rolesForPosition = ROLES[player.position as keyof typeof ROLES] || ROLES.MID;
  
  return (
    <div className="fm-player-role-selector">
      <div className="fm-player-role-selector__header">
        <span className="fm-player-role-selector__name">{player.name}</span>
        <span className="fm-player-role-selector__position">{player.position}</span>
      </div>
      
      <div className="fm-player-role-selector__selection">
        <select
          id={`player-role-${player.id}`}
          name={`player-role-${player.id}`}
          value={currentRole || ''}
          onChange={(e) => onRoleChange(player.id, e.target.value)}
          className="fm-player-role-selector__dropdown"
        >
          <option value="">Selecione um Role...</option>
          {rolesForPosition.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="fm-player-role-selector__duty">
        <select
          id={`player-duty-${player.id}`}
          name={`player-duty-${player.id}`}
          value={currentDuty || 'balance'}
          onChange={(e) => onDutyChange(player.id, e.target.value)}
          className="fm-player-role-selector__dropdown"
        >
          {DUTIES.map((duty) => (
            <option key={duty.value} value={duty.value}>
              {duty.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE: IndividualInstructions - Instruções Individuais
// ============================================================

const IndividualInstructions: React.FC<{
  player: { id: string; name: string; position: string };
  instructions: PlayerInstruction;
  onInstructionChange: (playerId: string, instructionKey: string, value: boolean) => void;
}> = ({ player, instructions, onInstructionChange }) => {
  const instructionGroups = {
    'Ataque': [
      { key: 'shootMore', label: 'Chuta Mais' },
      { key: 'shootLess', label: 'Chuta Menos' },
      { key: 'goGoal', label: 'Ir ao Gol' },
    ],
    'Passes': [
      { key: 'passMore', label: 'Passa Mais' },
      { key: 'passLess', label: 'Passa Menos' },
      { key: 'playFaster', label: 'Joga Mais Rápido' },
      { key: 'playSlower', label: 'Joga Mais Devagar' },
    ],
    'Defesa': [
      { key: 'tackleMore', label: 'Desarma Mais' },
      { key: 'tackleLess', label: 'Desarma Menos' },
      { key: 'stayBack', label: 'Manter Posição' },
      { key: 'beMoreAggressive', label: 'Seja Mais Aggressivo' },
    ],
    'Movimento': [
      { key: 'crossMore', label: 'Cruza Mais' },
      { key: 'crossLess', label: 'Cruza Menos' },
      { key: 'dribbMore', label: 'Finta Mais' },
      { key: 'dribbLess', label: 'Finta Menos' },
    ],
  };

  return (
    <div className="fm-tactics-view__player-instructions">
      <div className="fm-tactics-view__player-instructions-header">
        <span className="fm-tactics-view__player-name">{player.name}</span>
        <span className="fm-tactics-view__player-position">{player.position}</span>
      </div>
      
      {Object.entries(instructionGroups).map(([groupName, groupInstructions]) => (
        <div key={groupName} className="fm-tactics-view__instruction-group">
          <h4 className="fm-tactics-view__instruction-group-title">{groupName}</h4>
          <div className="fm-tactics-view__instruction-row">
            {groupInstructions.map((inst) => (
              <label htmlFor={`player-instruction-${player.id}-${inst.key}`} className="fm-instruction-checkbox">
                <input
                  id={`player-instruction-${player.id}-${inst.key}`}
                  name={`player-instruction-${player.id}-${inst.key}`}
                  type="checkbox"
                  checked={instructions[inst.key as keyof PlayerInstruction] === true}
                  onChange={(e) => onInstructionChange(player.id, inst.key, e.target.checked)}
                />
                <span>{inst.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// HELPERS: valores de instruções coletivas (com fallback legado)
// ============================================================

function getCollectiveInstructionValue(team: Team, key: string, fallback: string): string {
  const value = (team as unknown as Record<string, unknown>)[key];
  if (typeof value === 'string' && value) return value;

  switch (key) {
    case 'afterLosingPossession':
      return team.counterPress ? 'counterPress' : 'regroup';
    case 'afterGainingPossession':
      return 'retainStructure';
    case 'engagementLine':
    case 'defensiveLine':
      return team.highLine ? 'high' : 'medium';
    case 'pressIntensity':
      return team.highPress ? 'high' : 'medium';
    case 'tacklingStyle':
      return team.aggressiveTackling ? 'aggressive' : 'contain';
    default:
      return fallback;
  }
}

// ============================================================
// COMPONENTE: StarterSelection - Escolha de titulares vs banco
// ============================================================

const StarterSelection: React.FC<{
  starters: Player[];
  bench: Player[];
  onAddStarter: (playerId: string) => void;
  onRemoveStarter: (playerId: string) => void;
}> = ({ starters, bench, onAddStarter, onRemoveStarter }) => {
  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'GK': return '#2196F3';
      case 'DEF': return '#4CAF50';
      case 'MID': return '#FF9800';
      case 'FWD': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="fm-starter-selection">
      <div className="fm-starter-selection__column">
        <h3 className="fm-starter-selection__title">Titulares ({starters.length}/11)</h3>
        <div className="fm-starter-selection__list">
          {starters.map((player, i) => (
            <div key={player.id} className="fm-starter-selection__player fm-starter-selection__player--starter">
              <span className="fm-starter-selection__slot">{i + 1}</span>
              <span className="fm-starter-selection__pos" style={{ backgroundColor: getPositionColor(player.position) }}>
                {player.position}
              </span>
              <span className="fm-starter-selection__name">{player.name}</span>
              <span className="fm-starter-selection__ca">{Math.round(player.currentAbility / 2)}</span>
              <button
                className="fm-starter-selection__btn fm-starter-selection__btn--remove"
                onClick={() => onRemoveStarter(player.id)}
                title="Enviar ao banco"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="fm-starter-selection__column">
        <h3 className="fm-starter-selection__title">Banco ({bench.length})</h3>
        <div className="fm-starter-selection__list">
          {bench.map((player) => (
            <div key={player.id} className="fm-starter-selection__player fm-starter-selection__player--bench">
              <span className="fm-starter-selection__pos" style={{ backgroundColor: getPositionColor(player.position) }}>
                {player.position}
              </span>
              <span className="fm-starter-selection__name">{player.name}</span>
              <span className="fm-starter-selection__ca">{Math.round(player.currentAbility / 2)}</span>
              <button
                className="fm-starter-selection__btn fm-starter-selection__btn--add"
                onClick={() => onAddStarter(player.id)}
                disabled={starters.length >= 11}
                title="Promover a titular"
              >
                ↑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL: TacticsView
// ============================================================

export const TacticsView: React.FC = () => {
  const { selectedTeam, teams, updateTeam } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);
  const [selectedPhase, setSelectedPhase] = useState<'POSSESSION' | 'TRANSITION' | 'NO_POSSESSION'>('POSSESSION');
  const [activeTab, setActiveTab] = useState<'formation' | 'team' | 'players'>('formation');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Inicializar startingXI e tacticsConfig se não existir
  useEffect(() => {
    if (!team) return;
    const needsStartingXI = !team.startingXI || team.startingXI.length === 0;
    const needsTacticsConfig = !team.tacticsConfig;
    if (needsStartingXI || needsTacticsConfig) {
      updateTeam(team.id, (t) => ({
        ...t,
        startingXI: t.startingXI?.length ? t.startingXI : t.squad.slice(0, 11).map(p => p.id),
        tacticsConfig: t.tacticsConfig ?? { playerRoles: [], playerInstructions: [] },
      }));
      return;
    }
    // Auto-assign slots 0-10 to starters if none have slot assignments
    const starterIds = team.startingXI;
    const startersWithSlots = team.tacticsConfig.playerRoles.filter(r => starterIds.includes(r.playerId));
    if (startersWithSlots.length === 0 && starterIds.length > 0) {
      updateTeam(team.id, (t) => ({
        ...t,
        tacticsConfig: {
          ...t.tacticsConfig!,
          playerRoles: starterIds.map((playerId, slotIndex) => ({ playerId, slotIndex, role: '', duty: 'balance' })),
        },
      }));
    }
  }, [team, updateTeam]);

  const updateFormation = (formation: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => ({ ...t, formation }));
  };

  // Adicionar jogador ao starting XI (encontra slot livre)
  const addStarter = (playerId: string) => {
    if (!team || !team.tacticsConfig) return;
    const currentXI = team.startingXI || [];
    if (currentXI.length >= 11 || currentXI.includes(playerId)) return;

    const occupiedSlots = new Set(
      team.tacticsConfig.playerRoles
        .filter(r => currentXI.includes(r.playerId))
        .map(r => r.slotIndex)
    );
    const freeSlot = Array.from({ length: 11 }, (_, i) => i).find(s => !occupiedSlots.has(s)) ?? currentXI.length;

    updateTeam(team.id, (t) => {
      const roles = [...t.tacticsConfig!.playerRoles];
      const existingIdx = roles.findIndex(r => r.playerId === playerId);
      if (existingIdx !== -1) {
        roles[existingIdx] = { ...roles[existingIdx], slotIndex: freeSlot };
      } else {
        roles.push({ playerId, slotIndex: freeSlot, role: '', duty: 'balance' });
      }
      return {
        ...t,
        startingXI: [...(t.startingXI || []), playerId],
        tacticsConfig: { ...t.tacticsConfig!, playerRoles: roles },
      };
    });
  };

  // Remover jogador do starting XI
  const removeStarter = (playerId: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => ({
      ...t,
      startingXI: (t.startingXI || []).filter(id => id !== playerId),
    }));
  };

  const updateTactic = (tactic: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => ({ ...t, tactic }));
  };

  const updateMentality = (mentality: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => ({ ...t, teamMentality: mentality }));
  };

  const updateInstruction = (tacticKey: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => {
      const updated = { ...t };
      (updated as any)[tacticKey] = !(t as any)[tacticKey];
      return updated;
    });
  };

  // Atualizar instruções coletivas de valor múltiplo (8.5)
  const updateCollectiveOption = (optionKey: string, value: string) => {
    if (!team) return;
    updateTeam(team.id, (t) => {
      const newTeam = { ...t, [optionKey]: value };

      // Sincronizar campos legados para saves antigos e motor de jogo
      if (optionKey === 'afterLosingPossession') {
        newTeam.counterPress = value === 'counterPress';
      } else if (optionKey === 'pressIntensity') {
        newTeam.highPress = value === 'high';
      } else if (optionKey === 'engagementLine' || optionKey === 'defensiveLine') {
        newTeam.highLine = newTeam.engagementLine === 'high' || newTeam.defensiveLine === 'high';
      } else if (optionKey === 'tacklingStyle') {
        newTeam.aggressiveTackling = value === 'aggressive';
      }

      return newTeam;
    });
  };

  // Atualizar posição do jogador no campo (drag-and-drop com swap de slots)
  const updatePlayerPosition = (playerId: string, slotIndex: number) => {
    if (!team || !team.tacticsConfig) return;
    
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return;
    
    updateTeam(team.id, (t) => {
      const roles = [...t.tacticsConfig!.playerRoles];
      const existingIndex = roles.findIndex(r => r.playerId === playerId);
      const occupierIndex = roles.findIndex(r => r.slotIndex === slotIndex && r.playerId !== playerId);
      
      let oldSlot = 0;
      if (existingIndex !== -1) {
        oldSlot = roles[existingIndex].slotIndex;
      }
      
      // Swap: se outro jogador ocupa o slot alvo, move-o para o slot antigo
      if (occupierIndex !== -1) {
        roles[occupierIndex] = { ...roles[occupierIndex], slotIndex: oldSlot };
      }
      
      if (existingIndex !== -1) {
        roles[existingIndex] = { ...roles[existingIndex], slotIndex };
      } else {
        roles.push({ playerId, slotIndex, role: '', duty: 'balance' });
      }
      
      return { ...t, tacticsConfig: { ...t.tacticsConfig!, playerRoles: roles } };
    });
  };

  // Atualizar Role do jogador
  const updatePlayerRole = (playerId: string, role: string) => {
    if (!team || !team.tacticsConfig) return;
    
    const existingRoleIndex = team.tacticsConfig.playerRoles.findIndex(r => r.playerId === playerId);
    
    updateTeam(team.id, (t) => {
      const roles = [...t.tacticsConfig!.playerRoles];
      if (existingRoleIndex !== -1) {
        roles[existingRoleIndex] = { ...roles[existingRoleIndex], role };
      } else {
        roles.push({ playerId, slotIndex: 0, role, duty: 'balance' });
      }
      return { ...t, tacticsConfig: { ...t.tacticsConfig!, playerRoles: roles } };
    });
  };

  // Atualizar Duty do jogador
  const updatePlayerDuty = (playerId: string, duty: string) => {
    if (!team || !team.tacticsConfig) return;
    
    const existingRoleIndex = team.tacticsConfig.playerRoles.findIndex(r => r.playerId === playerId);
    
    updateTeam(team.id, (t) => {
      const roles = [...t.tacticsConfig!.playerRoles];
      if (existingRoleIndex !== -1) {
        roles[existingRoleIndex] = { ...roles[existingRoleIndex], duty };
      } else {
        roles.push({ playerId, slotIndex: 0, role: '', duty });
      }
      return { ...t, tacticsConfig: { ...t.tacticsConfig!, playerRoles: roles } };
    });
  };

  // Atualizar instrução individual do jogador
  const updatePlayerInstruction = (playerId: string, instructionKey: string, value: boolean) => {
    if (!team || !team.tacticsConfig) return;
    
    updateTeam(team.id, (t) => {
      const instructions = [...t.tacticsConfig!.playerInstructions];
      const existingInstructionIndex = instructions.findIndex(i => i.playerId === playerId);
      
      if (existingInstructionIndex !== -1) {
        const existingInstruction = { ...instructions[existingInstructionIndex] };
        (existingInstruction as any)[instructionKey] = value;
        instructions[existingInstructionIndex] = existingInstruction;
      } else {
        const newInstruction = DEFAULT_PLAYER_INSTRUCTIONS(playerId);
        (newInstruction as any)[instructionKey] = value;
        instructions.push(newInstruction);
      }
      return { ...t, tacticsConfig: { ...t.tacticsConfig!, playerInstructions: instructions } };
    });
  };

  // Obter instruções atuais do jogador
  const getPlayerInstructions = (playerId: string): PlayerInstruction => {
    if (!team || !team.tacticsConfig) return DEFAULT_PLAYER_INSTRUCTIONS(playerId);
    return team.tacticsConfig.playerInstructions.find(i => i.playerId === playerId) || DEFAULT_PLAYER_INSTRUCTIONS(playerId);
  };

  // Obter role atual do jogador
  const getPlayerRole = (playerId: string): { role: string; duty: string } | null => {
    if (!team || !team.tacticsConfig) return null;
    const playerRole = team.tacticsConfig.playerRoles.find(r => r.playerId === playerId);
    return playerRole ? { role: playerRole.role, duty: playerRole.duty } : null;
  };

  // Mapear jogadores para seus slots atuais
  const getPlayerPositionMap = (): Record<string, number> => {
    if (!team || !team.tacticsConfig) return {};
    
    const positionMap: Record<string, number> = {};
    team.tacticsConfig.playerRoles.forEach(role => {
      positionMap[role.playerId] = role.slotIndex;
    });
    return positionMap;
  };

  if (!team) {
    return <div className="fm-empty">Selecione um time para configurar táticas</div>;
  }

  const playerPositionMap = getPlayerPositionMap();
  const startingXIPlayers: Player[] = (() => {
    const ids = team.startingXI;
    if (ids && ids.length > 0) {
      const players = ids.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
      if (players.length > 0) return players;
    }
    return team.squad.slice(0, 11);
  })();
  const starterIdSet = new Set(startingXIPlayers.map(p => p.id));
  const benchPlayers = team.squad.filter(p => !starterIdSet.has(p.id));
  const selectedPlayer = selectedPlayerId
    ? startingXIPlayers.find(p => p.id === selectedPlayerId)
    : startingXIPlayers[0];

  const TABS = [
    { id: 'formation' as const, label: 'Formação', icon: '⚽' },
    { id: 'team' as const, label: 'Equipa', icon: '📋' },
    { id: 'players' as const, label: 'Jogadores', icon: '👤' },
  ];

  return (
    <div className="fm-tactics-view">
      <header className="fm-tactics-view__header">
        <div className="fm-tactics-view__header-left">
          <h1>Configuração de Táticas</h1>
          <div className="fm-tactics-view__team-name">{team.name}</div>
        </div>
        <div className="fm-tactics-view__header-right">
          <span className="fm-tactics-view__formation-badge">{team.formation}</span>
          <span className={`fm-tactics-view__tactic-badge fm-tactics-view__tactic-badge--${team.tactic}`}>
            {team.tactic}
          </span>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="fm-tactics-view__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`fm-tactics-view__tab ${activeTab === tab.id ? 'fm-tactics-view__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="fm-tactics-view__tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="fm-tactics-view__content">
        {/* ===== TAB: Formação ===== */}
        {activeTab === 'formation' && (
          <>
            <div className="fm-tactics-view__section fm-tactics-view__section--formation">
              <DraggableFormationVisual
                formation={team.formation}
                players={startingXIPlayers.map(p => ({ id: p.id, name: p.name, position: p.position }))}
                playerPositions={playerPositionMap}
                onUpdatePlayerPosition={updatePlayerPosition}
              />
            </div>

            <div className="fm-tactics-view__section">
              <h2>Escalação</h2>
              <StarterSelection
                starters={startingXIPlayers}
                bench={benchPlayers}
                onAddStarter={addStarter}
                onRemoveStarter={removeStarter}
              />
            </div>

            <div className="fm-tactics-view__section">
              <h2>Formação</h2>
              <div className="fm-tactics-view__formations-list">
                {['4-4-2', '4-3-3', '3-5-2', '5-2-2'].map((formation) => (
                  <button
                    key={formation}
                    className={`fm-formation ${team.formation === formation ? 'fm-formation--active' : ''}`}
                    onClick={() => updateFormation(formation)}
                  >
                    <div className="fm-formation__name">{formation}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="fm-tactics-view__section">
              <h2>Estilo de Jogo</h2>
              <div className="fm-tactics-view__tactics-list">
                {['attacking', 'defensive', 'balanced'].map((tactic) => (
                  <button
                    key={tactic}
                    className={`fm-tactic ${team.tactic === tactic ? 'fm-tactic--active' : ''}`}
                    onClick={() => updateTactic(tactic)}
                  >
                    {tactic.charAt(0).toUpperCase() + tactic.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: Equipa ===== */}
        {activeTab === 'team' && (
          <>
            {/* Mentalidade */}
            <div className="fm-tactics-view__section">
              <h2>🧠 Mentalidade da Equipa</h2>
              <div className="fm-tactics-view__mentality">
                {TEAM_MENTALITY_OPTIONS.map((mentality) => (
                  <button
                    key={mentality.value}
                    className={`fm-mentality ${team.teamMentality === mentality.value ? 'fm-mentality--active' : ''}`}
                    onClick={() => updateMentality(mentality.value)}
                    title={mentality.description}
                  >
                    <span className="fm-mentality__label">{mentality.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Instruções Coletivas */}
            <div className="fm-tactics-view__section">
              <h2>📋 Instruções Coletivas</h2>

              <div className="fm-tactics-view__phase-tabs">
                {Object.entries(INSTRUCTION_PHASES).map(([phaseKey, phase]) => (
                  <button
                    key={phaseKey}
                    className={`fm-tactics-view__phase-tab ${selectedPhase === phaseKey ? 'fm-tactics-view__phase-tab--active' : ''}`}
                    onClick={() => setSelectedPhase(phaseKey as 'POSSESSION' | 'TRANSITION' | 'NO_POSSESSION')}
                  >
                    <span className="fm-tactics-view__phase-tab__icon">{phase.icon}</span>
                    <span className="fm-tactics-view__phase-tab__label">{phase.label}</span>
                  </button>
                ))}
              </div>

              <div className="fm-tactics-view__phase-instructions">
                {INSTRUCTION_PHASES[selectedPhase].instructions.map((instruction) => (
                  <InstructionToggle
                    key={instruction.key}
                    instructionKey={instruction.key}
                    label={instruction.label}
                    description={instruction.description}
                    selected={Boolean((team as unknown as Record<string, boolean>)[instruction.key])}
                    onSelect={() => updateInstruction(instruction.key)}
                  />
                ))}

                {INSTRUCTION_PHASES[selectedPhase].multiValueInstructions && (
                  <div className="fm-tactics-view__multi-value-instructions">
                    {INSTRUCTION_PHASES[selectedPhase].multiValueInstructions!.map((instruction) => (
                      <MultiValueInstructionSelector
                        key={instruction.key}
                        instruction={instruction}
                        currentValue={getCollectiveInstructionValue(
                          team,
                          instruction.key,
                          instruction.values[Math.floor(instruction.values.length / 2)].value,
                        )}
                        onSelect={(_key, value) => updateCollectiveOption(instruction.key, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: Jogadores ===== */}
        {activeTab === 'players' && (
          <>
            {/* Roles e Tarefas */}
            <div className="fm-tactics-view__section">
              <h2>Roles e Tarefas</h2>
              <div className="fm-tactics-view__roles-grid">
                {startingXIPlayers.map((player) => {
                  const playerRole = getPlayerRole(player.id);
                  return (
                    <div key={player.id} className="fm-player-role-selector-card">
                      <PlayerRoleSelector
                        player={player}
                        currentRole={playerRole?.role || null}
                        currentDuty={playerRole?.duty || null}
                        onRoleChange={(playerId, role) => updatePlayerRole(playerId, role)}
                        onDutyChange={(playerId, duty) => updatePlayerDuty(playerId, duty)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instruções Individuais */}
            <div className="fm-tactics-view__section">
              <h2>Instruções Individuais</h2>
              <div className="fm-tactics-view__player-picker">
                {startingXIPlayers.map((player) => (
                  <button
                    key={player.id}
                    className={`fm-tactics-view__player-chip ${selectedPlayer?.id === player.id ? 'fm-tactics-view__player-chip--active' : ''}`}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    {player.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              {selectedPlayer && (
                <IndividualInstructions
                  player={selectedPlayer}
                  instructions={getPlayerInstructions(selectedPlayer.id)}
                  onInstructionChange={updatePlayerInstruction}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
