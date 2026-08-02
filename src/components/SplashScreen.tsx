import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Screen, UserStats } from '../types';
import Loader from './Loader';

interface SplashScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
}

export default function SplashScreen({ onNavigate, stats }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stats.uid && stats.apiKey && stats.name) {
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
        className="flex flex-col items-center"
      >
        <Loader />
        <motion.h1 
          className="mt-8 text-4xl font-black tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Academix Aletheon
        </motion.h1>
      </motion.div>
    </motion.div>
  );
}
