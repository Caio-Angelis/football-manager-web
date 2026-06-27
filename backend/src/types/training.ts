// Tipos de Treino

export interface TrainingSession {
  day: number; // 0-6 (seg-dom)
  morning: { type: string; focus: string };
  afternoon: { type: string; focus: string };
  evening: { type: string; focus: string };
}

export interface WeeklyTrainingPlan {
  week: number;
  sessions: TrainingSession[];
  teamFocus: string; // 'attack', 'defense', 'physical', 'cohesion'
}
