import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../../api/client';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import './online.css';

const NICK_KEY = 'fm-nickname';

export const OnlineHome: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = React.useState(() => localStorage.getItem(NICK_KEY) ?? '');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const saveNick = () => localStorage.setItem(NICK_KEY, nickname.trim());

  const handleCreate = async () => {
    if (!nickname.trim()) { setError('Escolha um apelido.'); return; }
    setBusy(true); setError(null);
    try {
      saveNick();
      const { code: newCode } = await createRoom(nickname.trim());
      navigate(`/online/sala/${newCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar sala.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) { setError('Escolha um apelido.'); return; }
    if (!code.trim()) { setError('Digite o código da sala.'); return; }
    setBusy(true); setError(null);
    try {
      saveNick();
      const target = code.trim().toUpperCase();
      await joinRoom(target, nickname.trim());
      navigate(`/online/sala/${target}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao entrar na sala.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fm-landing">
      <div className="fm-landing__topbar">
        <ThemeToggle compact />
        <Button variant="secondary" onClick={() => navigate('/')} className="fm-landing__back-btn">
          ← Voltar
        </Button>
      </div>
      <div className="fm-landing__layout fm-landing__layout--full">
        <main className="fm-landing__main fmo">
          <h1 className="fm-landing__title">Jogar online</h1>
          <p className="fmo__lede">
            Crie uma sala e compartilhe o código, ou entre na sala de um amigo.
          </p>

          <div className="fmo-field">
            <label htmlFor="fmo-nick" className="fmo-label">Seu apelido</label>
            <input
              id="fmo-nick"
              className="fmo-input"
              value={nickname}
              maxLength={20}
              placeholder="Ex.: Caio"
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />
          </div>

          <div className="fmo-fullrow">
            <Button onClick={handleCreate} disabled={busy} className="fmo-block">
              {busy ? 'Aguarde…' : 'Criar sala'}
            </Button>
          </div>

          <div className="fmo-divider">ou</div>

          <div className="fmo-field">
            <label htmlFor="fmo-code" className="fmo-label">Código da sala</label>
            <div className="fmo-row">
              <input
                id="fmo-code"
                className="fmo-input fmo-input--code"
                value={code}
                maxLength={6}
                placeholder="ABC234"
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              />
              <Button variant="secondary" onClick={handleJoin} disabled={busy}>Entrar</Button>
            </div>
          </div>

          {error && <p className="fmo-error" role="alert">{error}</p>}
        </main>
      </div>
    </div>
  );
};
