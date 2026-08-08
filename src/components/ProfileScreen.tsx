import { useState } from 'react';
import { motion } from 'motion/react';
import { Screen, UserStats } from '../types';
import { ChevronLeft, User, Key, LogOut, Check, Save } from 'lucide-react';
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

    if (apiKey.trim()) {
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey.trim(),
            model: 'gemini-3.1-flash-lite-preview',
            contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
            config: {}
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.error === 'INVALID_API_KEY' || response.status === 401) {
            setErrorMessage('Invalid API Key! Please enter a valid Gemini API key.');
            setIsSaving(false);
            return;
          }
        }
      } catch (err) {
        // Continue if offline or proxy error
      }
    }

    onUpdateStats({ name, apiKey: apiKey.trim(), avatarSeed });
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 flex items-center"><Key className="w-3 h-3 mr-1"/> API Key Setup</label>
                <div className="flex items-center space-x-2">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1"
                  >
                    🔑 Get Key from AI Studio ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const newKey = `academix_google_key_${stats.uid || Math.random().toString(36).substring(7)}`;
                      setApiKey(newKey);
                      setSavedMessage('In-App Key Generated');
                      setTimeout(() => setSavedMessage(''), 2500);
                    }}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30 transition-colors"
                  >
                    ⚡ Auto In-App Key
                  </button>
                </div>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="In-App Key active or AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5 ml-1">
                An auto-managed in-app key is active. You can also paste your personal Gemini API key from Google AI Studio for all device access.
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
