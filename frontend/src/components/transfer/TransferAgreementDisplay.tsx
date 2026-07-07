import React from 'react';
import { Button } from '../ui/Button';
import type { TransferAgreement, PlayerBonus } from '../../types/game';

export const TransferAgreementDisplay: React.FC<{
  agreement: TransferAgreement;
  onTerminate?: () => void;
}> = ({ agreement, onTerminate }) => {
  const contractWeeks = agreement.contract.contractWeeks;
  const years = Math.floor(contractWeeks / 52);
  const weeks = contractWeeks % 52;
  const durationText = years > 0 ? `${years} ano${years > 1 ? 's' : ''}${weeks > 0 ? ` e ${weeks} semana${weeks > 1 ? 's' : ''}` : ''}` : `${weeks} semana${weeks !== 1 ? 's' : ''}`;

  return (
    <div className="fm-transfer-agreement">
      <div className="fm-transfer-agreement__header">
        <h3 className="fm-transfer-agreement__player-name">{agreement.playerName}</h3>
        <span className={`fm-transfer-agreement__status fm-transfer-agreement__status--${agreement.status}`}>
          {agreement.status === 'active' ? 'Ativo' : agreement.status === 'terminated' ? 'Encerrado' : 'Expirado'}
        </span>
      </div>
      <div className="fm-transfer-agreement__details">
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Valor da Transferência:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.transferFee}M</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Método de Pagamento:</span>
          <span className="fm-transfer-agreement__detail-value">
            {agreement.paymentMethod === 'installments' ? 'Parcelado' : 'À vista'}
          </span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Contrato:</span>
          <span className="fm-transfer-agreement__detail-value">{durationText}</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Salário Semanal:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.contract.weeklySalary}K</span>
        </div>
        <div className="fm-transfer-agreement__detail">
          <span className="fm-transfer-agreement__detail-label">Cláusula de Rescisão:</span>
          <span className="fm-transfer-agreement__detail-value">R$ {agreement.contract.releaseClause}M</span>
        </div>
        {agreement.contract.performanceBonuses && agreement.contract.performanceBonuses.length > 0 ? (
          <div className="fm-transfer-agreement__bonuses">
            <span className="fm-transfer-agreement__detail-label">Bónus de Performance:</span>
            <div className="fm-transfer-agreement__bonuses-list">
              {agreement.contract.performanceBonuses.map((bonus, index) => {
                const typeLabels: Record<PlayerBonus['type'], string> = {
                  goals: 'Golos',
                  appearances: 'Aparições',
                  assists: 'Assistências',
                  titles: 'Títulos',
                  performance: 'Performance',
                };
                return (
                  <span key={index} className="fm-transfer-agreement__bonus-tag">
                    {typeLabels[bonus.type]}: {bonus.threshold}x → R$ {bonus.bonusAmount}K
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
        {agreement.installmentClause && agreement.status === 'active' ? (
          <div className="fm-transfer-agreement__installments">
            <span className="fm-transfer-agreement__detail-label">Pagamentos Pendentes:</span>
            <div className="fm-transfer-agreement__installments-summary">
              <span>
                Pagos: {agreement.installmentClause.payments.filter(p => p.paid).length}/{agreement.installmentClause.installmentCount}
              </span>
              <span>
                Restante: R$ {agreement.installmentClause.payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0)}M
              </span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="fm-transfer-agreement__history">
        <span className="fm-transfer-agreement__history-label">Data de Assinatura:</span>
        <span className="fm-transfer-agreement__history-value">
          {new Date(agreement.agreementDate).toLocaleDateString('pt-BR')}
        </span>
      </div>
      {onTerminate && agreement.status === 'active' && (
        <div className="fm-transfer-agreement__actions">
          <Button variant="secondary" onClick={onTerminate}>Encerrar Acordo</Button>
        </div>
      )}
    </div>
  );
};
