import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Pause, Square, SkipForward, Plus, Settings, Search, Heart, Clock, PlayCircle, Star, Flame, Target, Trophy, Activity, Calendar } from 'lucide-react';
import { Screen } from '../types';
import confetti from 'canvas-confetti';
import TimeDialPicker from './TimeDialPicker';
import YouTube, { YouTubeEvent, YouTubeProps } from 'react-youtube';
import { recordSkillActivity } from '../utils/dailyTracker';

interface FocusTimerScreenProps {
  onNavigate: (screen: Screen) => void;
  onActivityComplete?: (xp: number, coins: number) => void;
}

type TimerState = 'idle' | 'focus' | 'shortBreak' | 'longBreak';
type TimerStatus = 'stopped' | 'running' | 'paused';

interface YTVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelId: string;
  isChannelResult?: boolean;
}

interface FocusStats {
  todayStudyTime: number;
  streak: number;
  streakGoal?: number;
  weeklyGoalProgress: number; // seconds
  monthlyGoalProgress: number; // seconds
  weeklyGoal: number;
  monthlyGoal: number;
  productivityScore: number;
  sessionsCompleted: number;
  todaySessionsCompleted: number;
  dailyStudyTime: Record<string, number>;
  lastActiveDate?: string;
}

const DEFAULT_STATS: FocusStats = {
  todayStudyTime: 0,
  streak: 0,
  streakGoal: 7,
  weeklyGoalProgress: 0,
  monthlyGoalProgress: 0,
  weeklyGoal: 36000, // 10 hours
  monthlyGoal: 144000, // 40 hours
  productivityScore: 0,
  sessionsCompleted: 0,
  todaySessionsCompleted: 0,
  dailyStudyTime: {},
  lastActiveDate: new Date().toDateString()
};

const MOTIVATIONS = [
  "Focus on the step in front of you, not the whole staircase.",
  "The secret of getting ahead is getting started.",
  "Don't stop until you're proud.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Believe you can and you're halfway there."
];

const YOUTUBE_API_KEY = "AIzaSyBsFlrpzaNqw6BSN8HYCONesTMVOwDWt9Y";

export default function FocusTimerScreen({ onNavigate, onActivityComplete }: FocusTimerScreenProps) {
  // Timer Settings
  const [focusTime, setFocusTime] = useState(25 * 60);
  const [shortBreakTime, setShortBreakTime] = useState(5 * 60);
  const [longBreakTime, setLongBreakTime] = useState(15 * 60);

  useEffect(() => {
    const savedTimer = localStorage.getItem('focus_timer_settings');
    if (savedTimer) {
      const parsed = JSON.parse(savedTimer);
      if (parsed.focusTime) setFocusTime(parsed.focusTime);
      if (parsed.shortBreakTime) setShortBreakTime(parsed.shortBreakTime);
      if (parsed.longBreakTime) setLongBreakTime(parsed.longBreakTime);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('focus_timer_settings', JSON.stringify({ focusTime, shortBreakTime, longBreakTime }));
  }, [focusTime, shortBreakTime, longBreakTime]);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartNext, setAutoStartNext] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(focusTime);
  const [timerState, setTimerState] = useState<TimerState>('focus');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('stopped');
  const [sessionCount, setSessionCount] = useState(0);

  // User Stats & Local Storage
  const [stats, setStats] = useState<FocusStats>(() => {
    const savedStats = localStorage.getItem('focus_stats');
    const todayDate = new Date();
    const today = todayDate.toDateString();

    const getWeekMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setHours(0, 0, 0, 0);
      return new Date(date.setDate(diff)).toDateString();
    };

    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        const dailyStudy = parsed.dailyStudyTime || {};
        const lastDate = new Date(parsed.lastActiveDate || today);
        
        if (parsed.lastActiveDate !== today) {
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            parsed.streak = 0;
          }
          
          parsed.todayStudyTime = dailyStudy[today] || 0;
          parsed.todaySessionsCompleted = 0;
          
          // Monthly Reset
          if (todayDate.getMonth() !== lastDate.getMonth() || todayDate.getFullYear() !== lastDate.getFullYear()) {
            parsed.monthlyGoalProgress = 0;
          }
          
          // Weekly Reset (Starts on Monday)
          if (getWeekMonday(todayDate) !== getWeekMonday(lastDate)) {
            parsed.weeklyGoalProgress = 0;
          }
          
          parsed.lastActiveDate = today;
        }
        return {
          ...DEFAULT_STATS,
          ...parsed,
          dailyStudyTime: dailyStudy,
          todayStudyTime: dailyStudy[today] || parsed.todayStudyTime || 0
        };
      } catch (e) {
        return DEFAULT_STATS;
      }
    }
    return DEFAULT_STATS;
  });
  const [favorites, setFavorites] = useState<YTVideo[]>(() => {
    const saved = localStorage.getItem('focus_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentLectures, setRecentLectures] = useState<YTVideo[]>(() => {
    const saved = localStorage.getItem('focus_recent');
    return saved ? JSON.parse(saved) : [];
  });
  const [favoriteChannels, setFavoriteChannels] = useState<{id: string, title: string, thumbnail?: string}[]>(() => {
    const saved = localStorage.getItem('focus_fav_channels');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChannel, setActiveChannel] = useState<{id: string, title: string, thumbnail?: string} | null>(null);

  // New Preferences and Progress States
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('focus_video_progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [themePreference, setThemePreference] = useState<'dark' | 'midnight'>(() => {
    const saved = localStorage.getItem('focus_theme');
    return (saved as any) || 'dark';
  });
  const [dashboardPreferences, setDashboardPreferences] = useState<{showQuotes: boolean}>(() => {
    const saved = localStorage.getItem('focus_dashboard_prefs');
    return saved ? JSON.parse(saved) : { showQuotes: true };
  });
  const [perDayTargetMinutes, setPerDayTargetMinutes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('focus_per_day_target_mins');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { Mon: 120, Tue: 120, Wed: 120, Thu: 120, Fri: 120, Sat: 120, Sun: 120 };
  });

  useEffect(() => {
    localStorage.setItem('focus_per_day_target_mins', JSON.stringify(perDayTargetMinutes));
  }, [perDayTargetMinutes]);

  const [editingDayTarget, setEditingDayTarget] = useState<string | null>(null);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const [dailyTargetHours, setDailyTargetHours] = useState<number>(() => {
    const saved = localStorage.getItem('focus_daily_target_hours');
    return saved ? parseFloat(saved) : 2.0;
  });

  useEffect(() => {
    localStorage.setItem('focus_daily_target_hours', dailyTargetHours.toString());
  }, [dailyTargetHours]);
  const [focusHistory, setFocusHistory] = useState<{date: string, duration: number, type: 'focus' | 'shortBreak' | 'longBreak'}[]>(() => {
    const saved = localStorage.getItem('focus_history');
    return saved ? JSON.parse(saved) : [];
  });

  // YouTube State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YTVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YTVideo | null>(null);

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState<'weekly' | 'monthly' | null>(null);

  const [quote] = useState(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);

  // Removed component-mount useEffect that wiped out data

  useEffect(() => {
    localStorage.setItem('focus_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('focus_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('focus_recent', JSON.stringify(recentLectures));
  }, [recentLectures]);

  useEffect(() => {
    localStorage.setItem('focus_fav_channels', JSON.stringify(favoriteChannels));
  }, [favoriteChannels]);

  useEffect(() => {
    localStorage.setItem('focus_video_progress', JSON.stringify(videoProgress));
  }, [videoProgress]);

  useEffect(() => {
    localStorage.setItem('focus_theme', themePreference);
  }, [themePreference]);

  useEffect(() => {
    localStorage.setItem('focus_dashboard_prefs', JSON.stringify(dashboardPreferences));
  }, [dashboardPreferences]);

  useEffect(() => {
    localStorage.setItem('focus_history', JSON.stringify(focusHistory));
  }, [focusHistory]);

  // Audio Context and Background Timer Support
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentNodeRef = useRef<{ osc: OscillatorNode, gain: GainNode } | null>(null);
  const lastTickTime = useRef(Date.now());

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playAlarmSound = (type: 'focus' | 'break' = 'focus') => {
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const now = ctx.currentTime;
    
    if (type === 'focus') {
      // Triumphant multi-chord completion chime for focus session completion
      const notes = [
        { freq: 523.25, time: 0, duration: 2.5 },    // C5
        { freq: 659.25, time: 0.12, duration: 2.5 }, // E5
        { freq: 783.99, time: 0.24, duration: 2.5 }, // G5
        { freq: 987.77, time: 0.36, duration: 2.5 }, // B5
        { freq: 1046.50, time: 0.48, duration: 3.5 } // C6
      ];
      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.4, now + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + duration);
      });
    } else {
      // Soft gentle wake chime for break completion
      const notes = [
        { freq: 440.00, time: 0, duration: 2.0 },    // A4
        { freq: 554.37, time: 0.15, duration: 2.0 }, // C#5
        { freq: 659.25, time: 0.30, duration: 2.5 }  // E5
      ];
      notes.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.35, now + time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + duration);
      });
    }
  };

  const startSilentTrack = () => {
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx || silentNodeRef.current) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    gain.gain.value = 0.0001; // Almost silent to keep JS thread alive
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    silentNodeRef.current = { osc, gain };
  };

  const stopSilentTrack = () => {
    if (silentNodeRef.current) {
      try {
        silentNodeRef.current.osc.stop();
        silentNodeRef.current.osc.disconnect();
        silentNodeRef.current.gain.disconnect();
      } catch(e) {}
      silentNodeRef.current = null;
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (timerStatus === 'running' && timeLeft > 0) {
      lastTickTime.current = Date.now();
      startSilentTrack();
      
      interval = setInterval(() => {
        const now = Date.now();
        const deltaSecs = Math.round((now - lastTickTime.current) / 1000);
        
        if (deltaSecs > 0) {
          lastTickTime.current = now;
          
          setTimeLeft((prev) => Math.max(0, prev - deltaSecs));
          
          setStats(s => {
            const todayStr = new Date().toDateString();
            const prevTodayTime = s.dailyStudyTime?.[todayStr] || s.todayStudyTime || 0;
            const updatedTodayTime = prevTodayTime + deltaSecs;
            const updatedDailyStudy = {
              ...(s.dailyStudyTime || {}),
              [todayStr]: updatedTodayTime
            };
            const isFocus = timerState === 'focus';
            const newWeekly = isFocus ? s.weeklyGoalProgress + deltaSecs : s.weeklyGoalProgress;
            const newMonthly = isFocus ? s.monthlyGoalProgress + deltaSecs : s.monthlyGoalProgress;
            const sessionsCount = s.todaySessionsCompleted || 0;
            const calcScore = Math.min(100, Math.round(((updatedTodayTime / 60) / 180) * 60 + (sessionsCount * 10)));

            return {
              ...s,
              todayStudyTime: updatedTodayTime,
              dailyStudyTime: updatedDailyStudy,
              weeklyGoalProgress: newWeekly,
              monthlyGoalProgress: newMonthly,
              productivityScore: Math.max(s.productivityScore || 0, calcScore),
              lastActiveDate: todayStr
            };
          });
        }
      }, 1000);
    } else if (timerStatus === 'running' && timeLeft <= 0) {
      stopSilentTrack();
      playAlarmSound(timerState === 'focus' ? 'focus' : 'break');
      handleSessionComplete();
    } else {
      stopSilentTrack();
    }
    return () => {
      clearInterval(interval);
    };
  }, [timerStatus, timeLeft, timerState]);

  const handleSessionComplete = () => {
    const duration = timerState === 'focus' ? focusTime : timerState === 'shortBreak' ? shortBreakTime : longBreakTime;
    setFocusHistory(prev => [{
      date: new Date().toISOString(),
      duration: duration,
      type: timerState === 'idle' ? 'focus' : timerState
    }, ...prev]);

    if (timerState === 'focus') {
      const mins = Math.max(1, Math.floor(duration / 60));
      recordSkillActivity('focus', prev => ({
        sessionsCompleted: prev.sessionsCompleted + 1,
        totalMinutes: prev.totalMinutes + mins,
      }));

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#a855f7', '#d946ef'] // Purple/pink theme
      });
      
      if (onActivityComplete) {
        const xp = Math.floor(Math.random() * 51) + 100;
        const mins = Math.floor(duration / 60);
        onActivityComplete(xp + mins, mins);
      }
      
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      setStats(s => {
        const newTodaySessions = (s.todaySessionsCompleted || 0) + 1;
        const todayMins = s.todayStudyTime / 60;
        const calcScore = Math.min(100, Math.round((todayMins / 180) * 60 + (newTodaySessions * 10)));
        return {
          ...s,
          sessionsCompleted: s.sessionsCompleted + 1,
          todaySessionsCompleted: newTodaySessions,
          productivityScore: Math.max(s.productivityScore || 0, calcScore),
          streak: s.streak === 0 ? 1 : s.streak
        };
      });

      if (newSessionCount % 4 === 0) {
        setTimerState('longBreak');
        setTimeLeft(longBreakTime);
      } else {
        setTimerState('shortBreak');
        setTimeLeft(shortBreakTime);
      }
      
      if (!autoStartBreaks) {
        setTimerStatus('stopped');
        releaseWakeLock();
      }
    } else {
      setTimerState('focus');
      setTimeLeft(focusTime);
      if (!autoStartNext) {
        setTimerStatus('stopped');
        releaseWakeLock();
      }
    }
  };

  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  const startTimer = () => {
    requestWakeLock();
    setTimerStatus('running');
  };

  const pauseTimer = () => {
    releaseWakeLock();
    setTimerStatus('paused');
  };

  const stopTimer = () => {
    releaseWakeLock();
    setTimerStatus('stopped');
    setTimeLeft(
      timerState === 'focus' ? focusTime :
      timerState === 'shortBreak' ? shortBreakTime : longBreakTime
    );
  };
  const extendTimer = (mins: number) => setTimeLeft(prev => prev + mins * 60);
  const skipSession = () => handleSessionComplete();

  // YouTube API Call
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setActiveChannel(null);
    setIsSearching(true);
    try {
      if (searchQuery.startsWith('@')) {
        const query = searchQuery.substring(1).trim();
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=channel&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();
        if (data.items) {
          const mapped = data.items.map((item: any) => ({
            id: item.id.channelId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.title,
            channelId: item.id.channelId,
            isChannelResult: true
          }));
          setSearchResults(mapped);
        }
      } else {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&videoDuration=long&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();
        if (data.items) {
          const mapped = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId
          }));
          setSearchResults(mapped);
        }
      }
    } catch (err) {
      console.error("YouTube search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const playVideo = (v: YTVideo) => {
    setCurrentVideo(v);
    setRecentLectures(prev => {
      const filtered = prev.filter(p => p.id !== v.id);
      return [v, ...filtered].slice(0, 5); // keep last 5
    });
  };

  const toggleFavorite = (v: YTVideo) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === v.id);
      if (exists) return prev.filter(p => p.id !== v.id);
      return [v, ...prev];
    });
  };

  const handleVideoStateChange = (event: YouTubeEvent) => {
    if (event.data === YouTube.PlayerState.PAUSED || event.data === YouTube.PlayerState.ENDED) {
      setVideoProgress(prev => ({
        ...prev,
        [currentVideo!.id]: event.target.getCurrentTime()
      }));
    }
  };

  const handleVideoReady = (event: YouTubeEvent) => {
    if (currentVideo && videoProgress[currentVideo.id]) {
      event.target.seekTo(videoProgress[currentVideo.id]);
    }
  };

  const searchChannel = async (channelId: string, channelTitle?: string, channelThumbnail?: string) => {
    setIsSearching(true);
    setSearchQuery('');
    const fav = favoriteChannels.find(c => c.id === channelId);
    setActiveChannel({ 
      id: channelId, 
      title: channelTitle || fav?.title || 'Channel', 
      thumbnail: channelThumbnail || fav?.thumbnail 
    });

    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&videoDuration=long&channelId=${channelId}&type=video&key=${YOUTUBE_API_KEY}`);
      const data = await res.json();
      if (data.items) {
        const mapped = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId
        }));
        setSearchResults(mapped);
      }
    } catch (err) {
      console.error("YouTube search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFavoriteChannel = async (channelId: string, channelTitle: string, knownThumbnail?: string) => {
    setFavoriteChannels(prev => {
      if (prev.find(c => c.id === channelId)) return prev.filter(c => c.id !== channelId);
      return [{id: channelId, title: channelTitle, thumbnail: knownThumbnail}, ...prev];
    });

    if (!knownThumbnail) {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const thumb = data.items[0].snippet.thumbnails.default.url;
          setFavoriteChannels(prev => prev.map(c => c.id === channelId ? {...c, thumbnail: thumb} : c));
        }
      } catch (err) {
        console.error("Failed to fetch channel thumbnail", err);
      }
    }
  };

  const handleSaveTime = (newMinutes: number) => {
    if (timerState === 'focus') {
      setFocusTime(newMinutes * 60);
      if (timerStatus === 'stopped') setTimeLeft(newMinutes * 60);
    } else if (timerState === 'shortBreak') {
      setShortBreakTime(newMinutes * 60);
      if (timerStatus === 'stopped') setTimeLeft(newMinutes * 60);
    } else if (timerState === 'longBreak') {
      setLongBreakTime(newMinutes * 60);
      if (timerStatus === 'stopped') setTimeLeft(newMinutes * 60);
    }
    setIsEditingTime(false);
  };

  const handleSaveGoal = (newMinutes: number) => {
    if (isEditingGoal === 'weekly') {
      setStats(prev => ({ ...prev, weeklyGoal: newMinutes * 60 }));
    } else if (isEditingGoal === 'monthly') {
      setStats(prev => ({ ...prev, monthlyGoal: newMinutes * 60 }));
    }
    setIsEditingGoal(null);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  const formatHours = (secs: number) => (secs / 3600).toFixed(1);

  const formatTodayTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Timer Circle Calculations
  const totalDuration = timerState === 'focus' ? focusTime : timerState === 'shortBreak' ? shortBreakTime : longBreakTime;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Chart Logic
  const currentWeekDays = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const mondayOffset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + mondayOffset + i);
    return d.toDateString();
  });

  const chartData = currentWeekDays.map(dateStr => {
    const secondsFromDaily = stats.dailyStudyTime?.[dateStr] || 0;
    const dayHistory = focusHistory.filter(h => new Date(h.date).toDateString() === dateStr);
    const secondsFromHistory = dayHistory.reduce((acc, curr) => acc + curr.duration, 0);
    const totalSeconds = Math.max(secondsFromDaily, secondsFromHistory);
    const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
    const targetMins = perDayTargetMinutes[dayLabel] || (dailyTargetHours * 60) || 120;
    const targetHours = targetMins / 60;
    return {
      label: dayLabel,
      fullDate: dateStr,
      hours: totalSeconds / 3600,
      targetMins,
      targetHours,
      isToday: dateStr === new Date().toDateString()
    };
  });
  const maxChartHours = Math.max(...chartData.map(d => d.hours), 1);

  // Dynamically compute weekly and monthly focus progress from daily study logs and focus history
  const calculatedWeeklySecs = currentWeekDays.reduce((acc, dateStr) => {
    const secondsFromDaily = stats.dailyStudyTime?.[dateStr] || 0;
    const dayHistory = focusHistory.filter(h => new Date(h.date).toDateString() === dateStr && h.type === 'focus');
    const secondsFromHistory = dayHistory.reduce((a, b) => a + b.duration, 0);
    return acc + Math.max(secondsFromDaily, secondsFromHistory);
  }, 0);

  const effectiveWeeklyProgress = Math.max(stats.weeklyGoalProgress || 0, calculatedWeeklySecs);

  const todayNowObj = new Date();
  const calculatedMonthlySecs = Object.keys(stats.dailyStudyTime || {}).reduce((acc, dateStr) => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getMonth() === todayNowObj.getMonth() && d.getFullYear() === todayNowObj.getFullYear()) {
      const secondsFromDaily = stats.dailyStudyTime?.[dateStr] || 0;
      const dayHistory = focusHistory.filter(h => new Date(h.date).toDateString() === dateStr && h.type === 'focus');
      const secondsFromHistory = dayHistory.reduce((a, b) => a + b.duration, 0);
      return acc + Math.max(secondsFromDaily, secondsFromHistory);
    }
    return acc;
  }, 0);

  const effectiveMonthlyProgress = Math.max(stats.monthlyGoalProgress || 0, calculatedMonthlySecs);

  return (
    <div className={`min-h-screen ${themePreference === 'dark' ? 'bg-zinc-950' : 'bg-[#050505]'} text-zinc-100 flex flex-col md:flex-row overflow-hidden font-sans transition-colors duration-500`}>
      
      {/* Left Column - Dashboard Stats */}
      <div className={`w-full md:w-1/4 p-6 border-r ${themePreference === 'dark' ? 'border-zinc-900 bg-zinc-950' : 'border-[#111] bg-[#0a0a0a]'} overflow-y-auto flex flex-col space-y-8 shadow-2xl relative z-10 transition-colors duration-500`}>
        <div className="flex justify-between items-center">
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center text-zinc-400 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          
          <button
            onClick={() => setThemePreference(p => p === 'dark' ? 'midnight' : 'dark')}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 bg-zinc-900/50 rounded-full"
            title="Toggle Theme"
          >
            {themePreference === 'dark' ? <Flame className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          </button>
        </div>
        
        <div>
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              Good Session.
            </h2>
            <button 
              onClick={() => setDashboardPreferences(p => ({...p, showQuotes: !p.showQuotes}))}
              className="text-zinc-600 hover:text-zinc-400 p-1"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
          {dashboardPreferences.showQuotes && (
            <p className="text-zinc-500 mt-2 text-sm italic border-l-2 border-indigo-500/50 pl-3">
              "{quote}"
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center text-indigo-400 mb-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Today</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold whitespace-nowrap">{formatTodayTime(stats.todayStudyTime)}</div>
          </div>

          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50">
            <div className="flex items-center text-emerald-400 mb-1">
              <Trophy className="w-3.5 h-3.5 mr-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Sessions</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold">{stats.todaySessionsCompleted || 0}</div>
          </div>

          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 group/streak relative">
            <button 
              onClick={() => {
                const num = parseInt(window.prompt("Set Streak Goal (Days):", (stats.streakGoal || 7).toString()) || "7");
                if (!isNaN(num) && num > 0) {
                  setStats(prev => ({...prev, streakGoal: num}));
                }
              }}
              className="absolute top-2 right-2 text-zinc-500 hover:text-orange-400 opacity-0 group-hover/streak:opacity-100 transition-opacity"
            >
              <Settings className="w-3 h-3" />
            </button>
            <div className="flex items-center text-orange-400 mb-1">
              <Flame className="w-3.5 h-3.5 mr-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Streak</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold">
              {stats.streak} <span className="text-xs font-sans text-zinc-500">/ {stats.streakGoal || 7}d</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center">
            <Target className="w-4 h-4 mr-2 text-indigo-400" /> Progress Goals
          </h3>
          
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 relative overflow-hidden group">
            <div className="flex justify-between items-center text-sm mb-2 relative z-10">
              <span className="text-zinc-300 flex items-center font-medium">
                Weekly Goal
                <button onClick={() => setIsEditingGoal('weekly')} className="ml-2 text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Set Weekly Target Hours">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-mono">
                  {((effectiveWeeklyProgress / (stats.weeklyGoal || 36000)) * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-indigo-300 font-bold">{formatHours(effectiveWeeklyProgress)} / {formatHours(stats.weeklyGoal || 36000)}h</span>
              </div>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-2.5 relative z-10 overflow-hidden border border-zinc-800/80">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-2.5 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, (effectiveWeeklyProgress / (stats.weeklyGoal || 36000)) * 100))}%` }}
              ></div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
          </div>

          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 relative overflow-hidden group">
            <div className="flex justify-between items-center text-sm mb-2 relative z-10">
              <span className="text-zinc-300 flex items-center font-medium">
                Monthly Goal
                <button onClick={() => setIsEditingGoal('monthly')} className="ml-2 text-zinc-500 hover:text-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Set Monthly Target Hours">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-md border border-fuchsia-500/20 font-mono">
                  {((effectiveMonthlyProgress / (stats.monthlyGoal || 144000)) * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-fuchsia-300 font-bold">{formatHours(effectiveMonthlyProgress)} / {formatHours(stats.monthlyGoal || 144000)}h</span>
              </div>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-2.5 relative z-10 overflow-hidden border border-zinc-800/80">
              <div 
                className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 h-2.5 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.8)] transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, (effectiveMonthlyProgress / (stats.monthlyGoal || 144000)) * 100))}%` }}
              ></div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-3xl group-hover:bg-fuchsia-500/10 transition-colors"></div>
          </div>
          
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weekly Activity</h4>
              <button
                onClick={() => setEditingDayTarget('Mon')}
                className="text-[10px] sm:text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg transition-colors border border-indigo-500/20 flex items-center"
                title="Set Per-Day Target Hours via Time Dial Clock"
              >
                <span>Set Day Targets</span>
                <Clock className="w-3 h-3 ml-1" />
              </button>
            </div>

            {/* Quick Day Target Chips */}
            <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-zinc-800/60 overflow-x-auto custom-scrollbar">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const targetMins = perDayTargetMinutes[day] || 120;
                const targetH = (targetMins / 60).toFixed(1);
                return (
                  <button
                    key={day}
                    onClick={() => setEditingDayTarget(day)}
                    className="flex flex-col items-center px-1.5 py-1 rounded-lg hover:bg-zinc-800/80 transition-all border border-transparent hover:border-indigo-500/30 group shrink-0"
                    title={`Set target for ${day}`}
                  >
                    <span className="text-[10px] text-zinc-400 group-hover:text-indigo-300 font-semibold">{day}</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-400">{targetH}h</span>
                  </button>
                );
              })}
            </div>

            {/* Chart Bars */}
            <div className="flex items-end justify-between h-32 gap-1.5">
              {chartData.map((d, i) => {
                const targetMins = perDayTargetMinutes[d.label] || 120;
                const targetHours = targetMins / 60;
                const fillPercentage = Math.min(100, Math.max(0, (d.hours / targetHours) * 100));
                const isTargetMet = d.hours >= targetHours;
                const isSelected = selectedBarIndex === i;

                return (
                  <div 
                    key={i} 
                    onClick={() => setSelectedBarIndex(isSelected ? null : i)}
                    className="flex flex-col items-center flex-1 group relative cursor-pointer"
                  >
                    <div className={`w-full bg-zinc-800/50 rounded-t-sm overflow-hidden flex items-end justify-center h-24 relative border-b border-zinc-700 transition-all ${
                      isSelected ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/30' : ''
                    }`}>
                      <div 
                        className={`w-full transition-all duration-700 rounded-t-sm ${
                          isTargetMet ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-indigo-500/80 hover:bg-indigo-400'
                        }`} 
                        style={{ height: `${fillPercentage}%` }}
                      ></div>
                      {/* Tooltip */}
                      <div className={`absolute bottom-full mb-2 ${isSelected ? 'opacity-100 z-30 scale-105' : 'opacity-0 group-hover:opacity-100'} transition-all bg-zinc-800 text-xs py-1.5 px-2.5 rounded-lg pointer-events-none whitespace-nowrap shadow-xl border border-zinc-700`}>
                        <div className="font-bold text-white">{d.hours.toFixed(1)}h <span className="text-zinc-400 font-normal">/ {targetHours.toFixed(1)}h</span></div>
                        <div className="text-[10px] text-indigo-300 font-mono mt-0.5">{fillPercentage.toFixed(0)}% target filled</div>
                      </div>
                    </div>
                    <span className={`text-[10px] mt-2 font-medium ${isSelected ? 'text-indigo-400 font-bold' : d.isToday ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selected Day Touch/Click Detail Card */}
            {selectedBarIndex !== null && chartData[selectedBarIndex] && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2.5 bg-zinc-950/90 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-indigo-300">{chartData[selectedBarIndex].label} Focus:</span>
                  <span className="ml-2 font-mono text-zinc-200">
                    {chartData[selectedBarIndex].hours.toFixed(1)}h done
                  </span>
                  <span className="mx-1 text-zinc-500">/</span>
                  <span className="font-mono text-indigo-400">
                    {( (perDayTargetMinutes[chartData[selectedBarIndex].label] || 120) / 60 ).toFixed(1)}h target
                  </span>
                </div>
                <button
                  onClick={() => setEditingDayTarget(chartData[selectedBarIndex].label)}
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-200 bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/40"
                >
                  Edit Goal
                </button>
              </motion.div>
            )}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900/50 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center text-indigo-300 mb-1">
              <Activity className="w-4 h-4 mr-2" />
              <span className="text-xs font-semibold uppercase tracking-wider">Productivity Score</span>
            </div>
            <div className="text-3xl font-black">{Math.round(stats.productivityScore)}</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 flex items-center justify-center">
            <span className="font-bold text-indigo-400">{timerState === 'focus' ? '↑' : '-'}</span>
          </div>
        </div>

      </div>

      {/* Center Column - Focus Timer */}
      <div className="w-full md:w-2/5 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow Effects */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000
          ${timerState === 'focus' ? 'bg-indigo-500' : timerState === 'shortBreak' ? 'bg-emerald-500' : 'bg-blue-500'}
        `} />

        <div className="mb-8 flex space-x-2 bg-zinc-900/50 p-1 rounded-full border border-zinc-800/50 relative z-10">
          <button 
            onClick={() => { setTimerState('focus'); setTimeLeft(focusTime); setTimerStatus('stopped'); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${timerState === 'focus' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-zinc-400 hover:text-white'}`}
          >
            Focus
          </button>
          <button 
            onClick={() => { setTimerState('shortBreak'); setTimeLeft(shortBreakTime); setTimerStatus('stopped'); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${timerState === 'shortBreak' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-zinc-400 hover:text-white'}`}
          >
            Short Break
          </button>
          <button 
            onClick={() => { setTimerState('longBreak'); setTimeLeft(longBreakTime); setTimerStatus('stopped'); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${timerState === 'longBreak' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-zinc-400 hover:text-white'}`}
          >
            Long Break
          </button>
        </div>

        {/* Circular Timer */}
        <div 
          className="relative flex items-center justify-center w-80 h-80 z-10 cursor-pointer group"
          onClick={() => { if (timerStatus === 'stopped' && !isEditingTime) setIsEditingTime(true); }}
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth="8"
              fill="transparent"
            />
            <motion.circle
              cx="130"
              cy="130"
              r={radius}
              stroke={timerState === 'focus' ? '#6366f1' : timerState === 'shortBreak' ? '#10b981' : '#3b82f6'}
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
              className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            />
          </svg>
          <div className="absolute flex flex-col items-center max-w-[230px] px-2 text-center pointer-events-none">
             <div className={`font-mono font-black tracking-tighter tabular-nums drop-shadow-2xl group-hover:text-indigo-200 transition-all ${
               timeLeft >= 3600 ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl'
             }`}>
               {formatTime(timeLeft)}
             </div>
             <div className="text-zinc-400 text-xs sm:text-sm tracking-[0.2em] uppercase mt-2 font-semibold flex items-center justify-center">
               {timerState === 'focus' ? 'Session ' + (sessionCount + 1) : 'Resting'}
               {timerStatus === 'stopped' && <Settings className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />}
             </div>
          </div>
        </div>

        <div className="mt-12 flex items-center space-x-6 z-10">
          <button onClick={stopTimer} className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors group">
            <Square className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            onClick={timerStatus === 'running' ? pauseTimer : startTimer}
            className={`p-6 rounded-3xl text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              timerState === 'focus' ? 'bg-indigo-600 shadow-indigo-500/50 hover:bg-indigo-500' :
              timerState === 'shortBreak' ? 'bg-emerald-600 shadow-emerald-500/50 hover:bg-emerald-500' :
              'bg-blue-600 shadow-blue-500/50 hover:bg-blue-500'
            }`}
          >
            {timerStatus === 'running' ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
          </button>

          <button onClick={skipSession} className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors group">
            <SkipForward className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        <div className="mt-8 flex space-x-3 z-10">
          <button onClick={() => extendTimer(5)} className="px-3.5 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center">
            <Plus className="w-3 h-3 mr-1" /> 5 MIN
          </button>
          <button onClick={() => extendTimer(10)} className="px-3.5 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center">
            <Plus className="w-3 h-3 mr-1" /> 10 MIN
          </button>
          <button 
            onClick={() => setIsEditingTime(true)} 
            className="px-3.5 py-2 rounded-xl bg-indigo-900/30 border border-indigo-500/40 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center shadow-lg shadow-indigo-500/10"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Dial Clock
          </button>
        </div>
      </div>

      {/* Right Column - YouTube & Media */}
      <div className="w-full md:w-1/3 p-6 bg-zinc-950/80 border-l border-zinc-900 flex flex-col relative z-10">
        
        {/* Current Video Player */}
        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
            <PlayCircle className="w-4 h-4 mr-2" /> Study Media
          </h3>
          {currentVideo ? (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="aspect-video bg-black relative">
                <YouTube
                  videoId={currentVideo.id}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                    },
                  }}
                  onStateChange={handleVideoStateChange}
                  onReady={handleVideoReady}
                  className="w-full h-full absolute inset-0"
                  iframeClassName="w-full h-full"
                />
              </div>
              <div className="p-4 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-zinc-100 line-clamp-1" dangerouslySetInnerHTML={{__html: currentVideo.title}} />
                  <p className="text-xs text-zinc-500 mt-1">{currentVideo.channelTitle}</p>
                </div>
                <div className="flex items-center space-x-2 ml-2 shrink-0">
                  <button 
                    onClick={() => toggleFavoriteChannel(currentVideo.channelId, currentVideo.channelTitle)}
                    className="text-zinc-500 hover:text-indigo-400 transition-colors group relative"
                    title="Favorite Channel"
                  >
                    <Star className={`w-5 h-5 ${favoriteChannels.find(c => c.id === currentVideo.channelId) ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                  </button>
                  <button 
                    onClick={() => toggleFavorite(currentVideo)}
                    className="text-zinc-500 hover:text-rose-500 transition-colors"
                    title="Favorite Video"
                  >
                    <Heart className={`w-5 h-5 ${favorites.find(f => f.id === currentVideo.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-500">
              <PlayCircle className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Search and select a lecture to study</p>
            </div>
          )}
        </div>

        {/* YouTube Search */}
        <form onSubmit={handleSearch} className="mb-6 relative">
          <input
            type="text"
            placeholder="Search lectures, or @channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
          />
          <Search className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </form>

        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
          
          {/* Favorite Channels */}
          {favoriteChannels.length > 0 && (
            <div className="mb-6 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3 flex items-center">
                <Star className="w-3 h-3 mr-2 text-indigo-400" /> Favorite Channels
              </h3>
              <div className="flex space-x-3 overflow-x-auto custom-scrollbar pb-2">
                {favoriteChannels.map(c => (
                  <div 
                    key={c.id} 
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group w-16 relative"
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteChannel(c.id, c.title, c.thumbnail); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div onClick={() => searchChannel(c.id, c.title, c.thumbnail)} className="w-12 h-12 rounded-full bg-indigo-900/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:bg-indigo-500 group-hover:text-white transition-colors border border-transparent group-hover:border-indigo-400 overflow-hidden shrink-0">
                      {c.thumbnail ? (
                        <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle className="w-6 h-6" />
                      )}
                    </div>
                    <span onClick={() => searchChannel(c.id, c.title, c.thumbnail)} className="text-[10px] text-zinc-400 text-center line-clamp-2 leading-tight group-hover:text-indigo-300">{c.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              {activeChannel ? (
                <div className="mb-4 p-4 bg-zinc-900/50 rounded-2xl flex items-center border border-zinc-800">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden mr-4 shrink-0">
                    {activeChannel.thumbnail ? (
                      <img src={activeChannel.thumbnail} alt={activeChannel.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500"><PlayCircle /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white line-clamp-1">{activeChannel.title}</h3>
                    <p className="text-xs text-zinc-400">Channel Dashboard</p>
                  </div>
                  <button onClick={() => { setActiveChannel(null); setSearchResults([]); }} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3">Search Results</h3>
              )}
              <div className="space-y-4">
                {searchResults.map(v => (
                  <div key={v.id} onClick={() => v.isChannelResult ? searchChannel(v.id, v.title, v.thumbnail) : playVideo(v)} className="flex flex-col bg-zinc-900/40 hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-zinc-700/50 group relative overflow-hidden">
                    <div className="w-full aspect-video bg-zinc-800 relative">
                       <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                       {v.isChannelResult && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                           <img src={v.thumbnail} alt={v.title} className="w-20 h-20 rounded-full border-4 border-zinc-900 object-cover" />
                         </div>
                       )}
                    </div>
                    <div className="p-3 pr-10">
                      <h4 className="text-sm font-semibold text-zinc-200 line-clamp-2 group-hover:text-indigo-300 transition-colors" dangerouslySetInnerHTML={{__html: v.title}} />
                      <p className="text-xs text-zinc-500 mt-1">{v.isChannelResult ? 'Channel' : v.channelTitle}</p>
                    </div>
                    {v.isChannelResult && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavoriteChannel(v.id, v.title, v.thumbnail); }}
                        className="absolute right-3 bottom-3 text-zinc-500 hover:text-indigo-400 transition-colors bg-zinc-900/80 p-2 rounded-full backdrop-blur-sm"
                      >
                        <Star className={`w-5 h-5 ${favoriteChannels.find(c => c.id === v.id) ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {favorites.length > 0 && searchResults.length === 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3 flex items-center">
                <Star className="w-3 h-3 mr-2" /> Favorite Lectures
              </h3>
              <div className="space-y-2">
                {favorites.map(v => (
                  <div key={v.id} onClick={() => playVideo(v)} className="flex gap-3 p-2 bg-zinc-900/40 hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-zinc-700/50 group">
                    <img src={v.thumbnail} alt={v.title} className="w-24 h-16 object-cover rounded-lg bg-zinc-800" />
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 group-hover:text-indigo-300 transition-colors" dangerouslySetInnerHTML={{__html: v.title}} />
                      <p className="text-[10px] text-zinc-500 mt-1">{v.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent */}
          {recentLectures.length > 0 && searchResults.length === 0 && favorites.length === 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3 flex items-center">
                <Clock className="w-3 h-3 mr-2" /> Continue Watching
              </h3>
              <div className="space-y-2">
                {recentLectures.map(v => (
                  <div key={v.id} onClick={() => playVideo(v)} className="flex gap-3 p-2 bg-zinc-900/40 hover:bg-zinc-800/80 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-zinc-700/50 group">
                    <img src={v.thumbnail} alt={v.title} className="w-24 h-16 object-cover rounded-lg bg-zinc-800" />
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 group-hover:text-indigo-300 transition-colors" dangerouslySetInnerHTML={{__html: v.title}} />
                      <p className="text-[10px] text-zinc-500 mt-1">{v.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Time Dial Picker Modal */}
      {isEditingTime && (
        <TimeDialPicker
          title={`Set ${timerState === 'focus' ? 'Focus Session' : timerState === 'shortBreak' ? 'Short Break' : 'Long Break'} Time`}
          initialValue={Math.floor((timerState === 'focus' ? focusTime : timerState === 'shortBreak' ? shortBreakTime : longBreakTime) / 60)}
          onSave={handleSaveTime}
          onCancel={() => setIsEditingTime(false)}
        />
      )}

      {/* Day Target Dial Picker Modal */}
      {editingDayTarget && (
        <TimeDialPicker
          title={`Set Daily Focus Target for ${editingDayTarget}`}
          initialValue={perDayTargetMinutes[editingDayTarget] || 120}
          onSave={(valueInMinutes) => {
            setPerDayTargetMinutes(prev => ({ ...prev, [editingDayTarget]: valueInMinutes }));
            setEditingDayTarget(null);
          }}
          onCancel={() => setEditingDayTarget(null)}
          maxHours={24}
        />
      )}

      {/* Goal Dial Picker Modal */}
      {isEditingGoal && (
        <TimeDialPicker
          title={`Set ${isEditingGoal === 'weekly' ? 'Weekly' : 'Monthly'} Target Goal (Hours/Mins)`}
          initialValue={Math.floor((isEditingGoal === 'weekly' ? stats.weeklyGoal : stats.monthlyGoal) / 60)}
          onSave={handleSaveGoal}
          onCancel={() => setIsEditingGoal(null)}
          maxHours={100}
        />
      )}

    </div>
  );
}
