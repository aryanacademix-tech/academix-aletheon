import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Target, Zap, Brain, TrendingUp, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Activity, Award } from 'lucide-react';
import { Screen, UserStats } from '../types';
import { calculateLevelInfo } from '../utils';
import { getTodayKey, getDailySkillRecord, calculateSkillScores, generateDailyFeedback, SkillScore, getWeeklyPresenceStats } from '../utils/dailyTracker';

interface ProgressScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
}

export default function ProgressScreen({ onNavigate, stats }: ProgressScreenProps) {
  const levelInfo = calculateLevelInfo(stats.xp);
  const todayKey = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Generate date options (ONLY Today and Yesterday as requested)
  const dateOptions = [0, 1].map((i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const label = i === 0 ? 'Today' : 'Yesterday';
    return { key, label };
  });

  const dailyRecord = getDailySkillRecord(selectedDate);
  const skillScores: SkillScore[] = calculateSkillScores(dailyRecord);
  const dailyFeedback = generateDailyFeedback(selectedDate);
  const weeklyStats = getWeeklyPresenceStats();

  const accuracy = stats.totalAttempts > 0 
    ? Math.round((stats.puzzlesSolved / stats.totalAttempts) * 100) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 pb-24 font-sans"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onNavigate('home')}
            className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              Observed Progress
            </h1>
            <p className="text-xs text-zinc-400">Daily cognitive skill measurements & activity insights</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-6">

        {/* Date Selector */}
        <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-2 pt-1 -mx-2 px-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
          {dateOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSelectedDate(opt.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedDate === opt.key 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10' 
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Level Overview Card */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <p className="text-indigo-300/80 text-xs font-bold uppercase tracking-widest mb-1">Overall Rank & Level</p>
              <div className="flex items-baseline space-x-2">
                <h2 className="text-4xl font-black text-white">Level {levelInfo.level}</h2>
                <span className="text-xs text-indigo-400 font-semibold">({stats.xp} Total XP)</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 shadow-lg">
              <Brain className="w-8 h-8 text-indigo-300" />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-indigo-200">{stats.xp} XP Earned</span>
              <span className="text-zinc-400">{levelInfo.requiredXp + (stats.xp - levelInfo.xpInCurrentLevel)} XP for Lvl {levelInfo.level + 1}</span>
            </div>
            <div className="w-full h-3 bg-zinc-950/70 rounded-full overflow-hidden border border-zinc-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPercent}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-400 rounded-full" 
              />
            </div>
          </div>
        </div>

        {/* Lifetime Quick Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-center space-y-1">
            <Target className="w-5 h-5 text-emerald-400 mx-auto" />
            <span className="text-2xl font-bold block text-white">{accuracy}%</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Accuracy</span>
          </div>
          
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-center space-y-1">
            <Zap className="w-5 h-5 text-amber-400 mx-auto" />
            <span className="text-2xl font-bold block text-white">{stats.streak}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Day Streak</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-center space-y-1">
            <TrendingUp className="w-5 h-5 text-indigo-400 mx-auto" />
            <span className="text-2xl font-bold block text-white">{stats.puzzlesSolved}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Puzzles Solved</span>
          </div>
        </div>

        {/* 7-Day Weekly Presence Tracker */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-100">7-Day Weekly Presence</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg">
              {weeklyStats.activeDaysThisWeek} / 7 Days Active
            </span>
          </div>
          <p className="text-xs text-zinc-400">Streak syncs with daily presence each week and repeats for next week.</p>
          
          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {weeklyStats.weeklyPresenceMap.map((day, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  day.isPresent 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10' 
                    : day.isToday 
                    ? 'bg-zinc-800/90 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30' 
                    : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-500'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block">{day.dayName}</span>
                <span className="text-xs font-extrabold mt-0.5">
                  {day.isPresent ? '✓' : '•'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Observed Daily Skills (Measured on Actual Activity) */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                Observed Skill Percentages
              </h3>
              <p className="text-xs text-zinc-400">Measured strictly when activity is completed on selected date</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-lg font-mono">
              {selectedDate === todayKey ? 'Today' : selectedDate}
            </span>
          </div>

          <div className="space-y-4">
            {skillScores.map((skill) => (
              <div key={skill.key} className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xl">{skill.icon}</span>
                    <div>
                      <span className="text-sm font-semibold text-zinc-100 block">{skill.name}</span>
                      <span className="text-[11px] text-zinc-400">{skill.summary}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {skill.isActive ? (
                      <span className="text-lg font-black text-emerald-400 font-mono">{skill.percentage}%</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-500 font-medium">Inactive Today</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.isActive ? skill.percentage : 0}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      !skill.isActive 
                        ? 'bg-zinc-800' 
                        : skill.percentage >= 80 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                        : skill.percentage >= 50 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-400'
                    }`} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fully Observed Pros & Cons Feedback */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-3xl p-6 space-y-6">
          <div className="border-b border-zinc-800/80 pb-3">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Daily Feedback: Pros & Cons
            </h3>
            <p className="text-xs text-zinc-400">Analysis derived from recorded activities in all app features</p>
          </div>

          {/* Pros Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Observed Strengths (Pros)
            </h4>
            <div className="space-y-2">
              {dailyFeedback.pros.map((pro, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl text-xs text-emerald-200">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>{pro}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cons Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Growth Areas & Unused Features (Cons)
            </h4>
            <div className="space-y-2">
              {dailyFeedback.cons.map((con, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 bg-amber-950/20 border border-amber-900/30 p-3 rounded-xl text-xs text-amber-200">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{con}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Daily Overall Analysis</span>
            <p className="text-xs text-zinc-300 leading-relaxed">{dailyFeedback.overallSummary}</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
