export const calculateLevelInfo = (xp: number) => {
  let level = 1;
  let requiredXp = 500;
  let totalXpNeeded = requiredXp;
  let previousTotal = 0;
  
  while (xp >= totalXpNeeded && level < 100) {
    level++;
    previousTotal = totalXpNeeded;
    requiredXp += 150;
    totalXpNeeded += requiredXp;
  }
  
  const xpInCurrentLevel = xp - previousTotal;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / requiredXp) * 100));
  
  return {
    level,
    progressPercent,
    xpInCurrentLevel,
    requiredXp
  };
};
