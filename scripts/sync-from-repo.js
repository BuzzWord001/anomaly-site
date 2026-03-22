#!/usr/bin/env node
/**
 * Auto-sync data.json from stalker-extraction TASKBOARD.md + team_active_work.md
 * Runs via GitHub Actions every 30 minutes
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const TASKBOARD_PATH = process.env.TASKBOARD_PATH || '';
const TEAM_WORK_PATH = process.env.TEAM_WORK_PATH || '';
const TEAM_WORK_LIR_PATH = process.env.TEAM_WORK_LIR_PATH || '';
const ANOMALY_COMMITS_PATH = process.env.ANOMALY_COMMITS_PATH || '';

// --- Parse TASKBOARD.md ---
function parseTaskboard(content) {
  const phases = [];
  let currentPhase = null;

  const lines = content.split('\n');

  for (const line of lines) {
    // Match phase headers: ## Phase 17: Production Cleanup
    const phaseMatch = line.match(/^## Phase ([\d.]+):\s*(.+)/);
    if (phaseMatch) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = {
        id: parseFloat(phaseMatch[1]),
        name: phaseMatch[2].trim(),
        plans: 0,
        plansDone: 0,
        status: 'planned'
      };
      continue;
    }

    // Match plan rows: | 17-01 | description | owner | ✓ done | date | date |
    if (currentPhase && line.match(/^\|.*\d+-\d+/)) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 4) {
        currentPhase.plans++;
        const statusCol = cols[3].toLowerCase();
        if (statusCol.includes('done') || statusCol.includes('✓')) {
          currentPhase.plansDone++;
        }
      }
    }

    // Match status from header lines: **Status:** IN PROGRESS
    if (currentPhase) {
      const statusMatch = line.match(/\*\*Status:\*\*\s*(.+)/i);
      if (statusMatch) {
        const s = statusMatch[1].toLowerCase();
        if (s.includes('complete') || s.includes('done')) currentPhase.status = 'done';
        else if (s.includes('progress')) currentPhase.status = 'in_progress';
        else if (s.includes('blocked')) currentPhase.status = 'blocked';
        else if (s.includes('ready')) currentPhase.status = 'planned';
      }
    }
  }
  if (currentPhase) phases.push(currentPhase);

  // Determine status from plan completion
  for (const p of phases) {
    if (p.plans > 0 && p.plansDone === p.plans) {
      p.status = 'done';
    } else if (p.plansDone > 0 && p.plansDone < p.plans) {
      p.status = 'in_progress';
    }
  }

  return phases;
}

// --- Parse team_active_work.md ---
function parseTeamWork(content) {
  const team = {};
  let currentDev = null;

  const lines = content.split('\n');
  for (const line of lines) {
    // Match dev headers
    if (line.match(/^## elbics/i)) {
      currentDev = 'elbics';
      team[currentDev] = { currentTask: '', recentWork: [] };
    } else if (line.match(/^## (Лир|BuzzWord)/i)) {
      currentDev = 'lir';
      team[currentDev] = { currentTask: '', recentWork: [] };
    } else if (line.match(/^## Developer 3/i)) {
      currentDev = 'dev3';
      team[currentDev] = { currentTask: '', recentWork: [] };
    } else if (line.match(/^## /) && currentDev) {
      // Another section (e.g. "## Server State") — stop parsing current dev
      currentDev = null;
    }

    if (!currentDev) continue;

    // Match current status line
    if (line.match(/^### Текущий статус:/)) {
      team[currentDev].currentTask = line.replace(/^### Текущий статус:\s*/, '').trim();
    }

    // Collect recent work items (bullet points with key achievements)
    if (line.match(/^- \*\*.*\*\*/)) {
      // "- **FULL AUDIT** фаз 1-17 (268 файлов)" → "Полный аудит фаз 1-17"
      let item = line.replace(/^- /, '').replace(/\*\*/g, '').trim();
      // Убираем скобки с техническими деталями
      item = item.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
      // Убираем перечисления после двоеточия если слишком длинные
      if (item.includes(':') && item.length > 55) {
        item = item.split(':')[0].trim();
      }
      if (item.length > 55) item = item.slice(0, 52) + '...';
      if (item) team[currentDev].recentWork.push(item);
    }
  }

  return team;
}

// --- Извлечь конкретную задачу из последнего коммита ---
function extractTaskFromCommit(commitMsg) {
  // Убираем префикс feat:/fix:/chore: и Co-Authored строки
  let msg = commitMsg.replace(/^(feat|fix|chore|docs|sync|merge):\s*/i, '').trim();
  // Берём только первую строку
  msg = msg.split('\n')[0].trim();
  // Ограничиваем длину
  if (msg.length > 80) msg = msg.slice(0, 77) + '...';
  return msg;
}

// --- Определить конкретную задачу Elbics из team_active_work ---
function getElbicsTask(teamWorkContent) {
  const parsed = parseTeamWork(teamWorkContent);
  if (!parsed.elbics) return null;

  const tw = parsed.elbics;
  // Берём последнее конкретное достижение, не общий статус
  if (tw.recentWork.length > 0) {
    // Первый пункт recentWork — самое свежее
    return tw.recentWork[0];
  }
  return tw.currentTask || null;
}

// --- Определить конкретную задачу Лира из нескольких источников ---
function getLirTask(teamWorkMaster, teamWorkLir, anomalyCommits) {
  // 1. Ветка Лира — последняя конкретная работа
  if (teamWorkLir) {
    const parsed = parseTeamWork(teamWorkLir);
    if (parsed.lir && parsed.lir.recentWork.length > 0) {
      return parsed.lir.recentWork[0]; // самый свежий пункт
    }
    if (parsed.lir && parsed.lir.currentTask && !parsed.lir.currentTask.includes('БЕЗ ЗАДАЧ')) {
      return parsed.lir.currentTask;
    }
  }

  // 2. Последний коммит в anomaly-site (не auto-sync)
  if (anomalyCommits) {
    const commits = anomalyCommits.split('\n').filter(l =>
      l.trim() && !l.includes('auto-sync') && !l.includes('merge')
    );
    if (commits.length > 0) {
      return extractTaskFromCommit(commits[0]);
    }
  }

  // 3. Master ветка
  if (teamWorkMaster) {
    const parsed = parseTeamWork(teamWorkMaster);
    if (parsed.lir && parsed.lir.recentWork.length > 0) {
      return parsed.lir.recentWork[0];
    }
  }

  return 'Подготовка к новым задачам';
}

// --- Update data.json ---
function updateData(taskboardContent, teamWorkContent) {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const tbPhases = parseTaskboard(taskboardContent);
  const teamWork = parseTeamWork(teamWorkContent);

  // Update phase statuses from TASKBOARD
  for (const tbPhase of tbPhases) {
    const existing = data.phases.find(p => p.id === tbPhase.id);
    if (existing) {
      existing.plans = tbPhase.plans;
      existing.plansDone = tbPhase.plansDone;
      existing.status = tbPhase.status;
    }
  }

  // Update team current tasks — всё связанное с проектом игры
  // (включая сайт, трекер, UI, карты, бэкенд и т.д.)
  if (data.team) {
    for (const member of data.team) {
      if (member.name === 'Elbics') {
        const task = getElbicsTask(teamWorkContent);
        if (task) member.currentTask = task;
      }
      if (member.name === 'Лир') {
        // Собираем задачу из всех источников
        let lirBranchContent = '';
        let anomalyCommitsContent = '';
        try { if (TEAM_WORK_LIR_PATH) lirBranchContent = fs.readFileSync(TEAM_WORK_LIR_PATH, 'utf8'); } catch(e) {}
        try { if (ANOMALY_COMMITS_PATH) anomalyCommitsContent = fs.readFileSync(ANOMALY_COMMITS_PATH, 'utf8'); } catch(e) {}
        member.currentTask = getLirTask(teamWorkContent, lirBranchContent, anomalyCommitsContent);
      }
    }
    // Add Developer 3 if present and has actual tasks
    if (teamWork.dev3 && teamWork.dev3.currentTask && !teamWork.dev3.currentTask.includes('Ожидаем')) {
      const dev3Exists = data.team.find(m => m.name === 'Developer 3');
      if (!dev3Exists) {
        data.team.push({
          name: 'Developer 3',
          role: 'TBD',
          focus: 'Задачи назначит elbics',
          currentTask: teamWork.dev3.currentTask,
          avatar: null
        });
      } else {
        dev3Exists.currentTask = teamWork.dev3.currentTask;
      }
    }
  }

  // --- Auto-update changelog ---
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayStr = msk.toISOString().slice(0, 10);
  const timeStr = msk.toISOString().slice(11, 16);

  // Read OLD data before we wrote changes
  const oldData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const newEntries = [];

  // 1. Detect phase changes
  for (const tbPhase of tbPhases) {
    const oldPhase = oldData.phases.find(p => p.id === tbPhase.id);
    if (!oldPhase) continue;
    if (tbPhase.status === 'done' && oldPhase.status !== 'done') {
      newEntries.push(`Phase ${tbPhase.id} COMPLETE — ${tbPhase.name} (${tbPhase.plansDone}/${tbPhase.plans} планов)`);
    } else if (tbPhase.status === 'in_progress' && oldPhase.status !== 'in_progress') {
      newEntries.push(`Phase ${tbPhase.id} начата — ${tbPhase.name}`);
    } else if (tbPhase.plansDone > oldPhase.plansDone && tbPhase.status === 'in_progress') {
      newEntries.push(`Phase ${tbPhase.id} — ${tbPhase.name} (${tbPhase.plansDone}/${tbPhase.plans} планов)`);
    }
  }

  // 2. Detect dev task changes — add to changelog when task changed
  if (oldData.team && data.team) {
    for (const member of data.team) {
      const oldMember = oldData.team.find(m => m.name === member.name);
      if (oldMember && member.currentTask !== oldMember.currentTask && member.currentTask) {
        newEntries.push(`${member.name}: ${member.currentTask}`);
      }
    }
  }

  // 3. Detect anomaly-site work from commits (for Лир)
  let anomalyCommitsContent = '';
  try { if (ANOMALY_COMMITS_PATH) anomalyCommitsContent = fs.readFileSync(ANOMALY_COMMITS_PATH, 'utf8'); } catch(e) {}
  if (anomalyCommitsContent) {
    const commits = anomalyCommitsContent.split('\n').filter(l =>
      l.trim() && !l.includes('auto-sync') && !l.includes('merge') && !l.includes('Co-Authored')
    );
    // Check last changelog to avoid duplicates
    const existingEntries = new Set();
    if (data.changelog && data.changelog[0]) {
      data.changelog[0].entries.forEach(e => existingEntries.add(e));
    }
    // Add significant commits as changelog entries
    for (const c of commits.slice(0, 5)) {
      let msg = c.replace(/^(feat|fix|chore|docs|sync):\s*/i, '').trim();
      if (msg.length > 70) msg = msg.slice(0, 67) + '...';
      const entry = msg + ' (Лир)';
      if (!existingEntries.has(entry) && !newEntries.includes(entry)) {
        newEntries.push(entry);
      }
    }
  }

  // Add to changelog
  if (!data.changelog) data.changelog = [];
  if (newEntries.length > 0) {
    const todayLog = data.changelog.find(c => c.date === todayStr);
    if (todayLog) {
      for (const entry of newEntries) {
        if (!todayLog.entries.includes(entry)) {
          todayLog.entries.push(entry);
        }
      }
    } else {
      data.changelog.unshift({ date: todayStr, entries: newEntries });
    }
  }
  // Ensure today exists in changelog even without new entries
  if (!data.changelog.find(c => c.date === todayStr) && todayStr !== (oldData.changelog[0] || {}).date) {
    // Don't create empty days
  }

  data.lastUpdated = `${todayStr} ${timeStr} МСК`;
  data.lastSyncBy = 'auto-sync';

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return true;
}

// --- Main ---
try {
  if (!TASKBOARD_PATH || !TEAM_WORK_PATH) {
    console.error('Missing TASKBOARD_PATH or TEAM_WORK_PATH env vars');
    process.exit(1);
  }

  const taskboard = fs.readFileSync(TASKBOARD_PATH, 'utf8');
  const teamWork = fs.readFileSync(TEAM_WORK_PATH, 'utf8');

  updateData(taskboard, teamWork);
  console.log('data.json updated successfully');
} catch (err) {
  console.error('Sync failed:', err.message);
  process.exit(1);
}
