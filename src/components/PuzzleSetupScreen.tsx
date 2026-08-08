import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Plus, Trash2, Clock, Settings, BrainCircuit, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface PuzzleSetupScreenProps {
  onNavigate: (screen: string) => void;
  onStart: (config: any) => void;
}

const CATEGORIES = {
  "Practical & Life Skills": [
    "Budget Planning", "Time Management", "Calendar Logic", "Map Navigation", "Travel Planning", 
    "Shopping Optimization", "Inventory Management", "Disaster Planning", "Survival Challenge", "Daily Life Decisions"
  ],
  "Logic & Reasoning": [
    "Logic Grid (Einstein Puzzle)", "Sudoku", "KenKen", "Kakuro", "Raven's Progressive Matrices", 
    "Pattern Recognition", "Number Sequences", "Syllogisms", "Tower of Hanoi", "Cryptograms", 
    "Chess Tactics", "Graph & Data Interpretation", "Maze & Path Finding", "Probability Challenges", 
    "Experimental & Scientific Reasoning", "Coding & Algorithm Logic", "Detective Mystery Cases"
  ],
  "Speed & Attention": [
    "Stroop Test", "Reaction Time", "Find the Difference", "Visual Search", "Target Detection", 
    "Attention Switching", "Color Matching", "Symbol Matching", "Speed Counting", "Rapid Comparison", 
    "Focus Challenge", "Multi-Task Puzzle"
  ],
  "Memory & Recall": [
    "Memory Cards", "Sequence Memory", "Visual Memory", "Number Memory", "Word Memory", 
    "Pattern Recall", "Simon Memory", "Dual N-Back", "Working Memory", "Chunk Recall", 
    "Spatial Memory", "Episodic Recall", "Recall Order", "Memory Matrix"
  ],
  "Lateral & Critical Thinking": [
    "Lateral Thinking", "Brain Teasers", "Riddles", "Escape Room Logic", "Mystery Solving", 
    "Scenario Analysis", "Error Detection", "Fact vs Opinion", "Assumption Identification", 
    "Evidence Evaluation", "Argument Strength", "Strategic Decision Making", "Resource Allocation", "Ethical Dilemmas"
  ],
  "Spatial & Visual": [
    "Mental Rotation", "Tangram", "Block Rotation", "Cube Folding", "Paper Folding", 
    "Mirror Image", "Water Reflection", "Hidden Object", "Spot the Difference", "Jigsaw Puzzle", 
    "Silhouette Matching", "Shape Assembly", "Shape Dissection", "Perspective Puzzle", 
    "Isometric Reasoning", "Optical Illusion Analysis"
  ],
  "Advanced Logic & Deductive": [
    "Truth Teller & Liar", "Conditional Logic", "If-Then Reasoning", "Deductive Elimination", 
    "Seating Arrangement", "Family Tree Logic", "Blood Relation", "Direction Sense", 
    "Ranking & Ordering", "Age Problems", "Coding-Decoding", "Statement & Conclusion", 
    "Cause & Effect", "Assertion & Reason", "Logical Connectives", "Decision Making", 
    "Puzzle Boxes", "Constraint Satisfaction", "Mathematics & Number"
  ]
};

export default function PuzzleSetupScreen({ onNavigate, onStart }: PuzzleSetupScreenProps) {
  const [selectedTypes, setSelectedTypes] = useState<{ type: string; count: number }[]>([]);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [timeLimit, setTimeLimit] = useState(0); // 0 = unlimited

  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(CATEGORIES)[0]);
  const [totalPuzzles, setTotalPuzzles] = useState(10); // Target total

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 240;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleWheelCategories = (e: React.WheelEvent) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleAddType = (type: string) => {
    if (selectedTypes.find(t => t.type === type)) return;
    
    // Auto-distribute
    const currentSum = selectedTypes.reduce((acc, curr) => acc + curr.count, 0);
    const remaining = Math.max(1, totalPuzzles - currentSum);
    
    setSelectedTypes([...selectedTypes, { type, count: remaining }]);
  };

  const handleRemoveType = (type: string) => {
    setSelectedTypes(selectedTypes.filter(t => t.type !== type));
  };

  const handleUpdateCount = (type: string, count: number) => {
    setSelectedTypes(selectedTypes.map(t => t.type === type ? { ...t, count } : t));
  };

  const handleTotalChange = (newTotal: number) => {
    setTotalPuzzles(newTotal);
    if (selectedTypes.length > 0) {
       const avg = Math.max(1, Math.floor(newTotal / selectedTypes.length));
       let remainder = newTotal - (avg * selectedTypes.length);
       setSelectedTypes(selectedTypes.map((t, i) => ({
           ...t,
           count: avg + (i < remainder ? 1 : 0)
       })));
    }
  };

  const currentTotal = selectedTypes.reduce((acc, curr) => acc + curr.count, 0);

  const handleStart = () => {
    if (selectedTypes.length === 0) return;
    
    onStart({
      types: selectedTypes,
      difficulty,
      timeLimit
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0A2353] text-white overflow-hidden relative selection:bg-[#BB63FF] selection:text-white">
      {/* Deep Space Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B58EB]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#BB63FF]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#56E1E9]/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 md:px-8 border-b border-[#5B58EB]/30 bg-[#112C70]/70 backdrop-blur-xl relative z-10">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('home')}
            className="p-2.5 mr-4 rounded-xl bg-[#0A2353]/80 border border-[#5B58EB]/40 text-[#56E1E9] hover:bg-[#5B58EB] hover:text-white transition-all shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center tracking-tight">
              <Sparkles className="w-6 h-6 mr-2 text-[#56E1E9] animate-pulse" />
              Custom Puzzle Setup
            </h2>
            <p className="text-xs text-[#56E1E9]/80 font-medium">Design your personalized brain training session</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative z-10 deep-space-scrollbar">
        
        {/* Global Settings Cards - Deep Space Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#112C70]/80 border border-[#5B58EB]/30 p-5 rounded-3xl shadow-xl backdrop-blur-md hover:border-[#BB63FF]/50 transition-all">
            <label className="block text-xs font-bold text-[#56E1E9] uppercase tracking-wider mb-3">Target Total Puzzles</label>
            <div className="flex items-center space-x-4">
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={totalPuzzles} 
                onChange={(e) => handleTotalChange(parseInt(e.target.value))}
                className="flex-1 accent-[#56E1E9] cursor-pointer"
              />
              <span className="text-2xl font-black text-white bg-[#0A2353] px-3 py-1 rounded-xl border border-[#5B58EB]/40">{totalPuzzles}</span>
            </div>
            <p className="text-xs text-zinc-300 mt-2">Pick 1 to 30 puzzles for this round</p>
          </div>

          <div className="bg-[#112C70]/80 border border-[#5B58EB]/30 p-5 rounded-3xl shadow-xl backdrop-blur-md hover:border-[#BB63FF]/50 transition-all">
            <label className="block text-xs font-bold text-[#56E1E9] uppercase tracking-wider mb-3">Difficulty Level</label>
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-[#0A2353] border border-[#5B58EB]/40 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#56E1E9] outline-none font-semibold transition-all"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="hard">Hard</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>

          <div className="bg-[#112C70]/80 border border-[#5B58EB]/30 p-5 rounded-3xl shadow-xl backdrop-blur-md hover:border-[#BB63FF]/50 transition-all">
            <label className="block text-xs font-bold text-[#56E1E9] uppercase tracking-wider mb-3">Time Limit (Minutes)</label>
            <select 
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              className="w-full bg-[#0A2353] border border-[#5B58EB]/40 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#56E1E9] outline-none font-semibold transition-all"
            >
              <option value={0}>Unlimited</option>
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Category Selection & Puzzles list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center">
              <BrainCircuit className="w-5 h-5 mr-2 text-[#BB63FF]" />
              Select Puzzle Categories
            </h3>
            
            {/* Horizontal Scrollable Category Bar with Left/Right Arrows */}
            <div className="relative flex items-center bg-[#112C70]/90 border border-[#5B58EB]/30 p-2 rounded-2xl shadow-lg">
              <button
                onClick={() => handleScrollCategories('left')}
                className="p-2 rounded-xl bg-[#0A2353] border border-[#5B58EB]/40 text-[#56E1E9] hover:bg-[#5B58EB] hover:text-white transition-all shadow-md flex-shrink-0 z-10 mr-1"
                title="Scroll Left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div
                ref={categoryScrollRef}
                onWheel={handleWheelCategories}
                className="flex overflow-x-auto py-1.5 px-1 space-x-2 scroll-smooth touch-pan-x flex-1 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {Object.keys(CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex-shrink-0 border ${
                      activeCategory === cat 
                        ? 'bg-gradient-to-r from-[#5B58EB] via-[#BB63FF] to-[#56E1E9] text-white border-white shadow-[0_0_15px_rgba(91,88,235,0.6)] scale-105' 
                        : 'bg-[#0A2353]/80 text-zinc-300 hover:text-white hover:bg-[#0A2353] border-[#5B58EB]/30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleScrollCategories('right')}
                className="p-2 rounded-xl bg-[#0A2353] border border-[#5B58EB]/40 text-[#56E1E9] hover:bg-[#5B58EB] hover:text-white transition-all shadow-md flex-shrink-0 z-10 ml-1"
                title="Scroll Right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Types Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2 deep-space-scrollbar">
              {CATEGORIES[activeCategory as keyof typeof CATEGORIES].map(type => {
                const isSelected = selectedTypes.some(t => t.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => isSelected ? handleRemoveType(type) : handleAddType(type)}
                    className={`text-left p-3.5 rounded-2xl border text-sm transition-all flex items-center justify-between font-medium ${
                      isSelected 
                        ? 'bg-[#5B58EB]/30 border-[#56E1E9] text-white shadow-[0_0_12px_rgba(86,225,233,0.3)]' 
                        : 'bg-[#112C70]/70 border-[#5B58EB]/20 text-zinc-200 hover:bg-[#112C70] hover:border-[#5B58EB]/50'
                    }`}
                  >
                    <span className="truncate pr-2">{type}</span>
                    {isSelected ? (
                      <Trash2 className="w-4 h-4 text-[#56E1E9] flex-shrink-0" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#BB63FF] flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Mix & Quantity Configuration */}
          <div className="bg-[#112C70]/80 border border-[#5B58EB]/40 rounded-3xl p-6 flex flex-col shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-[#56E1E9]" />
                Selected Puzzle Mix
              </h3>
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                currentTotal > 30 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 
                currentTotal === totalPuzzles 
                  ? 'bg-[#56E1E9]/20 text-[#56E1E9] border border-[#56E1E9]/40' :
                  'bg-[#BB63FF]/20 text-[#BB63FF] border border-[#BB63FF]/40'
              }`}>
                {currentTotal} / {totalPuzzles} Selected
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[280px] mb-6 pr-2 deep-space-scrollbar">
              {selectedTypes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 py-12">
                  <BrainCircuit className="w-14 h-14 text-[#56E1E9] opacity-30 animate-pulse" />
                  <p className="text-sm text-center text-zinc-300">
                    Select puzzle categories & types from the left<br/>to build your custom challenge list.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {selectedTypes.map((st) => (
                    <motion.div
                      key={st.type}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-[#0A2353]/90 border border-[#5B58EB]/30 rounded-2xl p-4 flex items-center space-x-4 shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{st.type}</p>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <label className="text-xs text-[#56E1E9] uppercase tracking-wider font-bold">Qty</label>
                        <input 
                          type="number"
                          min="1"
                          max="30"
                          value={st.count}
                          onChange={(e) => handleUpdateCount(st.type, parseInt(e.target.value) || 1)}
                          className="w-16 bg-[#112C70] border border-[#5B58EB]/50 text-center text-white font-bold p-2 rounded-xl focus:ring-2 focus:ring-[#56E1E9] outline-none"
                        />
                        <button
                          onClick={() => handleRemoveType(st.type)}
                          className="p-2 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={selectedTypes.length === 0 || currentTotal > 30}
              className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center space-x-3 transition-all ${
                selectedTypes.length > 0 && currentTotal <= 30
                  ? 'bg-gradient-to-r from-[#5B58EB] via-[#BB63FF] to-[#56E1E9] hover:brightness-110 text-white shadow-[0_0_25px_rgba(91,88,235,0.5)] active:scale-[0.99]'
                  : 'bg-[#0A2353] text-zinc-500 border border-zinc-800 cursor-not-allowed'
              }`}
            >
              <Play className="w-6 h-6 fill-current" />
              <span>LAUNCH PUZZLE SESSION</span>
            </button>
            {currentTotal > 30 && (
              <p className="text-red-400 text-xs text-center mt-3 font-semibold">
                Maximum 30 questions per session. Please adjust your quantities.
              </p>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .deep-space-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .deep-space-scrollbar::-webkit-scrollbar-track { background: #0A2353; }
        .deep-space-scrollbar::-webkit-scrollbar-thumb { background: #5B58EB; border-radius: 10px; }
        .deep-space-scrollbar::-webkit-scrollbar-thumb:hover { background: #BB63FF; }
      `}} />
    </div>
  );
}
