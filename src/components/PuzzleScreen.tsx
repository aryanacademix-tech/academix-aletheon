import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lightbulb, CheckCircle2, XCircle, Loader2, BrainCircuit, RefreshCw } from 'lucide-react';
import { Puzzle, Screen, UserStats } from '../types';
import { generatePuzzle, getHint, evaluateLogic } from '../services/ai';
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
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [logicInput, setLogicInput] = useState('');
  const [status, setStatus] = useState<'playing' | 'correct' | 'failed' | 'evaluating'>('playing');
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [isRetry, setIsRetry] = useState(false);
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

  const loadPuzzle = async () => {
    if (mode === 'daily' && checkDailyLimitReached()) {
      onNavigate('daily');
      return;
    }
    setLoading(true);
    setStatus('playing');
    setInput('');
    setLogicInput('');
    setHints([]);
    setFeedback('');
    setStartTime(Date.now());
    setIsRetry(false);
    setRateLimitReached(false);
    setMissingApiKey(false);
    try {
      const difficulties = ['beginner', 'intermediate', 'hard', 'super hard', 'extreme'];
      const diffIndex = stats.totalAttempts % difficulties.length;
      const sequentialDifficulty = difficulties[diffIndex];
        
        const types = [
          'logic', 
          'mental math', 
          'sequence', 
          'visual reasoning', 
          'math', 
          'pattern matching', 
          'trick',
          'pattern recognition & number sequences',
          'geometric number puzzles',
          'basic operations & arithmetic',
          'logical logic & spatial reasoning',
          'missing number/letter puzzle'
        ];
        
        // Cycle through types sequentially based on total attempts
        const typeIndex = stats.totalAttempts % types.length;
        const sequentialType = types[typeIndex];
        
        let accuracy = stats.totalAttempts > 0 ? stats.puzzlesSolved / stats.totalAttempts : 0.5;
        let favoriteType = 'logic';
        let maxAttempts = 0;
        Object.entries(stats.typeStats || {}).forEach(([type, data]) => {
          if (data.attempts > maxAttempts) {
            maxAttempts = data.attempts;
            favoriteType = type;
          }
        });

        const newPuzzle = await generatePuzzle(sequentialDifficulty, sequentialType, {
          accuracy,
          averageTime: stats.averageTime || 60,
          favoriteType
        });
        setPuzzle(newPuzzle);
    } catch (error: any) {
      if (error.message !== 'RATE_LIMIT_REACHED' && error.message !== 'MISSING_API_KEY') {
        console.error("Failed to load puzzle", error);
      }
      if (error.message === 'RATE_LIMIT_REACHED') {
        setRateLimitReached(true);
      } else if (error.message === 'MISSING_API_KEY') {
        setMissingApiKey(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPuzzle();
  }, [mode]);

  const handleHint = async () => {
    if (!puzzle || hintLoading || stats.coins < 10) return;
    
    setHintLoading(true);
    try {
      const newHint = await getHint(puzzle, input, hints.length + 1);
      setHints(prev => [...prev, newHint]);
      if (onSpendCoins) {
        onSpendCoins(10); // Deduct 10 coins for hint
      }
    } catch (error) {
      if (error.message !== 'RATE_LIMIT_REACHED' && error.message !== 'MISSING_API_KEY') console.error("Failed to get hint", error);
    } finally {
      setHintLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!puzzle || !input) return;

    if (puzzle.options && puzzle.options.length > 0) {
       // Multiple choice
       if (input.toLowerCase() === puzzle.answer.toLowerCase()) {
         handleCorrect();
       } else {
         handleIncorrect();
       }
    } else {
       // Direct input or logic evaluation
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

    // Record activity in daily tracker
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
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      
      // Base XP based on difficulty
      let baseXP = 50;
      switch (puzzle?.difficulty) {
        case 'beginner': baseXP = 30; break;
        case 'intermediate': baseXP = 50; break;
        case 'hard': baseXP = 80; break;
        case 'super hard': baseXP = 120; break;
        case 'extreme': baseXP = 200; break;
      }

      // Time bonus (up to 50% extra if solved quickly, but not instantly)
      const avgTime = stats.averageTime || 60;
      let timeBonus = 0;
      if (timeTaken < avgTime && timeTaken > 5) {
        timeBonus = Math.floor(baseXP * 0.5 * (1 - (timeTaken / avgTime)));
      }

      // Logic explanation bonus (showing work)
      let logicBonus = 0;
      if (logicInput.trim().length > 15) {
        logicBonus = Math.floor(baseXP * 0.3); // 30% bonus for explaining logic
      }

      // Hint penalty
      const hintPenalty = hints.length * Math.floor(baseXP * 0.2); // 20% penalty per hint

      const xpEarned = Math.max(10, baseXP + timeBonus + logicBonus - hintPenalty);
      const coinsEarned = Math.max(1, Math.floor(xpEarned / 10));

      let finalXP = xpEarned;
      let finalCoins = coinsEarned;
      if (mode === 'daily') {
        finalXP *= 2;
        finalCoins *= 2;
        incrementDailyChallenge();
      }

      onSolve(finalXP, finalCoins, true, timeTaken, puzzle?.type || 'logic');
    } else {
      // If it's a retry, they get significantly less XP and no coins
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center fixed inset-0 bg-[#0A2353] text-white overflow-hidden z-50">
        {/* Deep Space Background Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B58EB]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#BB63FF]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <GeneratingLoader />
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 mt-8 mb-2 text-center tracking-wide">Generating next puzzle...</h2>
          <p className="text-zinc-400 text-xs md:text-sm max-w-[280px] md:max-w-sm text-center">AI is crafting a unique challenge just for you.</p>
        </div>
      </div>
    );
  }

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
                const autoKey = `academix_google_key_${Math.random().toString(36).substring(7)}`;
                try {
                  const saved = localStorage.getItem('synapse_stats') || '{}';
                  const parsed = JSON.parse(saved);
                  parsed.apiKey = autoKey;
                  localStorage.setItem('synapse_stats', JSON.stringify(parsed));
                } catch (e) {}
                setMissingApiKey(false);
                loadPuzzle();
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
        <h2 className="text-2xl font-bold mb-4">Failed to Generate Puzzle</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          We couldn't generate a puzzle at this time. Please check your connection or try again.
        </p>
        <div className="flex space-x-4">
          <button 
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
          <button 
            onClick={loadPuzzle}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => onNavigate('home')}
          className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2 text-sm font-mono text-zinc-400 uppercase tracking-wider">
          <BrainCircuit className="w-4 h-4 text-indigo-400" />
          <span>{puzzle.difficulty} • {puzzle.type}</span>
        </div>
        <div className="flex items-center space-x-1 bg-zinc-900 px-3 py-1 rounded-full text-sm font-medium">
          <span className="text-emerald-400">{stats.coins}</span>
          <span className="text-zinc-500">C</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full">
        
        {/* Question Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 mb-8 shadow-2xl shadow-indigo-500/5 backdrop-blur-sm"
        >
          <p className="text-xl md:text-2xl font-medium leading-relaxed text-center">
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
                onClick={loadPuzzle}
                className="flex-shrink-0 w-full bg-white text-black hover:bg-zinc-200 rounded-xl p-4 font-bold tracking-wide transition-colors flex items-center justify-center space-x-2"
              >
                <span>NEXT PUZZLE</span>
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
                  onClick={loadPuzzle}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 rounded-xl p-4 font-bold tracking-wide transition-colors flex items-center justify-center space-x-2"
                >
                  <span>NEXT</span>
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
