export interface SkillDailyData {
  solving_puzzle: { attempted: number; solved: number; totalTimeSeconds: number };
  logic: { attempted: number; solved: number };
  speed: { totalTimeSeconds: number; itemCounts: number };
  math: { attempted: number; solved: number; totalTimeSeconds: number };
  quiz: { attempted: number; solved: number; totalTimeSeconds: number };
  focus: { sessionsCompleted: number; totalMinutes: number };
  completion_of_task: { tasksCreated: number; tasksCompleted: number };
  researches: { sessions: number; topicsViewed: string[] };
  pattern: { attempted: number; solved: number };
}

export type SkillKey = keyof SkillDailyData;

export interface SkillScore {
  key: SkillKey;
  name: string;
  icon: string;
  isActive: boolean;
  percentage: number; // 0 to 100
  summary: string;
  metricLabel: string;
}

export interface DailyFeedback {
  date: string;
  pros: string[];
  cons: string[];
  overallSummary: string;
  activeSkillsCount: number;
}

export const SKILL_METADATA: Record<SkillKey, { name: string; icon: string; description: string }> = {
  solving_puzzle: { name: 'Solving Puzzle', icon: '🧩', description: 'Puzzle solving accuracy & problem solving' },
  logic: { name: 'Logic', icon: '🧠', description: 'Logical reasoning and analytical deduction' },
  speed: { name: 'Speed', icon: '⚡', description: 'Reaction time and problem completion speed' },
  math: { name: 'Math', icon: '🔢', description: 'Arithmetic accuracy and calculation power' },
  quiz: { name: 'Quiz', icon: '🎯', description: 'General knowledge & quiz comprehension' },
  focus: { name: 'Focus', icon: '⏱️', description: 'Sustained focus and deep work endurance' },
  completion_of_task: { name: 'Completion of Task', icon: '📋', description: 'Daily planner execution & task discipline' },
  researches: { name: 'Researches', icon: '🔬', description: 'Inquisitiveness and topic research depth' },
  pattern: { name: 'Pattern Recognition', icon: '🔮', description: 'Visual pattern and sequence identification' },
};

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PRESENCE_STORAGE_KEY = 'synapse_active_presence_dates';

export interface WeeklyPresenceInfo {
  currentStreak: number;
  activeDaysThisWeek: number; // e.g. 5 out of 7
  weeklyPresenceMap: { dayName: string; dateKey: string; isPresent: boolean; isToday: boolean }[];
}

export function recordTodayPresence(): WeeklyPresenceInfo {
  const today = getTodayKey();
  let activeDates: string[] = [];
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (raw) activeDates = JSON.parse(raw);
  } catch (e) {
    activeDates = [];
  }

  if (!activeDates.includes(today)) {
    activeDates.push(today);
    activeDates.sort();
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(activeDates));
  }

  return getWeeklyPresenceStats(activeDates);
}

export function getWeeklyPresenceStats(passedActiveDates?: string[]): WeeklyPresenceInfo {
  let activeDates: string[] = passedActiveDates || [];
  if (!passedActiveDates) {
    try {
      const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
      if (raw) activeDates = JSON.parse(raw);
    } catch (e) {
      activeDates = [];
    }
  }

  const todayStr = getTodayKey();

  // 1. Calculate consecutive day streak leading up to today (or yesterday if today hasn't logged in yet)
  let streak = 0;
  let checkDate = new Date();
  
  // Check if today is present
  const todayY = checkDate.getFullYear();
  const todayM = String(checkDate.getMonth() + 1).padStart(2, '0');
  const todayD = String(checkDate.getDate()).padStart(2, '0');
  const todayKey = `${todayY}-${todayM}-${todayD}`;

  if (!activeDates.includes(todayKey)) {
    // Check if yesterday was present; if so, streak starts from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    if (activeDates.includes(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Weekly grid: Mon through Sun for the CURRENT calendar week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
  const distToMon = (dayOfWeek + 6) % 7; // distance back to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - distToMon);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyPresenceMap: { dayName: string; dateKey: string; isPresent: boolean; isToday: boolean }[] = [];
  let activeDaysThisWeek = 0;

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    const isPresent = activeDates.includes(key);
    if (isPresent) activeDaysThisWeek++;

    weeklyPresenceMap.push({
      dayName: dayNames[i],
      dateKey: key,
      isPresent,
      isToday: key === todayStr,
    });
  }

  return { currentStreak: streak, activeDaysThisWeek, weeklyPresenceMap };
}

const STORAGE_PREFIX = 'synapse_daily_skills_';

export function getEmptyDailyRecord(): SkillDailyData {
  return {
    solving_puzzle: { attempted: 0, solved: 0, totalTimeSeconds: 0 },
    logic: { attempted: 0, solved: 0 },
    speed: { totalTimeSeconds: 0, itemCounts: 0 },
    math: { attempted: 0, solved: 0, totalTimeSeconds: 0 },
    quiz: { attempted: 0, solved: 0, totalTimeSeconds: 0 },
    focus: { sessionsCompleted: 0, totalMinutes: 0 },
    completion_of_task: { tasksCreated: 0, tasksCompleted: 0 },
    researches: { sessions: 0, topicsViewed: [] },
    pattern: { attempted: 0, solved: 0 },
  };
}

export function getDailySkillRecord(dateKey: string = getTodayKey()): SkillDailyData {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getEmptyDailyRecord(), ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse daily skill record', e);
  }
  return getEmptyDailyRecord();
}

export function recordSkillActivity<K extends SkillKey>(
  key: K,
  updater: (prev: SkillDailyData[K]) => SkillDailyData[K],
  dateKey: string = getTodayKey()
) {
  const current = getDailySkillRecord(dateKey);
  const updatedCategory = updater(current[key]);
  const newRecord: SkillDailyData = {
    ...current,
    [key]: updatedCategory,
  };
  localStorage.setItem(`${STORAGE_PREFIX}${dateKey}`, JSON.stringify(newRecord));
}

export function calculateSkillScores(data: SkillDailyData): SkillScore[] {
  const scores: SkillScore[] = [];

  // 1. Solving Puzzle
  const pAttempted = data.solving_puzzle.attempted;
  const pSolved = data.solving_puzzle.solved;
  const pActive = pAttempted > 0;
  const pPct = pActive ? Math.min(100, Math.round((pSolved / pAttempted) * 100)) : 0;
  scores.push({
    key: 'solving_puzzle',
    name: SKILL_METADATA.solving_puzzle.name,
    icon: SKILL_METADATA.solving_puzzle.icon,
    isActive: pActive,
    percentage: pPct,
    summary: pActive ? `${pSolved}/${pAttempted} puzzles solved` : 'No puzzles solved today',
    metricLabel: pActive ? `${pPct}% Accuracy` : 'Inactive Today',
  });

  // 2. Logic
  const lAttempted = data.logic.attempted;
  const lSolved = data.logic.solved;
  const lActive = lAttempted > 0;
  const lPct = lActive ? Math.min(100, Math.round((lSolved / lAttempted) * 100)) : 0;
  scores.push({
    key: 'logic',
    name: SKILL_METADATA.logic.name,
    icon: SKILL_METADATA.logic.icon,
    isActive: lActive,
    percentage: lPct,
    summary: lActive ? `${lSolved}/${lAttempted} logic deductions correct` : 'No logic exercises today',
    metricLabel: lActive ? `${lPct}% Accuracy` : 'Inactive Today',
  });

  // 3. Speed
  const sItems = data.speed.itemCounts;
  const sTime = data.speed.totalTimeSeconds;
  const sActive = sItems > 0;
  let sPct = 0;
  let sSummary = 'No timed activities today';
  if (sActive) {
    const avgSec = sTime / sItems; // e.g. 3.2s per question
    // Score scale: <2s = 100%, 2-5s = 90-70%, 5-10s = 70-50%, >10s = <50%
    if (avgSec <= 2) sPct = 100;
    else if (avgSec <= 5) sPct = Math.round(100 - (avgSec - 2) * 10);
    else if (avgSec <= 15) sPct = Math.max(30, Math.round(70 - (avgSec - 5) * 4));
    else sPct = 25;
    sSummary = `${avgSec.toFixed(1)}s avg response speed across ${sItems} items`;
  }
  scores.push({
    key: 'speed',
    name: SKILL_METADATA.speed.name,
    icon: SKILL_METADATA.speed.icon,
    isActive: sActive,
    percentage: sPct,
    summary: sSummary,
    metricLabel: sActive ? `${sPct}% Speed Score` : 'Inactive Today',
  });

  // 4. Math
  const mAttempted = data.math.attempted;
  const mSolved = data.math.solved;
  const mActive = mAttempted > 0;
  const mPct = mActive ? Math.min(100, Math.round((mSolved / mAttempted) * 100)) : 0;
  scores.push({
    key: 'math',
    name: SKILL_METADATA.math.name,
    icon: SKILL_METADATA.math.icon,
    isActive: mActive,
    percentage: mPct,
    summary: mActive ? `${mSolved}/${mAttempted} math calculations solved` : 'No math challenges done today',
    metricLabel: mActive ? `${mPct}% Accuracy` : 'Inactive Today',
  });

  // 5. Quiz
  const qAttempted = data.quiz.attempted;
  const qSolved = data.quiz.solved;
  const qActive = qAttempted > 0;
  const qPct = qActive ? Math.min(100, Math.round((qSolved / qAttempted) * 100)) : 0;
  scores.push({
    key: 'quiz',
    name: SKILL_METADATA.quiz.name,
    icon: SKILL_METADATA.quiz.icon,
    isActive: qActive,
    percentage: qPct,
    summary: qActive ? `${qSolved}/${qAttempted} quiz answers correct` : 'No quiz completed today',
    metricLabel: qActive ? `${qPct}% Score` : 'Inactive Today',
  });

  // 6. Focus
  const fMinutes = data.focus.totalMinutes;
  const fSessions = data.focus.sessionsCompleted;
  const fActive = fMinutes > 0 || fSessions > 0;
  // Target: 25 mins = 80%, 45+ mins = 100%
  let fPct = 0;
  if (fActive) {
    fPct = Math.min(100, Math.round((fMinutes / 45) * 100));
    if (fPct < 30 && fMinutes > 0) fPct = 30; // base reward
  }
  scores.push({
    key: 'focus',
    name: SKILL_METADATA.focus.name,
    icon: SKILL_METADATA.focus.icon,
    isActive: fActive,
    percentage: fPct,
    summary: fActive ? `${fMinutes} mins focused across ${fSessions} sessions` : 'No focus timer sessions logged today',
    metricLabel: fActive ? `${fPct}% Focus Rating` : 'Inactive Today',
  });

  // 7. Completion of Task
  const tCreated = data.completion_of_task.tasksCreated;
  const tCompleted = data.completion_of_task.tasksCompleted;
  const tActive = tCompleted > 0 || tCreated > 0;
  let tPct = 0;
  if (tActive) {
    const totalRef = Math.max(tCreated, tCompleted);
    tPct = totalRef > 0 ? Math.min(100, Math.round((tCompleted / totalRef) * 100)) : 100;
  }
  scores.push({
    key: 'completion_of_task',
    name: SKILL_METADATA.completion_of_task.name,
    icon: SKILL_METADATA.completion_of_task.icon,
    isActive: tActive,
    percentage: tPct,
    summary: tActive ? `${tCompleted} tasks completed` : 'No tasks finished in planner today',
    metricLabel: tActive ? `${tPct}% Task Rate` : 'Inactive Today',
  });

  // 8. Researches
  const rSessions = data.researches.sessions;
  const rTopics = data.researches.topicsViewed.length;
  const rActive = rSessions > 0 || rTopics > 0;
  let rPct = 0;
  if (rActive) {
    rPct = Math.min(100, Math.round((rTopics * 25) + (rSessions * 15)));
    if (rPct < 40) rPct = 40;
  }
  scores.push({
    key: 'researches',
    name: SKILL_METADATA.researches.name,
    icon: SKILL_METADATA.researches.icon,
    isActive: rActive,
    percentage: rPct,
    summary: rActive ? `${rTopics} topic(s) researched across ${rSessions} session(s)` : 'No research sessions today',
    metricLabel: rActive ? `${rPct}% Exploration` : 'Inactive Today',
  });

  // 9. Pattern Recognition
  const ptAttempted = data.pattern.attempted;
  const ptSolved = data.pattern.solved;
  const ptActive = ptAttempted > 0;
  const ptPct = ptActive ? Math.min(100, Math.round((ptSolved / ptAttempted) * 100)) : 0;
  scores.push({
    key: 'pattern',
    name: SKILL_METADATA.pattern.name,
    icon: SKILL_METADATA.pattern.icon,
    isActive: ptActive,
    percentage: ptPct,
    summary: ptActive ? `${ptSolved}/${ptAttempted} pattern problems solved` : 'No pattern puzzles attempted today',
    metricLabel: ptActive ? `${ptPct}% Accuracy` : 'Inactive Today',
  });

  return scores;
}

export function generateDailyFeedback(dateKey: string = getTodayKey()): DailyFeedback {
  const record = getDailySkillRecord(dateKey);
  const scores = calculateSkillScores(record);

  const activeScores = scores.filter(s => s.isActive);
  const pros: string[] = [];
  const cons: string[] = [];

  if (activeScores.length === 0) {
    return {
      date: dateKey,
      pros: ['App ready for learning and skill analysis!'],
      cons: ['No activities performed today yet. Try a puzzle, math game, or task to start tracking.'],
      overallSummary: 'No activity recorded yet for today. Use the app features like Puzzle, Math, Quiz, Focus Timer, Planner, or Keen Researchers to measure your cognitive performance.',
      activeSkillsCount: 0,
    };
  }

  // Evaluate strengths (Pros)
  for (const s of activeScores) {
    if (s.percentage >= 80) {
      if (s.key === 'math') pros.push(`High Math precision (${s.percentage}% accuracy) in calculation monarch.`);
      else if (s.key === 'solving_puzzle') pros.push(`Strong puzzle solving skills (${s.percentage}% success rate).`);
      else if (s.key === 'logic') pros.push(`Exceptional logical reasoning accuracy (${s.percentage}%).`);
      else if (s.key === 'speed') pros.push(`Outstanding speed and fast reaction time on challenges.`);
      else if (s.key === 'quiz') pros.push(`Great quiz mastery and knowledge retention (${s.percentage}%).`);
      else if (s.key === 'focus') pros.push(`Solid focus discipline with ${record.focus.totalMinutes} minutes logged.`);
      else if (s.key === 'completion_of_task') pros.push(`Excellent task execution in Planner (${record.completion_of_task.tasksCompleted} completed).`);
      else if (s.key === 'researches') pros.push(`Deep research engagement across multiple topic studies.`);
      else if (s.key === 'pattern') pros.push(`Sharp visual pattern recognition (${s.percentage}% accuracy).`);
    } else if (s.percentage >= 60) {
      pros.push(`Consistent practice in ${s.name} (${s.summary}).`);
    }
  }

  // Evaluate growth areas (Cons / Areas to improve)
  for (const s of activeScores) {
    if (s.percentage < 60) {
      if (s.key === 'math') cons.push(`Math accuracy fell to ${s.percentage}%. Practice basic operations to reduce miscalculations.`);
      else if (s.key === 'speed') cons.push(`Response time was slower than average. Try quick mental arithmetic to build speed.`);
      else if (s.key === 'quiz') cons.push(`Quiz score was ${s.percentage}%. Review study materials in Keen Researchers.`);
      else if (s.key === 'completion_of_task') cons.push(`Several planner tasks remained incomplete.`);
      else if (s.key === 'logic') cons.push(`Logic puzzle accuracy was ${s.percentage}%. Take time on deduction steps.`);
      else if (s.key === 'pattern') cons.push(`Pattern recognition accuracy was ${s.percentage}%.`);
      else cons.push(`${s.name} score is currently ${s.percentage}%. Additional practice recommended.`);
    }
  }

  // Unused features feedback
  const inactiveScores = scores.filter(s => !s.isActive);
  if (inactiveScores.length > 0) {
    const inactiveNames = inactiveScores.map(s => s.name).slice(0, 3).join(', ');
    cons.push(`Unused features today: ${inactiveNames}. Engage with these tools to get a complete 360° brain skill report.`);
  }

  // Fallback if pros is empty
  if (pros.length === 0) {
    pros.push(`Active engagement started today across ${activeScores.length} skill area(s). Keep practicing to improve accuracy!`);
  }

  const avgActivePct = Math.round(
    activeScores.reduce((acc, curr) => acc + curr.percentage, 0) / activeScores.length
  );

  const overallSummary = `Observed performance across ${activeScores.length} active feature(s) today with an overall average skill score of ${avgActivePct}%. ${
    avgActivePct >= 75
      ? 'Outstanding cognitive performance today with high precision and strong discipline.'
      : avgActivePct >= 50
      ? 'Good steady progress today. Focus on speed and accuracy in lower-scoring categories.'
      : 'Room for improvement. Consistent daily practice in Math, Focus, and Puzzles will boost your scores.'
  }`;

  return {
    date: dateKey,
    pros,
    cons,
    overallSummary,
    activeSkillsCount: activeScores.length,
  };
}
