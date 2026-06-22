import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerCard } from '../squad/PlayerCard';
import { Button } from '../ui/Button';
import type { Player } from '../../types/game';
import playersData from '../../data/players.json';

export const TransferMarket: React.FC = () => {
  const { selectedTeam, teams } = useGameStore();
  const [filter, setFilter] = useState<string>('');

  const team = teams.find(t => t.id === selectedTeam);
  
  const playerIds = new Set(
    teams.flatMap(t => t.squad.map(p => p.id))
  );

  const allPlayers = playersData.players as Player[];
  
  const availablePlayers = allPlayers.filter(p => !playerIds.has(p.id));
  
  const filteredPlayers = filter 
    ? availablePlayers.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    : availablePlayers;

  const handleBuyPlayer = (playerId: string) => {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player || !team) return;
    
    // Simulação de compra
    alert(`Jogador ${player.name} comprado com sucesso!`);
  };

  return (
    <div className="fm-transfer-market">
      <header className="fm-transfer-market__header">
        <h1>Mercado de Transferências</h1>
        {team && (
          <div className="fm-transfer-market__budget">
            <span className="fm-transfer-market__label">Orçamento:</span>
            <span className="fm-transfer-market__value">R$ 15.0M</span>
          </div>
        )}
      </header>

      <div className="fm-transfer-market__filters">
        <input
          type="text"
          placeholder="Buscar jogador..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="fm-transfer-market__search"
        />
      </div>

      <div className="fm-transfer-market__players">
        {filteredPlayers.length === 0 ? (
          <div className="fm-empty">Nenhum jogador encontrado</div>
        ) : (
          <div className="fm-player-grid">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                actionLabel="Comprar"
                onAction={() => handleBuyPlayer(player.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
