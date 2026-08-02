import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Play, Lock } from 'lucide-react';
import { Screen, UserStats } from '../types';
import { useState, useEffect } from 'react';

interface DailyChallengeScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
}

export default function DailyChallengeScreen({ onNavigate, stats }: DailyChallengeScreenProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dataStr = localStorage.getItem('daily_challenge');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.date === today) {
          setCompletedCount(data.completedCount || 0);
          if (data.completedCount >= 10) {
            setIsCompleted(true);
          }
        } else {
          // new day
          localStorage.setItem('daily_challenge', JSON.stringify({ date: today, completedCount: 0 }));
        }
      } else {
        localStorage.setItem('daily_challenge', JSON.stringify({ date: today, completedCount: 0 }));
      }
    } catch (e) {}
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => onNavigate('home')}
          className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Daily Challenge</h1>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full flex flex-col items-center justify-center space-y-8">
        
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full" />
          <div className="w-32 h-32 bg-zinc-900 border border-amber-500/30 rounded-full flex items-center justify-center relative z-10 shadow-2xl shadow-amber-500/10">
            <Calendar className="w-12 h-12 text-amber-400" />
          </div>
        </div>

        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black text-white">The Enigma Code</h2>
          <p className="text-zinc-400 max-w-xs mx-auto text-sm leading-relaxed">
            Solve today's unique puzzles to earn double XP and a special badge. Limit: 10 questions per day.
          </p>
          <p className="text-amber-400 font-semibold">{completedCount} / 10 Completed Today</p>
        </div>

        <div className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-medium">Reward</span>
            <span className="text-amber-400 font-bold flex items-center">
              +200 XP <span className="mx-2 text-zinc-700">•</span> +50 Coins
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-medium">Difficulty</span>
            <span className="text-red-400 font-bold uppercase tracking-wider text-xs">Genius</span>
          </div>
        </div>

        <button
          onClick={() => !isCompleted && onNavigate('daily-play')}
          disabled={isCompleted}
          className={`w-full font-bold text-lg p-5 rounded-2xl shadow-lg transition-colors flex items-center justify-center space-x-3 ${isCompleted ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20'}`}
        >
          {isCompleted ? (
            <>
              <Lock className="w-6 h-6" />
              <span>COMPLETED FOR TODAY</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              <span>START CHALLENGE</span>
            </>
          )}
        </button>

      </div>
    </motion.div>
  );
}
