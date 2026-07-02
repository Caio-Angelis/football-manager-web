import React from 'react';
import { Trophy, Globe, CheckCircle2, ArrowDownCircle, type LucideIcon } from 'lucide-react';

const ZONE_ICON: Record<string, LucideIcon> = {
  title: Trophy,
  europe: Globe,
  safe: CheckCircle2,
  relegation: ArrowDownCircle,
};

export const ZoneIcon: React.FC<{ zone: string; size?: number }> = ({ zone, size = 13 }) => {
  const Icon = ZONE_ICON[zone] ?? CheckCircle2;
  return <Icon size={size} style={{ verticalAlign: -2 }} />;
};
