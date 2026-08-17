import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lightbulb, CheckCircle2, XCircle, Loader2, BrainCircuit, Clock, Sparkles, RotateCcw } from 'lucide-react';
import { Puzzle, Screen, UserStats } from '../types';
import { generatePuzzle, getHint, evaluateLogic } from '../services/ai';
import GeneratingLoader from './GeneratingLoader';

interface CustomChallengeScreenProps {
  config: {
    types: { type: string; count: number }[];
    difficulty: string;
    timeLimit: number; // in minutes
  };
  onNavigate: (screen: Screen) => void;
  onSolve: (xp: number, coins: number, isCorrect: boolean, timeTaken: number, puzzleType: string) => void;
  onSpendCoins: (amount: number) => void;
  stats: UserStats;
}

export default function CustomChallengeScreen({ config, onNavigate, onSolve, onSpendCoins, stats }: CustomChallengeScreenProps) {
  const [puzzleSequence, setPuzzleSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [input, setInput] = useState('');
  const [logicInput, setLogicInput] = useState('');
  const [status, setStatus] = useState<'playing' | 'correct' | 'failed' | 'evaluating'>('playing');
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  
  // Overall challenge state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [missingApiKey, setMissingApiKey] = useState(false);
  const [sessionResults, setSessionResults] = useState<{isCorrect: boolean, timeTaken: number, xp: number, type: string}[]>([]);

  useEffect(() => {
    // Generate the sequence
    const seq: string[] = [];
    config.types.forEach(t => {
      for (let i = 0; i < t.count; i++) {
        seq.push(t.type);
      }
    });
    // Shuffle sequence
    for (let i = seq.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    setPuzzleSequence(seq);
    setCurrentIndex(0);
    
    if (config.timeLimit > 0) {
      setTimeLeft(config.timeLimit * 60);
    } else {
      setTimeLeft(null);
    }
  }, [config]);

  useEffect(() => {
    let timer: any;
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const loadPuzzle = async (index: number) => {
    if (index >= puzzleSequence.length) {
       setIsFinished(true);
       return;
    }
    setLoading(true);
    setStatus('playing');
    setInput('');
    setLogicInput('');
    setHints([]);
    setFeedback('');
    setStartTime(Date.now());

    try {
      const type = puzzleSequence[index];
      const newPuzzle = await generatePuzzle(config.difficulty, type, {
        accuracy: stats.totalAttempts > 0 ? stats.puzzlesSolved / stats.totalAttempts : 0.5,
        averageTime: stats.averageTime || 60,
        favoriteType: type
      });
      setPuzzle(newPuzzle);
    } catch (error: any) {
      if (error.message === 'MISSING_API_KEY') {
        setMissingApiKey(true);
      } else {
        console.error("Failed to load custom puzzle", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (puzzleSequence.length > 0 && !isFinished) {
      loadPuzzle(currentIndex);
    }
  }, [puzzleSequence, currentIndex, isFinished]);

  const handleHint = async () => {
    if (!puzzle || hintLoading || stats.coins < 10) return;
    setHintLoading(true);
    try {
      const newHint = await getHint(puzzle, input, hints.length + 1);
      setHints(prev => [...prev, newHint]);
      onSpendCoins(10);
    } catch (error) {
      console.error("Failed to get hint", error);
    } finally {
      setHintLoading(false);
    }
  };

  const handleRetry = () => {
    setStatus('playing');
    setInput('');
    setLogicInput('');
    setFeedback('');
    setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    if (!puzzle || !input) return;
    if (puzzle.options && puzzle.options.length > 0) {
       if (input.toLowerCase() === puzzle.answer.toLowerCase()) {
         handleResult(true, "");
       } else {
         handleResult(false, "");
       }
    } else {
       if (input.toLowerCase().trim() === puzzle.answer.toLowerCase().trim() && !logicInput) {
           handleResult(true, "");
       } else {
           setStatus('evaluating');
           try {
             const evalResult = await evaluateLogic(puzzle, input, logicInput);
             handleResult(evalResult.isCorrect, evalResult.feedback);
           } catch (e) {
             handleResult(false, "Failed to evaluate logic.");
           }
       }
    }
  };

  const handleResult = (isCorrect: boolean, fb: string) => {
    setStatus(isCorrect ? 'correct' : 'failed');
    setFeedback(fb);
    const timeTaken = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    
    // XP Calculation
    let baseXP = 50;
    switch (config.difficulty) {
      case 'beginner': baseXP = 30; break;
      case 'intermediate': baseXP = 50; break;
      case 'hard': baseXP = 80; break;
      case 'extreme': baseXP = 200; break;
    }
    const xpEarned = Math.max(10, baseXP - (hints.length * 10));
    const coinsEarned = Math.max(1, Math.floor(xpEarned / 10));

    if (isCorrect) {
       onSolve(xpEarned, coinsEarned, true, timeTaken, puzzle?.type || 'logic');
    } else {
       onSolve(10, 0, false, timeTaken, puzzle?.type || 'logic');
    }

    setSessionResults(prev => [...prev, { isCorrect, timeTaken, xp: isCorrect ? xpEarned : 10, type: puzzle?.type || '' }]);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= puzzleSequence.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    const totalCorrect = sessionResults.filter(r => r.isCorrect).length;
    const totalXP = sessionResults.reduce((sum, r) => sum + r.xp, 0);
    const totalTime = sessionResults.reduce((sum, r) => sum + r.timeTaken, 0);

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-[#0A2353] text-white relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#BB63FF]/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#112C70]/90 border border-[#5B58EB]/50 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl backdrop-blur-xl relative z-10"
        >
          <BrainCircuit className="w-16 h-16 text-[#56E1E9] mx-auto mb-6 animate-pulse" />
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Challenge Complete!</h2>
          <p className="text-zinc-300 mb-8">You finished {totalCorrect} out of {puzzleSequence.length} puzzles.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#0A2353] rounded-2xl p-4 border border-[#5B58EB]/30">
              <p className="text-xs text-[#56E1E9] uppercase tracking-wider font-bold mb-1">Total XP</p>
              <p className="text-2xl font-black text-[#56E1E9]">+{totalXP}</p>
            </div>
            <div className="bg-[#0A2353] rounded-2xl p-4 border border-[#5B58EB]/30">
              <p className="text-xs text-[#BB63FF] uppercase tracking-wider font-bold mb-1">Total Time</p>
              <p className="text-2xl font-black text-[#BB63FF]">{formatTime(totalTime)}</p>
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate('home')}
            className="w-full bg-gradient-to-r from-[#5B58EB] via-[#BB63FF] to-[#56E1E9] text-white font-black py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(91,88,235,0.4)] hover:brightness-110"
          >
            RETURN TO DASHBOARD
          </button>
        </motion.div>
      </div>
    );
  }

  if (missingApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A2353] text-zinc-100 p-6">
        <div className="bg-[#112C70] border border-[#5B58EB]/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <BrainCircuit className="w-16 h-16 text-[#56E1E9] mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">AI Key Setup Required</h2>
          <p className="text-zinc-300 mb-6 text-sm">
            Activate your in-app Google Auth AI key to generate custom logic puzzles instantly.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                const autoKey = `academix_google_key_${Math.random().toString(36).substring(7)}`;
                try {
                  const saved = localStorage.getItem('synapse_stats') || '{}';
                  const parsed = JSON.parse(saved);
                  
                  localStorage.setItem('synapse_stats', JSON.stringify(parsed));
                } catch (e) {}
                setMissingApiKey(false);
                loadPuzzle(currentIndex);
              }}
              className="w-full bg-[#5B58EB] hover:bg-[#5B58EB]/80 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#5B58EB]/20"
            >
              <span>⚡ Auto-Activate In-App Key</span>
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-[#112C70] border border-[#5B58EB]/30 hover:bg-[#5B58EB]/20 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A2353] text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#5B58EB]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#BB63FF]/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-shrink-0 flex items-center justify-between p-4 md:px-8 border-b border-[#5B58EB]/30 bg-[#112C70]/80 backdrop-blur-md relative z-10">
        <div className="flex items-center">
          <button onClick={() => onNavigate('puzzle-setup')} className="p-2.5 mr-4 rounded-xl bg-[#0A2353] border border-[#5B58EB]/40 text-[#56E1E9] hover:bg-[#5B58EB] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white capitalize flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-[#56E1E9]" />
              {config.difficulty} Challenge
            </h2>
            <p className="text-xs text-zinc-300">
              Puzzle {currentIndex + 1} of {puzzleSequence.length} • <span className="text-[#56E1E9] font-semibold">{puzzleSequence[currentIndex]}</span>
            </p>
          </div>
        </div>
        
        {timeLeft !== null && (
          <div className="flex items-center space-x-2 bg-[#0A2353] border border-[#5B58EB]/40 px-4 py-2 rounded-xl">
            <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-[#56E1E9]'}`} />
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col max-w-4xl mx-auto w-full deep-space-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center my-auto min-h-[60vh] py-12">
              <GeneratingLoader />
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100 mt-8 mb-2 text-center tracking-wide">Generating next puzzle...</h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-[280px] md:max-w-sm text-center">AI is crafting a unique challenge just for you.</p>
            </motion.div>
          ) : puzzle ? (
            <motion.div key="puzzle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col space-y-6">
              
              <div className="bg-[#112C70]/90 border border-[#5B58EB]/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#56E1E9]/10 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none" />
                <div className="prose prose-invert max-w-none text-base md:text-lg leading-relaxed text-zinc-100 font-medium break-words">
                  {puzzle.question.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 break-words">{line}</p>
                  ))}
                </div>
              </div>

              {/* Hints */}
              {hints.length > 0 && (
                <div className="space-y-3">
                  {hints.map((hint, i) => (
                    <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[#0A2353]/90 border border-[#BB63FF]/40 text-[#56E1E9] p-4 rounded-2xl flex items-start space-x-3 text-sm shadow-md">
                      <Lightbulb className="w-5 h-5 flex-shrink-0 text-[#BB63FF]" />
                      <p className="leading-relaxed text-white font-medium break-words flex-1 min-w-0">{hint}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="bg-[#112C70]/90 border border-[#5B58EB]/40 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                {puzzle.options && puzzle.options.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {puzzle.options.map((opt, idx) => (
                      <button
                        key={idx}
                        disabled={status !== 'playing'}
                        onClick={() => setInput(opt)}
                        className={`p-4 rounded-2xl border text-left font-semibold transition-all flex items-start space-x-2 break-words min-w-0 ${
                          input === opt 
                            ? 'bg-gradient-to-r from-[#5B58EB] to-[#BB63FF] border-[#56E1E9] text-white shadow-[0_0_15px_rgba(91,88,235,0.5)]' 
                            : 'bg-[#0A2353] border-[#5B58EB]/30 text-zinc-300 hover:bg-[#0A2353]/80 hover:border-[#5B58EB]'
                        } ${status !== 'playing' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="font-bold text-[#56E1E9] shrink-0">{String.fromCharCode(65 + idx)}.</span>
                        <span className="break-words min-w-0 flex-1">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={status !== 'playing'}
                      placeholder="Type your answer here..."
                      className="w-full bg-[#0A2353] border border-[#5B58EB]/40 text-white p-4 rounded-2xl focus:ring-2 focus:ring-[#56E1E9] outline-none transition-all placeholder:text-zinc-500 font-medium"
                    />
                    <textarea
                      value={logicInput}
                      onChange={(e) => setLogicInput(e.target.value)}
                      disabled={status !== 'playing'}
                      placeholder="Explain your reasoning (optional)..."
                      className="w-full bg-[#0A2353] border border-[#5B58EB]/40 text-white p-4 rounded-2xl h-24 resize-none focus:ring-2 focus:ring-[#56E1E9] outline-none transition-all placeholder:text-zinc-500 text-sm"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 mt-6">
                  {status === 'playing' || status === 'evaluating' ? (
                    <>
                      <button 
                        onClick={handleSubmit} 
                        disabled={!input || status === 'evaluating'}
                        className="flex-1 bg-gradient-to-r from-[#5B58EB] via-[#BB63FF] to-[#56E1E9] hover:brightness-110 disabled:opacity-50 text-white p-4 rounded-2xl font-black tracking-wide transition-all flex items-center justify-center shadow-[0_0_20px_rgba(91,88,235,0.4)]"
                      >
                        {status === 'evaluating' ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : 'SUBMIT ANSWER'}
                      </button>
                      <button 
                        onClick={handleHint} 
                        disabled={hintLoading || stats.coins < 10}
                        className="bg-[#0A2353] hover:bg-[#0A2353]/80 disabled:opacity-50 text-[#56E1E9] p-4 rounded-2xl font-bold flex items-center justify-center transition-all border border-[#5B58EB]/40"
                        title="Get Hint (Cost: 10 Coins)"
                      >
                        {hintLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5 text-[#BB63FF]" />}
                        <span className="ml-2 text-xs font-bold">10</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex space-x-3 w-full">
                      <button 
                        onClick={handleRetry}
                        className="flex-1 bg-[#0A2353] hover:bg-[#0A2353]/80 border border-[#BB63FF] text-[#BB63FF] p-4 rounded-2xl font-black tracking-wide transition-all flex items-center justify-center shadow-lg"
                      >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        <span>RETRY PUZZLE</span>
                      </button>
                      <button 
                        onClick={handleNext}
                        className="flex-1 bg-gradient-to-r from-[#5B58EB] to-[#56E1E9] hover:brightness-110 text-white p-4 rounded-2xl font-black tracking-wide transition-all flex items-center justify-center shadow-lg"
                      >
                        {currentIndex + 1 >= puzzleSequence.length ? 'FINISH CHALLENGE' : 'NEXT PUZZLE'}
                        <ArrowLeft className="w-5 h-5 ml-2 rotate-180 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Feedback */}
              <AnimatePresence>
                {status !== 'playing' && status !== 'evaluating' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-3xl border ${status === 'correct' ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200' : 'bg-red-950/60 border-red-400 text-red-200'}`}>
                    <div className="flex items-start space-x-4">
                      {status === 'correct' ? <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" /> : <XCircle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />}
                      <div className="w-full">
                        <h3 className={`text-lg font-bold mb-2 ${status === 'correct' ? 'text-emerald-300' : 'text-red-300'}`}>
                          {status === 'correct' ? 'Excellent Work!' : 'Incorrect Answer'}
                        </h3>

                        {status === 'failed' && (
                          <div className="mb-3 p-3 bg-[#0A2353]/90 rounded-xl border border-red-400/30">
                            <span className="text-xs uppercase font-bold text-[#56E1E9] tracking-wider block mb-1">Correct Answer</span>
                            <span className="text-base font-black text-white">{puzzle.answer}</span>
                          </div>
                        )}

                        <div className="text-sm leading-relaxed opacity-95 text-white">
                          <span className="text-xs uppercase font-bold text-zinc-300 tracking-wider block mb-1">Explanation</span>
                          <p>{feedback || puzzle.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .deep-space-scrollbar::-webkit-scrollbar { width: 6px; }
        .deep-space-scrollbar::-webkit-scrollbar-track { background: #0A2353; }
        .deep-space-scrollbar::-webkit-scrollbar-thumb { background: #5B58EB; border-radius: 10px; }
        .deep-space-scrollbar::-webkit-scrollbar-thumb:hover { background: #BB63FF; }
      `}} />
    </div>
  );
}
