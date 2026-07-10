import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getRatingColor, STATUS_COLOR } from '../../utils/statusColors';
import { PageHeader } from '../ui/PageHeader';
import { TeamCrest } from '../ui/TeamCrest';
import './club.css';

const EXPECTATION_LABELS: Record<string, string> = {
  relegation: 'Evitar rebaixamento',
  midtable: 'Meio da tabela',
  top4: 'G4',
  title: 'Título',
};

const FORM_LABELS: Record<string, string> = { W: 'V', D: 'E', L: 'D' };
const FORM_COLORS: Record<string, string> = {
  W: STATUS_COLOR.green,
  D: STATUS_COLOR.amber,
  L: STATUS_COLOR.red,
};

const FAN_SENTIMENT_LABELS: Record<string, string> = {
  ecstatic: 'Eufórica',
  happy: 'Feliz',
  satisfied: 'Satisfeita',
  neutral: 'Neutra',
  concerned: 'Preocupada',
  angry: 'Irritada',
  furious: 'Furiosa',
};

function boardLabel(value: number): string {
  if (value >= 50) return 'Excelente';
  if (value >= 20) return 'Satisfeita';
  if (value >= -20) return 'Neutra';
  if (value >= -50) return 'Insatisfeita';
  return 'Crítica';
}

function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
}) {
  return (
    <header className="fmc-section-title">
      <span className="fmc-section-title__icon" aria-hidden="true"><Icon size={15} /></span>
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
    </header>
  );
}

function LevelStat({ label, level, max = 10 }: { label: string; level: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (level / max) * 100));
  return (
    <div className="fms-stat-card fmc-level-stat">
      <span className="fms-stat-card__label">{label}</span>
      <span className="fms-stat-card__value">Nível {level}</span>
      <div className="fms-bar fms-bar--wide" aria-hidden="true">
        <div
          className="fms-bar__fill"
          style={{ width: `${pct}%`, backgroundColor: getRatingColor(pct) }}
        />
      </div>
      <span className="fms-stat-card__sub">de {max}</span>
    </div>
  );
}

function MoodRow({
  label,
  value,
  max = 100,
  color,
  sublabel,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  sublabel: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="fmc-mood-row">
      <div className="fmc-mood-row__head">
        <span className="fmc-mood-row__label">{label}</span>
        <span className="fmc-mood-row__value" style={{ color }}>{sublabel}</span>
      </div>
      <div className="fms-bar fms-bar--wide fms-bar--tall" aria-hidden="true">
        <div className="fms-bar__fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export const ClubView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTeam, teams, fanMood, boardSatisfaction } = useGameStore();
  const team = teams.find(t => t.id === selectedTeam);

  const derived = useMemo(() => {
    if (!team) return null;
    const goalDifference = team.goalsFor - team.goalsAgainst;
    const expectationLabel = EXPECTATION_LABELS[team.boardExpectation] ?? team.boardExpectation;
    const form = team.leagueForm ?? [];
    const formScore = form.reduce((s, f) => s + (f === 'W' ? 3 : f === 'D' ? 1 : 0), 0);
    const boardPct = Math.max(0, Math.min(100, ((boardSatisfaction ?? 0) + 100) / 2));
    const boardColor = getRatingColor(boardPct, { high: 60, medium: 40 });
    const fanValue = fanMood?.value ?? 50;
    const fanColor = getRatingColor(fanValue, { high: 60, medium: 40 });
    const fanLabel = FAN_SENTIMENT_LABELS[fanMood?.sentiment ?? 'neutral']
      ?? fanMood?.sentiment
      ?? 'Neutra';
    return {
      goalDifference,
      expectationLabel,
      form,
      formScore,
      boardPct,
      boardColor,
      boardText: boardLabel(boardSatisfaction ?? 0),
      fanValue,
      fanColor,
      fanLabel,
      squadCount: team.squad?.length ?? 0,
      promises: team.boardPromises ?? [],
    };
  }, [team, fanMood, boardSatisfaction]);

  if (!team || !derived) {
    return (
      <div className="fms-page">
        <div className="fms-empty">Selecione um time para ver a visão do clube.</div>
      </div>
    );
  }

  const {
    goalDifference,
    expectationLabel,
    form,
    formScore,
    boardPct,
    boardColor,
    boardText,
    fanValue,
    fanColor,
    fanLabel,
    squadCount,
    promises,
  } = derived;

  return (
    <div className="fms-page">
      <PageHeader
        title="Visão do Clube"
        subtitle={`${team.name} — ${team.division}`}
        teamName={team.name}
        teamReputation={team.reputation}
        actions={[
          { icon: <Users size={15} />, title: 'Elenco', onClick: () => navigate('/elenco') },
          { icon: <Wallet size={15} />, title: 'Finanças', onClick: () => navigate('/financas') },
          { icon: <BarChart3 size={15} />, title: 'Classificação', onClick: () => navigate('/classificacao') },
        ]}
      />

      <div className="fms-body--scroll fmc-view">
        <section className="fms-card fmc-identity" aria-label="Identidade do clube">
          <div className="fmc-identity__crest">
            <TeamCrest name={team.name} reputation={team.reputation} size={48} />
          </div>
          <div className="fmc-identity__copy">
            <h2 className="fmc-identity__name">{team.name}</h2>
            <p className="fmc-identity__meta">
              {team.division} · {team.league}
            </p>
            <div className="fmc-identity__tags">
              <span className="fms-badge fms-badge--accent">Rep {team.reputation}/100</span>
              <span className="fms-badge">{expectationLabel}</span>
              <span className="fms-badge">{team.formation} · {team.tactic}</span>
            </div>
          </div>
        </section>

        <div className="fmc-layout">
          <section className="fms-section fmc-panel">
            <SectionTitle
              icon={CircleDot}
              title="Atmosfera"
              detail="Torcida e diretoria neste momento"
            />
            <MoodRow
              label="Torcida"
              value={fanValue}
              color={fanColor}
              sublabel={fanLabel}
            />
            <MoodRow
              label="Diretoria"
              value={boardPct}
              color={boardColor}
              sublabel={boardText}
            />
          </section>

          <section className="fms-section fmc-panel">
            <SectionTitle
              icon={Building2}
              title="Estrutura"
              detail="Nível das instalações e departamentos"
            />
            <div className="fms-stat-grid fmc-stat-grid">
              <LevelStat label="Instalações" level={team.facilitiesLevel} />
              <LevelStat label="Base Juvenil" level={team.youthFacilitiesLevel} />
              <LevelStat label="Scouting" level={team.scoutingLevel} />
              <LevelStat label="Equipe Técnica" level={team.staffLevel} />
            </div>
          </section>

          <section className="fms-section fmc-panel">
            <SectionTitle icon={Wallet} title="Finanças" detail="Resumo do caixa do clube" />
            <div className="fms-stat-grid fmc-stat-grid">
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Orçamento</span>
                <span className="fms-stat-card__value">R$ {team.budget.toFixed(1)}M</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Folha Salarial</span>
                <span className="fms-stat-card__value">R$ {team.wageBill.toFixed(1)}M</span>
                <span className="fms-stat-card__sub">por semana</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Elenco</span>
                <span className="fms-stat-card__value">{squadCount}</span>
                <span className="fms-stat-card__sub">jogadores</span>
              </div>
            </div>
          </section>

          <section className="fms-section fmc-panel">
            <SectionTitle icon={BarChart3} title="Desempenho" detail="Temporada atual na liga" />
            <div className="fms-stat-grid fmc-stat-grid">
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Posição</span>
                <span className="fms-stat-card__value">{team.leaguePosition}º</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Pontos</span>
                <span className="fms-stat-card__value">{team.points}</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Jogos</span>
                <span className="fms-stat-card__value">{team.played}</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">V / E / D</span>
                <span className="fms-stat-card__value">{team.won} / {team.drawn} / {team.lost}</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Gols Marcados</span>
                <span className="fms-stat-card__value">{team.goalsFor}</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Gols Sofridos</span>
                <span className="fms-stat-card__value">{team.goalsAgainst}</span>
              </div>
              <div className="fms-stat-card">
                <span className="fms-stat-card__label">Saldo</span>
                <span
                  className="fms-stat-card__value"
                  style={{ color: goalDifference >= 0 ? STATUS_COLOR.green : STATUS_COLOR.red }}
                >
                  {goalDifference >= 0 ? '+' : ''}{goalDifference}
                </span>
              </div>
            </div>

            <div className="fmc-form">
              <span className="fmc-form__label">Últimos jogos</span>
              {form.length > 0 ? (
                <>
                  <div className="fmc-form__badges" role="list" aria-label="Forma recente">
                    {form.map((result, i) => (
                      <span
                        key={`${result}-${i}`}
                        role="listitem"
                        className="fmc-form__badge"
                        style={{ background: FORM_COLORS[result] ?? 'var(--t-panel-2)' }}
                      >
                        {FORM_LABELS[result] ?? result}
                      </span>
                    ))}
                  </div>
                  <span className="fmc-form__score">{formScore}/15 pts</span>
                </>
              ) : (
                <span className="fmc-form__empty">Sem jogos ainda</span>
              )}
            </div>
          </section>

          <section className="fms-section fmc-panel fmc-panel--wide">
            <SectionTitle
              icon={Clock3}
              title="Promessas da Diretoria"
              detail={promises.length > 0 ? `${promises.length} compromisso(s)` : 'Nenhuma promessa ativa'}
            />
            {promises.length > 0 ? (
              <ul className="fmc-promises">
                {promises.map((p, i) => (
                  <li
                    key={`${p.goal}-${i}`}
                    className={`fmc-promise ${p.fulfilled ? 'fmc-promise--done' : ''}`}
                  >
                    <span className="fmc-promise__icon" aria-hidden="true">
                      {p.fulfilled
                        ? <CheckCircle2 size={16} color={STATUS_COLOR.green} />
                        : <Clock3 size={16} color={STATUS_COLOR.amber} />}
                    </span>
                    <span className="fmc-promise__goal">{p.goal}</span>
                    <span className={`fms-badge ${p.fulfilled ? 'fms-badge--green' : 'fms-badge--amber'}`}>
                      {p.fulfilled ? 'Cumprida' : `Prazo: ${p.deadline} sem.`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fmc-promises__empty">
                Sem promessas pendentes com a diretoria neste momento.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
