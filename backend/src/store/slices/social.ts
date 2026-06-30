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

    if (team.squad.length === 0) return;

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

    // Generate edges based on teamMates — deterministic strength
    const edges: { from: string; to: string; strength: number }[] = [];
    nodes.forEach(node => {
      const player = team.squad.find(p => p.id === node.playerId);
      const teammates = player?.teamMates || [];
      teammates.forEach(teammateId => {
        const teammate = team.squad.find(p => p.id === teammateId);
        let strength = 0.5;
        if (teammate) {
          if (player?.socialGroup && teammate.socialGroup && player.socialGroup === teammate.socialGroup) {
            strength = 0.9;
          } else if (player?.squadStatus === teammate.squadStatus) {
            strength = 0.7;
          } else {
            strength = 0.4;
          }
        }
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

    const tree = { ...state.socialTree, edges: [...state.socialTree.edges] };
    const edgeIdxA = tree.edges.findIndex(e => e.from === playerIdA && e.to === playerIdB);
    const edgeIdxB = tree.edges.findIndex(e => e.from === playerIdB && e.to === playerIdA);

    if (edgeIdxA !== -1) {
      tree.edges[edgeIdxA] = { ...tree.edges[edgeIdxA], strength };
    } else {
      tree.edges.push({ from: playerIdA, to: playerIdB, strength });
    }

    if (edgeIdxB !== -1) {
      tree.edges[edgeIdxB] = { ...tree.edges[edgeIdxB], strength };
    } else {
      tree.edges.push({ from: playerIdB, to: playerIdA, strength });
    }

    set({ socialTree: tree });
  },
});
