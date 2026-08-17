import { motion } from 'motion/react';
import { Play, Calendar, BarChart2, BrainCircuit, Trophy, Timer, ListTodo, Search, Clock } from 'lucide-react';
import { Screen, UserStats } from '../types';
import { calculateLevelInfo } from '../utils';
import { useState, useEffect } from 'react';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
}

import AppLogo from './AppLogo';
import DeveloperCard from './DeveloperCard';

export default function HomeScreen({ onNavigate, stats }: HomeScreenProps) {
  const levelInfo = calculateLevelInfo(stats.xp);
  
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

  useEffect(() => {
    const checkRateLimit = () => {
      const endsAt = localStorage.getItem('rateLimitEndsAt');
      if (endsAt) {
        const left = Math.ceil((parseInt(endsAt) - Date.now()) / 1000);
        if (left > 0) {
          setRateLimitTimeLeft(left);
        } else {
          setRateLimitTimeLeft(0);
        }
      } else {
        setRateLimitTimeLeft(0);
      }
    };
    
    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950 text-zinc-100"
    >
      <div className="w-full max-w-md space-y-8">
        
        {/* Rate Limit Banner */}
        {rateLimitTimeLeft > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-red-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-red-400">API Rate Limit</p>
                <p className="text-xs text-red-500/80">AI features disabled</p>
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-red-400">
              {rateLimitTimeLeft}s
            </div>
          </motion.div>
        )}

        {/* Header / Stats */}
        <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => onNavigate('profile')}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-emerald-500/30 flex-shrink-0">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${stats.avatarSeed || 'academix'}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-200">{stats.name || 'Student'}</p>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-zinc-400 font-medium">Lvl {levelInfo.level}</p>
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden" title={`${levelInfo.xpInCurrentLevel} / ${levelInfo.requiredXp} XP`}>
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500">{stats.xp} XP</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4 text-sm font-medium">
            <div className="flex flex-col items-center">
              <span className="text-amber-400 flex items-center"><Trophy className="w-3 h-3 mr-1"/> {stats.streak}</span>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Streak</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-emerald-400">{stats.coins}</span>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Coins</span>
            </div>
          </div>
        </div>

        {/* Academix Aletheon Logo */}
        <div className="py-2 flex justify-center">
          <AppLogo size="md" showTagline={true} />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('play')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-colors"
          >
            <Play className="w-6 h-6 fill-current" />
            <span className="text-xl font-bold tracking-tight">PLAY NOW</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('calc-monarch')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-900/50 text-white p-4 rounded-2xl transition-colors shadow-inner shadow-amber-500/10"
          >
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold tracking-wide text-amber-100">CALCULATION MONARCH</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('focus-timer')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 border border-indigo-900/50 text-white p-4 rounded-2xl transition-colors shadow-inner shadow-indigo-500/10"
          >
            <Timer className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold tracking-wide text-indigo-100">FOCUS TIMER & STUDY</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('planner')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 border border-emerald-900/50 text-white p-4 rounded-2xl transition-colors shadow-inner shadow-emerald-500/10"
          >
            <ListTodo className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide text-emerald-100">TODO PLANNER</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('keen-researchers')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 border border-blue-900/50 text-white p-4 rounded-2xl transition-colors shadow-inner shadow-blue-500/10"
          >
            <Search className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold tracking-wide text-blue-100">KEEN RESEARCHERS</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('quiz-master')}
            className="col-span-2 flex items-center justify-center space-x-3 bg-zinc-900 hover:bg-zinc-800 border border-rose-900/50 text-white p-4 rounded-2xl transition-colors shadow-inner shadow-rose-500/10"
          >
            <BrainCircuit className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-bold tracking-wide text-rose-100">QUIZ MASTER</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('daily')}
            className="flex flex-col items-center justify-center p-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-zinc-800 transition-colors"
          >
            <Calendar className="w-6 h-6 text-amber-400 mb-2" />
            <span className="text-sm font-semibold">Daily Challenge</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('progress')}
            className="flex flex-col items-center justify-center p-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-zinc-800 transition-colors"
          >
            <BarChart2 className="w-6 h-6 text-emerald-400 mb-2" />
            <span className="text-sm font-semibold">Progress</span>
          </motion.button>
        </div>

        {/* Developer Info Section with Hover Card Effect */}
        <DeveloperCard />

      </div>
    </motion.div>
  );
}
