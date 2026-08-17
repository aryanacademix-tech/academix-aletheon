import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Play, Timer, Target, CheckCircle2, XCircle, Calculator, Trophy, 
  Flame, Zap, Crown, Skull, Brain, Hash, Sparkles, RotateCcw, Check, ShieldAlert,
  Layers, Award, RefreshCw
} from 'lucide-react';
import { Screen } from '../types';
import { recordSkillActivity } from '../utils/dailyTracker';

interface CalculationMonarchScreenProps {
  onNavigate: (screen: Screen) => void;
  onBulkSolve?: (xpEarned: number, coinsEarned: number, results: {isCorrect: boolean, timeTaken: number, puzzleType: string}[]) => void;
}

export type GameMode = 
  | 'battle'     // Calculation Battle — solve as many as possible in 60 seconds
  | 'monarch'    // 👑 Monarch Mode — progressively harder questions
  | 'streak'     // 🔥 Streak Mode — one mistake breaks the streak
  | 'blitz'      // ⚡ Blitz Mode — extremely short time per question
  | 'accuracy'   // 🎯 Accuracy Mode — speed doesn't matter, accuracy does
  | 'survival'   // 💀 Survival Mode — difficulty increases continuously
  | 'mixed'      // 🧠 Mixed Mastery — randomly combines all unlocked operations
  | 'rush';      // 🔢 Number Rush — rapid-fire mental calculations

export interface ModeConfig {
  id: GameMode;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const GAME_MODES: ModeConfig[] = [
  {
    id: 'battle',
    name: 'Calculation Battle',
    emoji: '⚔️',
    tagline: '60 Seconds Battle',
    description: 'Solve as many questions as possible in a 60-second rapid battle.',
    accentColor: 'red',
    badgeBg: 'bg-red-500/20',
    badgeBorder: 'border-red-500/60',
    badgeText: 'text-red-300',
  },
  {
    id: 'monarch',
    name: 'Monarch Mode',
    emoji: '👑',
    tagline: 'Progressively Harder',
    description: 'Questions ramp up from Easy to Extreme as you advance.',
    accentColor: 'amber',
    badgeBg: 'bg-amber-500/20',
    badgeBorder: 'border-amber-500/60',
    badgeText: 'text-amber-300',
  },
  {
    id: 'streak',
    name: 'Streak Mode',
    emoji: '🔥',
    tagline: 'Sudden Death',
    description: 'One mistake or wrong calculation instantly breaks your streak and ends the game.',
    accentColor: 'orange',
    badgeBg: 'bg-orange-500/20',
    badgeBorder: 'border-orange-500/60',
    badgeText: 'text-orange-300',
  },
  {
    id: 'blitz',
    name: 'Blitz Mode',
    emoji: '⚡',
    tagline: 'Per-Question Timer',
    description: 'Extremely short time per question (e.g. 5s per problem). Think fast!',
    accentColor: 'yellow',
    badgeBg: 'bg-yellow-500/20',
    badgeBorder: 'border-yellow-500/60',
    badgeText: 'text-yellow-300',
  },
  {
    id: 'accuracy',
    name: 'Accuracy Mode',
    emoji: '🎯',
    tagline: 'Precision Focus',
    description: "Speed doesn't matter, accuracy does. Perfect calculation precision required.",
    accentColor: 'emerald',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
  },
  {
    id: 'survival',
    name: 'Survival Mode',
    emoji: '💀',
    tagline: 'Infinite Escalation',
    description: 'Difficulty escalates continuously with every single question solved.',
    accentColor: 'rose',
    badgeBg: 'bg-rose-500/20',
    badgeBorder: 'border-rose-500/60',
    badgeText: 'text-rose-300',
  },
  {
    id: 'mixed',
    name: 'Mixed Mastery',
    emoji: '🧠',
    tagline: 'All Operations',
    description: 'Randomly combines all math operations (algebra, BODMAS, roots, HCF/LCM, etc.).',
    accentColor: 'purple',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-500/60',
    badgeText: 'text-purple-300',
  },
  {
    id: 'rush',
    name: 'Number Rush',
    emoji: '🔢',
    tagline: 'Instant Auto-Submit',
    description: 'Rapid-fire mental calculations with instant auto-submit on exact match.',
    accentColor: 'indigo',
    badgeBg: 'bg-indigo-500/20',
    badgeBorder: 'border-indigo-500/60',
    badgeText: 'text-indigo-300',
  },
];

type Operation = 
  | '+' 
  | '-' 
  | '*' 
  | '/' 
  | 'bodmas' 
  | 'fractions' 
  | 'decimals' 
  | 'percentages' 
  | 'factors' 
  | 'multiples' 
  | 'hcf' 
  | 'lcm' 
  | '^2' 
  | 'sqrt' 
  | 'powers' 
  | 'ratios' 
  | 'algebra' 
  | 'area' 
  | 'perimeter' 
  | 'volume' 
  | 'stats' 
  | 'probability';

interface Question {
  text: string;
  answer: number;
  operation: Operation;
  difficultyTag?: string;
}

const ALL_OPERATIONS: { op: Operation; label: string; symbol: string }[] = [
  { op: '+', label: 'Addition', symbol: '+' },
  { op: '-', label: 'Subtraction', symbol: '-' },
  { op: '*', label: 'Multiplication', symbol: '×' },
  { op: '/', label: 'Division', symbol: '÷' },
  { op: 'bodmas', label: 'BODMAS', symbol: '()' },
  { op: 'fractions', label: 'Fractions', symbol: '½' },
  { op: 'decimals', label: 'Decimals', symbol: '0.0' },
  { op: 'percentages', label: 'Percentages', symbol: '%' },
  { op: 'factors', label: 'Factors', symbol: 'F' },
  { op: 'multiples', label: 'Multiples', symbol: 'M' },
  { op: 'hcf', label: 'HCF (GCD)', symbol: 'HCF' },
  { op: 'lcm', label: 'LCM', symbol: 'LCM' },
  { op: '^2', label: 'Squares', symbol: 'x²' },
  { op: 'sqrt', label: 'Roots', symbol: '√x' },
  { op: 'powers', label: 'Powers', symbol: 'xⁿ' },
  { op: 'ratios', label: 'Ratios', symbol: 'a:b' },
  { op: 'algebra', label: 'Algebra', symbol: '3x' },
  { op: 'area', label: 'Area', symbol: 'A' },
  { op: 'perimeter', label: 'Perimeter', symbol: 'P' },
  { op: 'volume', label: 'Volume', symbol: 'V' },
  { op: 'stats', label: 'Mean/Med/Mode', symbol: 'X̄' },
  { op: 'probability', label: 'Probability', symbol: 'P(E)' },
];

export default function CalculationMonarchScreen({ onNavigate, onBulkSolve }: CalculationMonarchScreenProps) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  
  // Multi-Mode State
  const [selectedModes, setSelectedModes] = useState<GameMode[]>(['monarch']);
  
  // Setup configuration state
  const [selectedOps, setSelectedOps] = useState<Operation[]>(['+', '-', '*', '/']);
  const [numQuestions, setNumQuestions] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(2); // 0 = no limit
  const [blitzSecondsPerQ, setBlitzSecondsPerQ] = useState(5); // For Blitz mode
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme' | 'all'>('medium');

  // Play state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // overall timer
  const [blitzTimeLeft, setBlitzTimeLeft] = useState<number | null>(null); // per-question timer
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [streakBroken, setStreakBroken] = useState(false);
  const [flashFeedback, setFlashFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Results state
  const [timeTaken, setTimeTaken] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle modes
  const toggleMode = (mode: GameMode) => {
    setSelectedModes(prev => {
      let next: GameMode[];
      if (prev.includes(mode)) {
        next = prev.filter(m => m !== mode);
      } else {
        next = [...prev, mode];
      }
      
      // Auto-adjust default parameters when toggled
      if (mode === 'battle' && next.includes('battle')) {
        setDurationMinutes(1); // 60 seconds
      }
      if (mode === 'accuracy' && next.includes('accuracy') && !next.includes('battle')) {
        setDurationMinutes(0); // No overall timer by default for pure accuracy
      }
      return next;
    });
  };

  const setPresetModes = (modes: GameMode[]) => {
    setSelectedModes(modes);
    if (modes.includes('battle')) setDurationMinutes(1);
    if (modes.includes('accuracy') && !modes.includes('battle')) setDurationMinutes(0);
  };

  const toggleOp = (op: Operation) => {
    setSelectedOps(prev => 
      prev.includes(op) 
        ? prev.filter(o => o !== op) 
        : [...prev, op]
    );
  };

  // Helper for generating a single math question
  const createSingleQuestion = (
    qIndex: number,
    totalQ: number,
    activeModes: GameMode[],
    activeOps: Operation[],
    baseDiff: 'easy' | 'medium' | 'hard' | 'extreme' | 'all'
  ): Question => {
    const isMixed = activeModes.includes('mixed');
    const opsPool = isMixed ? ALL_OPERATIONS.map(i => i.op) : (activeOps.length > 0 ? activeOps : ['+']);
    const op = opsPool[Math.floor(Math.random() * opsPool.length)] as Operation;

    let currentDiff: 'easy' | 'medium' | 'hard' | 'extreme' = 'medium';

    if (activeModes.includes('survival')) {
      if (qIndex < 3) currentDiff = 'easy';
      else if (qIndex < 7) currentDiff = 'medium';
      else if (qIndex < 14) currentDiff = 'hard';
      else currentDiff = 'extreme';
    } else if (activeModes.includes('monarch')) {
      const ratio = qIndex / Math.max(1, totalQ);
      if (ratio < 0.25) currentDiff = 'easy';
      else if (ratio < 0.50) currentDiff = 'medium';
      else if (ratio < 0.75) currentDiff = 'hard';
      else currentDiff = 'extreme';
    } else if (baseDiff === 'all') {
      const diffs: ('easy' | 'medium' | 'hard' | 'extreme')[] = ['easy', 'medium', 'hard', 'extreme'];
      currentDiff = diffs[Math.floor(Math.random() * diffs.length)];
    } else {
      currentDiff = baseDiff;
    }

    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const lcmCalc = (a: number, b: number): number => (a * b) / gcd(a, b);
    const countFactors = (n: number): number => {
      let count = 0;
      for (let i = 1; i <= n; i++) {
        if (n % i === 0) count++;
      }
      return count;
    };

    let qText = '';
    let ans = 0;

    switch (op) {
      case '+': {
        let a = 10, b = 10;
        if (currentDiff === 'easy') {
          a = Math.floor(Math.random() * 20) + 1;
          b = Math.floor(Math.random() * 20) + 1;
        } else if (currentDiff === 'medium') {
          a = Math.floor(Math.random() * 90) + 10;
          b = Math.floor(Math.random() * 90) + 10;
        } else if (currentDiff === 'hard') {
          a = Math.floor(Math.random() * 900) + 100;
          b = Math.floor(Math.random() * 900) + 100;
        } else {
          a = Math.floor(Math.random() * 9000) + 1000;
          b = Math.floor(Math.random() * 9000) + 1000;
        }
        qText = `${a} + ${b}`;
        ans = a + b;
        break;
      }
      case '-': {
        let a = 20, b = 10;
        if (currentDiff === 'easy') {
          a = Math.floor(Math.random() * 20) + 2;
          b = Math.floor(Math.random() * a);
        } else if (currentDiff === 'medium') {
          a = Math.floor(Math.random() * 90) + 10;
          b = Math.floor(Math.random() * a);
        } else if (currentDiff === 'hard') {
          a = Math.floor(Math.random() * 900) + 100;
          b = Math.floor(Math.random() * a);
        } else {
          a = Math.floor(Math.random() * 9000) + 1000;
          b = Math.floor(Math.random() * a);
        }
        qText = `${a} - ${b}`;
        ans = a - b;
        break;
      }
      case '*': {
        let a = 2, b = 10;
        if (currentDiff === 'easy') {
          a = Math.floor(Math.random() * 10) + 1;
          b = Math.floor(Math.random() * 10) + 1;
        } else if (currentDiff === 'medium') {
          a = Math.floor(Math.random() * 11) + 2;
          b = Math.floor(Math.random() * 90) + 10;
        } else if (currentDiff === 'hard') {
          a = Math.floor(Math.random() * 25) + 10;
          b = Math.floor(Math.random() * 88) + 12;
        } else {
          a = Math.floor(Math.random() * 75) + 25;
          b = Math.floor(Math.random() * 75) + 25;
        }
        qText = `${a} × ${b}`;
        ans = a * b;
        break;
      }
      case '/': {
        let b = 2, ansGen = 10;
        if (currentDiff === 'easy') {
          b = Math.floor(Math.random() * 10) + 1;
          ansGen = Math.floor(Math.random() * 10) + 1;
        } else if (currentDiff === 'medium') {
          b = Math.floor(Math.random() * 11) + 2;
          ansGen = Math.floor(Math.random() * 90) + 10;
        } else if (currentDiff === 'hard') {
          b = Math.floor(Math.random() * 20) + 10;
          ansGen = Math.floor(Math.random() * 88) + 12;
        } else {
          b = Math.floor(Math.random() * 35) + 15;
          ansGen = Math.floor(Math.random() * 125) + 25;
        }
        const a = b * ansGen;
        qText = `${a} ÷ ${b}`;
        ans = ansGen;
        break;
      }
      case 'bodmas': {
        const a = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 10) + 2;
        const c = Math.floor(Math.random() * 10) + 1;
        const type = Math.floor(Math.random() * 3);
        if (type === 0) {
          qText = `(${a} + ${b}) × ${c}`;
          ans = (a + b) * c;
        } else if (type === 1) {
          qText = `${a} + ${b} × ${c}`;
          ans = a + (b * c);
        } else {
          const d = (a + b) * c;
          qText = `${d} ÷ (${a} + ${b})`;
          ans = c;
        }
        break;
      }
      case 'fractions': {
        const denom = [2, 4, 5, 10][Math.floor(Math.random() * 4)];
        const num = Math.floor(Math.random() * (denom - 1)) + 1;
        const total = denom * (Math.floor(Math.random() * 12) + 2);
        qText = `${num}/${denom} of ${total}`;
        ans = (num / denom) * total;
        break;
      }
      case 'decimals': {
        const a = (Math.floor(Math.random() * 90) + 10) / 10;
        const b = (Math.floor(Math.random() * 90) + 10) / 10;
        qText = `${a} + ${b}`;
        ans = Math.round((a + b) * 10) / 10;
        break;
      }
      case 'percentages': {
        const p = [10, 20, 25, 50, 75][Math.floor(Math.random() * 5)];
        const base = (Math.floor(Math.random() * 20) + 1) * 20;
        qText = `${p}% of ${base}`;
        ans = (p / 100) * base;
        break;
      }
      case 'factors': {
        const nums = [12, 16, 18, 20, 24, 30, 36, 40, 48, 60];
        const n = nums[Math.floor(Math.random() * nums.length)];
        qText = `Total factors of ${n}`;
        ans = countFactors(n);
        break;
      }
      case 'multiples': {
        const base = Math.floor(Math.random() * 12) + 2;
        const idx = Math.floor(Math.random() * 9) + 2;
        qText = `${idx}th multiple of ${base}`;
        ans = base * idx;
        break;
      }
      case 'hcf': {
        const common = Math.floor(Math.random() * 10) + 2;
        const x = [2, 3, 5, 7][Math.floor(Math.random() * 4)];
        let y = [2, 3, 5, 7][Math.floor(Math.random() * 4)];
        while (y === x) y = [2, 3, 5, 7][Math.floor(Math.random() * 4)];
        const a = common * x;
        const b = common * y;
        qText = `HCF of ${a} and ${b}`;
        ans = gcd(a, b);
        break;
      }
      case 'lcm': {
        const a = Math.floor(Math.random() * 10) + 2;
        const b = Math.floor(Math.random() * 10) + 2;
        qText = `LCM of ${a} and ${b}`;
        ans = lcmCalc(a, b);
        break;
      }
      case '^2': {
        let a = 5;
        if (currentDiff === 'easy') a = Math.floor(Math.random() * 10) + 1;
        else if (currentDiff === 'medium') a = Math.floor(Math.random() * 25) + 1;
        else if (currentDiff === 'hard') a = Math.floor(Math.random() * 35) + 15;
        else a = Math.floor(Math.random() * 70) + 30;
        qText = `${a}²`;
        ans = a * a;
        break;
      }
      case 'sqrt': {
        let a = 5;
        if (currentDiff === 'easy') a = Math.floor(Math.random() * 10) + 1;
        else if (currentDiff === 'medium') a = Math.floor(Math.random() * 25) + 1;
        else if (currentDiff === 'hard') a = Math.floor(Math.random() * 35) + 15;
        else a = Math.floor(Math.random() * 70) + 30;
        qText = `√${a * a}`;
        ans = a;
        break;
      }
      case 'powers': {
        const base = [2, 3, 4, 5, 10][Math.floor(Math.random() * 5)];
        const exp = base === 2 ? Math.floor(Math.random() * 6) + 2 : base === 3 ? Math.floor(Math.random() * 3) + 2 : 2;
        qText = `${base}^${exp}`;
        ans = Math.pow(base, exp);
        break;
      }
      case 'ratios': {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = Math.floor(Math.random() * 5) + 2;
        const unit = Math.floor(Math.random() * 10) + 2;
        const total = (r1 + r2) * unit;
        qText = `Ratio ${r1}:${r2} of ${total} (larger part)`;
        ans = Math.max(r1, r2) * unit;
        break;
      }
      case 'algebra': {
        const xVal = Math.floor(Math.random() * 12) + 1;
        const coeff = Math.floor(Math.random() * 6) + 2;
        const constVal = Math.floor(Math.random() * 20) + 1;
        const result = coeff * xVal + constVal;
        qText = `If ${coeff}x + ${constVal} = ${result}, x`;
        ans = xVal;
        break;
      }
      case 'area': {
        const shape = Math.floor(Math.random() * 3);
        if (shape === 0) {
          const side = Math.floor(Math.random() * 15) + 2;
          qText = `Area of square (side = ${side})`;
          ans = side * side;
        } else if (shape === 1) {
          const l = Math.floor(Math.random() * 15) + 2;
          const w = Math.floor(Math.random() * 10) + 2;
          qText = `Area of rectangle (${l} × ${w})`;
          ans = l * w;
        } else {
          const b = (Math.floor(Math.random() * 10) + 2) * 2;
          const h = Math.floor(Math.random() * 10) + 2;
          qText = `Area of triangle (b=${b}, h=${h})`;
          ans = 0.5 * b * h;
        }
        break;
      }
      case 'perimeter': {
        const l = Math.floor(Math.random() * 20) + 3;
        const w = Math.floor(Math.random() * 15) + 2;
        qText = `Perimeter of rectangle (${l} by ${w})`;
        ans = 2 * (l + w);
        break;
      }
      case 'volume': {
        const s = Math.floor(Math.random() * 8) + 2;
        qText = `Volume of cube (side = ${s})`;
        ans = s * s * s;
        break;
      }
      case 'stats': {
        const type = Math.floor(Math.random() * 3);
        if (type === 0) {
          qText = `Mean of [10, 20, 30]`;
          ans = 20;
        } else if (type === 1) {
          qText = `Median of [2, 5, 8, 12, 19]`;
          ans = 8;
        } else {
          const mVal = Math.floor(Math.random() * 9) + 1;
          qText = `Mode of [${mVal}, ${mVal}, ${mVal + 2}, ${mVal + 5}]`;
          ans = mVal;
        }
        break;
      }
      case 'probability': {
        const dieProb = Math.floor(Math.random() * 2);
        if (dieProb === 0) {
          qText = `Outcomes for 6-sided die`;
          ans = 6;
        } else {
          qText = `Probability of Heads on fair coin (1/N, enter N)`;
          ans = 2;
        }
        break;
      }
    }

    return {
      text: qText,
      answer: ans,
      operation: op,
      difficultyTag: currentDiff
    };
  };

  const generateQuestionSet = (count: number) => {
    const newQs: Question[] = [];
    for (let i = 0; i < count; i++) {
      newQs.push(createSingleQuestion(i, count, selectedModes, selectedOps, difficulty));
    }
    return newQs;
  };

  const startGame = () => {
    if (selectedOps.length === 0 && !selectedModes.includes('mixed')) return;

    const initialCount = selectedModes.includes('battle') ? 30 : numQuestions;
    const initialQs = generateQuestionSet(initialCount);
    
    setQuestions(initialQs);
    setCurrentQIndex(0);
    setInputVal('');
    setAnswers(new Array(initialCount).fill(null));
    setEndReason(null);
    setStreakBroken(false);
    setFlashFeedback(null);

    // Set overall timer
    if (selectedModes.includes('battle')) {
      setTimeLeft(60); // 60 seconds fixed for Calculation Battle
    } else if (durationMinutes > 0) {
      setTimeLeft(durationMinutes * 60);
    } else {
      setTimeLeft(null);
    }

    // Set Blitz per-question timer
    if (selectedModes.includes('blitz')) {
      setBlitzTimeLeft(blitzSecondsPerQ);
    } else {
      setBlitzTimeLeft(null);
    }

    setStartTime(Date.now());
    setGameState('playing');

    setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  };

  // Overall Timer effect
  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft !== null) {
      if (timeLeft <= 0) {
        endGame(answers, 'Time Limit Reached!');
      } else {
        timer = setInterval(() => {
          setTimeLeft(t => (t ? t - 1 : null));
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, answers]);

  // Blitz Per-Question Timer effect
  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && selectedModes.includes('blitz') && blitzTimeLeft !== null) {
      if (blitzTimeLeft <= 0) {
        // Blitz time expired on current question!
        if (selectedModes.includes('streak')) {
          setStreakBroken(true);
          endGame(answers, 'Blitz Timeout - Streak Ended!');
        } else {
          // Auto submit timeout (wrong/skip)
          handleAnswerSubmit(NaN, true);
        }
      } else {
        timer = setInterval(() => {
          setBlitzTimeLeft(t => (t !== null ? t - 1 : null));
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [gameState, blitzTimeLeft, selectedModes, currentQIndex]);

  // Number Rush Auto-Submit Listener
  useEffect(() => {
    if (gameState !== 'playing' || !selectedModes.includes('rush')) return;
    if (!inputVal.trim() || inputVal === '-') return;

    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed === currentQ.answer) {
      handleAnswerSubmit(parsed);
    }
  }, [inputVal, currentQIndex, questions, gameState, selectedModes]);

  const handleAnswerSubmit = (submittedAns: number, isTimeout = false) => {
    const currentQ = questions[currentQIndex];
    const isCorrect = !isNaN(submittedAns) && submittedAns === currentQ.answer;

    // Flash feedback
    setFlashFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFlashFeedback(null), 300);

    // Check Streak mode failure
    if (!isCorrect && selectedModes.includes('streak')) {
      const newAnsList = [...answers];
      newAnsList[currentQIndex] = isNaN(submittedAns) ? null : submittedAns;
      setAnswers(newAnsList);
      setStreakBroken(true);
      endGame(newAnsList, isTimeout ? 'Blitz Timeout - Streak Broken!' : 'Mistake Made in Streak Mode!');
      return;
    }

    const newAnsList = [...answers];
    newAnsList[currentQIndex] = isNaN(submittedAns) ? null : submittedAns;
    setAnswers(newAnsList);
    setInputVal('');

    // Calculation Battle continuous question generation
    if (selectedModes.includes('battle') && currentQIndex + 2 >= questions.length) {
      const nextQ = createSingleQuestion(questions.length, 100, selectedModes, selectedOps, difficulty);
      setQuestions(prev => [...prev, nextQ]);
      setAnswers(prev => [...prev, null]);
    }

    // Reset Blitz per-question timer for next question
    if (selectedModes.includes('blitz')) {
      setBlitzTimeLeft(blitzSecondsPerQ);
    }

    // Advance to next question or complete
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      endGame(newAnsList, 'All Questions Completed!');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const parsed = parseFloat(inputVal);
    handleAnswerSubmit(isNaN(parsed) ? 0 : parsed);
  };

  const endGame = (finalAnswers: (number | null)[], reason?: string) => {
    setGameState('results');
    if (reason) setEndReason(reason);
    const totalTime = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    setTimeTaken(totalTime);

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (finalAnswers[idx] === q.answer) correctCount++;
    });

    recordSkillActivity('math', prev => ({
      attempted: prev.attempted + questions.length,
      solved: prev.solved + correctCount,
      totalTimeSeconds: prev.totalTimeSeconds + totalTime,
    }));

    recordSkillActivity('speed', prev => ({
      totalTimeSeconds: prev.totalTimeSeconds + totalTime,
      itemCounts: prev.itemCounts + questions.length,
    }));

    if (onBulkSolve) {
      const results = questions.slice(0, finalAnswers.length).map((q, idx) => ({
        isCorrect: finalAnswers[idx] === q.answer,
        timeTaken: totalTime / Math.max(1, finalAnswers.length),
        puzzleType: 'calculation-monarch'
      }));
      
      const solved = results.filter(r => r.isCorrect).length;
      // Bonus multiplier for selecting multiple active modes
      const modeMultiplier = 1 + (selectedModes.length - 1) * 0.15;
      const xpEarned = Math.round(solved * 6 * modeMultiplier);
      const coinsEarned = Math.round((solved / 2) * modeMultiplier);
      
      onBulkSolve(xpEarned, coinsEarned, results);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Calculations for current playing stats
  const solvedSoFar = answers.filter((a, idx) => a !== null && a === questions[idx]?.answer).length;
  const attemptedSoFar = answers.filter(a => a !== null).length;
  const currentAccuracy = attemptedSoFar > 0 ? Math.round((solvedSoFar / attemptedSoFar) * 100) : 100;

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => onNavigate('home')}
              className="flex items-center text-zinc-400 hover:text-white transition-colors text-sm font-semibold bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2 text-amber-400" />
              Back
            </button>
            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Multi-Mode Trainer</span>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500" />

            {/* Title Section */}
            <div className="flex items-center gap-4 pb-4 border-b border-zinc-800/80">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Calculation Monarch
                </h1>
                <p className="text-zinc-400 text-xs md:text-sm">
                  Select your desired challenge modes and question levels below
                </p>
              </div>
            </div>

            {/* MODE SELECTION SECTION */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <label className="text-base font-bold text-white tracking-tight">
                    Select Game Modes
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {selectedModes.length} Selected
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedModes(GAME_MODES.map(m => m.id))}
                    className="text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModes([])}
                    className="text-zinc-400 hover:text-zinc-200 font-bold underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Quick Preset Combo Chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[11px] font-semibold text-zinc-400 self-center mr-1">Combos:</span>
                <button
                  type="button"
                  onClick={() => setPresetModes(['monarch', 'battle'])}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all"
                >
                  👑 Monarch Battle
                </button>
                <button
                  type="button"
                  onClick={() => setPresetModes(['blitz', 'survival'])}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-yellow-300 text-xs font-semibold border border-yellow-500/30 transition-all"
                >
                  ⚡ Blitz Survival
                </button>
                <button
                  type="button"
                  onClick={() => setPresetModes(['streak', 'rush'])}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-300 text-xs font-semibold border border-orange-500/30 transition-all"
                >
                  🔥 Streak Rush
                </button>
                <button
                  type="button"
                  onClick={() => setPresetModes(['accuracy', 'mixed'])}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all"
                >
                  🎯 Precision Mixed
                </button>
                <button
                  type="button"
                  onClick={() => setPresetModes(GAME_MODES.map(m => m.id))}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-rose-500/20 hover:from-purple-500/30 hover:to-rose-500/30 text-purple-200 text-xs font-bold border border-purple-500/40 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  All 8 Modes Unleashed
                </button>
              </div>

              {/* Mode Selection Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GAME_MODES.map((m) => {
                  const isSelected = selectedModes.includes(m.id);
                  return (
                    <motion.div
                      key={m.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleMode(m.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between relative overflow-hidden ${
                        isSelected 
                          ? `${m.badgeBg} ${m.badgeBorder} shadow-lg shadow-${m.accentColor}-500/10`
                          : 'bg-zinc-800/40 border-zinc-700/60 hover:bg-zinc-800/80 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start space-x-3 pr-6">
                        <span className="text-2xl shrink-0 leading-none pt-0.5">{m.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                              {m.name}
                            </span>
                          </div>
                          <p className={`text-[11px] font-semibold tracking-tight ${isSelected ? m.badgeText : 'text-amber-400/80'}`}>
                            {m.tagline}
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="absolute top-3.5 right-3.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected 
                            ? 'bg-amber-400 border-amber-300 text-black font-black' 
                            : 'border-zinc-600 bg-zinc-900/80 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {selectedModes.length === 0 && (
                <div className="p-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Please select at least one mode to customize your challenge rules.
                </div>
              )}
            </div>

            {/* DIFFICULTY LEVEL SELECTION */}
            <div className="border-t border-zinc-800/80 pt-6">
              <label className="block text-sm font-bold text-white mb-2">
                Question Level / Base Difficulty
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {[
                  { id: 'easy', label: 'Easy', color: 'emerald' },
                  { id: 'medium', label: 'Medium', color: 'amber' },
                  { id: 'hard', label: 'Hard', color: 'orange' },
                  { id: 'extreme', label: 'Extreme', color: 'red' },
                  { id: 'all', label: 'All Levels', color: 'purple' }
                ].map(({ id, label }) => {
                  const isSelected = difficulty === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDifficulty(id as any)}
                      className={`py-2.5 px-1 sm:px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                        isSelected
                          ? id === 'easy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : id === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                          : id === 'hard' ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-md shadow-orange-500/10'
                          : id === 'extreme' ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                          : 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                          : 'bg-zinc-800/50 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {(selectedModes.includes('monarch') || selectedModes.includes('survival')) && (
                <p className="text-[11px] text-amber-400/90 mt-2 italic flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  Note: Active Monarch/Survival mode will scale difficulty progressively regardless of base level setting.
                </p>
              )}
            </div>

            {/* TOPIC SELECTION SECTION */}
            <div className="border-t border-zinc-800/80 pt-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-white">
                  Math Topics ({selectedModes.includes('mixed') ? 'All Topics Mixed' : `${selectedOps.length}/${ALL_OPERATIONS.length} Selected`})
                </label>
                {!selectedModes.includes('mixed') && (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedOps(ALL_OPERATIONS.map(item => item.op))}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOps([])}
                      className="text-zinc-400 hover:text-zinc-200 underline font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {selectedModes.includes('mixed') ? (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    Mixed Mastery Active: Questions will automatically sample across ALL unlocked math operations!
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {ALL_OPERATIONS.map(({ op, label, symbol }) => {
                    const isSelected = selectedOps.includes(op);
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => toggleOp(op)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow-sm shadow-amber-500/10' 
                            : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <span className="text-xs font-semibold truncate pr-1">{label}</span>
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-950/60 text-amber-400 shrink-0">
                          {symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TEST LIMITS & SLIDERS */}
            <div className="border-t border-zinc-800/80 pt-6 space-y-5">
              {!selectedModes.includes('battle') && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-zinc-300">Number of Questions</label>
                    <span className="text-amber-400 font-bold font-mono text-base">{numQuestions}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    step="5"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}

              {selectedModes.includes('blitz') && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-400" /> Blitz Per-Question Timer
                    </label>
                    <span className="text-yellow-400 font-bold font-mono text-base">{blitzSecondsPerQ} sec</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="15" 
                    value={blitzSecondsPerQ}
                    onChange={(e) => setBlitzSecondsPerQ(parseInt(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-zinc-300">Total Time Limit</label>
                  <span className="text-amber-400 font-bold font-mono text-base">
                    {selectedModes.includes('battle') ? '60s Fixed (Battle)' : durationMinutes === 0 ? 'No Limit' : `${durationMinutes} min`}
                  </span>
                </div>
                {!selectedModes.includes('battle') && (
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* START BUTTON */}
            <button
              onClick={startGame}
              disabled={selectedModes.length === 0 || (!selectedModes.includes('mixed') && selectedOps.length === 0)}
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black py-4 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-500/20 text-lg tracking-wide uppercase"
            >
              <Play className="w-6 h-6 mr-2 fill-current" />
              START TEST ({selectedModes.length} {selectedModes.length === 1 ? 'MODE' : 'MODES'} ACTIVE)
            </button>

          </div>
        </div>
      </div>
    );
  }

  // PLAYING STATE
  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentQIndex];

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 md:p-6 text-zinc-100 transition-colors duration-300 ${
        flashFeedback === 'correct' ? 'bg-emerald-950/40' : flashFeedback === 'wrong' ? 'bg-rose-950/40' : 'bg-zinc-950'
      }`}>
        <div className="w-full max-w-lg">
          
          {/* Active Modes Banner Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
            {selectedModes.map(mId => {
              const config = GAME_MODES.find(g => g.id === mId);
              if (!config) return null;
              return (
                <span 
                  key={mId} 
                  className={`text-[11px] font-bold font-mono px-2.5 py-1 rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText} flex items-center gap-1 shadow-sm`}
                >
                  <span>{config.emoji}</span>
                  <span>{config.name}</span>
                </span>
              );
            })}
          </div>

          {/* Top Info Bar */}
          <div className="flex justify-between items-center mb-6 bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center text-zinc-300 font-semibold text-sm">
              <Target className="w-4 h-4 mr-1.5 text-indigo-400" />
              <span>
                {selectedModes.includes('battle') ? `Solved: ${solvedSoFar}` : `Q ${currentQIndex + 1} / ${questions.length}`}
              </span>
            </div>

            {/* Blitz Question Timer */}
            {selectedModes.includes('blitz') && blitzTimeLeft !== null && (
              <div className={`flex items-center font-mono font-bold text-sm px-2.5 py-1 rounded-xl bg-yellow-500/10 border border-yellow-500/30 ${
                blitzTimeLeft <= 2 ? 'text-red-400 animate-ping' : 'text-yellow-400'
              }`}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                <span>{blitzTimeLeft}s Blitz</span>
              </div>
            )}

            {/* Overall Countdown Timer */}
            {timeLeft !== null && (
              <div className={`flex items-center font-mono font-bold text-lg ${
                timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'
              }`}>
                <Timer className="w-5 h-5 mr-1.5" />
                {formatTime(timeLeft)}
              </div>
            )}

            {/* Live Accuracy Tracker */}
            {selectedModes.includes('accuracy') && (
              <div className="text-emerald-400 font-mono font-bold text-sm flex items-center">
                🎯 {currentAccuracy}%
              </div>
            )}
          </div>

          {/* Per-Question Blitz Progress Bar */}
          {selectedModes.includes('blitz') && blitzTimeLeft !== null && (
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-6">
              <motion.div 
                className="h-full bg-yellow-400 rounded-full"
                animate={{ width: `${(blitzTimeLeft / blitzSecondsPerQ) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          )}

          {/* Main Question Display Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 flex flex-col items-center shadow-2xl mb-6 relative overflow-hidden">
            {q.difficultyTag && (
              <span className="absolute top-3 right-4 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-widest bg-zinc-950/60 px-2.5 py-1 rounded-full border border-zinc-800">
                {q.difficultyTag}
              </span>
            )}

            <h1 className="text-4xl md:text-5xl font-black font-mono tracking-tight my-6 text-center text-white">
              {q.text} <span className="text-amber-400">=</span>
            </h1>

            {/* Form Input */}
            <form onSubmit={handleFormSubmit} className="w-full">
              <input
                ref={inputRef}
                type="number"
                step="any"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className={`w-full bg-zinc-950 border-2 rounded-2xl py-4 text-center text-3xl font-mono text-white focus:outline-none transition-colors ${
                  flashFeedback === 'correct' ? 'border-emerald-500 bg-emerald-950/20' :
                  flashFeedback === 'wrong' ? 'border-rose-500 bg-rose-950/20' :
                  'border-zinc-700 focus:border-amber-500'
                }`}
                placeholder="?"
                autoFocus
                autoComplete="off"
              />
            </form>

            {selectedModes.includes('rush') && (
              <p className="text-[11px] text-indigo-400 mt-2 font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" /> Number Rush active: exact answer auto-submits instantly!
              </p>
            )}
          </div>

          {/* Keypad Controls */}
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0, 'Enter'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  if (key === 'Enter') handleFormSubmit(e as any);
                  else if (key === '-') setInputVal(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
                  else setInputVal(prev => prev + key);
                  inputRef.current?.focus();
                }}
                className={`py-3.5 text-2xl font-mono rounded-2xl transition-all active:scale-95 ${
                  key === 'Enter' ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-500/20' :
                  key === '-' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold' :
                  'bg-zinc-800 hover:bg-zinc-700 text-white font-semibold'
                }`}
              >
                {key}
              </button>
            ))}
            <button 
              type="button"
              onClick={() => {
                setInputVal(prev => prev.slice(0, -1));
                inputRef.current?.focus();
              }}
              className="col-span-3 py-3 text-sm font-bold rounded-2xl bg-zinc-900 text-red-400 hover:bg-zinc-800 border border-zinc-800 transition-colors tracking-wider"
            >
              DELETE
            </button>
          </div>

          <div className="mt-6 text-center">
            <button 
              onClick={() => endGame(answers, 'User Quit Test')}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold underline"
            >
              End Test & View Results
            </button>
          </div>

        </div>
      </div>
    );
  }

  // RESULTS STATE
  const correctCount = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0), 0);
  const totalAttempted = answers.filter(a => a !== null).length;
  const accuracy = Math.round((correctCount / Math.max(1, totalAttempted)) * 100) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-lg mt-4 md:mt-8">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-indigo-500" />

          {/* Result Banner Header */}
          <div className="flex flex-col items-center mb-6 text-center">
            {streakBroken ? (
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3">
                <Flame className="w-10 h-10 animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
                <Trophy className="w-10 h-10" />
              </div>
            )}

            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {streakBroken ? 'Streak Broken!' : 'Test Complete'}
            </h2>
            {endReason && (
              <p className="text-xs text-amber-400/90 font-mono font-semibold mt-1">
                {endReason}
              </p>
            )}

            {/* Mode Pills Summary */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {selectedModes.map(mId => {
                const config = GAME_MODES.find(g => g.id === mId);
                if (!config) return null;
                return (
                  <span key={mId} className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${config.badgeBg} ${config.badgeBorder} ${config.badgeText}`}>
                    {config.emoji} {config.name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800/80 text-center mb-6">
            <div>
              <p className="text-2xl md:text-3xl font-mono font-black text-white">{correctCount}/{totalAttempted}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Solved</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-mono font-black text-emerald-400">{accuracy}%</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-mono font-black text-indigo-400">{formatTime(timeTaken)}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Time</p>
            </div>
          </div>

          {/* Answers Breakdown List */}
          <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-2 custom-scrollbar">
            {questions.slice(0, answers.length).map((q, idx) => {
              const isCorrect = answers[idx] === q.answer;
              const answered = answers[idx] !== null && answers[idx] !== undefined;
              return (
                <div key={idx} className={`p-3.5 rounded-xl border flex justify-between items-center text-sm ${
                  isCorrect ? 'bg-emerald-900/10 border-emerald-900/40 text-emerald-200' : 'bg-rose-900/10 border-rose-900/40 text-rose-200'
                }`}>
                  <div className="flex items-center">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 mr-2.5 shrink-0" />
                    )}
                    <span className="font-mono font-semibold">{q.text} = {q.answer}</span>
                  </div>
                  {!isCorrect && answered && (
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Your input:</span>
                      <span className="font-mono text-rose-400 font-bold line-through">{answers[idx]}</span>
                    </div>
                  )}
                  {!isCorrect && !answered && (
                    <span className="text-zinc-500 text-xs italic">Skipped</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => setGameState('setup')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-amber-500/20 text-sm tracking-wide"
            >
              CONFIGURE & PLAY AGAIN
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              BACK TO HOME
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
