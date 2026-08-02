import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, UserStats } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, Key, User as UserIcon, Link as LinkIcon, LogIn, Loader2 } from 'lucide-react';

interface OnboardingScreenProps {
  onNavigate: (screen: Screen) => void;
  onUpdateStats: (stats: Partial<UserStats>) => void;
  stats: UserStats;
}

export default function OnboardingScreen({ onNavigate, onUpdateStats, stats }: OnboardingScreenProps) {
  const [step, setStep] = useState(stats.uid ? (stats.apiKey ? 3 : 2) : 1);
  const [name, setName] = useState(stats.name || '');
  const [apiKey, setApiKey] = useState(stats.apiKey || '');
  const [avatarSeed, setAvatarSeed] = useState(stats.avatarSeed || Math.random().toString(36).substring(7));
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      onUpdateStats({ 
        uid: result.user.uid,
        name: result.user.displayName || '',
      });
      if (result.user.displayName) {
        setName(result.user.displayName);
        setAvatarSeed(result.user.displayName);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleApiSubmit = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }
    setError('');
    setIsValidating(true);
    
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          config: {}
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error === 'INVALID_API_KEY' || response.status === 401) {
          throw new Error('Invalid API Key! Please enter a valid Gemini API key from Google AI Studio.');
        }
        throw new Error(data.message || 'Invalid API key or network error');
      }

      onUpdateStats({ apiKey: apiKey.trim() });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleComplete = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    onUpdateStats({ 
      name: name.trim(),
      avatarSeed: avatarSeed
    });
    onNavigate('home');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-purple-500/30">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent mb-2">
            Welcome to Academix Aletheon
          </h1>
          <p className="text-zinc-400 text-sm">Let's get you set up.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                    <LogIn className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold">Authentication</h2>
                  <p className="text-sm text-zinc-400">Sign in to save your progress and sync across devices.</p>
                </div>
                
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center space-x-3 bg-white text-black py-4 px-6 rounded-2xl font-bold hover:bg-zinc-200 transition-colors"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span>Continue with Google</span>
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                    <Key className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold">AI Studio API Key</h2>
                  <p className="text-sm text-zinc-400">Unlock powerful AI features by providing your free Gemini API key.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 mb-2 block">Your API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 text-xs text-amber-400 hover:text-amber-300 transition-colors p-2"
                  >
                    <span>Get a free API key here</span>
                    <LinkIcon className="w-3 h-3" />
                  </a>

                  <button
                    onClick={handleApiSubmit}
                    disabled={isValidating}
                    className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black py-4 px-6 rounded-2xl font-bold transition-colors"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <span>Next Step</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                    <UserIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold">Your Profile</h2>
                  <p className="text-sm text-zinc-400">Personalize your Academix experience.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-emerald-500/50 p-1">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full bg-zinc-900"
                      />
                    </div>
                    <button 
                      onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Randomize Avatar
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 mb-2 block">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setAvatarSeed(e.target.value);
                      }}
                      placeholder="Your Name"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleComplete}
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-6 rounded-2xl font-bold transition-colors"
                  >
                    <span>Complete Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
