import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import type { SaveSlotMetadata } from '../../types/game';

interface SaveSlotProps {
  slotNumber: 1 | 2;
  onSaveSlot?: (slot: SaveSlotMetadata) => void;
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SaveSlot: React.FC<SaveSlotProps> = ({ slotNumber, onSaveSlot }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const store = useGameStore();
  const metadata = store.getSaveSlots().find(s => s.slotNumber === slotNumber);
  const saveSlot = metadata as SaveSlotMetadata | undefined;
  const hasTeam = store.selectedTeam !== null;

  const handleSave = () => {
    if (!hasTeam) {
      setMessage('⚠️ Selecione um time primeiro!');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    store.saveGame(slotNumber);
    
    // Aguarda um pouco para garantir que o save foi processado
    setTimeout(() => {
      setSaving(false);
      const newSlots = store.getSaveSlots();
      const savedSlot = newSlots.find(s => s.slotNumber === slotNumber);
      
      if (savedSlot) {
        setMessage('✅ Save ' + slotNumber + ' salvo com sucesso!');
        if (onSaveSlot) {
          onSaveSlot(savedSlot);
        }
      } else {
        setMessage('❌ Erro ao salvar. Verifique o console.');
        console.error('Save falhou - slot não encontrado após save');
      }
      // Mantém a mensagem visível por 5 segundos
      setTimeout(() => setMessage(null), 5000);
    }, 200);
  };

  const handleLoad = () => {
    if (saveSlot) {
      store.loadGame(slotNumber);
    }
  };

  const handleDelete = () => {
    store.deleteSave(slotNumber);
    setConfirmDelete(false);
  };

  const isSlotActive = saveSlot !== undefined;

  return (
    <div className="fm-save-slot">
      {message && (
        <div className="fm-save-slot__message" style={{ color: message.includes('✅') ? 'green' : 'orange', marginBottom: '12px', fontSize: '14px' }}>
          {message}
        </div>
      )}
      {isSlotActive ? (
        <>
          <div className="fm-save-slot__header">
            <span className="fm-save-slot__title">
              Save {slotNumber} — {saveSlot.teamName}
            </span>
            <span className="fm-save-slot__info">
              T{saveSlot.currentSeason} · Semana {saveSlot.currentWeek}
            </span>
          </div>
          <div className="fm-save-slot__date">
            Salvo em: {formatDate(saveSlot.savedAt)}
          </div>
          <div className="fm-save-slot__actions">
            <Button onClick={handleLoad}>Carregar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            {!confirmDelete ? (
              <Button onClick={() => setConfirmDelete(true)}>Excluir</Button>
            ) : (
              <div className="fm-save-slot__confirm">
                <span>Confirma?</span>
                <Button onClick={handleDelete}>Sim</Button>
                <Button onClick={() => setConfirmDelete(false)}>Não</Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="fm-save-slot__header">
            <span className="fm-save-slot__title">Save {slotNumber}</span>
            <span className="fm-save-slot__empty">Vazio</span>
          </div>
          <div className="fm-save-slot__actions">
            <Button onClick={handleSave}>Criar Save</Button>
          </div>
        </>
      )}
    </div>
  );
};
