import type { GameStore, SocialTree, SocialNode } from '../../types/game';
import { getFullName } from '../../utils/playerName';

type Set = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type Get = () => GameStore;

export const createSocialSlice = (set: Set, get: Get) => ({
  generateSocialTree: () => {
    const state = get();
    if (!state.selectedTeam) return;

    const team = state.teams.find(t => t.id === state.selectedTeam);
    if (!team) return;

    // Find the most influential player as root
    const mostInfluential = team.squad.reduce((best, p) => {
      const influence = (p.mental?.leadership ?? 0) * 5 +
        (p.squadStatus === 'Key Player' ? 20 : p.squadStatus === 'Regular Starter' ? 15 : 10);
      const bestInfluence = (best.mental?.leadership ?? 0) * 5 +
        (best.squadStatus === 'Key Player' ? 20 : best.squadStatus === 'Regular Starter' ? 15 : 10);
      return influence > bestInfluence ? p : best;
    }, team.squad[0]);

    // Generate social nodes
    const nodes: SocialNode[] = team.squad.map(p => {
      const influence = Math.min(100, (p.mental?.leadership ?? 5) * 5 +
        (p.squadStatus === 'Key Player' ? 20 : p.squadStatus === 'Regular Starter' ? 15 : 10));
      return {
        playerId: p.id,
        playerName: getFullName(p),
        position: p.position,
        socialGroup: p.socialGroup || 'Sem grupo',
        influence,
        connections: p.teamMates || [],
      };
    });

    // Generate edges based on teamMates
    const edges: { from: string; to: string; strength: number }[] = [];
    nodes.forEach(node => {
      const teammates = team.squad.find(p => p.id === node.playerId)?.teamMates || [];
      teammates.forEach(teammateId => {
        const strength = Math.random() * 0.6 + 0.3; // 0.3-0.9
        edges.push({
          from: node.playerId,
          to: teammateId,
          strength,
        });
      });
    });

    // Calculate depth based on influence
    const maxInfluence = Math.max(...nodes.map(n => n.influence));
    const minInfluence = Math.min(...nodes.map(n => n.influence));
    nodes.forEach(node => {
      const normalized = (node.influence - minInfluence) / Math.max(maxInfluence - minInfluence, 1);
      node.depth = Math.floor(normalized * 3); // 0-3 levels
    });

    const socialTree: SocialTree = {
      rootNodeId: mostInfluential.id,
      nodes,
      edges,
      generatedWeek: state.currentWeek,
    };

    set({ socialTree });
  },

  getSocialTree: () => {
    const state = get();
    return state.socialTree ?? null;
  },

  updateSocialConnections: (playerIdA: string, playerIdB: string, strength: number) => {
    const state = get();
    if (!state.socialTree) return;

    const tree = { ...state.socialTree };
    const existingEdgeA = tree.edges.find(e => e.from === playerIdA && e.to === playerIdB);
    const existingEdgeB = tree.edges.find(e => e.from === playerIdB && e.to === playerIdA);

    if (existingEdgeA) {
      existingEdgeA.strength = strength;
    } else if (existingEdgeB) {
      existingEdgeB.strength = strength;
    } else {
      tree.edges.push({ from: playerIdA, to: playerIdB, strength });
    }

    set({ socialTree: tree });
  },
});
