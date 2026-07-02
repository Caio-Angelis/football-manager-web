import React from 'react';
import { sendOffer, respondOffer, type OfferView, type PublicRoom } from '../../api/client';
import { useGameStore } from '../../store/gameStore';
import { getFullName } from '../../utils/player';

interface Props {
  code: string;
  offers: OfferView[];
  humanTeams: { teamId: string; nickname: string }[]; // rivais humanos (exclui você)
  onClose: () => void;
  onRoom: (room: PublicRoom) => void;
}

export const OnlineTransfers: React.FC<Props> = ({ code, offers, humanTeams, onClose, onRoom }) => {
  const teams = useGameStore(s => s.teams);
  const [tab, setTab] = React.useState<'inbox' | 'make'>(offers.some(o => o.myTurn) ? 'inbox' : 'make');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [counters, setCounters] = React.useState<Record<string, string>>({});
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [targetTeam, setTargetTeam] = React.useState<string>(humanTeams[0]?.teamId ?? '');

  const act = async (fn: () => Promise<{ room: PublicRoom }>) => {
    setBusy(true); setErr(null);
    try { const { room } = await fn(); onRoom(room); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erro.'); }
    finally { setBusy(false); }
  };

  const renderOffer = (o: OfferView) => {
    const dir = o.iAmSeller ? `${o.fromNickname} quer contratar` : `Sua proposta a ${o.toNickname}`;
    return (
      <div className="fmo-offer" key={o.id}>
        <div className="fmo-offer__top">
          <span className="fmo-offer__name">{o.playerName}</span>
          <span className="fmo-offer__price">R$ {o.price}M</span>
        </div>
        <div className="fmo-offer__meta">{dir} · rodada {o.round}</div>

        {o.status === 'accepted' && <div className="fmo-offer__status fmo-offer__status--accepted">✅ Negócio fechado</div>}
        {o.status === 'rejected' && <div className="fmo-offer__status fmo-offer__status--rejected">❌ Recusada</div>}
        {o.status === 'pending' && !o.myTurn && (
          <div className="fmo-offer__status fmo-offer__status--waiting">
            Aguardando {o.iAmSeller ? o.fromNickname : o.toNickname}…
          </div>
        )}

        {o.status === 'pending' && o.myTurn && (
          <div className="fmo-offer__actions">
            <button className="fmo-btn fmo-btn--primary" disabled={busy}
              onClick={() => act(() => respondOffer(code, o.id, 'accept'))}>Aceitar</button>
            <button className="fmo-btn fmo-btn--danger" disabled={busy}
              onClick={() => act(() => respondOffer(code, o.id, 'reject'))}>Recusar</button>
            <input className="fmo-num" type="number" min={0} step={0.5} placeholder="valor"
              value={counters[o.id] ?? ''} onChange={e => setCounters(c => ({ ...c, [o.id]: e.target.value }))} />
            <button className="fmo-btn" disabled={busy || !(Number(counters[o.id]) > 0)}
              onClick={() => act(() => respondOffer(code, o.id, 'counter', Number(counters[o.id])))}>Contrapor</button>
            {o.iAmBuyer && (
              <button className="fmo-btn fmo-btn--ghost" disabled={busy}
                onClick={() => act(() => respondOffer(code, o.id, 'withdraw'))}>Retirar</button>
            )}
          </div>
        )}
      </div>
    );
  };

  const squad = teams.find(t => t.id === targetTeam)?.squad ?? [];

  return (
    <div className="fmo-modal-backdrop fmo-shell" onClick={onClose}>
      <div className="fmo-modal" role="dialog" aria-modal="true" aria-label="Negociações online" onClick={e => e.stopPropagation()}>
        <div className="fmo-modal__head">
          <span className="fmo-modal__title">Negociações Online</span>
          <button className="fmo-modal__close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="fmo-tabs">
          <button className={`fmo-tab ${tab === 'inbox' ? 'fmo-tab--active' : ''}`} onClick={() => setTab('inbox')}>
            Ofertas{offers.filter(o => o.myTurn).length > 0 ? ` (${offers.filter(o => o.myTurn).length})` : ''}
          </button>
          <button className={`fmo-tab ${tab === 'make' ? 'fmo-tab--active' : ''}`} onClick={() => setTab('make')}>
            Fazer oferta
          </button>
        </div>

        <div className="fmo-modal__body">
          {err && <div className="fmo-offer__status fmo-offer__status--rejected" role="alert" style={{ marginBottom: 10 }}>{err}</div>}

          {tab === 'inbox' && (
            offers.length === 0
              ? <div className="fmo-empty">Nenhuma negociação ainda.</div>
              : offers.map(renderOffer)
          )}

          {tab === 'make' && (
            humanTeams.length === 0
              ? <div className="fmo-empty">Não há outros clubes humanos nesta sala.</div>
              : <>
                <div className="fmo-teamtabs">
                  {humanTeams.map(h => (
                    <button key={h.teamId}
                      className={`fmo-btn ${targetTeam === h.teamId ? 'fmo-btn--primary' : ''}`}
                      onClick={() => setTargetTeam(h.teamId)}>
                      {h.nickname}
                    </button>
                  ))}
                </div>
                {squad.map(p => (
                  <div className="fmo-plrow" key={p.id}>
                    <span className="fmo-plrow__pos">{p.position}</span>
                    <span className="fmo-plrow__name">{getFullName(p)}</span>
                    <span className="fmo-plrow__val">R$ {p.marketValue}M</span>
                    <input className="fmo-num" type="number" min={0} step={0.5}
                      placeholder={String(p.marketValue)}
                      value={prices[p.id] ?? ''} onChange={e => setPrices(v => ({ ...v, [p.id]: e.target.value }))} />
                    <button className="fmo-btn fmo-btn--primary"
                      disabled={busy}
                      onClick={() => act(() => sendOffer(code, p.id, Number(prices[p.id]) || p.marketValue))}>
                      Ofertar
                    </button>
                  </div>
                ))}
              </>
          )}
        </div>
      </div>
    </div>
  );
};
