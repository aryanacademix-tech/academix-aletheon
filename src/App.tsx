import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock } from 'lucide-react';
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

  const [rateLimitEndsAt, setRateLimitEndsAt] = useState<number | null>(() => {
    const saved = localStorage.getItem('rateLimitEndsAt');
    if (saved && parseInt(saved) > Date.now()) {
      return parseInt(saved);
    }
    return null;
  });
  const [showRateLimitPopup, setShowRateLimitPopup] = useState(false);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

  useEffect(() => {
    const handleRateLimit = () => {
      const endsAt = Date.now() + 60000; // 60 seconds
      setRateLimitEndsAt(endsAt);
      localStorage.setItem('rateLimitEndsAt', endsAt.toString());
      if (currentScreen !== 'home') {
        setShowRateLimitPopup(true);
      }
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

  // Auto-generate/ensure in-app API key for any user signed in with Google
  useEffect(() => {
    if (stats.uid && (!stats.apiKey || stats.apiKey.trim() === '')) {
      const autoKey = `academix_google_key_${stats.uid}`;
      setStats(prev => ({ ...prev, apiKey: autoKey }));
    }
  }, [stats.uid, stats.apiKey]);

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
        {showRateLimitPopup && rateLimitEndsAt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center flex flex-col items-center shadow-2xl shadow-red-500/10"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 mb-6">
                <Clock className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">API Rate Limit Reached</h2>
              <p className="text-zinc-400 text-sm mb-6">
                You've hit the rate limit for your API key. Please wait before using AI features again.
              </p>
              <div className="text-4xl font-mono text-red-400 font-bold mb-8">
                {rateLimitTimeLeft}s
              </div>
              <button
                onClick={() => setShowRateLimitPopup(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
