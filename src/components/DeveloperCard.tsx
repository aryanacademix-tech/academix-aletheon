import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code2, Heart, MapPin, Sparkles, GraduationCap, Quote, Info, X } from 'lucide-react';

export default function DeveloperCard() {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const showCard = isHovered || isOpenMobile;

  return (
    <div className="relative my-6 w-full max-w-md mx-auto flex flex-col items-center">
      {/* TRIGGER BADGE / CARD */}
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsOpenMobile(prev => !prev)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative group w-full bg-gradient-to-r from-zinc-900 via-[#18181B] to-zinc-900 hover:from-purple-950/40 hover:via-zinc-900 hover:to-indigo-950/40 border border-zinc-800 hover:border-purple-500/50 rounded-2xl p-4 transition-all duration-300 shadow-lg flex items-center justify-between overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="flex items-center space-x-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Meet the Creator</span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-purple-200 transition-colors">About the Developer</h3>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400 group-hover:text-purple-300 bg-zinc-800/80 group-hover:bg-purple-900/40 px-3 py-1.5 rounded-xl border border-zinc-700/50 group-hover:border-purple-500/30 transition-all relative z-10">
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hover / Tap</span>
          <span className="sm:hidden">Tap info</span>
        </div>
      </motion.button>

      {/* HOVER / EXPANDED CARD */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full mt-3 bg-[#121216] border border-purple-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl relative z-30 overflow-hidden text-left"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Mobile close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpenMobile(false);
                setIsHovered(false);
              }}
              className="sm:hidden absolute top-3.5 right-3.5 p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Card Header */}
            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-zinc-800/80">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  About the Developer
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                </h4>
                <p className="text-[11px] text-zinc-400">Creator of Academix Aletheon</p>
              </div>
            </div>

            {/* Exact Description text requested */}
            <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                Abhinav Aryan is a student and passionate vibe coder from India who built Academix Aletheon to test, expand, and refine his skills in the emerging field of AI-powered application development. Driven by curiosity and a love for learning, he believes every project is an opportunity to discover something new.
              </p>
              <p>
                His goal with Academix Aletheon is to make studying feel less like a chore and more like an engaging, enjoyable journey. By combining AI with thoughtful design, he aims to create tools that are genuinely helpful, practical, and accessible for students and lifelong learners.
              </p>
              <p>
                He continues to learn, experiment, and improve every day with one simple belief:
              </p>

              {/* Quote block */}
              <div className="bg-purple-950/30 border-l-2 border-purple-500 p-3 rounded-r-xl my-2 flex items-start space-x-2.5">
                <Quote className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p className="italic font-medium text-purple-200 text-xs sm:text-sm">
                  "Keep learning. Keep growing."
                </p>
              </div>
            </div>

            {/* Footer with Name and Country */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 font-bold text-zinc-100">
                <span className="text-emerald-400">Abhinav Aryan</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  India 🇮🇳
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                Vibe Coder
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
