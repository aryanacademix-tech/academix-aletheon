import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Tag, Clock, Calendar, Hash, Flag, Target, Book, Star, Trash2, CalendarCheck, Loader2 } from 'lucide-react';
import { TaskMetadata, CATEGORIES, PRIORITIES } from './types';
import { createGoogleCalendarEvent, googleSignIn, getAccessToken } from '../../lib/auth';
import ClockTimePicker from '../ClockTimePicker';

interface TaskDetailsModalProps {
  task: any; // Google Task
  meta: TaskMetadata;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { title: string; notes: string; due?: string }, newMeta: TaskMetadata) => void;
  onDelete?: () => void;
}

export default function TaskDetailsModal({ task, meta, isOpen, onClose, onSave, onDelete }: TaskDetailsModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [showClockPicker, setShowClockPicker] = useState(false);
  
  const [localMeta, setLocalMeta] = useState<TaskMetadata>(meta);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      if (task.due) {
        const d = new Date(task.due);
        if (!isNaN(d.getTime())) {
          setDueDate(d.toISOString().split('T')[0]);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setDueTime(`${hh}:${mm}`);
        } else {
          setDueDate('');
          setDueTime('09:00');
        }
      } else {
        setDueDate('');
        setDueTime('09:00');
      }
      setLocalMeta(meta);
      setCalendarSyncStatus(null);
    }
  }, [task, meta, isOpen]);

  if (!isOpen) return null;

  const format12Hour = (time24: string) => {
    if (!time24) return '09:00 AM';
    const [h, m] = time24.split(':').map(Number);
    const period = (h || 0) >= 12 ? 'PM' : 'AM';
    const hour12 = (h || 0) % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let combinedDue: string | undefined = undefined;
    if (dueDate) {
      if (dueTime) {
        combinedDue = new Date(`${dueDate}T${dueTime}:00`).toISOString();
      } else {
        combinedDue = new Date(dueDate).toISOString();
      }
    }
    onSave({ title, notes, due: combinedDue }, localMeta);
  };

  const handleSyncToCalendar = async () => {
    if (!title.trim()) return;
    setIsSyncingCalendar(true);
    setCalendarSyncStatus(null);

    let token = await getAccessToken();
    if (!token) {
      setCalendarSyncStatus('Signing in to Google Calendar...');
      try {
        const signResult = await googleSignIn();
        if (signResult) {
          token = signResult.accessToken;
        }
      } catch (err) {
        setIsSyncingCalendar(false);
        setCalendarSyncStatus('Google login required for Calendar sync.');
        return;
      }
    }

    let res = await createGoogleCalendarEvent({
      summary: title.trim(),
      description: notes || `Category: ${localMeta.category || 'General'} | Priority: ${localMeta.priority || 'medium'}`,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined
    });

    // If initial attempt failed due to auth, prompt sign in once and retry
    if (!res.success && (res.error?.includes('authenticated') || res.error?.includes('401') || res.error?.includes('token'))) {
      try {
        setCalendarSyncStatus('Refreshing Google credentials...');
        const signResult = await googleSignIn();
        if (signResult) {
          res = await createGoogleCalendarEvent({
            summary: title.trim(),
            description: notes || `Category: ${localMeta.category || 'General'} | Priority: ${localMeta.priority || 'medium'}`,
            dueDate: dueDate || undefined
          });
        }
      } catch (err) {
        // Fall back
      }
    }

    setIsSyncingCalendar(false);
    if (res.success) {
      setCalendarSyncStatus('Successfully added to Google Calendar!');
    } else {
      setCalendarSyncStatus(res.error || 'Failed to sync to Calendar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setLocalMeta({ ...localMeta, isPinned: !localMeta.isPinned })}
              className={`p-2 rounded-xl transition-colors ${localMeta.isPinned ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
            >
              <Star className="w-5 h-5" fill={localMeta.isPinned ? "currentColor" : "none"} />
            </button>
            <h2 className="text-lg font-bold text-zinc-100">Edit Task Details</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Core Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="What needs to be done?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors min-h-[100px] resize-y"
                placeholder="Add more details..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category & Subject */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Hash className="w-3 h-3 mr-1" /> Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLocalMeta({ ...localMeta, category: cat.id })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 border ${
                        localMeta.category === cat.id 
                          ? 'bg-zinc-800 border-zinc-700 text-white' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Book className="w-3 h-3 mr-1" /> Subject</label>
                <input
                  type="text"
                  value={localMeta.subject}
                  onChange={e => setLocalMeta({ ...localMeta, subject: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="e.g. Math, React, Design..."
                />
              </div>
            </div>

            {/* Timing & Priority */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Flag className="w-3 h-3 mr-1" /> Priority</label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map(pri => (
                    <button
                      key={pri.id}
                      type="button"
                      onClick={() => setLocalMeta({ ...localMeta, priority: pri.id as any })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        localMeta.priority === pri.id 
                          ? `${pri.color} border-transparent` 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {pri.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Calendar className="w-3 h-3 mr-1 text-emerald-400" /> Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Clock className="w-3 h-3 mr-1 text-emerald-400" /> Reminder Time</label>
                  <button
                    type="button"
                    onClick={() => setShowClockPicker(true)}
                    className="w-full bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-zinc-100 text-sm text-left flex items-center justify-between transition-colors group"
                  >
                    <span className="font-semibold text-emerald-400 group-hover:text-emerald-300">{format12Hour(dueTime)}</span>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">⏰ Dial</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Clock className="w-3 h-3 mr-1 text-zinc-400" /> Est. Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={localMeta.estimatedDuration}
                    onChange={e => setLocalMeta({ ...localMeta, estimatedDuration: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Google Calendar Sync Section */}
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <div className="flex items-center space-x-2 text-xs text-zinc-300">
                <CalendarCheck className="w-4 h-4 text-blue-400" />
                <span>Google Calendar Sync</span>
              </div>
              <button
                type="button"
                onClick={handleSyncToCalendar}
                disabled={isSyncingCalendar || !title.trim()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isSyncingCalendar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarCheck className="w-3.5 h-3.5" />
                )}
                <span>Add to Google Calendar</span>
              </button>
            </div>
            {calendarSyncStatus && (
              <p className={`text-xs mt-2 font-medium ${calendarSyncStatus.includes('Successfully') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {calendarSyncStatus}
              </p>
            )}
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center"><Target className="w-3 h-3 mr-1" /> Progress ({localMeta.progress}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={localMeta.progress}
              onChange={e => setLocalMeta({ ...localMeta, progress: parseInt(e.target.value) })}
              className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          ) : (
            <div></div>
          )}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors text-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Clock Dial Time Picker Modal */}
      {showClockPicker && (
        <ClockTimePicker
          title="Set Reminder Time"
          initialTime={dueTime || "09:00"}
          onSave={(selectedTime) => {
            setDueTime(selectedTime);
            setShowClockPicker(false);
          }}
          onCancel={() => setShowClockPicker(false)}
        />
      )}
    </div>
  );
}
