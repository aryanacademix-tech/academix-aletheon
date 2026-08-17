import { useState } from 'react';
import { motion } from 'motion/react';
import { Screen, UserStats } from '../types';
import { ChevronLeft, User, LogOut, Check, Save, Key, Link as LinkIcon, ExternalLink, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import DeveloperCard from './DeveloperCard';

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
  stats: UserStats;
  onUpdateStats: (stats: Partial<UserStats>) => void;
}

export default function ProfileScreen({ onNavigate, stats, onUpdateStats }: ProfileScreenProps) {
  const [name, setName] = useState(stats.name || '');
  const [apiKey, setApiKey] = useState(stats.apiKey || '');
  const [avatarSeed, setAvatarSeed] = useState(stats.avatarSeed || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    const trimmedKey = apiKey.trim();

    if (trimmedKey) {
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: trimmedKey,
            model: 'gemini-3.6-flash',
            contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
            config: {}
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.error === 'INVALID_API_KEY') {
            setErrorMessage('Invalid API Key! Please enter a valid Gemini API key.');
            setIsSaving(false);
            return;
          }
        }
      } catch (err) {
        // Continue if offline or proxy error
      }
    }

    onUpdateStats({ name, apiKey: trimmedKey, avatarSeed });
    setSavedMessage('Profile updated successfully');
    setTimeout(() => setSavedMessage(''), 3000);
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    onUpdateStats({ uid: undefined, apiKey: undefined, name: undefined });
    onNavigate('onboarding');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-6"
    >
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => onNavigate('home')} className="p-2 hover:bg-zinc-900 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
      </div>

      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-emerald-500/50 p-1">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed || 'academix'}`} 
                alt="Avatar" 
                className="w-full h-full rounded-full bg-zinc-900 object-cover"
              />
            </div>
            <button 
              onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Randomize Avatar
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 mb-2 block flex items-center"><User className="w-3 h-3 mr-1"/> Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 mb-2 flex items-center"><Key className="w-3.5 h-3.5 mr-1.5 text-yellow-400"/> Custom Gemini API Key</label>
              
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors font-mono text-sm"
              />

              {/* Highlighted Yellow Box Light Animation Link */}
              <motion.a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-3 group relative flex items-center justify-between p-3.5 rounded-2xl bg-yellow-500/15 border-2 border-yellow-400 hover:border-yellow-300 text-yellow-100 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.7)] transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Light Sweep Animation Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                
                {/* Pulsing Light Ring Background Effect */}
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

              <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 my-2">
                💡 <strong className="text-zinc-300">Account Note:</strong> Log in with a personal Google account (<code className="text-amber-400 font-mono">@gmail.com</code>). School/work accounts show restriction policies.
              </p>

              <p className="text-[11px] text-zinc-500 mt-2 ml-1">
                Enter your manual Google AI Studio key to power all AI features with seamless multi-model fallback.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black py-4 px-6 rounded-2xl font-bold transition-colors"
          >
            {savedMessage ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            <span>{savedMessage || 'Save Changes'}</span>
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-4 px-6 rounded-2xl font-bold transition-colors border border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>

        <DeveloperCard />
      </div>
    </motion.div>
  );
}
