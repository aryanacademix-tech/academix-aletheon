export interface TaskMetadata {
  id: string; // The Google Task ID
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number; // minutes
  progress: number; // 0-100
  colorLabel: string;
  tags: string[];
  isPinned: boolean;
  subject: string;
  dueTime?: string; // Storing due time separately if needed
}

export const CATEGORIES = [
  { id: 'study', label: 'Study', icon: '📚', color: 'text-blue-400' },
  { id: 'homework', label: 'Homework', icon: '📝', color: 'text-emerald-400' },
  { id: 'revision', label: 'Revision', icon: '📖', color: 'text-amber-400' },
  { id: 'exam', label: 'Exam', icon: '🎯', color: 'text-red-400' },
  { id: 'coding', label: 'Coding', icon: '💻', color: 'text-indigo-400' },
  { id: 'personal', label: 'Personal', icon: '🏠', color: 'text-zinc-400' },
];

export const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-zinc-800 text-zinc-300' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-900/50 text-blue-300' },
  { id: 'high', label: 'High', color: 'bg-amber-900/50 text-amber-300' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-900/50 text-red-300' },
];

export const DEFAULT_META: Omit<TaskMetadata, 'id'> = {
  category: 'personal',
  priority: 'medium',
  estimatedDuration: 30,
  progress: 0,
  colorLabel: 'zinc',
  tags: [],
  isPinned: false,
  subject: '',
};
