import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit } from 'lucide-react';

const Loader = () => {
  return (
    <div className="relative flex items-center justify-center w-28 h-28 my-2">
      {/* Outer spinning gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-teal-400/30 border border-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.3)]"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-2 rounded-2xl bg-gradient-to-bl from-teal-400/20 via-indigo-600/30 to-purple-600/20 border border-teal-400/40"
        animate={{ scale: [1.08, 0.95, 1.08], rotate: [360, 180, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      {/* Core emblem container */}
      <motion.div
        className="relative z-10 p-4 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-indigo-500/60 shadow-[0_0_30px_rgba(99,102,241,0.6)] flex items-center justify-center"
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <BrainCircuit className="w-10 h-10 text-teal-300 drop-shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
      </motion.div>
    </div>
  );
};

export default Loader;
