const LOGS_KEY = 'daily-tracker-logs';
const GOALS_KEY = 'daily-tracker-goals';
const LONG_TERM_GOALS_KEY = 'daily-tracker-long-term-goals';
const PROJECTS_KEY = 'daily-tracker-projects';
const BOARD_KEY = 'daily-tracker-board';
const DAILY_TASKS_KEY = 'daily-tracker-daily-tasks';
const RECURRING_TASKS_KEY = 'daily-tracker-recurring-tasks';
const BLOCKS_KEY = 'daily-tracker-blocks';

export function getDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getHourLog(date, hour) {
  const logs = loadLogs();
  return logs[date]?.[hour] || { planned: '', actual: '', energy: 0 };
}

export function setHourLog(date, hour, data) {
  const logs = loadLogs();
  if (!logs[date]) logs[date] = {};
  logs[date][hour] = data;
  saveLogs(logs);
  return logs;
}

export function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function loadLongTermGoals() {
  try {
    return JSON.parse(localStorage.getItem(LONG_TERM_GOALS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveLongTermGoals(goals) {
  localStorage.setItem(LONG_TERM_GOALS_KEY, JSON.stringify(goals));
}

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadBoard() {
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY)) || { items: [], pan: { x: 0, y: 0 }, zoom: 1 };
  } catch {
    return { items: [], pan: { x: 0, y: 0 }, zoom: 1 };
  }
}

export function saveBoard(board) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(board));
}

export function loadDailyTasks(date) {
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_TASKS_KEY)) || {};
    return all[date] || [];
  } catch {
    return [];
  }
}

export function saveDailyTasks(date, tasks) {
  try {
    const all = JSON.parse(localStorage.getItem(DAILY_TASKS_KEY)) || {};
    all[date] = tasks;
    localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(all));
  } catch {
    const obj = {};
    obj[date] = tasks;
    localStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(obj));
  }
}

export function loadRecurringTasks() {
  try {
    return JSON.parse(localStorage.getItem(RECURRING_TASKS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRecurringTasks(tasks) {
  localStorage.setItem(RECURRING_TASKS_KEY, JSON.stringify(tasks));
}

export function loadBlocks(date) {
  try {
    const all = JSON.parse(localStorage.getItem(BLOCKS_KEY)) || {};
    return all[date] || [];
  } catch {
    return [];
  }
}

export function saveBlocks(date, blocks) {
  try {
    const all = JSON.parse(localStorage.getItem(BLOCKS_KEY)) || {};
    all[date] = blocks;
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(all));
  } catch {
    const obj = {};
    obj[date] = blocks;
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(obj));
  }
}

export function loadAllBlocks() {
  try {
    return JSON.parse(localStorage.getItem(BLOCKS_KEY)) || {};
  } catch {
    return {};
  }
}

export function loadAllDailyTasks() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_TASKS_KEY)) || {};
  } catch {
    return {};
  }
}

export function getLast7DaysLogs() {
  const logs = loadLogs();
  const result = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDateStr(d);
    if (logs[key]) result[key] = logs[key];
  }
  return result;
}

export function getDayStats(date) {
  const logs = loadLogs();
  const day = logs[date];
  if (!day) return { logged: 0, avgEnergy: 0 };

  let logged = 0;
  let totalEnergy = 0;
  let energyCount = 0;

  for (let h = 0; h < 24; h++) {
    if (day[h] && (day[h].planned || day[h].actual)) {
      logged++;
      if (day[h].energy > 0) {
        totalEnergy += day[h].energy;
        energyCount++;
      }
    }
  }

  return {
    logged,
    avgEnergy: energyCount > 0 ? (totalEnergy / energyCount).toFixed(1) : 0
  };
}
