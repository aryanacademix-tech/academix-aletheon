import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, BrainCircuit, Play, Timer, Trophy, CheckCircle, XCircle, AlertCircle, Loader2, Key, Sparkles, ExternalLink } from 'lucide-react';
import { Screen } from '../types';
import { recordSkillActivity } from '../utils/dailyTracker';
import GeneratingLoader from './GeneratingLoader';

interface QuizMasterScreenProps {
  onNavigate: (screen: Screen) => void;
  onActivityComplete?: (xp: number, coins: number) => void;
}

const SUBJECTS = [
  'Mixed', 'Physics', 'Chemistry', 'Biology', 
  'History', 'Mathematics', 'Geography', 'Technology', 
  'Literature', 'Custom'
];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Extreme', 'All'];
const QUESTION_TYPES = [
  'Multiple Choice Questions (MCQs)',
  'Multiple Select',
  'True/False',
  'Fill in the Blanks',
  'Match the Following',
  'Assertion & Reason',
  'Case-Based Questions'
];

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

const getFallbackQuiz = (subject: string, count: number): Question[] => {
  const subjectLower = subject.toLowerCase();
  let baseQuestions: Question[] = [
    {
      question: `In ${subject}, what is a fundamental core principle essential for analytical problem solving?`,
      options: ["Systematic analysis & logical decomposition", "Random trial without observation", "Ignoring unknown variables", "Memorizing results without theory"],
      correctAnswer: 0,
      explanation: "Logical analysis and systematic breakdown are fundamental across all academic and scientific disciplines."
    },
    {
      question: `Which strategy is most effective when encountering a complex problem in ${subject}?`,
      options: ["Decomposing into smaller, manageable sub-problems", "Skipping fundamental definitions", "Assuming variables remain constant", "Avoiding step-by-step verification"],
      correctAnswer: 0,
      explanation: "Decomposing complex problems into smaller sub-problems simplifies structural analysis."
    },
    {
      question: `What role does empirical verification play in study and research in ${subject}?`,
      options: ["Validating hypotheses and ensuring mathematical rigor", "Replacing theoretical modeling completely", "Slowing down problem solving artificially", "Eliminating peer review"],
      correctAnswer: 0,
      explanation: "Empirical verification ensures that conclusions are consistent, reproducible, and mathematically sound."
    },
    {
      question: `In mathematical and logical evaluation, what does applying standard order of operations guarantee?`,
      options: ["Consistent and unambiguous evaluation of expressions", "Elimination of negative numbers", "Faster calculation speed only", "Simplification of 3D geometry"],
      correctAnswer: 0,
      explanation: "Standard order of operations (PEMDAS/BODMAS) guarantees identical expression evaluation everywhere."
    },
    {
      question: `Which tool is most effective in ${subject} to visualize structural dependencies and concepts?`,
      options: ["Conceptual diagrams, flowcharts, and mind maps", "Unlabeled scatter plots", "Random number tables", "Unstructured text blocks"],
      correctAnswer: 0,
      explanation: "Mind maps, flowcharts, and diagrams clarify structural dependencies and logical relationships."
    }
  ];

  if (subjectLower.includes('math') || subjectLower.includes('algebra') || subjectLower.includes('arithmetic')) {
    baseQuestions = [
      {
        question: "Evaluate: 8 + 2 × (3² - 4)",
        options: ["18", "14", "26", "20"],
        correctAnswer: 0,
        explanation: "Order of operations: (3² - 4) = 5. 2 × 5 = 10. 8 + 10 = 18."
      },
      {
        question: "If 3x + 7 = 22, what is the value of x?",
        options: ["5", "4", "6", "3"],
        correctAnswer: 0,
        explanation: "3x = 22 - 7 = 15 => x = 5."
      },
      {
        question: "What is the slope of the line given by the equation y = 4x - 9?",
        options: ["4", "-9", "1/4", "9"],
        correctAnswer: 0,
        explanation: "In slope-intercept form y = mx + b, the coefficient m = 4 is the slope."
      },
      {
        question: "What is the sum of the interior angles of a pentagon (5 sides)?",
        options: ["540°", "360°", "720°", "180°"],
        correctAnswer: 0,
        explanation: "Formula: (n - 2) × 180° = (5 - 2) × 180° = 3 × 180° = 540°."
      },
      {
        question: "Which of the following numbers is a prime number?",
        options: ["29", "27", "33", "35"],
        correctAnswer: 0,
        explanation: "29 has no positive divisors other than 1 and itself."
      }
    ];
  } else if (subjectLower.includes('physics') || subjectLower.includes('science') || subjectLower.includes('chemistry')) {
    baseQuestions = [
      {
        question: "According to Newton's Second Law of Motion, net force equals:",
        options: ["Mass × Acceleration (F = ma)", "Mass ÷ Velocity", "Work × Distance", "Energy × Time"],
        correctAnswer: 0,
        explanation: "F = ma directly defines force as mass multiplied by acceleration."
      },
      {
        question: "What is the chemical symbol for Gold?",
        options: ["Au", "Ag", "Fe", "Cu"],
        correctAnswer: 0,
        explanation: "Au comes from the Latin word for gold, 'Aurum'."
      },
      {
        question: "What is the approximate speed of light in a vacuum?",
        options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "1.5 × 10⁸ m/s", "3 × 10¹⁰ m/s"],
        correctAnswer: 0,
        explanation: "The speed of light in a vacuum is c ≈ 3 × 10⁸ m/s."
      },
      {
        question: "Which subatomic particle carries a negative electric charge?",
        options: ["Electron", "Proton", "Neutron", "Positron"],
        correctAnswer: 0,
        explanation: "Electrons carry a unit negative charge (-1e)."
      },
      {
        question: "What is the pH value of pure distilled water at 25°C?",
        options: ["7 (Neutral)", "0 (Strong Acid)", "14 (Strong Base)", "5 (Slightly Acidic)"],
        correctAnswer: 0,
        explanation: "Pure water has equal concentrations of H⁺ and OH⁻ ions, yielding pH = 7."
      }
    ];
  }

  return baseQuestions.slice(0, count);
};

export default function QuizMasterScreen({ onNavigate, onActivityComplete }: QuizMasterScreenProps) {
  const [mode, setMode] = useState<'setup' | 'generating' | 'playing' | 'results' | 'cooldown'>('setup');
  
  // Setup State
  const [subject, setSubject] = useState('Mixed');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTopicName, setCustomTopicName] = useState('');
  const [descriptionPrompt, setDescriptionPrompt] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [questionsCount, setQuestionsCount] = useState(15);
  const [timeMin, setTimeMin] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Multiple Choice Questions (MCQs)']);
  
  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizTimer, setQuizTimer] = useState(0);
  const [missingApiKey, setMissingApiKey] = useState(false);
  
  // Cooldown State
  const [cooldownTime, setCooldownTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'playing') {
      interval = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
             handleQuizComplete();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (mode === 'cooldown') {
      interval = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            setMode('setup');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode]);

  const handleGenerate = async () => {
    setMode('generating');
    try {
      const activeSubject = isCustomMode || subject === 'Custom' 
        ? (customTopicName.trim() || 'Custom Topic') 
        : subject;
      
      const prompt = `Generate a multiple choice quiz in strict JSON array format.
      Subject / Core Topic: ${activeSubject}
      Sub-topic / Details: ${topic || 'General overview'}
      Class / Grade Level: ${grade || 'General audience'}
      Question Types Included: ${selectedTypes.join(', ')}
      Key Areas to Cover & Specific Instructions: ${descriptionPrompt || 'Cover fundamental to advanced concepts comprehensively.'}
      Number of Questions: ${questionsCount}
      Difficulty: ${difficulty}
      
      CRITICAL MATHEMATICAL & SYMBOL NOTATION RULES:
      1. Use clean, plain text for mathematical formulas, equations, and expressions (e.g., use +, -, ×, ÷, ^, √, =).
      2. DO NOT use raw LaTeX tags or commands (e.g. do NOT use \\frac, \\sqrt, \\times, \\cdot, etc.). Write fractions as a/b and square roots as √(x).
      3. CLEAR SYMBOL LEGEND: If any special, non-standard, or operational symbol (such as *, ^, ⊕, ⊗, mod, !, #) is used in a question or formula, you MUST explicitly include a clear explanation inside the question text explaining what the symbol demonstrates (e.g., "Note: '^' denotes exponentiation (power)", "Note: 'a ⊕ b' represents (a*b) + 1", or "Note: 'mod' represents remainder after division").
      
      IMPORTANT FORMATTING RULE FOR ALL QUESTION TYPES:
      Even if the question is True/False, Multiple Select, Fill in the Blanks, or Match the Following, you MUST format it as a 4-option single-choice question to fit the UI. 
      - For True/False: Provide options like ["True", "False", "Not enough info", "None of these"].
      - For Multiple Select: Provide options like ["Option A and B", "Option C only", "All of the above", "None of the above"].
      - For Fill in the Blanks: Provide 4 possible options for the blank.
      - For Match the Following: Include the matching pairs in the question text or options (e.g., option could be "1-A, 2-B, 3-C").
      - For Case-Based: Include the short case directly in the question text.
      
      Format requirement: Return ONLY a JSON array, no markdown formatting, no backticks.
      [
        {
          "question": "Question text here?",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0,
          "explanation": "Brief explanation of the answer."
        }
      ]`;

      let apiKey = '';
      try {
        const saved = localStorage.getItem('synapse_stats');
        if (saved) {
          const parsed = JSON.parse(saved);
          apiKey = parsed.apiKey || '';
        }
      } catch(e) {}

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('MISSING_API_KEY');
        // Fallback to offline subject quiz template
        const activeSub = isCustomMode || subject === 'Custom' ? (customTopicName.trim() || 'Custom Topic') : subject;
        const fallbackQs = getFallbackQuiz(activeSub, questionsCount);
        setQuestions(fallbackQs);
        setSelectedAnswers(new Array(fallbackQs.length).fill(-1));
        setCurrentQIndex(0);
        setQuizTimer(timeMin * 60);
        setMode('playing');
        return;
      }
      
      const data = await response.json();
      let rawText = data.text;
      
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      if (rawText.startsWith('```')) {
         rawText = rawText.replace(/```/g, '').trim();
      }
      
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid quiz format');
      
      setQuestions(parsed.slice(0, questionsCount)); // Ensure we don't exceed requested count
      setSelectedAnswers(new Array(parsed.slice(0, questionsCount).length).fill(-1));
      setCurrentQIndex(0);
      setQuizTimer(timeMin * 60);
      setMode('playing');
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY') {
        setMissingApiKey(true);
      } else {
        const activeSub = isCustomMode || subject === 'Custom' ? (customTopicName.trim() || 'Custom Topic') : subject;
        const fallbackQs = getFallbackQuiz(activeSub, questionsCount);
        setQuestions(fallbackQs);
        setSelectedAnswers(new Array(fallbackQs.length).fill(-1));
        setCurrentQIndex(0);
        setQuizTimer(timeMin * 60);
        setMode('playing');
      }
    }
  };

  const handleQuizComplete = () => {
    setMode('results');
    const finalScore = selectedAnswers.reduce((acc, ans, idx) => {
      if (ans === questions[idx]?.correctAnswer) return acc + 1;
      return acc;
    }, 0);

    const totalQ = questions.length;
    const timeSpent = Math.max(5, (timeMin * 60) - quizTimer);

    recordSkillActivity('quiz', prev => ({
      attempted: prev.attempted + totalQ,
      solved: prev.solved + finalScore,
      totalTimeSeconds: prev.totalTimeSeconds + timeSpent,
    }));

    recordSkillActivity('speed', prev => ({
      totalTimeSeconds: prev.totalTimeSeconds + timeSpent,
      itemCounts: prev.itemCounts + totalQ,
    }));

    if (onActivityComplete) {
      const baseXP = Math.floor(Math.random() * 51) + 100;
      const scoreXP = finalScore * 10;
      const coinsEarned = finalScore * 5;
      onActivityComplete(baseXP + scoreXP, coinsEarned);
    }
  };

  const finishAndCooldown = () => {
    // Set cooldown based on timeMin to prevent API exhaustion (1 min cooldown per 5 min of quiz, min 1 min)
    const cooldownMins = Math.max(1, Math.ceil(timeMin / 5));
    setCooldownTime(cooldownMins * 60);
    setMode('cooldown');
  };

  const handleAnswer = (index: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQIndex] = index;
    setSelectedAnswers(newAnswers);
  };

  const score = selectedAnswers.reduce((acc, ans, idx) => {
    if (ans === questions[idx]?.correctAnswer) return acc + 1;
    return acc;
  }, 0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden relative">
      {/* Top Gradient Bar */}
      <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 z-20" />
      
      {/* Header */}
      <div className="absolute top-1.5 w-full h-16 flex items-center px-6 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="ml-4 font-bold text-lg text-zinc-100 flex items-center">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-1.5 rounded-xl mr-3 shadow-md">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          Quiz Master
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto pt-24 pb-12 px-6 flex justify-center custom-scrollbar">
        {missingApiKey ? (
          <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full text-center shadow-2xl">
              <BrainCircuit className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Google AI Key Required</h2>
              <p className="text-zinc-400 mb-6 text-sm">
                To generate custom quizzes, enter your manual API key from Google AI Studio.
              </p>

              {/* Highlighted Yellow Box Light Animation Link */}
              <motion.a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 hover:border-yellow-300 text-yellow-100 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.7)] transition-all duration-300 overflow-hidden cursor-pointer mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-300 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500 group-hover:duration-200 animate-pulse pointer-events-none" />

                <div className="flex items-center space-x-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center font-black shadow-md shadow-yellow-400/40 shrink-0 group-hover:scale-110 transition-transform">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-black text-yellow-300 uppercase tracking-wider">Click Here To Get API Key</span>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-bounce" />
                    </div>
                    <p className="text-xs font-semibold text-yellow-100/90 leading-tight">
                      Google AI Studio (Free Manual Key)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-black bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-xl shadow-md shadow-yellow-400/30 z-10 shrink-0 group-hover:translate-x-0.5 transition-all">
                  <span>Get Key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </motion.a>

              <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 my-3 text-left">
                💡 <strong className="text-zinc-300">Account Note:</strong> Log in with a personal Google account (<code className="text-amber-400 font-mono">@gmail.com</code>). School/work accounts show restriction policies.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('profile')}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20"
                >
                  <Key className="w-4 h-4" />
                  <span>Enter API Key in Settings</span>
                </button>
                <button
                  onClick={() => onNavigate('home')}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
        <AnimatePresence mode="wait">
          {mode === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-teal-500/10 flex flex-col md:flex-row gap-12 lg:gap-16 items-stretch"
            >
              {/* Left Column */}
              <div className="flex-1 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center">
                      <BrainCircuit className="w-4 h-4 mr-2 text-teal-400" /> Subject / Topic Mode
                    </h3>
                    <button
                      onClick={() => {
                        setIsCustomMode(!isCustomMode);
                        if (!isCustomMode) setSubject('Custom');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                        isCustomMode || subject === 'Custom'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent shadow-lg shadow-teal-500/20 scale-105'
                          : 'bg-zinc-800 text-teal-400 border-teal-500/30 hover:bg-zinc-700'
                      }`}
                    >
                      <span>✨ Customize Topic</span>
                    </button>
                  </div>

                  {(isCustomMode || subject === 'Custom') ? (
                    <div className="p-4 bg-teal-950/20 border border-teal-500/40 rounded-2xl space-y-3 mb-4">
                      <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider">
                        Custom Topic Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Quantum Computing, French Revolution, Organic Chemistry..."
                        value={customTopicName}
                        onChange={e => setCustomTopicName(e.target.value)}
                        className="w-full bg-zinc-900 border border-teal-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 text-zinc-100 placeholder-zinc-500 font-medium"
                        autoFocus
                      />
                      <div className="flex justify-between items-center text-[11px] text-teal-400/80">
                        <span>AI will generate quiz questions specifically for this topic</span>
                        <button 
                          onClick={() => { setIsCustomMode(false); setSubject('Mixed'); }}
                          className="hover:underline text-zinc-400"
                        >
                          Switch to preset subjects
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {SUBJECTS.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setSubject(s);
                            if (s === 'Custom') setIsCustomMode(true);
                            else setIsCustomMode(false);
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                            subject === s && !isCustomMode
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/50 shadow-md' 
                              : 'bg-zinc-800/50 border border-transparent text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Question Types Section */}
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Question Types</h3>
                    <div className="flex flex-wrap gap-2">
                      {QUESTION_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            if (selectedTypes.includes(type)) {
                              if (selectedTypes.length > 1) {
                                setSelectedTypes(selectedTypes.filter(t => t !== type));
                              }
                            } else {
                              setSelectedTypes([...selectedTypes, type]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            selectedTypes.includes(type)
                              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50 shadow-sm'
                              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description Section */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Description & Key Areas to Cover</span>
                      <span className="text-[10px] text-teal-400 font-normal">AI Instructions</span>
                    </h3>
                    <textarea 
                      rows={3}
                      placeholder="Give specific key areas, subtopics, or instructions (e.g. 'Focus on sub-atomic particles, include numerical calculations, 12th grade level, emphasize practical applications')..."
                      value={descriptionPrompt}
                      onChange={e => setDescriptionPrompt(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500/80 transition-colors text-zinc-100 placeholder-zinc-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Topic Focus</h3>
                      <input 
                        type="text" 
                        placeholder="e.g. Chapter Name or Specific Topic..."
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500/50 transition-colors text-zinc-100 placeholder-zinc-500"
                      />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Class / Grade</h3>
                      <input 
                        type="text" 
                        placeholder="e.g. Class 10..."
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500/50 transition-colors text-zinc-100 placeholder-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex-1 space-y-10 flex flex-col justify-between">
                <div className="space-y-10">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Questions: {questionsCount}</h3>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="25" 
                      value={questionsCount}
                      onChange={e => setQuestionsCount(parseInt(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 mt-2 font-medium">
                      <span>10</span>
                      <span>25</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center">
                        <Timer className="w-4 h-4 mr-2" /> Time: {timeMin} Min
                      </h3>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="60" 
                      value={timeMin}
                      onChange={e => setTimeMin(parseInt(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-400 mt-2 font-medium">
                      <span>1m</span>
                      <span>30m</span>
                      <span>60m</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Difficulty</h3>
                    <div className="flex bg-zinc-800/50 border border-zinc-800 rounded-xl p-1.5">
                      {DIFFICULTIES.map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                            difficulty === d ? 'bg-zinc-900 text-zinc-100 shadow-md' : 'text-zinc-400 hover:text-zinc-400 hover:bg-zinc-800/50'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-transform active:scale-95 shadow-md"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span className="text-lg tracking-wide">Generate Quiz</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'generating' && (
            <motion.div 
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto w-full py-12"
            >
              <GeneratingLoader />
              <h2 className="text-2xl font-bold text-zinc-100 mt-4">Forging Your Quiz...</h2>
              <p className="text-zinc-400 text-sm max-w-sm">AI is crafting unique questions tailored to your configuration. This usually takes a few seconds.</p>
            </motion.div>
          )}

          {mode === 'playing' && questions.length > 0 && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-3xl mx-auto flex flex-col h-full space-y-4"
            >
              <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-md">
                <div className="flex space-x-1.5 flex-1 mr-4 overflow-x-auto py-1">
                  {questions.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2.5 min-w-[10px] rounded-full transition-all ${i === currentQIndex ? 'flex-[3] bg-gradient-to-r from-teal-500 to-cyan-500' : i < currentQIndex ? 'flex-1 bg-teal-500/20' : 'flex-1 bg-zinc-800/50'}`}
                    />
                  ))}
                </div>
                <div className={`font-mono text-lg md:text-xl font-bold flex items-center shrink-0 ${quizTimer < 60 ? 'text-red-400 animate-pulse' : 'text-zinc-100'}`}>
                  <Timer className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                  {formatTime(quizTimer)}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-[2rem] p-5 md:p-10 shadow-2xl shadow-teal-500/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 to-cyan-500" />
                  
                  <span className="text-cyan-500 font-bold text-xs md:text-sm tracking-wider uppercase mb-3 block">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  
                  <h2 className="text-lg md:text-2xl font-bold text-zinc-100 mb-6 leading-relaxed break-words max-w-full overflow-hidden">
                    {questions[currentQIndex].question}
                  </h2>

                  <div className="space-y-3">
                    {questions[currentQIndex].options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border-2 transition-all ${
                          selectedAnswers[currentQIndex] === idx 
                            ? 'bg-teal-500/10 border-teal-500/50 text-zinc-100 shadow-md' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-teal-500/50 hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-start">
                          <span className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center mr-3 text-xs md:text-sm font-bold shrink-0 transition-colors ${
                            selectedAnswers[currentQIndex] === idx ? 'bg-teal-500 text-white' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800'
                          }`}>
                            {['A', 'B', 'C', 'D'][idx]}
                          </span>
                          <span className="text-sm md:text-base font-medium break-words min-w-0 flex-1 leading-relaxed">{opt}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center gap-2">
                <button 
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-4 md:px-6 py-3 rounded-xl font-bold text-xs md:text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                
                {currentQIndex === questions.length - 1 ? (
                  <button 
                    onClick={handleQuizComplete}
                    className="px-6 md:px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-white font-bold text-xs md:text-sm rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 md:px-8 py-3 bg-zinc-900 hover:bg-zinc-800/50 text-zinc-100 border border-zinc-800 font-bold text-xs md:text-sm rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {mode === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-4xl space-y-8"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden shadow-2xl shadow-teal-500/10">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-transparent pointer-events-none" />
                
                <Trophy className="w-20 h-20 text-amber-500 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-zinc-100 mb-2">Quiz Complete!</h2>
                <p className="text-zinc-400 mb-8 font-medium">You scored {score} out of {questions.length}</p>
                
                <div className="flex justify-center mb-8">
                  <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-teal-500 to-cyan-500">
                    {Math.round((score / questions.length) * 100)}%
                  </div>
                </div>

                <button 
                  onClick={finishAndCooldown}
                  className="px-8 py-4 bg-teal-600 hover:bg-teal-600/90 text-white font-bold rounded-2xl shadow-lg transition-transform active:scale-95"
                >
                  Finish & Cooldown
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xl px-2 text-zinc-100">Review Answers</h3>
                {questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctAnswer;
                  const isUnanswered = selectedAnswers[i] === -1 || selectedAnswers[i] === undefined;
                  
                  return (
                    <div key={i} className={`bg-zinc-900 border-2 ${isCorrect ? 'border-emerald-500/40' : 'border-red-500/40'} rounded-2xl p-6 shadow-md`}>
                      <div className="flex items-start">
                        <div className="mr-4 mt-1">
                          {isCorrect ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-zinc-100 text-lg mb-4">{i + 1}. {q.question}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {q.options.map((opt, oIdx) => {
                              let optionClass = "bg-zinc-950 border-zinc-800 text-zinc-400";
                              if (oIdx === q.correctAnswer) optionClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold";
                              else if (oIdx === selectedAnswers[i]) optionClass = "bg-red-500/10 border-red-500 text-red-400 font-bold";
                              
                              return (
                                <div key={oIdx} className={`p-4 rounded-xl border-2 ${optionClass}`}>
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
                            <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider block mb-1">Explanation</span>
                            <span className="text-zinc-100 font-medium text-sm">{q.explanation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {mode === 'cooldown' && (
            <motion.div 
              key="cooldown"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center space-y-6 text-center max-w-md bg-zinc-900 border border-zinc-800 rounded-[2rem] p-12 shadow-2xl shadow-teal-500/10"
            >
              <Timer className="w-16 h-16 text-teal-400" />
              <h2 className="text-3xl font-black text-zinc-100">Cooldown Active</h2>
              <p className="text-zinc-400 font-medium">To prevent API quota exhaustion, Quiz Master requires a brief cooldown period after each generation.</p>
              
              <div className="text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 py-4">
                {formatTime(cooldownTime)}
              </div>
              
              <p className="text-sm text-zinc-400 font-medium">You can explore other sections of the app while waiting.</p>
              
              <button 
                onClick={() => onNavigate('home')}
                className="mt-4 px-8 py-3 bg-zinc-900 border-2 border-zinc-800 hover:border-teal-500/50 hover:bg-zinc-800/50 text-zinc-100 font-bold rounded-xl transition-colors"
              >
                Return to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
      
    </div>
  );
}
