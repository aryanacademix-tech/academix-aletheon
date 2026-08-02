export type Screen = 'splash' | 'onboarding' | 'home' | 'play' | 'daily' | 'daily-play' | 'levels' | 'progress' | 'calc-monarch' | 'focus-timer' | 'planner' | 'keen-researchers' | 'quiz-master' | 'profile';

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  coins: number;
  puzzlesSolved: number;
  totalAttempts: number;
  averageTime: number;
  typeStats: Record<string, { solved: number; attempts: number }>;
  name?: string;
  avatarSeed?: string;
  apiKey?: string;
  uid?: string;
}

export interface Puzzle {
  id: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'hard' | 'super hard' | 'extreme' | string;
  question: string;
  options?: string[]; // If provided, it's multiple choice. Otherwise, text input.
  answer: string;
  explanation: string;
}

export interface PuzzleAttempt {
  puzzleId: string;
  solved: boolean;
  timeTaken: number; // in seconds
  hintsUsed: number;
  attempts: number;
}
