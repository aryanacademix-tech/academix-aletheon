import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Key, Sparkles, ExternalLink, X } from 'lucide-react';
import { Screen, UserStats } from './types';
import HomeScreen from './components/HomeScreen';
import PuzzleScreen from './components/PuzzleScreen';
import ProgressScreen from './components/ProgressScreen';
import DailyChallengeScreen from './components/DailyChallengeScreen';

import CalculationMonarchScreen from './components/CalculationMonarchScreen';
import FocusTimerScreen from './components/FocusTimerScreen';
import PlannerScreen from './components/PlannerScreen';
import KeenResearchersScreen from './components/KeenResearchersScreen';
import QuizMasterScreen from './components/QuizMasterScreen';
import SplashScreen from './components/SplashScreen';
import OnboardingScreen from './components/OnboardingScreen';
import ProfileScreen from './components/ProfileScreen';
import PuzzleSetupScreen from './components/PuzzleSetupScreen';
import CustomChallengeScreen from './components/CustomChallengeScreen';

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirestoreSyncEnabled, disableFirestoreSync } from './firebase';

import { calculateLevelInfo } from './utils';
import { recordTodayPresence } from './utils/dailyTracker';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [customConfig, setCustomConfig] = useState<any>(null);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('synapse_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        averageTime: parsed.averageTime || 0,
        typeStats: parsed.typeStats || {},
      };
    }
    return {
      xp: 0,
      level: 1,
      streak: 0,
      coins: 50,
      puzzlesSolved: 0,
      totalAttempts: 0,
      averageTime: 0,
      typeStats: {},
    };
  });

  // Clear any old rate limit timestamp on app startup to prevent false positive popups
  useEffect(() => {
    localStorage.removeItem('rateLimitEndsAt');
  }, []);

  const [rateLimitEndsAt, setRateLimitEndsAt] = useState<number | null>(null);
  const [showRateLimitPopup, setShowRateLimitPopup] = useState(false);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [modalApiKeyInput, setModalApiKeyInput] = useState('');

  useEffect(() => {
    const handleMissingKey = () => {
      setModalApiKeyInput(stats.apiKey || '');
      setShowApiKeyModal(true);
    };
    window.addEventListener('missing_api_key_requested', handleMissingKey);
    return () => window.removeEventListener('missing_api_key_requested', handleMissingKey);
  }, [stats.apiKey]);

  useEffect(() => {
    const handleRateLimit = () => {
      const endsAt = Date.now() + 3000; // 3 seconds
      setRateLimitEndsAt(endsAt);
      setShowRateLimitPopup(true);
    };
    window.addEventListener('api_rate_limit_reached', handleRateLimit);
    return () => window.removeEventListener('api_rate_limit_reached', handleRateLimit);
  }, [currentScreen]);

  useEffect(() => {
    if (rateLimitEndsAt) {
      setRateLimitTimeLeft(Math.ceil((rateLimitEndsAt - Date.now()) / 1000));
      const interval = setInterval(() => {
        const left = Math.ceil((rateLimitEndsAt - Date.now()) / 1000);
        if (left <= 0) {
          setRateLimitEndsAt(null);
          localStorage.removeItem('rateLimitEndsAt');
          setShowRateLimitPopup(false);
          clearInterval(interval);
        } else {
          setRateLimitTimeLeft(left);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rateLimitEndsAt]);

  // Record daily presence and update day streak
  useEffect(() => {
    const presenceInfo = recordTodayPresence();
    setStats(prev => ({
      ...prev,
      streak: presenceInfo.currentStreak,
    }));
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('synapse_stats', JSON.stringify(stats));
  }, [stats]);

  // Load from Firestore on mount if uid is present and sync is enabled
  useEffect(() => {
    const loadFromFirebase = async () => {
      if (stats.uid && db && isFirestoreSyncEnabled()) {
        try {
          const docRef = doc(db, 'users', stats.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setStats(prev => ({ ...prev, ...docSnap.data() as Partial<UserStats> }));
          }
        } catch (e: any) {
          // Gracefully disable cloud synchronization if Firestore database is unprovisioned or unavailable
          disableFirestoreSync();
        }
      }
    };
    loadFromFirebase();
  }, [stats.uid]);

  // Save to Firestore when stats change
  useEffect(() => {
    const saveToFirebase = async () => {
      if (stats.uid && db && isFirestoreSyncEnabled()) {
        try {
          const docRef = doc(db, 'users', stats.uid);
          await setDoc(docRef, stats, { merge: true });
        } catch (e: any) {
          // Gracefully disable cloud synchronization if Firestore database is unprovisioned or unavailable
          disableFirestoreSync();
        }
      }
    };
    // Debounce saving to firestore slightly to avoid excessive writes
    const timeout = setTimeout(saveToFirebase, 1000);
    return () => clearTimeout(timeout);
  }, [stats]);

  const handleNavigate = (screen: Screen) => {
    // Override 'play' to go to setup screen first
    if (screen === 'play') {
      setCurrentScreen('puzzle-setup');
    } else {
      setCurrentScreen(screen);
    }
  };

  const handleStartCustomChallenge = (config: any) => {
    setCustomConfig(config);
    setCurrentScreen('custom-challenge');
  };

  const handleUpdateStats = (newStats: Partial<UserStats>) => {
    setStats(prev => ({ ...prev, ...newStats }));
  };

  const handleSpendCoins = (amount: number) => {
    setStats(prev => ({
      ...prev,
      coins: Math.max(0, prev.coins - amount)
    }));
  };

  const handleSolve = (_xpEarned: number, coinsEarned: number, isCorrect: boolean, timeTaken: number, puzzleType: string) => {
    const presenceInfo = recordTodayPresence();
    setStats(prev => {
      const fixedXpEarned = 50;
      let newXp = prev.xp + fixedXpEarned;
      let newLevel = calculateLevelInfo(newXp).level;

      const newTotalAttempts = prev.totalAttempts + 1;
      const prevAverageTime = prev.averageTime || 0;
      const newAverageTime = prevAverageTime === 0 
        ? timeTaken 
        : ((prevAverageTime * prev.totalAttempts) + timeTaken) / newTotalAttempts;

      const safeTypeStats = prev.typeStats || {};
      const currentTypeStats = safeTypeStats[puzzleType] || { solved: 0, attempts: 0 };

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        streak: presenceInfo.currentStreak,
        coins: prev.coins + coinsEarned,
        puzzlesSolved: prev.puzzlesSolved + (isCorrect ? 1 : 0),
        totalAttempts: newTotalAttempts,
        averageTime: newAverageTime,
        typeStats: {
          ...safeTypeStats,
          [puzzleType]: {
            solved: currentTypeStats.solved + (isCorrect ? 1 : 0),
            attempts: currentTypeStats.attempts + 1
          }
        }
      };
    });
  };

  const handleBulkSolve = (_xpEarned: number, coinsEarned: number, results: {isCorrect: boolean, timeTaken: number, puzzleType: string}[]) => {
    const presenceInfo = recordTodayPresence();
    setStats(prev => {
      const fixedXpEarned = 50 * results.length;
      let newXp = prev.xp + fixedXpEarned;
      let newLevel = calculateLevelInfo(newXp).level;

      let newTotalAttempts = prev.totalAttempts;
      let totalTime = (prev.averageTime || 0) * prev.totalAttempts;
      let newPuzzlesSolved = prev.puzzlesSolved;
      
      const newTypeStats = { ...(prev.typeStats || {}) };

      for (const res of results) {
        newTotalAttempts += 1;
        totalTime += res.timeTaken;
        if (res.isCorrect) {
          newPuzzlesSolved += 1;
        }
        
        if (!newTypeStats[res.puzzleType]) {
          newTypeStats[res.puzzleType] = { solved: 0, attempts: 0 };
        }
        newTypeStats[res.puzzleType] = {
          ...newTypeStats[res.puzzleType],
          attempts: newTypeStats[res.puzzleType].attempts + 1,
          solved: newTypeStats[res.puzzleType].solved + (res.isCorrect ? 1 : 0)
        };
      }

      const newAverageTime = newTotalAttempts === 0 ? 0 : totalTime / newTotalAttempts;

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        streak: presenceInfo.currentStreak,
        coins: prev.coins + coinsEarned,
        puzzlesSolved: newPuzzlesSolved,
        totalAttempts: newTotalAttempts,
        averageTime: newAverageTime,
        typeStats: newTypeStats
      };
    });
  };

  const handleActivityComplete = (_xpEarned: number, coinsEarned: number) => {
    setStats(prev => {
      const fixedXpEarned = 50;
      let newXp = prev.xp + fixedXpEarned;
      let newLevel = calculateLevelInfo(newXp).level;
      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        coins: prev.coins + coinsEarned,
      };
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {currentScreen === 'splash' && (
          <motion.div key="splash" className="h-full">
            <SplashScreen onNavigate={handleNavigate} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'onboarding' && (
          <motion.div key="onboarding" className="h-full">
            <OnboardingScreen onNavigate={handleNavigate} onUpdateStats={handleUpdateStats} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'profile' && (
          <motion.div key="profile" className="h-full">
            <ProfileScreen onNavigate={handleNavigate} onUpdateStats={handleUpdateStats} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'home' && (
          <motion.div key="home" className="h-full">
            <HomeScreen onNavigate={handleNavigate} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'puzzle-setup' && (
          <motion.div key="puzzle-setup" className="h-full">
            <PuzzleSetupScreen onNavigate={handleNavigate} onStart={handleStartCustomChallenge} />
          </motion.div>
        )}
        {currentScreen === 'custom-challenge' && (
          <motion.div key="custom-challenge" className="h-full">
            <CustomChallengeScreen config={customConfig} onNavigate={handleNavigate} onSolve={handleSolve} onSpendCoins={handleSpendCoins} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'play' && (
          <motion.div key="play" className="h-full">
            <PuzzleScreen mode="normal" onNavigate={handleNavigate} onSolve={handleSolve} onSpendCoins={handleSpendCoins} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'progress' && (
          <motion.div key="progress" className="h-full">
            <ProgressScreen onNavigate={handleNavigate} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'calc-monarch' && (
          <motion.div key="calc-monarch" className="h-full">
            <CalculationMonarchScreen onNavigate={handleNavigate} onBulkSolve={handleBulkSolve} />
          </motion.div>
        )}
        {currentScreen === 'focus-timer' && (
          <motion.div key="focus-timer" className="h-full">
            <FocusTimerScreen onNavigate={handleNavigate} onActivityComplete={handleActivityComplete} />
          </motion.div>
        )}
        {currentScreen === 'planner' && (
          <motion.div key="planner" className="h-full">
            <PlannerScreen onNavigate={handleNavigate} onActivityComplete={handleActivityComplete} />
          </motion.div>
        )}
        {currentScreen === 'keen-researchers' && (
          <motion.div key="keen-researchers" className="h-full">
            <KeenResearchersScreen onNavigate={handleNavigate} onActivityComplete={handleActivityComplete} />
          </motion.div>
        )}
        {currentScreen === 'quiz-master' && (
          <motion.div key="quiz-master" className="h-full">
            <QuizMasterScreen onNavigate={handleNavigate} onActivityComplete={handleActivityComplete} />
          </motion.div>
        )}
        {currentScreen === 'daily' && (
          <motion.div key="daily" className="h-full">
            <DailyChallengeScreen onNavigate={handleNavigate} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'daily-play' && (
          <motion.div key="daily-play" className="h-full">
            <PuzzleScreen mode="daily" onNavigate={handleNavigate} onSolve={handleSolve} onSpendCoins={handleSpendCoins} stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-zinc-950/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl shadow-amber-500/10"
            >
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/40 mb-4">
                <Key className="w-7 h-7 text-amber-400" />
              </div>

              <h2 className="text-xl font-bold text-white mb-1">Google AI Studio Key Required</h2>
              <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
                Enter your manual Gemini API key to activate AI features. Multiple free models (Gemini 3.6 Flash, Flash Lite, etc.) will automatically be used with fallback.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Paste Custom API Key</label>
                  <input
                    type="password"
                    value={modalApiKeyInput}
                    onChange={(e) => setModalApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none transition-colors"
                  />
                </div>

                {/* Highlighted Yellow Box Light Animation Link */}
                <motion.a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 hover:border-yellow-300 text-yellow-100 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.7)] transition-all duration-300 overflow-hidden cursor-pointer block my-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-300 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500 group-hover:duration-200 animate-pulse pointer-events-none" />

                  <div className="flex items-center space-x-3 relative z-10">
                    <div className="w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-md shadow-yellow-400/40 shrink-0 group-hover:scale-110 transition-transform">
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">Click Here To Get API Key</span>
                        <Sparkles className="w-3 h-3 text-yellow-200 animate-bounce" />
                      </div>
                      <p className="text-[11px] font-semibold text-yellow-100/90 leading-tight">
                        Google AI Studio (Free Manual Key)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[11px] font-extrabold text-black bg-yellow-400 hover:bg-yellow-300 px-2.5 py-1.5 rounded-xl shadow-md shadow-yellow-400/30 z-10 shrink-0 group-hover:translate-x-0.5 transition-all">
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </motion.a>

                <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 my-1">
                  💡 <strong className="text-zinc-300">Account Note:</strong> Use a personal Google account (<code className="text-amber-400 font-mono">@gmail.com</code>). School/work accounts show Google policy restrictions.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowApiKeyModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modalApiKeyInput.trim()) {
                        handleUpdateStats({ apiKey: modalApiKeyInput.trim() });
                        setShowApiKeyModal(false);
                      }
                    }}
                    disabled={!modalApiKeyInput.trim()}
                    className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-yellow-400/20"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRateLimitPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md bg-zinc-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-amber-500/10 backdrop-blur-md flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Gemini API Quota Busy
                  {rateLimitTimeLeft > 0 && <span className="text-xs text-amber-400 font-mono">({rateLimitTimeLeft}s)</span>}
                </h4>
                <p className="text-zinc-400 text-xs">Auto-resets in seconds or use your own free key.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setShowRateLimitPopup(false);
                  setModalApiKeyInput(stats.apiKey || '');
                  setShowApiKeyModal(true);
                }}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-lg text-xs border border-amber-500/40 transition"
              >
                Key
              </button>
              <button
                onClick={() => setShowRateLimitPopup(false)}
                className="px-2 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
