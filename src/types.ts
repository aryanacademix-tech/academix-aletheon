export type Screen = 'splash' | 'onboarding' | 'home' | 'profile' | 'play' | 'progress' | 'calc-monarch' | 'focus-timer' | 'planner' | 'keen-researchers' | 'quiz-master' | 'daily' | 'daily-play' | 'puzzle-setup' | 'custom-challenge';

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  coins: number;
  puzzlesSolved: number;
  totalAttempts: number;
  averageTime: number; // in seconds
  name: string;
  avatarSeed: string;
  uid?: string; // Optional user ID for Firebase auth
  apiKey?: string; // Add optional API key
  typeStats: {
    [key: string]: {
      solved: number;
      attempts: number;
    };
  };
}

export interface Puzzle {
  id: string;
  type: string;
  difficulty: string;
  question: string;
  answer: string;
  explanation: string;
  options?: string[]; // Make sure options can be missing for text inputs
}

export interface LevelInfo {
  level: number;
  currentXp: number;
  requiredXp: number;
  progressPercent: number;
  xpInCurrentLevel: number;
}
