import React from 'react';
import type { InstallmentClause } from '../../types/game';

export const InstallmentClauseDisplay: React.FC<{ clause: InstallmentClause }> = ({ clause }) => {
  const paidCount = clause.payments.filter(p => p.paid).length;

  return (
    <div className="fm-installments-display">
      <div className="fm-installments-display__header">
        <span className="fm-installments-display__label">Pagamentos Parcelados</span>
        <span className={`fm-installments-display__status fm-installments-display__status--${clause.status}`}>
          {clause.status === 'completed' ? 'Completo' : clause.status === 'defaulted' ? 'Inadimplente' : 'Ativo'}
        </span>
      </div>
      <div className="fm-installments-display__summary">
        <span className="fm-installments-display__total">Total: R$ {clause.totalAmount}M</span>
        <span className="fm-installments-display__progress">{paidCount}/{clause.installmentCount} pagos</span>
      </div>
      <div className="fm-installments-display__payments">
        {clause.payments.map(payment => (
          <div key={payment.installmentNumber} className={`fm-installment-payment ${payment.paid ? 'fm-installment-payment--paid' : ''}`}>
            <span className="fm-installment-payment__number">Parcela {payment.installmentNumber}</span>
            <span className="fm-installment-payment__amount">R$ {payment.amount}M</span>
            <span className="fm-installment-payment__status">
              {payment.paid ? '✓ Pago' : `Vencimento: Sem. ${payment.dueWeek}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
