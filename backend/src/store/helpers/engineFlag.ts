// Flag de seleção de motor — único ponto de leitura de MATCH_ENGINE (Pilar A)
// Valores: 'v1' (default) | 'v2'
// NUNCA ler process.env espalhado — importar deste módulo.

export type EngineVersion = 'v1' | 'v2';

export const ENGINE_VERSION: EngineVersion =
  process.env.MATCH_ENGINE === 'v2' ? 'v2' : 'v1';

export const isV2 = ENGINE_VERSION === 'v2';
