import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, Search, Plus, Upload, MessageSquare, BookOpen, 
  BrainCircuit, LayoutDashboard, Database, HelpCircle, 
  Sparkles, ArrowRight, X, Loader2, Menu, Image as ImageIcon,
  Clock, Download, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  CheckCircle, RotateCcw, Zap, Layers, Wand2, Eye, Share2,
  Key, SlidersHorizontal, FileText
} from 'lucide-react';
import { Screen } from '../types';
import Markdown from 'react-markdown';
import { recordSkillActivity } from '../utils/dailyTracker';

interface KeenResearchersScreenProps {
  onNavigate: (screen: Screen) => void;
  onActivityComplete?: (xp: number, coins: number) => void;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'quiz' | 'flashcards' | 'mindmap' | 'dictionary';
  executionTime?: number; // duration in seconds
  infographicUrl?: string;
  infographicSvg?: string;
  mindMapData?: MindMapTree;
  flashcards?: Flashcard[];
  quiz?: QuizItem[];
};

type MindMapNode = {
  id: string;
  label: string;
  details?: string;
  category?: string;
  children?: MindMapNode[];
};

type MindMapTree = {
  title: string;
  nodes: MindMapNode[];
};

type Flashcard = {
  question: string;
  answer: string;
  tag?: string;
};

type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};


const RESEARCH_SYSTEM_INSTRUCTION = `You are an expert AI research and summarization assistant.
First, understand the user's intent and the context of the query before generating any response. If web research is available, gather the most relevant, recent, and reliable information from trusted online sources, then synthesize it instead of copying it.

Create summaries that are:
- Accurate, complete, and easy to understand.
- Well-structured with clear headings and subheadings.
- Written in simple, concise language while preserving important details.
- Logically organized from basic concepts to advanced points.
- Free from repetition, unnecessary filler, and jargon.

Output format:
# Title
## Overview (2–4 sentences)
## Key Points (bullet list)
## Detailed Explanation
## Important Facts / Statistics (if relevant)
## Examples or Real-World Applications (if applicable)
## Key Takeaways (3–5 bullets)

Prioritize clarity, readability, and educational value over length. Explain concepts instead of merely listing facts, and ensure the summary gives the user a complete understanding of the topic.`;

export default function KeenResearchersScreen({ onNavigate, onActivityComplete }: KeenResearchersScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [researchStyle, setResearchStyle] = useState<'flash' | 'fast' | 'deep'>('fast');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isDesktopLeftPanelOpen, setIsDesktopLeftPanelOpen] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Timeline / timer states
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [cooldownTimer, setCooldownTimer] = useState<number>(0);

  // Auto-decrement 60s cooldown timer
  useEffect(() => {
    if (cooldownTimer <= 0) return;
    const interval = setInterval(() => {
      setCooldownTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTimer]);

  // Studio tabs & specialized state
  const [activeStudioTab, setActiveStudioTab] = useState<'tools' | 'mindmap' | 'study_deck'>('tools');
  
  // User API key state
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('synapse_stats');
      if (saved) return JSON.parse(saved).apiKey || '';
    } catch(e) {}
    return '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  // Mind map state
  const [mindMapData, setMindMapData] = useState<MindMapTree | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedMindMapNode, setSelectedMindMapNode] = useState<MindMapNode | null>(null);
  const [isFullscreenMindMap, setIsFullscreenMindMap] = useState(false);
  const [mindmapViewMode, setMindmapViewMode] = useState<'network' | 'tree'>('network');

  // Study deck (Flashcards & Quiz) state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [discoveredResources, setDiscoveredResources] = useState<{title: string; uri: string; snippet?: string}[]>([]);

  const tools = [
    { 
      id: 'mindmap', 
      label: 'Mind Map', 
      icon: BrainCircuit, 
      color: 'text-purple-400', 
      prompt: 'Create a comprehensive mind map structure for our current topic. Return a structured JSON mind map format with title, main branches, and sub-details. Format as ```json { "title": "Topic", "nodes": [ { "id": "1", "label": "Main Branch", "category": "Principle", "details": "Explanation", "children": [ { "id": "1-1", "label": "Sub concept", "details": "Sub details" } ] } ] } ```' 
    },
    { 
      id: 'flashcards', 
      label: 'Flashcards', 
      icon: BookOpen, 
      color: 'text-blue-400', 
      prompt: 'Generate an exhaustive set of study flashcards covering ALL key concepts, definitions, formulas, and critical details of the topic. Do not limit to 5 questions; create as many high-quality flashcards as required for total topic mastery. Format as a JSON array of objects with "question" and "answer" keys.' 
    },
    { 
      id: 'quiz', 
      label: 'Quiz', 
      icon: LayoutDashboard, 
      color: 'text-amber-400', 
      prompt: 'Generate a comprehensive knowledge test quiz covering all subtopics, edge cases, and core principles of the subject. Do not cap at 5 questions; generate a full set of questions for complete assessment. Format as a JSON array of objects with "question", "options" (4 strings), "answerIndex" (0-3), and "explanation".' 
    },
    { 
      id: 'infographic', 
      label: 'Infographic Summary', 
      icon: Database, 
      color: 'text-emerald-400', 
      prompt: 'Create a structured infographic summary in markdown format with clear statistics, callout boxes, and comparison sections.' 
    },
    { 
      id: 'qa', 
      label: 'Q&A Bank', 
      icon: HelpCircle, 
      color: 'text-rose-400', 
      prompt: 'Provide an extensive Question & Answer bank covering every essential concept and subtopic across the subject without limiting the question count.' 
    },
    { 
      id: 'dictionary', 
      label: 'Vocabulary Bank', 
      icon: Sparkles, 
      color: 'text-cyan-400', 
      prompt: 'Identify all technical terms, key vocabulary, and hard words from our discussion, providing clear definitions, contextual usage, and examples for each.' 
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Live timer tick during request execution
  useEffect(() => {
    if (isTyping) {
      setLiveTimer(0);
      timerRef.current = setInterval(() => {
        setLiveTimer(prev => parseFloat((prev + 0.1).toFixed(1)));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTyping]);

  // Helper to parse mindmap JSON / markdown tree
  const parseMindMapData = (text: string): MindMapTree | null => {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
      const raw = jsonMatch[1] || text;
      const parsed = JSON.parse(raw.trim());
      if (parsed && (parsed.nodes || parsed.title)) {
        return {
          title: parsed.title || 'Topic Overview',
          nodes: parsed.nodes || []
        };
      }
    } catch (e) {
      // Fallback: parse bullet list markdown into mindmap tree
      const lines = text.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().startsWith('#'));
      if (lines.length > 0) {
        const nodes: MindMapNode[] = [];
        let currentParent: MindMapNode | null = null;

        lines.forEach((line, idx) => {
          const clean = line.replace(/^[#*-\s]+/, '').trim();
          if (!clean) return;

          if (line.startsWith('#') || !line.startsWith(' ')) {
            currentParent = { id: `node-${idx}`, label: clean, children: [] };
            nodes.push(currentParent);
          } else if (currentParent) {
            currentParent.children?.push({ id: `sub-${idx}`, label: clean });
          }
        });

        if (nodes.length > 0) {
          return { title: 'Research Mind Map', nodes };
        }
      }
    }
    return null;
  };

  // Helper to parse flashcards JSON
  const parseFlashcards = (text: string): Flashcard[] => {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const raw = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [];
  };

  // Helper to parse quiz JSON
  const parseQuiz = (text: string): QuizItem[] => {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const raw = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [];
  };

  // Helper to save API Key to local storage
  const handleSaveApiKey = (keyToSave: string) => {
    const trimmed = keyToSave.trim();
    setUserApiKey(trimmed);
    try {
      const saved = localStorage.getItem('synapse_stats');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed.apiKey = trimmed;
      localStorage.setItem('synapse_stats', JSON.stringify(parsed));
    } catch (e) {}
    setShowApiKeyModal(false);
  };

  const handleSend = async (customPrompt?: string, msgType?: Message['type']) => {
    if (cooldownTimer > 0) {
      alert(`Please wait ${cooldownTimer} seconds for the API rate limit cooldown before sending another request.`);
      return;
    }

    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    if (!customPrompt) {
      setInput('');
    }

    const startTime = performance.now();

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      let activeSysInstruction = RESEARCH_SYSTEM_INSTRUCTION;
      if (researchStyle === 'flash') {
        activeSysInstruction = `You are an ultra-concise, direct AI research assistant.
Provide a quick, laser-focused answer sticking strictly to the topic and directly answering what is explicitly asked.
- Keep responses short, clear, and to the point (1-3 short paragraphs or direct bullet points).
- Do NOT include lengthy preambles, repetitive summaries, filler text, or unrequested background history.
- Immediately state the core answer or essential facts clearly.`;
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: userApiKey,
          model: researchStyle === 'deep' ? 'gemini-3.1-pro-preview' : 'gemini-2.5-flash',
          thinkingMode: researchStyle === 'deep',
          contents: [
            ...messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content || 'Specialized Studio Deck Resource' }]
            })),
            { role: 'user', parts: [{ text: textToSend }] }
          ],
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: activeSysInstruction
          }
        }),
      });

      const data = await response.json();
      const endTime = performance.now();
      const totalSec = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      setLastExecutionTime(totalSec);

      if (data.groundingChunks && data.groundingChunks.length > 0) {
        setDiscoveredResources(prev => {
          const newResources = [...prev];
          data.groundingChunks.forEach((chunk: {title: string; uri: string; snippet?: string}) => {
            if (!newResources.some(r => r.uri === chunk.uri)) {
              newResources.push(chunk);
            }
          });
          return newResources;
        });
      }

      if (response.ok) {
        const replyText = data.text || 'No response';

        // Parse special types for dedicated studio spaces
        let parsedMindMap: MindMapTree | null = null;
        let parsedCards: Flashcard[] = [];
        let parsedQuiz: QuizItem[] = [];

        if (msgType === 'mindmap' || textToSend.toLowerCase().includes('mind map')) {
          parsedMindMap = parseMindMapData(replyText);
          if (parsedMindMap) {
            setMindMapData(parsedMindMap);
            setActiveStudioTab('mindmap');
            setShowRightPanel(true);
          }
        } else if (msgType === 'flashcards' || textToSend.toLowerCase().includes('flashcard')) {
          parsedCards = parseFlashcards(replyText);
          if (parsedCards.length > 0) {
            setFlashcards(parsedCards);
            setCurrentCardIndex(0);
            setIsCardFlipped(false);
            setActiveStudioTab('study_deck');
            setShowRightPanel(true);
          }
        } else if (msgType === 'quiz' || textToSend.toLowerCase().includes('quiz')) {
          parsedQuiz = parseQuiz(replyText);
          if (parsedQuiz.length > 0) {
            setQuizItems(parsedQuiz);
            setCurrentQuizIndex(0);
            setSelectedOption(null);
            setQuizScore(0);
            setQuizFinished(false);
            setActiveStudioTab('study_deck');
            setShowRightPanel(true);
          }
        }

        // Clean chat content display string so raw JSON arrays never show up in chat
        let displayContent = replyText;
        if (parsedQuiz.length > 0) {
          displayContent = `🎯 **Quiz generated successfully** (${parsedQuiz.length} questions).\n\nThe interactive quiz is ready in your **Study Deck**!`;
        } else if (parsedCards.length > 0) {
          displayContent = `🎴 **Flashcard Deck generated successfully** (${parsedCards.length} cards).\n\nThe study deck is ready in your **Study Deck**!`;
        } else if (parsedMindMap) {
          displayContent = `🧠 **Mind Map generated successfully** for **${parsedMindMap.title}**.\n\nThe interactive tree is ready in your **Mind Map Space**!`;
        } else if (replyText.trim().startsWith('[') && replyText.trim().endsWith(']')) {
          // If the model returned a raw JSON array string for a general prompt, prevent dumping raw JSON in chat
          try {
            const arr = JSON.parse(replyText.trim());
            if (Array.isArray(arr)) {
              displayContent = `✅ Generated ${arr.length} items. Check your Studio space!`;
            }
          } catch (e) {}
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: displayContent,
          type: msgType || 'text',
          executionTime: totalSec,
          mindMapData: parsedMindMap || undefined,
          flashcards: parsedCards.length > 0 ? parsedCards : undefined,
          quiz: parsedQuiz.length > 0 ? parsedQuiz : undefined
        }]);

        recordSkillActivity('researches', prev => ({
          sessions: prev.sessions + 1,
          topicsViewed: [...prev.topicsViewed, textToSend.trim().substring(0, 30)]
        }));

        if (onActivityComplete) {
          const xp = Math.floor(Math.random() * 51) + 100;
          onActivityComplete(xp, 5);
        }
      } else {
        const isRateLimit = response.status === 429 || 
          (data.error && (data.error.includes('429') || data.error.includes('quota') || data.error.includes('RESOURCE_EXHAUSTED') || data.error.includes('rate limit')));

        if (isRateLimit) {
          setCooldownTimer(60);
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `⏳ **Gemini API Rate Limit Cooldown (60 Seconds)**\n\nThe free shared API quota per minute was exceeded. An automatic **60-second timer** has been started to allow the rate limit window to refresh.\n\n* **Cooldown Remaining:** Check the timer banner at the bottom input bar.\n* **Tip:** Enter your own custom Gemini API key in **Settings / Custom API Key** (top right) to bypass shared limits!`,
            executionTime: totalSec
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${data.error || 'Failed to generate response'}`,
            executionTime: totalSec
          }]);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Network error occurred. Please try again.',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div className="flex h-screen bg-[#0F172A] text-[#F8FAFC] font-sans overflow-hidden">
      {/* Mobile Overlays */}
      {(showLeftPanel || showRightPanel) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => { setShowLeftPanel(false); setShowRightPanel(false); }}
        />
      )}

      {/* Left Panel: Sources */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-[#334155] bg-[#111827] flex flex-col flex-shrink-0 transform transition-all duration-300 ease-in-out lg:relative ${showLeftPanel ? 'translate-x-0' : '-translate-x-full'} ${isDesktopLeftPanelOpen ? 'lg:translate-x-0 lg:ml-0' : 'lg:-translate-x-full lg:-ml-80'}`}>
        <div className="p-4 border-b border-[#334155] flex items-center justify-between h-16">
          <div className="flex items-center">
            <div>
              <h1 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#14B8A6] leading-none">
                Academix Aletheon
              </h1>
            </div>
          </div>
          <button onClick={() => setShowLeftPanel(false)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <button onClick={() => setIsDesktopLeftPanelOpen(false)} className="hidden lg:block p-2 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center justify-between">
            Sources
            <span className="text-xs text-blue-400 font-normal">Live Web Sync</span>
          </h2>

          <div className="bg-[#1E293B] rounded-xl p-3 flex items-center justify-between border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] mb-4 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-100">Deep Research Engine</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>

          <div className="relative mb-6">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search web for new sources..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend(`Research this topic comprehensively: ${searchQuery}`);
                  setSearchQuery('');
                  if (window.innerWidth < 1024) setShowLeftPanel(false);
                }
              }}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl pl-9 pr-10 py-2 text-sm focus:outline-none focus:border-blue-500 text-zinc-200"
            />
            <button 
              onClick={() => {
                handleSend(`Research this topic comprehensively: ${searchQuery}`);
                setSearchQuery('');
                if (window.innerWidth < 1024) setShowLeftPanel(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#1E293B] rounded-lg"
            >
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Research Sources</span>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-mono">{discoveredResources.length} Extracted</span>
          </div>

          {discoveredResources.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-600 space-y-3 border-2 border-dashed border-[#334155] rounded-xl mt-4">
              <BookOpen className="w-8 h-8 opacity-50" />
              <span className="text-xs text-center px-4">Trusted online resources used to generate answers will appear here automatically.</span>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              <p className="text-xs text-zinc-500 mb-2">Verified websites used to synthesize your research summary:</p>
              {discoveredResources.map((resource, i) => {
                let domain = resource.uri;
                try {
                  domain = new URL(resource.uri).hostname.replace('www.', '');
                } catch (e) {}
                
                return (
                  <a 
                    key={i} 
                    href={resource.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block bg-[#1E293B] border border-[#334155] hover:border-blue-500/50 hover:bg-[#273449] p-3 rounded-xl transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2 min-w-0">
                        <p className="text-xs font-medium text-blue-400 truncate mb-1">{domain}</p>
                        <h3 className="text-sm font-semibold text-zinc-200 line-clamp-2 leading-tight group-hover:text-blue-300 transition-colors">{resource.title}</h3>
                        {resource.snippet && (
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{resource.snippet}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-2 truncate">{resource.uri}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Middle Panel: Chat */}
      <div className="flex-1 flex flex-col relative bg-[#0F172A] min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-[#334155] flex items-center justify-between px-3 sm:px-6 bg-[#0F172A]/90 backdrop-blur-md z-10 absolute top-0 w-full">
          <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
            <button onClick={() => onNavigate('home')} className="p-1.5 sm:p-2 -ml-1 text-zinc-400 hover:text-white hover:bg-[#1E293B] rounded-lg flex items-center transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setShowLeftPanel(true)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E293B] rounded-lg flex items-center shrink-0">
              <Menu className="w-5 h-5" />
            </button>
            {!isDesktopLeftPanelOpen && (
              <button onClick={() => setIsDesktopLeftPanelOpen(true)} className="hidden lg:flex p-2 text-zinc-400 hover:text-white hover:bg-[#1E293B] rounded-lg items-center shrink-0">
                <Menu className="w-5 h-5" />
                <span className="text-xs ml-1 font-medium">Sources</span>
              </button>
            )}
            
            <h2 className="font-semibold text-zinc-200 text-xs sm:text-sm truncate hidden md:block">Academix Aletheon</h2>

            {/* Flash / Fast / Deep mode toggle buttons */}
            <div className="flex items-center bg-[#1E293B] border border-[#334155] rounded-full p-0.5 shrink-0">
              <button 
                onClick={() => setResearchStyle('flash')}
                className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  researchStyle === 'flash'
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="Flash Mode: Quick, ultra-concise, direct answer sticking strictly to the question"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Flash</span>
              </button>
              <button 
                onClick={() => setResearchStyle('fast')}
                className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  researchStyle === 'fast'
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="Fast Mode: Standard quick summary with web search"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Fast</span>
              </button>
              <button 
                onClick={() => setResearchStyle('deep')}
                className={`flex items-center space-x-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                  researchStyle === 'deep'
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="Deep Mode: Comprehensive deep analysis with thinking model"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Deep</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Live / Last Execution Timer Banner */}
            <div className="flex items-center space-x-1 bg-[#1E293B] border border-[#334155] text-[11px] sm:text-xs font-mono px-2.5 sm:px-3 py-1 rounded-full text-cyan-300 shadow-sm">
              <Clock className={`w-3.5 h-3.5 ${isTyping ? 'text-amber-400 animate-spin' : 'text-cyan-400'}`} />
              <span>{isTyping ? `${liveTimer}s` : lastExecutionTime ? `${lastExecutionTime}s` : '0.0s'}</span>
            </div>

            <button onClick={() => setShowRightPanel(true)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E293B] rounded-lg flex items-center">
              <LayoutDashboard className="w-5 h-5 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4 sm:px-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 p-0.5 shadow-xl shadow-blue-500/20">
                <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">Research & Intelligence Studio</h2>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Search any topic to generate web intelligence, interconnected Mind Maps, and custom Study Decks.
                </p>
              </div>

              {/* Action prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-2">
                <button 
                  onClick={() => handleSend("Research Quantum Computing breakthroughs, key principles, and real-world applications")}
                  className="bg-[#1E293B] border border-[#334155] hover:border-blue-500/50 p-3.5 rounded-xl text-xs text-zinc-300 hover:text-white transition-all group"
                >
                  <p className="font-semibold text-blue-400 mb-1">⚛️ Quantum Computing</p>
                  <p className="text-zinc-500 group-hover:text-zinc-400 line-clamp-1">Synthesize principles & applications</p>
                </button>
                <button 
                  onClick={() => handleSend("Explain Artificial Intelligence Neural Networks, architecture, and training process")}
                  className="bg-[#1E293B] border border-[#334155] hover:border-purple-500/50 p-3.5 rounded-xl text-xs text-zinc-300 hover:text-white transition-all group"
                >
                  <p className="font-semibold text-purple-400 mb-1">🧠 Neural Networks</p>
                  <p className="text-zinc-500 group-hover:text-zinc-400 line-clamp-1">Deep breakdown & visual structure</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto w-full">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[88%] rounded-2xl px-5 py-4 ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' 
                          : 'bg-[#1E293B] border border-[#334155] text-zinc-200 shadow-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="w-full min-w-0 overflow-hidden break-words">
                          {msg.content && (
                            <div className="markdown-body text-sm leading-relaxed prose prose-invert max-w-none break-words overflow-x-auto w-full">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                          )}

                          {/* Quick shortcuts to open dedicated space if message generated specialized objects */}
                          {msg.quiz && msg.quiz.length > 0 && (
                            <button
                              onClick={() => {
                                setQuizItems(msg.quiz || []);
                                setCurrentQuizIndex(0);
                                setSelectedOption(null);
                                setQuizScore(0);
                                setQuizFinished(false);
                                setActiveStudioTab('study_deck');
                                setShowRightPanel(true);
                              }}
                              className="mt-3 inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs px-3 sm:px-3.5 py-2 rounded-xl transition-all max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              <LayoutDashboard className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="truncate">Open Quiz in Study Deck ({msg.quiz.length} Questions)</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}

                          {msg.flashcards && msg.flashcards.length > 0 && (
                            <button
                              onClick={() => {
                                setFlashcards(msg.flashcards || []);
                                setCurrentCardIndex(0);
                                setIsCardFlipped(false);
                                setActiveStudioTab('study_deck');
                                setShowRightPanel(true);
                              }}
                              className="mt-3 inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 text-xs px-3 sm:px-3.5 py-2 rounded-xl transition-all max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                              <span className="truncate">Open Flashcards in Study Deck ({msg.flashcards.length} Cards)</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}

                          {msg.mindMapData && (
                            <button
                              onClick={() => {
                                setMindMapData(msg.mindMapData || null);
                                setActiveStudioTab('mindmap');
                                setShowRightPanel(true);
                              }}
                              className="mt-3 inline-flex items-center space-x-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs px-3 sm:px-3.5 py-2 rounded-xl transition-all max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0" />
                              <span className="truncate">View Interconnected Mind Map</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}

                          {/* Execution time badge */}
                          {msg.executionTime && (
                            <div className="mt-3 pt-2 border-t border-[#334155]/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                              <span className="flex items-center space-x-1 text-cyan-400/90">
                                <Zap className="w-3 h-3" />
                                <span>Execution Time: {msg.executionTime}s</span>
                              </span>
                              <span className="text-zinc-600">Academix Gemini 2.5</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed">{msg.content}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#1E293B] border border-[#334155] rounded-2xl px-5 py-4 flex space-x-3 items-center">
                    <div className="flex space-x-1.5 items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 border-l border-[#334155] pl-3">
                      Processing ({liveTimer}s)
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 w-full p-4 sm:p-6 bg-gradient-to-t from-[#0F172A] via-[#0F172A] to-transparent">
          <div className="max-w-3xl mx-auto relative flex flex-col space-y-2">
            {cooldownTimer > 0 && (
              <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-2xl text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-pulse">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Quota Rate Limit Cooldown Active</span>
                </div>
                <span className="font-mono font-bold text-amber-200 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Ready in {cooldownTimer}s
                </span>
              </div>
            )}

            <div className="relative flex items-center w-full">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={cooldownTimer > 0}
                placeholder={cooldownTimer > 0 ? `Rate limit cooldown: ${cooldownTimer}s remaining...` : "Ask anything or search a topic..."}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-lg shadow-black/20 text-zinc-100 placeholder-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping || cooldownTimer > 0}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-10 h-10 px-3 bg-blue-600 hover:bg-blue-500 disabled:bg-[#334155] disabled:text-zinc-500 text-white rounded-full flex items-center justify-center transition-colors text-xs font-semibold"
              >
                {cooldownTimer > 0 ? (
                  <span>{cooldownTimer}s</span>
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Studio Space & Interactive Tools */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 lg:w-[420px] border-l border-[#334155] bg-[#111827] flex flex-col flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${showRightPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Studio Panel Header */}
        <div className="p-3 border-b border-[#334155] h-16 flex items-center justify-between bg-[#111827]">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Studio Layout</h2>
          </div>

          {/* Execution Time Tracker in Studio Header */}
          <div className="flex items-center space-x-2">
            <div className="bg-[#0F172A] border border-[#334155] text-[11px] font-mono px-2.5 py-1 rounded-full text-cyan-300 flex items-center space-x-1">
              <Zap className={`w-3 h-3 ${isTyping ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
              <span>{isTyping ? `${liveTimer}s` : lastExecutionTime ? `${lastExecutionTime}s` : '0.0s'}</span>
            </div>
            <button onClick={() => setShowRightPanel(false)} className="lg:hidden p-1.5 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio View Navigation Tabs */}
        <div className="flex items-center border-b border-[#334155] bg-[#0F172A]/60 p-1 space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveStudioTab('tools')}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
              activeStudioTab === 'tools' 
                ? 'bg-[#1E293B] text-blue-400 border border-blue-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Tools</span>
          </button>

          <button
            onClick={() => setActiveStudioTab('mindmap')}
            className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
              activeStudioTab === 'mindmap' 
                ? 'bg-[#1E293B] text-purple-400 border border-purple-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Mind Map</span>
            {mindMapData && <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>}
          </button>

          <button
            onClick={() => setActiveStudioTab('study_deck')}
            className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
              activeStudioTab === 'study_deck' 
                ? 'bg-[#1E293B] text-amber-400 border border-amber-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Deck</span>
            {(flashcards.length > 0 || quizItems.length > 0) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* TAB 1: STUDIO TOOLS GRID */}
          {activeStudioTab === 'tools' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Select Research Assistant Tool</span>
                <span className="text-blue-400 font-mono">{tools.length} Available</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleSend(tool.prompt, tool.id as any)}
                    disabled={isTyping}
                    className="bg-[#1E293B] border border-[#334155] hover:border-blue-500/50 hover:bg-[#273449] p-3.5 rounded-xl flex flex-col items-center justify-center text-center transition-all group disabled:opacity-50 disabled:cursor-not-allowed aspect-square"
                  >
                    <div className={`p-2.5 rounded-full bg-[#0F172A] mb-2 group-hover:scale-110 transition-transform ${tool.color}`}>
                      <tool.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-white">{tool.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-zinc-400 leading-relaxed">
                <p className="font-semibold text-blue-400 mb-1">💡 Studio Workspace Features:</p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li>Generate structured summaries and interactive tools.</li>
                  <li>Explore interactive, interconnected Mind Map diagrams.</li>
                  <li>Click any mindmap node to inspect or elaborate.</li>
                  <li>Uncapped Flashcards & Quizzes covering full subjects.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: DEDICATED INTERCONNECTED MIND MAP SPACE */}
          {activeStudioTab === 'mindmap' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-purple-300 flex items-center space-x-1.5">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    <span>Mind Map Dedicated Space</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">Interconnected Network Graph & Node Click Inspection</p>
                </div>
                {mindMapData && (
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={() => setMindmapViewMode(m => m === 'network' ? 'tree' : 'network')}
                      className="px-2 py-1 text-[11px] text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/40"
                    >
                      {mindmapViewMode === 'network' ? 'Network View' : 'Tree View'}
                    </button>
                    <button 
                      onClick={() => setIsFullscreenMindMap(true)}
                      className="p-1.5 text-zinc-400 hover:text-white bg-[#1E293B] rounded-lg border border-[#334155]"
                      title="Fullscreen View"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {!mindMapData ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#334155] rounded-2xl bg-[#0F172A]/50 space-y-3 my-4">
                  <BrainCircuit className="w-10 h-10 text-purple-400 opacity-40 animate-pulse" />
                  <p className="text-xs font-medium text-zinc-300">No Mind Map Generated Yet</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs">
                    Generate an interconnected mind map for your research topic.
                  </p>
                  <button
                    onClick={() => handleSend("Create a mind map for our current research topic.", 'mindmap')}
                    disabled={isTyping}
                    className="mt-2 bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    Generate Mind Map Now
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="bg-[#1E293B] border border-purple-500/30 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 truncate pr-2">{mindMapData.title}</span>
                    <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                      {mindMapData.nodes.length} Branches
                    </span>
                  </div>

                  {/* VISUAL INTERCONNECTED NETWORK GRAPH VIEW */}
                  {mindmapViewMode === 'network' ? (
                    <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-3 sm:p-4 overflow-y-auto max-h-[55vh] sm:max-h-[480px] custom-scrollbar space-y-4 sm:space-y-6 relative w-full overflow-x-hidden">
                      {/* Central Topic Hub */}
                      <div className="flex justify-center w-full px-2">
                        <div 
                          onClick={() => setSelectedMindMapNode({ id: 'central', label: mindMapData.title, details: 'Central Core Subject', category: 'Central Hub' })}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-purple-400 hover:border-purple-200 text-white p-3 sm:p-3.5 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer text-center w-full max-w-[280px] sm:max-w-xs transition-transform hover:scale-105 break-words"
                        >
                          <div className="flex items-center justify-center space-x-1.5 mb-1">
                            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-purple-200 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Central Topic</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-white break-words">{mindMapData.title}</h4>
                        </div>
                      </div>

                      {/* Connector graphic stem */}
                      <div className="flex justify-center -my-2">
                        <div className="w-0.5 h-5 sm:h-6 bg-gradient-to-b from-purple-500 to-indigo-500"></div>
                      </div>

                      {/* Primary Interconnected Nodes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 relative w-full">
                        {mindMapData.nodes.map((node, i) => (
                          <div 
                            key={node.id || i}
                            className="bg-[#1E293B] border border-purple-500/30 hover:border-purple-400 p-2.5 sm:p-3 rounded-xl transition-all hover:bg-[#273449] group cursor-pointer shadow-md w-full overflow-hidden break-words"
                            onClick={() => setSelectedMindMapNode(node)}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                                {node.category || `Branch ${i+1}`}
                              </span>
                              <Eye className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-300 shrink-0" />
                            </div>
                            <h5 className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 mb-1 break-words">
                              {node.label}
                            </h5>
                            {node.details && (
                              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-tight break-words">
                                {node.details}
                              </p>
                            )}

                            {/* Sub branches list pills */}
                            {node.children && node.children.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-[#334155] flex flex-wrap gap-1 max-w-full overflow-hidden">
                                {node.children.map((child, j) => (
                                  <span 
                                    key={child.id || j}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMindMapNode(child);
                                    }}
                                    className="text-[10px] bg-[#0F172A] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full truncate max-w-[110px] sm:max-w-[140px]"
                                  >
                                    • {child.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* HIERARCHICAL TREE VIEW */
                    <div className="space-y-3 overflow-y-auto max-h-[55vh] sm:max-h-[480px] pr-1 custom-scrollbar w-full overflow-x-hidden">
                      {mindMapData.nodes.map((node, i) => (
                        <div key={node.id || i} className="bg-[#0F172A] border border-[#334155] rounded-xl p-3 space-y-2 w-full break-words">
                          <div 
                            onClick={() => toggleNodeExpanded(node.id || `node-${i}`)}
                            className="flex items-center justify-between cursor-pointer hover:text-purple-300 transition-colors"
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-2">
                              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                              <h4 className="text-xs font-bold text-zinc-100 truncate">{node.label}</h4>
                            </div>
                            <span className="text-[10px] text-zinc-500 bg-[#1E293B] px-2 py-0.5 rounded shrink-0">
                              {expandedNodes[node.id || `node-${i}`] ? 'Collapse' : 'Expand'}
                            </span>
                          </div>

                          {node.details && (
                            <p 
                              onClick={() => setSelectedMindMapNode(node)}
                              className="text-xs text-zinc-400 bg-[#1E293B]/60 p-2 rounded-lg leading-relaxed cursor-pointer hover:text-purple-200 break-words"
                            >
                              {node.details}
                            </p>
                          )}

                          {/* Children sub-branches */}
                          {(expandedNodes[node.id || `node-${i}`] ?? true) && node.children && node.children.length > 0 && (
                            <div className="pl-3 border-l-2 border-purple-500/30 space-y-2 pt-1 w-full">
                              {node.children.map((child, j) => (
                                <div 
                                  key={child.id || j} 
                                  onClick={() => setSelectedMindMapNode(child)}
                                  className="bg-[#1E293B] p-2 rounded-lg border border-[#334155]/60 text-xs text-zinc-300 cursor-pointer hover:border-purple-400 break-words"
                                >
                                  <p className="font-semibold text-purple-300 mb-0.5 break-words">• {child.label}</p>
                                  {child.details && (
                                    <p className="text-[11px] text-zinc-400 break-words">{child.details}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Regenerate or modify mindmap */}
                  <button
                    onClick={() => handleSend("Expand and add deeper sub-branches to the current mind map.", 'mindmap')}
                    disabled={isTyping}
                    className="w-full bg-[#1E293B] hover:bg-[#273449] border border-[#334155] text-xs text-purple-300 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Expand Mind Map Depth</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STUDY DECK (UNCAPPED FLASHCARDS & QUIZ) */}
          {activeStudioTab === 'study_deck' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Comprehensive Study Deck</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">Uncapped Flashcards & Knowledge Quizzes</p>
                </div>
              </div>

              {flashcards.length === 0 && quizItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#334155] rounded-2xl bg-[#0F172A]/50 space-y-3 my-4">
                  <BookOpen className="w-10 h-10 text-amber-400 opacity-40 animate-pulse" />
                  <p className="text-xs font-medium text-zinc-300">No Active Study Deck</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs">
                    Generate an uncapped set of flashcards and quizzes covering your entire research topic.
                  </p>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleSend("Generate a comprehensive set of flashcards for total topic mastery.", 'flashcards')}
                      disabled={isTyping}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-xl font-medium"
                    >
                      Flashcards
                    </button>
                    <button
                      onClick={() => handleSend("Generate a comprehensive knowledge evaluation quiz covering all subtopics.", 'quiz')}
                      disabled={isTyping}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-2 rounded-xl font-medium"
                    >
                      Full Quiz
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* FLASHCARDS PLAYER */}
                  {flashcards.length > 0 && (
                    <div className="space-y-3 bg-[#0F172A] border border-[#334155] p-4 rounded-2xl">
                      <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                        <span>🎴 Flashcard {currentCardIndex + 1} of {flashcards.length}</span>
                        <span className="text-zinc-500 text-[11px]">Click card to flip</span>
                      </div>

                      {/* Interactive Flip Card */}
                      <div 
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="bg-[#1E293B] border border-amber-500/30 hover:border-amber-500/60 p-6 rounded-2xl min-h-[160px] flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-lg"
                      >
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                          {isCardFlipped ? 'Answer' : 'Question'}
                        </p>
                        <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                          {isCardFlipped ? flashcards[currentCardIndex].answer : flashcards[currentCardIndex].question}
                        </p>
                      </div>

                      {/* Deck Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => {
                            setCurrentCardIndex(prev => Math.max(0, prev - 1));
                            setIsCardFlipped(false);
                          }}
                          disabled={currentCardIndex === 0}
                          className="bg-[#1E293B] border border-[#334155] disabled:opacity-40 text-xs px-3 py-1.5 rounded-xl text-zinc-300"
                        >
                          Previous
                        </button>

                        <button
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className="text-xs text-amber-400 hover:underline"
                        >
                          Flip Card 🔄
                        </button>

                        <button
                          onClick={() => {
                            setCurrentCardIndex(prev => Math.min(flashcards.length - 1, prev + 1));
                            setIsCardFlipped(false);
                          }}
                          disabled={currentCardIndex === flashcards.length - 1}
                          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-xl font-medium"
                        >
                          Next Card
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QUIZ PLAYER */}
                  {quizItems.length > 0 && (
                    <div className="space-y-3 bg-[#0F172A] border border-[#334155] p-4 rounded-2xl mt-4">
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                        <span>📝 Quiz Question {currentQuizIndex + 1} of {quizItems.length}</span>
                        <span className="font-mono text-cyan-300">Score: {quizScore}</span>
                      </div>

                      <div className="bg-[#1E293B] p-4 rounded-xl border border-[#334155]">
                        <p className="text-sm font-semibold text-zinc-100 mb-3 leading-snug">
                          {quizItems[currentQuizIndex].question}
                        </p>

                        <div className="space-y-2">
                          {quizItems[currentQuizIndex].options.map((option, idx) => {
                            const isSelected = selectedOption === idx;
                            const isCorrect = idx === quizItems[currentQuizIndex].answerIndex;
                            let btnStyle = 'bg-[#0F172A] border-[#334155] text-zinc-300 hover:border-blue-500/50';

                            if (selectedOption !== null) {
                              if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200';
                              else if (isSelected) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                            }

                            return (
                              <button
                                key={idx}
                                disabled={selectedOption !== null}
                                onClick={() => {
                                  setSelectedOption(idx);
                                  if (idx === quizItems[currentQuizIndex].answerIndex) {
                                    setQuizScore(s => s + 1);
                                  }
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${btnStyle}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>

                        {selectedOption !== null && quizItems[currentQuizIndex].explanation && (
                          <div className="mt-3 p-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-xs text-zinc-300">
                            <p className="font-semibold text-blue-400 mb-0.5">Explanation:</p>
                            <p className="text-[11px] text-zinc-400">{quizItems[currentQuizIndex].explanation}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        {currentQuizIndex < quizItems.length - 1 ? (
                          <button
                            disabled={selectedOption === null}
                            onClick={() => {
                              setCurrentQuizIndex(i => i + 1);
                              setSelectedOption(null);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs px-4 py-2 rounded-xl font-medium"
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setCurrentQuizIndex(0);
                              setSelectedOption(null);
                              setQuizScore(0);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-medium"
                          >
                            Restart Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL 2: CLICKED MIND MAP NODE INSPECTOR MODAL */}
      {selectedMindMapNode && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative"
          >
            <button 
              onClick={() => setSelectedMindMapNode(null)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#1E293B]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping"></span>
              <span className="text-xs font-mono text-purple-300 uppercase tracking-wider bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                {selectedMindMapNode.category || 'Mind Map Branch'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white leading-snug">
              {selectedMindMapNode.label}
            </h3>

            {selectedMindMapNode.details && (
              <div className="p-3.5 bg-[#0F172A] border border-[#334155] rounded-xl text-xs text-zinc-300 leading-relaxed">
                <p className="font-semibold text-purple-300 mb-1">Details & Context:</p>
                <p>{selectedMindMapNode.details}</p>
              </div>
            )}

            {selectedMindMapNode.children && selectedMindMapNode.children.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-zinc-400">Sub-branches ({selectedMindMapNode.children.length}):</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedMindMapNode.children.map((c, idx) => (
                    <span 
                      key={idx}
                      onClick={() => setSelectedMindMapNode(c)}
                      className="text-xs bg-[#1E293B] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      • {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  const nodeToExplain = selectedMindMapNode.label;
                  setSelectedMindMapNode(null);
                  handleSend(`Elaborate in detail on the mind map concept: "${nodeToExplain}" with examples and key points.`);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-purple-600/30"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Explain Node in Chat</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: FULLSCREEN MIND MAP INTERCONNECTED VIEW */}
      {isFullscreenMindMap && mindMapData && (
        <div className="fixed inset-0 z-[100] bg-[#0F172A] p-3 sm:p-6 flex flex-col w-screen h-screen overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3 sm:pb-4 mb-3 sm:mb-4 shrink-0">
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-white truncate">{mindMapData.title}</h2>
                <p className="text-[11px] sm:text-xs text-purple-300 truncate">Full Screen Interconnected Mind Map View</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <button 
                onClick={() => setMindmapViewMode(m => m === 'network' ? 'tree' : 'network')}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs text-purple-300 bg-purple-500/20 rounded-xl border border-purple-500/40 whitespace-nowrap"
              >
                {mindmapViewMode === 'network' ? 'Switch to Tree' : 'Switch to Network'}
              </button>
              <button 
                onClick={() => setIsFullscreenMindMap(false)}
                className="p-1.5 sm:p-2 bg-[#1E293B] text-zinc-300 hover:text-white rounded-xl border border-[#334155]"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#111827] border border-[#334155] rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col items-center relative w-full">
            {/* Central Node */}
            <div 
              onClick={() => setSelectedMindMapNode({ id: 'central', label: mindMapData.title, details: 'Central Core Subject', category: 'Central Hub' })}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-purple-400 text-white p-3.5 sm:p-4 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] cursor-pointer text-center w-full max-w-xs sm:max-w-md transition-transform hover:scale-105 mb-6 sm:mb-8 break-words"
            >
              <div className="flex items-center justify-center space-x-1.5 mb-1">
                <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-purple-200 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-200">Central Mind Map Topic</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold text-white break-words">{mindMapData.title}</h3>
            </div>

            {/* Grid of branches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-6xl">
              {mindMapData.nodes.map((node, i) => (
                <div 
                  key={node.id || i}
                  onClick={() => setSelectedMindMapNode(node)}
                  className="bg-[#1E293B] border border-purple-500/40 hover:border-purple-300 p-3.5 sm:p-4 rounded-2xl transition-all hover:bg-[#273449] cursor-pointer shadow-lg space-y-2 group w-full overflow-hidden break-words"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full truncate max-w-[160px]">
                      {node.category || `Branch ${i+1}`}
                    </span>
                    <Eye className="w-4 h-4 text-zinc-500 group-hover:text-purple-300 shrink-0" />
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-purple-300 break-words">
                    {node.label}
                  </h4>

                  {node.details && (
                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed break-words">
                      {node.details}
                    </p>
                  )}

                  {node.children && node.children.length > 0 && (
                    <div className="pt-2 border-t border-[#334155] flex flex-wrap gap-1 max-w-full overflow-hidden">
                      {node.children.map((child, j) => (
                        <span 
                          key={child.id || j}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMindMapNode(child);
                          }}
                          className="text-xs bg-[#0F172A] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full truncate max-w-[140px]"
                        >
                          • {child.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
