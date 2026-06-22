import React, { useState, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { PlayerRole, PlayerInstruction } from '../../types/game';

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

const INSTRUCTION_PHASES = {
  POSSESSION: {
    label: 'Em Posse',
    icon: '⚽',
    instructions: [
      { key: 'workBallIntoBox', label: 'Levar Bola à Área', description: 'Jogadores tentam levar a bola à área' },
      { key: 'crossFromWide', label: 'Centro das Laterais', description: 'Jogadores cruzam das laterais' },
      { key: 'takeMoreRisks', label: 'Mais Riscos', description: 'Jogadores assumem mais riscos' },
    ],
  },
  TRANSITION: {
    label: 'Em Transição',
    icon: '🔄',
    instructions: [
      { key: 'counterPress', label: 'Contra-Pressão', description: 'Pressionar imediatamente após perder bola' },
      { key: 'highPress', label: 'Alta Pressão', description: 'Pressionar alto na quadra' },
    ],
  },
  NO_POSSESSION: {
    label: 'Sem Posse',
    icon: '🛡️',
    instructions: [
      { key: 'highLine', label: 'Linha Alta', description: 'Defesa alta na quadra' },
      { key: 'aggressiveTackling', label: 'Desarmes Aggressivos', description: 'Desarmes mais agressivos' },
      { key: 'trapOffside', label: 'Armadula de Impasso', description: 'Tentar pegar adversários em impasso' },
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

  const formationPositions: Record<string, number[][]> = {
    '4-4-2': [
      [0.5, 0.95],
      [0.1, 0.75], [0.35, 0.75], [0.65, 0.75], [0.9, 0.75],
      [0.1, 0.55], [0.35, 0.55], [0.65, 0.55], [0.9, 0.55],
      [0.35, 0.25], [0.65, 0.25],
    ],
    '4-3-3': [
      [0.5, 0.95],
      [0.1, 0.75], [0.35, 0.75], [0.65, 0.75], [0.9, 0.75],
      [0.15, 0.55], [0.5, 0.55], [0.85, 0.55],
      [0.15, 0.25], [0.5, 0.25], [0.85, 0.25],
    ],
    '3-5-2': [
      [0.5, 0.95],
      [0.15, 0.75], [0.5, 0.75], [0.85, 0.75],
      [0.1, 0.55], [0.35, 0.55], [0.5, 0.55], [0.65, 0.55], [0.9, 0.55],
      [0.35, 0.25], [0.65, 0.25],
    ],
    '5-2-2': [
      [0.5, 0.95],
      [0.1, 0.75], [0.3, 0.75], [0.5, 0.75], [0.7, 0.75], [0.9, 0.75],
      [0.15, 0.55], [0.85, 0.55],
      [0.35, 0.25], [0.65, 0.25],
    ],
  };

  const positions = formationPositions[formation] || formationPositions['4-4-2'];

  // Calcular qual slot está mais próximo de um ponto no campo
  const getNearestSlot = (clientX: number, clientY: number): number => {
    if (!fieldRef.current) return 0;
    
    const fieldRect = fieldRef.current.getBoundingClientRect();
    const x = (clientX - fieldRect.left) / fieldRect.width;
    const y = (clientY - fieldRect.top) / fieldRect.height;

    let nearestSlot = 0;
    let minDistance = Infinity;
    
    positions.forEach(([px, py], index) => {
      const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestSlot = index;
      }
    });

    return nearestSlot;
  };

  // Iniciar drag ao clicar em um jogador
  const handleMouseDown = useCallback((e: React.MouseEvent, playerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingPlayerId(playerId);
  }, []);

  // Atualizar posição durante movimento do mouse
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingPlayerId || !fieldRef.current) return;
    
    const slot = getNearestSlot(e.clientX, e.clientY);
    currentSlotRef.current = slot;
    
    // Atualizar apenas se mudou o slot
    if (slot !== currentSlotRef.current) {
      currentSlotRef.current = slot;
      onUpdatePlayerPosition(draggingPlayerId, slot);
    }
  }, [draggingPlayerId, onUpdatePlayerPosition]);

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
              onMouseMove={(e) => {
                handleMouseMove(e);
                handleSlotHover(e);
              }}
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
              <label key={inst.key} className="fm-instruction-checkbox">
                <input
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
// COMPONENTE PRINCIPAL: TacticsView
// ============================================================

export const TacticsView: React.FC = () => {
  const { selectedTeam, teams } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);
  const [selectedPhase, setSelectedPhase] = useState<'POSSESSION' | 'TRANSITION' | 'NO_POSSESSION'>('POSSESSION');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Inicializar tacticsConfig se não existir
  if (team && !team.tacticsConfig) {
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = {
      ...updatedTeams[idx],
      tacticsConfig: {
        playerRoles: [],
        playerInstructions: [],
      },
    };
    useGameStore.getState().teams = updatedTeams;
  }

  const updateFormation = (formation: string) => {
    if (!team) return;
    const newTeam = { ...team, formation };
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = newTeam;
    useGameStore.getState().teams = updatedTeams;
  };

  const updateTactic = (tactic: string) => {
    if (!team) return;
    const newTeam = { ...team, tactic };
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = newTeam;
    useGameStore.getState().teams = updatedTeams;
  };

  const updateMentality = (mentality: string) => {
    if (!team) return;
    const newTeam = { ...team, teamMentality: mentality };
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = newTeam;
    useGameStore.getState().teams = updatedTeams;
  };

  const updateInstruction = (tacticKey: string) => {
    if (!team) return;
    const newTeam = { ...team };
    (newTeam as any)[tacticKey] = !(team as any)[tacticKey];
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    updatedTeams[idx] = newTeam;
    useGameStore.getState().teams = updatedTeams;
  };

  // Atualizar posição do jogador no campo (drag-and-drop)
  const updatePlayerPosition = (playerId: string, slotIndex: number) => {
    if (!team || !team.tacticsConfig) return;
    
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    const teamData = { ...updatedTeams[idx] };
    
    // Verificar se já existe um PlayerRole para este jogador
    const existingRoleIndex = teamData.tacticsConfig.playerRoles.findIndex(r => {
      const player = teamData.squad.find(p => p.id === playerId);
      return player && teamData.tacticsConfig.playerRoles.find(pr => pr.slotIndex === slotIndex && pr.role === player.id);
    });
    
    // Buscar jogador
    const player = team.squad.find(p => p.id === playerId);
    const playerRoleIndex = teamData.tacticsConfig.playerRoles.findIndex(r => {
      const p = teamData.squad.find(sp => sp.id === playerId);
      return p && teamData.tacticsConfig.playerRoles.find(pr => pr.role === r.role && pr.slotIndex === r.slotIndex);
    });
    
    const newRole: PlayerRole = {
      position: player?.position || 'MID',
      slotIndex,
      role: teamData.tacticsConfig.playerRoles[playerRoleIndex]?.role || '',
      duty: teamData.tacticsConfig.playerRoles[playerRoleIndex]?.duty || 'balance',
    };
    
    if (existingRoleIndex !== -1) {
      teamData.tacticsConfig.playerRoles[existingRoleIndex] = newRole;
    } else {
      teamData.tacticsConfig.playerRoles.push(newRole);
    }
    
    updatedTeams[idx] = teamData;
    useGameStore.getState().teams = updatedTeams;
  };

  // Atualizar Role do jogador
  const updatePlayerRole = (playerId: string, role: string) => {
    if (!team || !team.tacticsConfig) return;
    
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    const teamData = { ...updatedTeams[idx] };
    
    // Encontrar o PlayerRole existente para este jogador
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return;
    
    const existingRoleIndex = teamData.tacticsConfig.playerRoles.findIndex(r => r.position === player.position);
    
    if (existingRoleIndex !== -1) {
      // Atualizar role existente
      teamData.tacticsConfig.playerRoles[existingRoleIndex] = {
        ...teamData.tacticsConfig.playerRoles[existingRoleIndex],
        role,
      };
    } else {
      // Criar novo role
      const newRole: PlayerRole = {
        position: player.position,
        slotIndex: 0,
        role,
        duty: 'balance',
      };
      teamData.tacticsConfig.playerRoles.push(newRole);
    }
    
    updatedTeams[idx] = teamData;
    useGameStore.getState().teams = updatedTeams;
  };

  // Atualizar Duty do jogador
  const updatePlayerDuty = (playerId: string, duty: string) => {
    if (!team || !team.tacticsConfig) return;
    
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    const teamData = { ...updatedTeams[idx] };
    
    // Encontrar o PlayerRole existente para este jogador
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return;
    
    const existingRoleIndex = teamData.tacticsConfig.playerRoles.findIndex(r => r.position === player.position);
    
    if (existingRoleIndex !== -1) {
      teamData.tacticsConfig.playerRoles[existingRoleIndex] = {
        ...teamData.tacticsConfig.playerRoles[existingRoleIndex],
        duty,
      };
    }
    
    updatedTeams[idx] = teamData;
    useGameStore.getState().teams = updatedTeams;
  };

  // Atualizar instrução individual do jogador
  const updatePlayerInstruction = (playerId: string, instructionKey: string, value: boolean) => {
    if (!team || !team.tacticsConfig) return;
    
    const updatedTeams = [...teams];
    const idx = updatedTeams.findIndex(t => t.id === team.id);
    const teamData = { ...updatedTeams[idx] };
    
    const existingInstructionIndex = teamData.tacticsConfig.playerInstructions.findIndex(i => i.playerId === playerId);
    
    if (existingInstructionIndex !== -1) {
      // Atualizar instrução existente - preservar todas as propriedades
      const existingInstruction = { ...teamData.tacticsConfig.playerInstructions[existingInstructionIndex] };
      (existingInstruction as any)[instructionKey] = value;
      teamData.tacticsConfig.playerInstructions[existingInstructionIndex] = existingInstruction;
    } else {
      // Criar nova instrução - inicializar TODAS as propriedades
      const newInstruction: PlayerInstruction = {
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
      (newInstruction as any)[instructionKey] = value;
      teamData.tacticsConfig.playerInstructions.push(newInstruction);
    }
    
    updatedTeams[idx] = teamData;
    useGameStore.getState().teams = updatedTeams;
  };

  // Obter instruções atuais do jogador
  const getPlayerInstructions = (playerId: string): PlayerInstruction => {
    if (!team || !team.tacticsConfig) return {} as PlayerInstruction;
    return team.tacticsConfig.playerInstructions.find(i => i.playerId === playerId) || {} as PlayerInstruction;
  };

  // Obter role atual do jogador
  const getPlayerRole = (playerId: string): { role: string; duty: string } | null => {
    if (!team || !team.tacticsConfig) return null;
    const player = team.squad.find(p => p.id === playerId);
    if (!player) return null;
    const playerRole = team.tacticsConfig.playerRoles.find(r => r.position === player.position);
    return playerRole ? { role: playerRole.role, duty: playerRole.duty } : null;
  };

  // Obter jogador selecionado
  const selectedPlayerData = selectedPlayer ? team?.squad.find(p => p.id === selectedPlayer) : null;

  // Mapear jogadores para seus slots atuais
  const getPlayerPositionMap = (): Record<string, number> => {
    if (!team || !team.tacticsConfig) return {};
    
    const positionMap: Record<string, number> = {};
    team.tacticsConfig.playerRoles.forEach(role => {
      const player = team?.squad.find(p => p.position === role.position);
      if (player) {
        positionMap[player.id] = role.slotIndex;
      }
    });
    return positionMap;
  };

  if (!team) {
    return <div className="fm-empty">Selecione um time para configurar táticas</div>;
  }

  const playerPositionMap = getPlayerPositionMap();

  return (
    <div className="fm-tactics-view">
      <header className="fm-tactics-view__header">
        <h1>Configuração de Táticas</h1>
        <div className="fm-tactics-view__team-name">{team.name}</div>
      </header>

      <div className="fm-tactics-view__content">
        {/* Mentalidade da Equipa */}
        <div className="fm-tactics-view__section">
          <h2>🧠 Mentalidade da Equipa</h2>
          <div className="fm-tactics-view__mentality">
            {TEAM_MENTALITY_OPTIONS.map((mentality) => (
              <div
                key={mentality.value}
                className={`fm-mentality ${team.teamMentality === mentality.value ? 'fm-mentality--active' : ''}`}
                onClick={() => updateMentality(mentality.value)}
              >
                <div className="fm-mentality__label">{mentality.label}</div>
                <div className="fm-mentality__description">{mentality.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Fases de Instruções Coletivas */}
        <div className="fm-tactics-view__section">
          <h2>📋 Instruções Coletivas</h2>
          
          {/* Tabs das 3 fases */}
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

          {/* Instruções da fase selecionada */}
          <div className="fm-tactics-view__phase-instructions">
            {INSTRUCTION_PHASES[selectedPhase].instructions.map((instruction) => (
              <InstructionToggle
                key={instruction.key}
                label={instruction.label}
                description={instruction.description}
                selected={(team as any)[instruction.key] as boolean}
                onSelect={() => updateInstruction(instruction.key)}
              />
            ))}
          </div>
        </div>

        {/* Configuração de Formação e Tática */}
        <div className="fm-tactics-view__section">
          <h2>📊 Formação e Tática</h2>
          
          {/* Visualização do Campo com Drag-and-Drop */}
          <DraggableFormationVisual 
            formation={team.formation} 
            players={team.squad.slice(0, 11).map(p => ({ id: p.id, name: p.name, position: p.position }))} 
            playerPositions={playerPositionMap}
            onUpdatePlayerPosition={updatePlayerPosition}
          />

          <div className="fm-tactics-view__formations">
            <h3>Formação</h3>
            <div className="fm-tactics-view__formations-list">
              {['4-4-2', '4-3-3', '3-5-2', '5-2-2'].map((formation) => (
                <div
                  key={formation}
                  className={`fm-formation ${team.formation === formation ? 'fm-formation--active' : ''}`}
                  onClick={() => updateFormation(formation)}
                >
                  <div className="fm-formation__name">{formation}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fm-tactics-view__tactics">
            <h3>Tática</h3>
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

          {/* Roles e Tarefas - Funcional */}
          <div className="fm-tactics-view__roles">
            <h3>Roles e Tarefas</h3>
            <div className="fm-tactics-view__roles-grid">
              {team.squad.slice(0, 11).map((player) => {
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
        </div>

        {/* Instruções Individuais por Jogador - Com Estado Real */}
        <div className="fm-tactics-view__section">
          <h2>👤 Instruções Individuais</h2>
          <div className="fm-tactics-view__players">
            {team.squad.slice(0, 11).map((player) => {
              const instructions = getPlayerInstructions(player.id);
              return (
                <IndividualInstructions
                  key={player.id}
                  player={player}
                  instructions={instructions}
                  onInstructionChange={updatePlayerInstruction}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
