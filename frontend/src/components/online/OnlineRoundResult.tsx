import React from 'react';
import type { Match, Team } from '../../types/game';
import { Button } from '../ui/Button';
import { PostMatchReportView } from '../match/PostMatchReportView';

// Fase 8 — após a rodada fechar, cada humano vê o resultado da SUA partida
// (simulada no servidor). Reaproveita o PostMatchReportView existente.
interface Props {
  match: Match;
  teams: Team[];
  myTeamId: string | null;
  onClose: () => void;
}

export const OnlineRoundResult: React.FC<Props> = ({ match, teams, myTeamId, onClose }) => {
  const name = (id: string) => teams.find(t => t.id === id)?.name ?? id;
  const homeName = name(match.homeTeam);
  const awayName = name(match.awayTeam);
  const iAmHome = match.homeTeam === myTeamId;
  const myGoals = iAmHome ? match.homeGoals : match.awayGoals;
  const oppGoals = iAmHome ? match.awayGoals : match.homeGoals;
  const verdict = myGoals > oppGoals ? 'Vitória!' : myGoals < oppGoals ? 'Derrota' : 'Empate';

  return (
    <div className="fm-match-block-overlay" onClick={onClose}>
      <div className="fmo-result-modal fmo-shell" onClick={e => e.stopPropagation()}>
        <span className={`fmo-result__verdict fmo-result__verdict--${verdict === 'Vitória!' ? 'win' : verdict === 'Derrota' ? 'loss' : 'draw'}`}>
          {verdict}
        </span>
        <div className="fmo-result__score">
          <span className={iAmHome ? 'fmo-result__me' : ''}>{homeName}</span>
          <strong>{match.homeGoals} – {match.awayGoals}</strong>
          <span className={!iAmHome ? 'fmo-result__me' : ''}>{awayName}</span>
        </div>
        {match.postMatchReport && (
          <div className="fmo-result__report">
            <PostMatchReportView report={match.postMatchReport} homeTeamName={homeName} awayTeamName={awayName} />
          </div>
        )}
        <Button className="fmo-block" onClick={onClose}>Continuar</Button>
      </div>
    </div>
  );
};
