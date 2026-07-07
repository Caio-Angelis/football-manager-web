// Exibição do relógio de jogo: minutos além dos 90 viram acréscimos ("90+2")
export const fmtMinute = (m: number): string => (m > 90 ? `90+${m - 90}` : `${m}`);
