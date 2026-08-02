import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Clock, Calendar as CalendarIcon, Trash2, ListTodo, LogIn, Loader2, Star } from 'lucide-react';
import { Screen } from '../types';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/auth';
import { User } from 'firebase/auth';
import TaskDetailsModal from './planner/TaskDetailsModal';
import { TaskMetadata, DEFAULT_META, CATEGORIES, PRIORITIES } from './planner/types';
import { recordSkillActivity } from '../utils/dailyTracker';

interface GTask {
  id: string;
  title: string;
  notes?: string;
  status: string; // "needsAction" or "completed"
  due?: string; // RFC 3339 timestamp
}

interface PlannerScreenProps {
  onNavigate: (screen: Screen) => void;
  onActivityComplete?: (xp: number, coins: number) => void;
}

export default function PlannerScreen({ onNavigate, onActivityComplete }: PlannerScreenProps) {
  const [tasks, setTasks] = useState<GTask[]>(() => {
    const saved = localStorage.getItem('synapse_local_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back
      }
    }
    return [
      { id: '1', title: 'Complete Physics Chapter 4 exercises', status: 'needsAction', due: new Date().toISOString() },
      { id: '2', title: 'Review Chemistry flashcards', status: 'needsAction' },
      { id: '3', title: 'Solve 10 Calculus practice problems', status: 'completed' },
    ];
  });
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMetadata>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State
  const [editingTask, setEditingTask] = useState<GTask | null>(null);
  
  // Filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const savedMeta = localStorage.getItem('synapse_task_meta');
    if (savedMeta) {
      try {
        setTaskMeta(JSON.parse(savedMeta));
      } catch (e) {
        console.error("Failed to parse task meta", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('synapse_task_meta', JSON.stringify(taskMeta));
  }, [taskMeta]);

  useEffect(() => {
    localStorage.setItem('synapse_local_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setNeedsAuth(false);
        fetchTasks(token);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchTasks = async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.items) {
        setTasks(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        fetchTasks(result.accessToken);
      }
    } catch (e) {
      console.error('Login failed', e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const newTask: GTask = {
      id: Date.now().toString(),
      title: title.trim(),
      status: 'needsAction',
      notes: ''
    };

    setTasks(prev => [newTask, ...prev]);
    setTaskMeta(prev => ({
      ...prev,
      [newTask.id]: { ...DEFAULT_META, id: newTask.id }
    }));

    recordSkillActivity('completion_of_task', prev => ({ ...prev, tasksCreated: prev.tasksCreated + 1 }));
    
    setTitle('');
    setIsAdding(false);

    const token = await getAccessToken();
    if (token) {
      try {
        const body = { title: newTask.title, notes: '' };
        const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        const created = await res.json();
        if (created.id) {
          setTasks(prev => prev.map(t => t.id === newTask.id ? created : t));
        }
      } catch (error) {
        console.error(error);
      }
    }
    setIsSubmitting(false);
  };

  const saveTaskDetails = async (updates: { title: string; notes: string; due?: string }, newMeta: TaskMetadata) => {
    if (!editingTask) return;
    
    // Optimistic UI updates
    setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updates } : t));
    setTaskMeta(prev => ({ ...prev, [editingTask.id]: newMeta }));
    setEditingTask(null);

    const token = await getAccessToken();
    if (!token) return;

    try {
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error("Failed to save task to Google Tasks", e);
    }
  };

  const setTaskStatus = async (task: GTask, newStatus: 'completed' | 'needsAction') => {
    if (task.status === newStatus) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    if (newStatus === 'completed') {
      recordSkillActivity('completion_of_task', prev => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
      if (onActivityComplete) {
        const xp = Math.floor(Math.random() * 51) + 100;
        onActivityComplete(xp, 5);
      }
    }
    
    const token = await getAccessToken();
    if (!token) return;

    try {
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const toggleTask = async (task: GTask) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    await setTaskStatus(task, newStatus);
  };

  const deleteTask = async (taskId: string) => {
    // Immediately update local task list and localStorage
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId);
      localStorage.setItem('synapse_local_tasks', JSON.stringify(next));
      return next;
    });

    setTaskMeta(prev => {
      const next = { ...prev };
      delete next[taskId];
      localStorage.setItem('synapse_task_meta', JSON.stringify(next));
      return next;
    });

    setEditingTask(null);

    // Sync deletion with Google Tasks if logged in
    const token = await getAccessToken();
    if (token) {
      try {
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Failed to delete task from Google Tasks", e);
      }
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const leftCount = tasks.length - completedCount;
  const score = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Sorting: Pinned first, then incomplete first
  const sortedTasks = [...tasks].sort((a, b) => {
    const metaA = taskMeta[a.id] || DEFAULT_META;
    const metaB = taskMeta[b.id] || DEFAULT_META;
    
    if (metaA.isPinned && !metaB.isPinned) return -1;
    if (!metaA.isPinned && metaB.isPinned) return 1;
    
    if (a.status === 'needsAction' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'needsAction') return 1;
    
    return 0;
  });

  const filteredTasks = selectedCategory 
    ? sortedTasks.filter(t => (taskMeta[t.id]?.category || 'personal') === selectedCategory)
    : sortedTasks;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <button 
          onClick={() => onNavigate('home')}
          className="flex items-center text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div className="flex items-center space-x-2">
          <ListTodo className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold tracking-wider">PLANNER</h1>
        </div>
        <div>
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-emerald-400 font-medium hidden sm:inline">Google Synced</span>
              <button onClick={logout} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center space-x-1"
            >
              {isLoggingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
              <span>Sync Google</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto p-6 flex-1 space-y-8 pb-32">
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-emerald-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Sync Notice if Not Logged In */}
            {!user && (
              <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5 text-zinc-300">
                  <ListTodo className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Local Planner Mode (Sign in to sync with Google Tasks & Calendar)</span>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {isLoggingIn ? 'Connecting...' : 'Sign In'}
                </button>
              </div>
            )}
            {/* Score & Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-3xl font-light text-emerald-400">{score}%</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Completion</span>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-3xl font-light text-zinc-200">{completedCount}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Completed</span>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-3xl font-light text-zinc-400">{leftCount}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Left to do</span>
              </div>
            </div>

            {/* Categories Filter */}
            <div className="flex space-x-2 overflow-x-auto custom-scrollbar pb-2 -mx-2 px-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedCategory === null ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2 ${
                    selectedCategory === cat.id ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Add Task */}
            <form onSubmit={addTask} className="relative flex items-center">
              <Plus className="absolute left-4 w-5 h-5 text-zinc-500" />
              <input 
                type="text"
                placeholder="Quick add a task..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors placeholder-zinc-600"
              />
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-0 flex items-center"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </form>

            {/* Task List */}
            <div className="flex items-center justify-between px-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
              <span>Tip: Swipe right to complete task</span>
              <span>Swipe left to uncomplete</span>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {filteredTasks.map(task => {
                  const meta = taskMeta[task.id] || DEFAULT_META;
                  const category = CATEGORIES.find(c => c.id === meta.category) || CATEGORIES[5];
                  const priority = PRIORITIES.find(p => p.id === meta.priority) || PRIORITIES[1];
                  const isDone = task.status === 'completed';
                  
                  return (
                    <div key={task.id} className="relative rounded-2xl overflow-hidden touch-pan-y bg-zinc-950">
                      {/* Swipe Action Background Hints - hidden under solid card when stationary */}
                      <div className="absolute inset-0 flex items-center justify-between px-5 rounded-2xl bg-zinc-950 border border-zinc-900 pointer-events-none">
                        <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                          <span>Swipe Right → Complete</span>
                        </div>
                        <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                          <span>Undo ← Swipe Left</span>
                        </div>
                      </div>

                      {/* Foreground slidable card - Ultra smooth on mobile touch and tablets */}
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        drag="x"
                        dragDirectionLock={true}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.65}
                        dragSnapToOrigin={true}
                        onDragEnd={(_e, info) => {
                          if (info.offset.x > 35 || info.velocity.x > 120) {
                            setTaskStatus(task, 'completed');
                          } else if (info.offset.x < -35 || info.velocity.x < -120) {
                            setTaskStatus(task, 'needsAction');
                          }
                        }}
                        className={`group relative z-10 flex flex-col space-y-3 p-4 rounded-2xl border transition-all cursor-pointer select-none bg-zinc-900 ${
                          isDone 
                            ? 'border-emerald-900/40 bg-zinc-900/95 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                        onClick={() => setEditingTask(task)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Checkbox button + Task title & metadata */}
                          <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTask(task);
                              }}
                              className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isDone 
                                  ? 'bg-emerald-500 border-emerald-500 text-zinc-950 font-bold text-xs' 
                                  : 'border-zinc-700 hover:border-emerald-400 text-transparent'
                              }`}
                              title={isDone ? 'Mark active' : 'Mark complete'}
                            >
                              ✓
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                {meta.isPinned && <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" />}
                                <div className="relative inline-block max-w-full">
                                  <span className={`text-base sm:text-lg font-semibold tracking-tight transition-colors duration-200 block truncate ${
                                    isDone ? 'text-zinc-500' : 'text-zinc-100'
                                  }`}>
                                    {task.title}
                                  </span>
                                  {isDone && (
                                    <motion.div
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{ duration: 0.35, ease: "easeOut" }}
                                      className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2.5px] bg-emerald-400 rounded-full origin-left shadow-[0_0_12px_#34d399,0_0_6px_#10b981] pointer-events-none"
                                    />
                                  )}
                                </div>
                              </div>
                            
                            {(task.notes || task.due || meta.subject) && (
                              <div className="flex items-center flex-wrap gap-2.5 mt-2 text-xs text-zinc-500">
                                {meta.subject && (
                                  <span className="flex items-center bg-zinc-800/80 px-2 py-0.5 rounded-md text-zinc-300 font-medium">
                                    {meta.subject}
                                  </span>
                                )}
                                {task.due && (
                                  <span className="flex items-center text-zinc-400">
                                    <CalendarIcon className="w-3 h-3 mr-1 text-emerald-400" />
                                    {(() => {
                                      const d = new Date(task.due);
                                      if (isNaN(d.getTime())) return '';
                                      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
                                      const timeStr = hasTime ? ` at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : '';
                                      return `${dateStr}${timeStr}`;
                                    })()}
                                  </span>
                                )}
                                {meta.estimatedDuration > 0 && (
                                  <span className="flex items-center text-zinc-400">
                                    <Clock className="w-3 h-3 mr-1 text-indigo-400" />
                                    {meta.estimatedDuration}m
                                  </span>
                                )}
                              </div>
                            )}
                            </div>
                          </div>

                          {/* Right Controls: Category, Priority, Delete */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1.5 shrink-0 bg-zinc-950 border border-zinc-800/80 ${category.color}`}>
                              <span>{category.icon}</span>
                              <span className="hidden sm:inline">{category.label}</span>
                            </span>
                            
                            {meta.priority && meta.priority !== 'medium' && (
                              <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-bold shrink-0 ${priority.color}`}>
                                {priority.label}
                              </span>
                            )}

                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {meta.progress > 0 && meta.progress < 100 && (
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-emerald-500" style={{ width: `${meta.progress}%` }} />
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
                
                {filteredTasks.length === 0 && !isAdding && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-zinc-600 text-sm"
                  >
                    No tasks found. Start planning!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Task Edit Modal */}
      <AnimatePresence>
        {editingTask && (
          <TaskDetailsModal
            task={editingTask}
            meta={taskMeta[editingTask.id] || { ...DEFAULT_META, id: editingTask.id }}
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            onSave={saveTaskDetails}
            onDelete={() => deleteTask(editingTask.id)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
