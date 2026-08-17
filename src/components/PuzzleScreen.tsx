import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Lightbulb, CheckCircle2, XCircle, Loader2, BrainCircuit, RefreshCw, 
  Play, Sparkles, Target, Trophy, Zap, Layers
} from 'lucide-react';
import { Puzzle, Screen, UserStats } from '../types';
import { generateBatchPuzzles, getHint, evaluateLogic, getFallbackPuzzle } from '../services/ai';
import { recordSkillActivity } from '../utils/dailyTracker';
import GeneratingLoader from './GeneratingLoader';

interface PuzzleScreenProps {
  mode: 'normal' | 'daily';
  onNavigate: (screen: Screen) => void;
  onSolve: (xp: number, coins: number, isCorrect: boolean, timeTaken: number, puzzleType: string) => void;
  onSpendCoins?: (amount: number) => void;
  stats: UserStats;
}

export default function PuzzleScreen({ mode, onNavigate, onSolve, onSpendCoins, stats }: PuzzleScreenProps) {
  // Screen mode: 'setup' | 'generating' | 'playing' | 'results'
  const [screenMode, setScreenMode] = useState<'setup' | 'generating' | 'playing' | 'results'>(
    mode === 'daily' ? 'generating' : 'setup'
  );

  // Setup Options
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('mixed');

  // Session Batch State
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  // Puzzle Interaction State
  const [input, setInput] = useState('');
  const [logicInput, setLogicInput] = useState('');
  const [status, setStatus] = useState<'playing' | 'correct' | 'failed' | 'evaluating'>('playing');
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isRetry, setIsRetry] = useState(false);

  // Session Results Stats
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);

  // Errors / Limits
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const [missingApiKey, setMissingApiKey] = useState(false);

  const incrementDailyChallenge = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dataStr = localStorage.getItem('daily_challenge');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.date === today) {
          localStorage.setItem('daily_challenge', JSON.stringify({ date: today, completedCount: (data.completedCount || 0) + 1 }));
        }
      }
    } catch (e) {}
  };

  const checkDailyLimitReached = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dataStr = localStorage.getItem('daily_challenge');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.date === today && data.completedCount >= 10) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  // Generate Batch of Puzzles
  const startSessionBatch = async (countToGen: number, diffToGen: string) => {
    if (mode === 'daily' && checkDailyLimitReached()) {
      onNavigate('daily');
      return;
    }

    setScreenMode('generating');
    setGenerationProgress(0);
    setMissingApiKey(false);
    setRateLimitReached(false);

    // Live progress timer (counts up to ~92% during generation)
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 7 + 4;
      if (currentProgress > 92) currentProgress = 92;
      setGenerationProgress(Math.min(92, Math.round(currentProgress)));
    }, 110);

    try {
      const accuracy = stats.totalAttempts > 0 ? stats.puzzlesSolved / stats.totalAttempts : 0.5;
      let favoriteType = 'logic';
      let maxAttempts = 0;
      Object.entries(stats.typeStats || {}).forEach(([type, data]) => {
        if (data.attempts > maxAttempts) {
          maxAttempts = data.attempts;
          favoriteType = type;
        }
      });

      const batch = await generateBatchPuzzles(countToGen, diffToGen, {
        accuracy,
        averageTime: stats.averageTime || 60,
        favoriteType
      });

      clearInterval(interval);
      setGenerationProgress(100);

      setTimeout(() => {
        setPuzzles(batch);
        setCurrentIndex(0);
        setSessionXP(0);
        setSessionCoins(0);
        setSessionCorrectCount(0);
        setHints([]);
        setInput('');
        setLogicInput('');
        setStatus('playing');
        setStartTime(Date.now());
        setIsRetry(false);
        setScreenMode('playing');
      }, 350);
    } catch (error: any) {
      clearInterval(interval);
      if (error.message === 'RATE_LIMIT_REACHED') {
        setRateLimitReached(true);
      } else if (error.message === 'MISSING_API_KEY') {
        setMissingApiKey(true);
      } else {
        console.warn("Failed to generate AI puzzle batch, using offline set:", error);
        const diffs = ['beginner', 'intermediate', 'hard', 'super hard', 'extreme'];
        const types = ['logic', 'math', 'sequence', 'pattern matching', 'trick'];
        const fbBatch: Puzzle[] = [];
        for (let i = 0; i < countToGen; i++) {
          fbBatch.push(getFallbackPuzzle(diffs[i % diffs.length], types[i % types.length]));
        }
        setGenerationProgress(100);
        setTimeout(() => {
          setPuzzles(fbBatch);
          setCurrentIndex(0);
          setSessionXP(0);
          setSessionCoins(0);
          setSessionCorrectCount(0);
          setHints([]);
          setInput('');
          setLogicInput('');
          setStatus('playing');
          setStartTime(Date.now());
          setIsRetry(false);
          setScreenMode('playing');
        }, 300);
      }
    }
  };

  useEffect(() => {
    if (mode === 'daily') {
      startSessionBatch(5, 'mixed');
    } else {
      setScreenMode('setup');
    }
  }, [mode]);

  const puzzle = puzzles[currentIndex] || null;

  const handleHint = async () => {
    if (!puzzle || hintLoading || stats.coins < 10) return;
    
    setHintLoading(true);
    try {
      const newHint = await getHint(puzzle, input, hints.length + 1);
      setHints(prev => [...prev, newHint]);
      if (onSpendCoins) {
        onSpendCoins(10);
      }
    } catch (error: any) {
      if (error.message !== 'RATE_LIMIT_REACHED' && error.message !== 'MISSING_API_KEY') {
        console.error("Failed to get hint", error);
      }
    } finally {
      setHintLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!puzzle || !input) return;

    if (puzzle.options && puzzle.options.length > 0) {
       if (input.toLowerCase() === puzzle.answer.toLowerCase()) {
         handleCorrect();
       } else {
         handleIncorrect();
       }
    } else {
       if (input.toLowerCase().trim() === puzzle.answer.toLowerCase().trim() && !logicInput) {
           handleCorrect();
       } else {
           setStatus('evaluating');
           try {
             const evalResult = await evaluateLogic(puzzle, input, logicInput);
             if (evalResult.isCorrect) {
                 setFeedback(evalResult.feedback);
                 handleCorrect();
             } else {
                 setFeedback(evalResult.feedback);
                 handleIncorrect();
             }
           } catch (e) {
             handleIncorrect();
           }
       }
    }
  };

  const handleCorrect = () => {
    setStatus('correct');
    const timeTaken = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const pType = (puzzle?.type || 'logic').toLowerCase();

    recordSkillActivity('solving_puzzle', prev => ({
      attempted: prev.attempted + 1,
      solved: prev.solved + 1,
      totalTimeSeconds: prev.totalTimeSeconds + timeTaken,
    }));

    recordSkillActivity('speed', prev => ({
      totalTimeSeconds: prev.totalTimeSeconds + timeTaken,
      itemCounts: prev.itemCounts + 1,
    }));

    if (pType.includes('logic') || pType.includes('deduction') || pType.includes('reasoning')) {
      recordSkillActivity('logic', prev => ({ attempted: prev.attempted + 1, solved: prev.solved + 1 }));
    }
    if (pType.includes('pattern') || pType.includes('sequence') || pType.includes('spatial')) {
      recordSkillActivity('pattern', prev => ({ attempted: prev.attempted + 1, solved: prev.solved + 1 }));
    }

    if (!isRetry) {
      let baseXP = 50;
      switch (puzzle?.difficulty) {
        case 'beginner': baseXP = 30; break;
        case 'intermediate': baseXP = 50; break;
        case 'hard': baseXP = 80; break;
        case 'super hard': baseXP = 120; break;
        case 'extreme': baseXP = 200; break;
      }

      const avgTime = stats.averageTime || 60;
      let timeBonus = 0;
      if (timeTaken < avgTime && timeTaken > 5) {
        timeBonus = Math.floor(baseXP * 0.5 * (1 - (timeTaken / avgTime)));
      }

      let logicBonus = 0;
      if (logicInput.trim().length > 15) {
        logicBonus = Math.floor(baseXP * 0.3);
      }

      const hintPenalty = hints.length * Math.floor(baseXP * 0.2);
      const xpEarned = Math.max(10, baseXP + timeBonus + logicBonus - hintPenalty);
      const coinsEarned = Math.max(1, Math.floor(xpEarned / 10));

      let finalXP = xpEarned;
      let finalCoins = coinsEarned;
      if (mode === 'daily') {
        finalXP *= 2;
        finalCoins *= 2;
        incrementDailyChallenge();
      }

      setSessionXP(prev => prev + finalXP);
      setSessionCoins(prev => prev + finalCoins);
      setSessionCorrectCount(prev => prev + 1);

      onSolve(finalXP, finalCoins, true, timeTaken, puzzle?.type || 'logic');
    } else {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      onSolve(10, 0, true, timeTaken, puzzle?.type || 'logic');
    }
  };

  const handleIncorrect = () => {
    setStatus('failed');
    const timeTaken = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    const pType = (puzzle?.type || 'logic').toLowerCase();

    recordSkillActivity('solving_puzzle', prev => ({
      attempted: prev.attempted + 1,
      solved: prev.solved,
      totalTimeSeconds: prev.totalTimeSeconds + timeTaken,
    }));

    recordSkillActivity('speed', prev => ({
      totalTimeSeconds: prev.totalTimeSeconds + timeTaken,
      itemCounts: prev.itemCounts + 1,
    }));

    if (pType.includes('logic') || pType.includes('deduction') || pType.includes('reasoning')) {
      recordSkillActivity('logic', prev => ({ attempted: prev.attempted + 1, solved: prev.solved }));
    }
    if (pType.includes('pattern') || pType.includes('sequence') || pType.includes('spatial')) {
      recordSkillActivity('pattern', prev => ({ attempted: prev.attempted + 1, solved: prev.solved }));
    }

    if (!isRetry) {
      if (mode === 'daily') {
        incrementDailyChallenge();
      }
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      onSolve(0, 0, false, timeTaken, puzzle?.type || 'logic');
    }
  };

  const handleNextPuzzleInBatch = () => {
    if (currentIndex + 1 < puzzles.length) {
      setCurrentIndex(prev => prev + 1);
      setStatus('playing');
      setInput('');
      setLogicInput('');
      setHints([]);
      setFeedback('');
      setStartTime(Date.now());
      setIsRetry(false);
    } else {
      setScreenMode('results');
    }
  };

  // Setup View
  if (screenMode === 'setup') {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-md mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => onNavigate('home')}
              className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold bg-indigo-950/40 border border-indigo-800/40 px-3 py-1.5 rounded-full">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
              <span>PUZZLE SESSION SETUP</span>
            </div>
            <div className="w-9" />
          </div>

          {/* Title Card */}
          <div className="text-center space-y-2 py-2">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Play Now</span>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-zinc-400 text-sm">
              Select session size. All puzzles generate at once in a single batch with zero lag while playing!
            </p>
          </div>

          {/* Count Selector */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white text-base">Select Number of Puzzles</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { count: 3, label: '3 Puzzles', sub: 'Quick Warmup' },
                { count: 5, label: '5 Puzzles', sub: 'Standard Session' },
                { count: 10, label: '10 Puzzles', sub: 'Mind Marathon' },
                { count: 15, label: '15 Puzzles', sub: 'Master Challenge' },
              ].map(item => (
                <button
                  key={item.count}
                  onClick={() => setSelectedCount(item.count)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedCount === item.count
                      ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/10'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="font-bold text-lg text-white">{item.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Select Difficulty Level</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'mixed', name: 'Mixed / Adaptive', color: 'text-indigo-400' },
                { id: 'beginner', name: 'Beginner', color: 'text-emerald-400' },
                { id: 'intermediate', name: 'Intermediate', color: 'text-blue-400' },
                { id: 'hard', name: 'Hard', color: 'text-amber-400' },
                { id: 'extreme', name: 'Extreme', color: 'text-rose-400' },
              ].map(diff => (
                <button
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                    selectedDifficulty === diff.id
                      ? 'bg-amber-500/20 border-amber-500 text-white ring-2 ring-amber-500/40'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <span className={diff.color}>{diff.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optimization Note */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-zinc-200">Batch Optimization:</strong> All {selectedCount} puzzles are requested in a single AI generation pass. No waiting between questions!
            </p>
          </div>

          {/* Start Session Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => startSessionBatch(selectedCount, selectedDifficulty)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg py-4 px-6 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START PUZZLE SESSION ({selectedCount})</span>
          </motion.button>
        </div>
      </div>
    );
  }

  // Generating View
  if (screenMode === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center fixed inset-0 bg-[#0A2353] text-white overflow-hidden z-50 p-6">
        {/* Deep Space Background Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B58EB]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#BB63FF]/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center justify-center max-w-sm w-full text-center">
          {/* Custom Loader with Progress Percentage */}
          <GeneratingLoader progress={generationProgress} text="AI PUZZLES" />
          
          <h2 className="text-2xl font-black text-white mt-8 mb-2 tracking-tight">
            Crafting {selectedCount} Puzzles...
          </h2>
          <p className="text-zinc-300 text-xs md:text-sm mb-6 max-w-xs leading-relaxed">
            Generating all selected puzzles in 1 batch for seamless, zero-lag gameplay.
          </p>

          {/* Loading Bar with Percentage */}
          <div className="w-full bg-zinc-900/90 rounded-full h-4 p-1 border border-zinc-700/80 shadow-2xl relative overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${generationProgress}%` }}
            />
          </div>

          {/* Percentage Counter Label */}
          <div className="flex justify-between w-full text-xs font-mono text-zinc-400 mt-2.5 px-1 font-semibold">
            <span>0%</span>
            <span className="text-emerald-400 font-bold text-sm tracking-wider">{generationProgress}% READY</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (screenMode === 'results') {
    const accuracyPct = puzzles.length > 0 ? Math.round((sessionCorrectCount / puzzles.length) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-amber-500/20 rounded-3xl border border-amber-500/30 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>

          <div>
            <h2 className="text-3xl font-black text-white">Session Completed!</h2>
            <p className="text-zinc-400 text-sm mt-1">Great job completing your puzzle batch.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Puzzles Solved</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{sessionCorrectCount} / {puzzles.length}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Accuracy</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">{accuracyPct}%</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Total XP</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">+{sessionXP}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 font-semibold uppercase block">Coins Earned</span>
              <span className="text-2xl font-black text-yellow-400 mt-1 block">+{sessionCoins}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                if (mode === 'daily') {
                  startSessionBatch(5, 'mixed');
                } else {
                  setScreenMode('setup');
                }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Play Another Session</span>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Return to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error States
  if (missingApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <BrainCircuit className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">AI Key Setup Required</h2>
          <p className="text-zinc-400 mb-6 text-sm">
            Activate your in-app Google Auth AI key to generate daily logic puzzles instantly without leaving the app.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setMissingApiKey(false);
                startSessionBatch(selectedCount, selectedDifficulty);
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>⚡ Auto-Activate In-App Key</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rateLimitReached) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <BrainCircuit className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Daily Limit Reached</h2>
          <p className="text-zinc-400 mb-8">
            You've solved so many puzzles that our AI needs a break! Please come back later to continue your brain training journey.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6 text-center">
        <BrainCircuit className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-bold mb-4">Failed to Load Puzzles</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          We couldn't generate puzzles at this time. Please check your connection or try again.
        </p>
        <div className="flex space-x-4">
          <button 
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={() => startSessionBatch(selectedCount, selectedDifficulty)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Playing View
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setScreenMode('setup')}
          className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-300 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
          <BrainCircuit className="w-4 h-4 text-indigo-400" />
          <span>PUZZLE {currentIndex + 1} OF {puzzles.length}</span>
        </div>
        <div className="flex items-center space-x-1 bg-zinc-900 px-3 py-1 rounded-full text-sm font-medium border border-zinc-800">
          <span className="text-emerald-400">{stats.coins}</span>
          <span className="text-zinc-500">C</span>
        </div>
      </div>

      {/* Progress Bar Across Top */}
      <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mb-6 border border-zinc-800">
        <motion.div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300" 
          style={{ width: `${((currentIndex + 1) / puzzles.length) * 100}%` }} 
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        {/* Puzzle Metadata Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 px-2.5 py-1 rounded-md font-semibold">
            {puzzle.difficulty}
          </span>
          <span className="text-xs font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-md">
            {puzzle.type}
          </span>
        </div>

        {/* Question Card */}
        <motion.div 
          key={puzzle.id || currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl backdrop-blur-sm"
        >
          <p className="text-lg md:text-xl font-medium leading-relaxed text-center text-zinc-100">
            {puzzle.question}
          </p>
        </motion.div>

        {/* Hints */}
        <AnimatePresence>
          {hints.map((hint, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 mb-4 text-sm text-indigo-200 flex items-start space-x-3"
            >
              <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p>{hint}</p>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Input Area */}
        <div className="mt-auto space-y-4">
          {puzzle.options && puzzle.options.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {puzzle.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(opt)}
                  disabled={status !== 'playing'}
                  className={`p-4 rounded-xl border transition-all disabled:opacity-50 ${
                    input === opt 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Your Answer..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-xl font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                disabled={status !== 'playing'}
              />
              <textarea
                value={logicInput}
                onChange={(e) => setLogicInput(e.target.value)}
                placeholder="Optional: Explain your logic to the AI..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24"
                disabled={status !== 'playing'}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleHint}
              disabled={hintLoading || stats.coins < 10 || status !== 'playing'}
              className="flex-1 flex items-center justify-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 disabled:opacity-50 transition-colors"
            >
              {hintLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5 text-amber-400" />}
              <span className="text-sm font-medium">Hint (10C)</span>
            </button>
            <button
              onClick={() => {
                setFeedback("You gave up. Here is the answer.");
                setStatus('failed');
                if (!isRetry) {
                  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
                  onSolve(0, 0, false, timeTaken, puzzle?.type || 'logic');
                }
              }}
              disabled={status !== 'playing'}
              className="flex-1 flex items-center justify-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-zinc-400" />
              <span className="text-sm font-medium">Give Up</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input || status !== 'playing'}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl p-4 font-bold tracking-wide transition-colors flex justify-center items-center"
            >
              {status === 'evaluating' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SUBMIT'}
            </button>
          </div>
        </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {status === 'correct' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center flex flex-col max-h-[90vh]"
            >
              <div className="flex-shrink-0 space-y-4 md:space-y-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 text-white">
                    Brilliant!
                  </h2>
                  <p className="text-zinc-400 text-sm">{feedback || "Your logic is flawless."}</p>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-4 text-left border border-zinc-800/50 my-4 md:my-6 overflow-y-auto flex-1 min-h-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold flex-shrink-0">AI Explanation</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <span className="font-bold text-white block mb-2">Answer: {puzzle.answer}</span>
                  {puzzle.explanation}
                </p>
              </div>

              <button
                onClick={handleNextPuzzleInBatch}
                className="flex-shrink-0 w-full bg-white text-black hover:bg-zinc-200 rounded-xl p-4 font-bold tracking-wide transition-colors flex items-center justify-center space-x-2"
              >
                <span>{currentIndex + 1 === puzzles.length ? "FINISH SESSION" : "NEXT PUZZLE"}</span>
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full text-center flex flex-col max-h-[90vh]"
            >
              <div className="flex-shrink-0 space-y-4 md:space-y-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                  <XCircle className="w-8 h-8 md:w-10 md:h-10 text-red-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-2 text-white">
                    {feedback === "You gave up. Here is the answer." ? "Keep Trying!" : "Incorrect"}
                  </h2>
                  <p className="text-zinc-400 text-sm">{feedback || "That wasn't the right answer."}</p>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-4 text-left border border-zinc-800/50 my-4 md:my-6 overflow-y-auto flex-1 min-h-0">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold flex-shrink-0">AI Explanation</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  <span className="font-bold text-white block mb-2">Correct Answer: {puzzle.answer}</span>
                  {puzzle.explanation}
                </p>
              </div>

              <div className="flex space-x-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setIsRetry(true);
                    setStatus('playing');
                    setInput('');
                    setLogicInput('');
                    setFeedback('');
                    setStartTime(Date.now());
                  }}
                  className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 rounded-xl p-4 font-bold tracking-wide transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>RETRY</span>
                </button>
                <button
                  onClick={handleNextPuzzleInBatch}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 rounded-xl p-4 font-bold tracking-wide transition-colors flex items-center justify-center space-x-2"
                >
                  <span>{currentIndex + 1 === puzzles.length ? "FINISH" : "NEXT"}</span>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
