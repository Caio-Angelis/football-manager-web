import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../../api/client';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

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
        <main className="fm-landing__main" style={{ maxWidth: 460, margin: '0 auto' }}>
          <h1 className="fm-landing__title">Jogar Online</h1>
          <p className="fm-landing__lede">
            Crie uma sala e compartilhe o código, ou entre na sala de um amigo.
          </p>

          <label style={{ display: 'block', marginBottom: 6, color: 'var(--t-text-2)' }}>Seu apelido</label>
          <input
            className="fms-input"
            value={nickname}
            maxLength={20}
            placeholder="Ex.: Caio"
            onChange={e => setNickname(e.target.value)}
            style={{ width: '100%', marginBottom: 18 }}
          />

          <div style={{ marginBottom: 24, display: 'flex' }}>
            <Button onClick={handleCreate} disabled={busy} className="fm-online-block">
              {busy ? 'Aguarde…' : 'Criar sala'}
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--t-border, #333)' }} />
            <span style={{ color: 'var(--t-text-2)' }}>ou</span>
            <span style={{ flex: 1, height: 1, background: 'var(--t-border, #333)' }} />
          </div>

          <label style={{ display: 'block', marginBottom: 6, color: 'var(--t-text-2)' }}>Código da sala</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="fms-input"
              value={code}
              maxLength={6}
              placeholder="Ex.: ABC234"
              onChange={e => setCode(e.target.value.toUpperCase())}
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: 2 }}
            />
            <Button variant="secondary" onClick={handleJoin} disabled={busy}>Entrar</Button>
          </div>

          {error && <p style={{ color: 'var(--t-danger, #e5484d)', marginTop: 16 }}>{error}</p>}
        </main>
      </div>
    </div>
  );
};
