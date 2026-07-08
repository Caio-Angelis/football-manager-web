export type TeamTier = 'elite' | 'strong' | 'average' | 'developing';

const TEAM_BADGES: Record<string, string> = {
  'Atlético Mineiro': '/badges/atletico_mineiro.png',
  'Bahia': '/badges/bahia.png',
  'Botafogo': '/badges/botafogo.png',
  'Ceará': '/badges/ceara.png',
  'Corinthians': '/badges/corinthians.png',
  'Cruzeiro': '/badges/cruzeiro.png',
  'Flamengo': '/badges/flamengo.png',
  'Fluminense': '/badges/fluminense.png',
  'Fortaleza': '/badges/fortaleza.png',
  'Grêmio': '/badges/gremio.png',
  'Internacional': '/badges/internacional.png',
  'Juventude': '/badges/juventude.png',
  'Mirassol': '/badges/mirassol.png',
  'Palmeiras': '/badges/palmeiras.png',
  'Red Bull Bragantino': '/badges/bragantino.png',
  'Santos': '/badges/santos.png',
  'São Paulo': '/badges/sao_paulo.png',
  'Sport Recife': '/badges/sport_recife.png',
  'Vasco da Gama': '/badges/vasco_da_gama.png',
  'Vitória': '/badges/vitoria.png',
};

export function getTeamBadge(name: string): string | undefined {
  return TEAM_BADGES[name];
}

const HUES = [215, 145, 25, 340, 195, 265];

export const TIER_ACCENT: Record<TeamTier, string> = {
  elite: '#3d7bf5',
  strong: '#3fbf6b',
  average: '#e0b341',
  developing: '#e25c52',
};

export function getTeamTier(reputation: number): TeamTier {
  if (reputation >= 80) return 'elite';
  if (reputation >= 60) return 'strong';
  if (reputation >= 40) return 'average';
  return 'developing';
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTeamInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Crest shield colors (primary/secondary) — stable per team name + tier. */
export function getCrestColors(name: string, tier: TeamTier): { primary: string; secondary: string } {
  const hash = hashString(name);
  const hue = HUES[hash % HUES.length];
  const primary = tier === 'elite' ? '#3d7bf5' : `hsl(${hue} 42% 38%)`;
  const secondary = tier === 'elite' ? '#2a5fb0' : `hsl(${hue} 35% 28%)`;
  return { primary, secondary };
}

/** Disc/marker color used on the 2D pitch — hueShift disambiguates home/away collisions. */
export function getTeamDiscColor(name: string, reputation: number, hueShift = 0): string {
  const idx = (hashString(name) + hueShift) % HUES.length;
  const hue = HUES[idx];
  if (reputation >= 80 && hueShift === 0) return '#1a73e8';
  return `hsl(${hue} 55% 45%)`;
}
