import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Timer, Target, CheckCircle2, XCircle, Calculator, Trophy } from 'lucide-react';
import { Screen } from '../types';
import { recordSkillActivity } from '../utils/dailyTracker';

interface CalculationMonarchScreenProps {
  onNavigate: (screen: Screen) => void;
  onBulkSolve?: (xpEarned: number, coinsEarned: number, results: {isCorrect: boolean, timeTaken: number, puzzleType: string}[]) => void;
}

type Operation = '+' | '-' | '*' | '/' | '^2' | 'sqrt' | '^3' | 'cbrt';

interface Question {
  text: string;
  answer: number;
  operation: Operation;
}

export default function CalculationMonarchScreen({ onNavigate, onBulkSolve }: CalculationMonarchScreenProps) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'results'>('setup');
  
  // Setup state
  const [selectedOps, setSelectedOps] = useState<Operation[]>(['+', '-', '*', '/']);
  const [numQuestions, setNumQuestions] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(2); // 0 = no limit
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme' | 'all'>('medium');

  // Play state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number|null)[]>([]); // null means not answered yet
  const [startTime, setStartTime] = useState(0);
  
  // Results
  const [timeTaken, setTimeTaken] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const toggleOp = (op: Operation) => {
    setSelectedOps(prev => 
      prev.includes(op) 
        ? prev.filter(o => o !== op) 
        : [...prev, op]
    );
  };

  const generateQuestions = () => {
    const ops = selectedOps.length > 0 ? selectedOps : ['+'];
    const newQuestions: Question[] = [];
    const diffLevels: ('easy' | 'medium' | 'hard' | 'extreme')[] = ['easy', 'medium', 'hard', 'extreme'];
    
    for (let i = 0; i < numQuestions; i++) {
      const op = ops[Math.floor(Math.random() * ops.length)] as Operation;
      const currentDiff = difficulty === 'all' 
        ? diffLevels[Math.floor(Math.random() * diffLevels.length)] 
        : difficulty;

      let qText = '';
      let ans = 0;
      
      switch(op) {
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
          } else { // extreme
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
          } else { // extreme
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
          } else { // extreme
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
          } else { // extreme
            b = Math.floor(Math.random() * 35) + 15;
            ansGen = Math.floor(Math.random() * 125) + 25;
          }
          const a = b * ansGen;
          qText = `${a} ÷ ${b}`;
          ans = ansGen;
          break;
        }
        case '^2': {
          let a = 5;
          if (currentDiff === 'easy') a = Math.floor(Math.random() * 10) + 1;
          else if (currentDiff === 'medium') a = Math.floor(Math.random() * 25) + 1;
          else if (currentDiff === 'hard') a = Math.floor(Math.random() * 35) + 15;
          else a = Math.floor(Math.random() * 70) + 30; // extreme
          qText = `${a}²`;
          ans = a * a;
          break;
        }
        case 'sqrt': {
          let a = 5;
          if (currentDiff === 'easy') a = Math.floor(Math.random() * 10) + 1;
          else if (currentDiff === 'medium') a = Math.floor(Math.random() * 25) + 1;
          else if (currentDiff === 'hard') a = Math.floor(Math.random() * 35) + 15;
          else a = Math.floor(Math.random() * 70) + 30; // extreme
          qText = `√${a * a}`;
          ans = a;
          break;
        }
        case '^3': {
          let a = 3;
          if (currentDiff === 'easy') a = Math.floor(Math.random() * 5) + 1;
          else if (currentDiff === 'medium') a = Math.floor(Math.random() * 10) + 1;
          else if (currentDiff === 'hard') a = Math.floor(Math.random() * 10) + 6;
          else a = Math.floor(Math.random() * 15) + 10; // extreme
          qText = `${a}³`;
          ans = a * a * a;
          break;
        }
        case 'cbrt': {
          let a = 3;
          if (currentDiff === 'easy') a = Math.floor(Math.random() * 5) + 1;
          else if (currentDiff === 'medium') a = Math.floor(Math.random() * 10) + 1;
          else if (currentDiff === 'hard') a = Math.floor(Math.random() * 10) + 6;
          else a = Math.floor(Math.random() * 15) + 10; // extreme
          qText = `∛${a * a * a}`;
          ans = a;
          break;
        }
      }
      
      newQuestions.push({ text: qText, answer: ans, operation: op });
    }
    return newQuestions;
  };

  const startGame = () => {
    if (selectedOps.length === 0) return;
    setQuestions(generateQuestions());
    setCurrentQIndex(0);
    setInputVal('');
    setAnswers(new Array(numQuestions).fill(null));
    setTimeLeft(durationMinutes > 0 ? durationMinutes * 60 : null);
    setStartTime(Date.now());
    setGameState('playing');
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft !== null) {
      if (timeLeft <= 0) {
        endGame(answers);
      } else {
        timer = setInterval(() => {
          setTimeLeft(t => (t ? t - 1 : null));
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, answers]);

  const endGame = (finalAnswers: (number | null)[]) => {
    setGameState('results');
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
      const results = questions.map((q, idx) => ({
        isCorrect: finalAnswers[idx] === q.answer,
        timeTaken: totalTime / questions.length,
        puzzleType: 'calculation-monarch'
      }));
      
      const correctCount = results.filter(r => r.isCorrect).length;
      const xpEarned = correctCount * 5;
      const coinsEarned = Math.floor(correctCount / 2);
      
      onBulkSolve(xpEarned, coinsEarned, results);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    
    const parsed = parseFloat(inputVal);
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = isNaN(parsed) ? 0 : parsed;
    setAnswers(newAnswers);
    setInputVal('');
    
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      endGame(newAnswers);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
        <div className="w-full max-w-lg">
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
              <Calculator className="w-8 h-8 text-amber-500" />
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Calculation Monarch</h2>
                <p className="text-zinc-400 text-sm">Offline Math Training Mode</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Difficulty Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Difficulty Level</label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[
                    { id: 'easy', label: 'Easy', color: 'emerald' },
                    { id: 'medium', label: 'Medium', color: 'amber' },
                    { id: 'hard', label: 'Hard', color: 'orange' },
                    { id: 'extreme', label: 'Extreme', color: 'red' },
                    { id: 'all', label: 'All', color: 'purple' }
                  ].map(({ id, label, color }) => {
                    const isSelected = difficulty === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDifficulty(id as any)}
                        className={`py-2 px-1.5 sm:px-3 rounded-xl border text-xs sm:text-sm font-bold capitalize transition-all ${
                          isSelected
                            ? id === 'easy' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                            : id === 'medium' ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                            : id === 'hard' ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-md shadow-orange-500/10'
                            : id === 'extreme' ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
                            : 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                            : 'bg-zinc-800/50 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Select Operations</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { op: '+', label: 'Addition' },
                    { op: '-', label: 'Subtraction' },
                    { op: '*', label: 'Multiplication' },
                    { op: '/', label: 'Division' },
                    { op: '^2', label: 'Square (x²)' },
                    { op: 'sqrt', label: 'Square Root (√)' },
                    { op: '^3', label: 'Cube (x³)' },
                    { op: 'cbrt', label: 'Cube Root (∛)' }
                  ].map(({ op, label }) => (
                    <button
                      key={op}
                      onClick={() => toggleOp(op as Operation)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        selectedOps.includes(op as Operation) 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                      title={label}
                    >
                      <span className="text-xl font-bold font-mono">{op === 'sqrt' ? '√' : op === 'cbrt' ? '∛' : op}</span>
                    </button>
                  ))}
                </div>
                {selectedOps.length === 0 && (
                  <p className="text-red-400 text-xs mt-2">Please select at least one operation.</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-zinc-300">Number of Questions</label>
                  <span className="text-amber-400 font-bold">{numQuestions}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-zinc-300">Time Limit</label>
                  <span className="text-amber-400 font-bold">
                    {durationMinutes === 0 ? 'No Limit' : `${durationMinutes} min`}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <button
                onClick={startGame}
                disabled={selectedOps.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                <Play className="w-5 h-5 mr-2" />
                START TEST
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentQIndex];
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center text-zinc-400 font-medium">
              <Target className="w-5 h-5 mr-2 text-indigo-400" />
              {currentQIndex + 1} / {questions.length}
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center font-mono text-xl ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                <Timer className="w-5 h-5 mr-2" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 flex flex-col items-center shadow-2xl mb-6">
            <h1 className="text-6xl font-bold font-mono tracking-tighter mb-8 text-center">{q.text} <span className="text-zinc-600">=</span></h1>
            
            <form onSubmit={handleInputSubmit} className="w-full">
              <input
                ref={inputRef}
                type="number"
                step="any"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full bg-zinc-950 border-2 border-zinc-700 rounded-2xl py-4 text-center text-3xl font-mono text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="?"
                autoFocus
                autoComplete="off"
              />
            </form>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0, 'Enter'].map((key) => (
              <button
                key={key}
                onClick={(e) => {
                  if (key === 'Enter') handleInputSubmit(e as any);
                  else if (key === '-') setInputVal(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
                  else setInputVal(prev => prev + key);
                  inputRef.current?.focus();
                }}
                className={`py-4 text-2xl font-mono rounded-2xl transition-colors ${
                  key === 'Enter' ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold' :
                  key === '-' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' :
                  'bg-zinc-800 hover:bg-zinc-700 text-white font-medium'
                }`}
              >
                {key}
              </button>
            ))}
            <button 
              onClick={() => {
                setInputVal(prev => prev.slice(0, -1));
                inputRef.current?.focus();
              }}
              className="col-span-3 py-4 text-xl font-bold rounded-2xl bg-zinc-800/50 text-red-400 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              DELETE
            </button>
          </div>
          
          <div className="mt-8 text-center">
            <button 
               onClick={() => endGame(answers)}
               className="text-zinc-500 hover:text-zinc-300 text-sm underline"
            >
              Give Up & Show Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results State
  const correctCount = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.answer ? 1 : 0), 0);
  const accuracy = Math.round((correctCount / questions.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-lg mt-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"></div>
          
          <div className="flex flex-col items-center mb-8">
            <Trophy className="w-16 h-16 text-amber-500 mb-4" />
            <h2 className="text-3xl font-black tracking-tight mb-2">Test Complete</h2>
            <div className="flex space-x-6 text-center">
              <div>
                <p className="text-4xl font-mono font-bold text-white">{correctCount}/{questions.length}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Score</p>
              </div>
              <div>
                <p className="text-4xl font-mono font-bold text-emerald-400">{accuracy}%</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Accuracy</p>
              </div>
              <div>
                <p className="text-4xl font-mono font-bold text-indigo-400">{formatTime(timeTaken)}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Time</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {questions.map((q, idx) => {
              const isCorrect = answers[idx] === q.answer;
              const answered = answers[idx] !== null && answers[idx] !== undefined;
              return (
                <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${
                  isCorrect ? 'bg-emerald-900/10 border-emerald-900/50' : 'bg-red-900/10 border-red-900/50'
                }`}>
                  <div className="flex items-center">
                    {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />}
                    <span className="font-mono text-lg">{q.text} = {q.answer}</span>
                  </div>
                  {!isCorrect && answered && (
                    <div className="text-right">
                      <span className="text-xs text-zinc-500 block">Your answer:</span>
                      <span className="font-mono text-red-400 font-bold line-through">{answers[idx]}</span>
                    </div>
                  )}
                  {!isCorrect && !answered && (
                    <span className="text-zinc-500 text-sm italic">Skipped</span>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 space-y-3">
            <button
              onClick={() => setGameState('setup')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-4 rounded-xl transition-colors"
            >
              PLAY AGAIN
            </button>
            <button
              onClick={() => onNavigate('home')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-colors"
            >
              BACK TO HOME
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
