import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Screen, UserStats } from '../types';
import Loader from './Loader';
import AppLogo from './AppLogo';

interface SplashScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
}

export default function SplashScreen({ onNavigate, stats }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stats.uid && stats.name && stats.apiKey) {
        onNavigate('home');
      } else {
        onNavigate('onboarding');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [stats, onNavigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-6"
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center max-w-xs w-full"
      >
        <AppLogo size="lg" showTagline={true} className="mb-4" />
        <Loader />
      </motion.div>
    </motion.div>
  );
}
