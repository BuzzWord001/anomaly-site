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
      const item = line.replace(/^- \*\*/, '').replace(/\*\*.*/, '').trim();
      if (item) team[currentDev].recentWork.push(item);
    }
  }

  return team;
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
      if (member.name === 'Elbics' && teamWork.elbics) {
        const tw = teamWork.elbics;
        // Берём статус + первые достижения для контекста
        let task = tw.currentTask || member.currentTask;
        if (tw.recentWork.length > 0 && task.length < 60) {
          task += ' | ' + tw.recentWork.slice(0, 2).join(', ');
        }
        member.currentTask = task;
      }
      if (member.name === 'Лир' && teamWork.lir) {
        const tw = teamWork.lir;
        let task = tw.currentTask || member.currentTask;
        // Если основная задача "без задач" в stalker-extraction,
        // но есть работа над сайтом/трекером — показываем это
        if (task.includes('БЕЗ ЗАДАЧ') || task.includes('без задач')) {
          if (tw.recentWork.length > 0) {
            task = tw.recentWork.slice(0, 2).join(', ');
          } else {
            task = 'Dev Tracker сайт, подготовка к новым задачам';
          }
        } else if (tw.recentWork.length > 0 && task.length < 60) {
          task += ' | ' + tw.recentWork.slice(0, 2).join(', ');
        }
        member.currentTask = task;
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

  // Update timestamp (Moscow time = UTC+3)
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const dateStr = msk.toISOString().slice(0, 10);
  const timeStr = msk.toISOString().slice(11, 16);
  data.lastUpdated = `${dateStr} ${timeStr} МСК`;
  data.lastSyncBy = 'auto-sync';

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  // Check if anything actually changed
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
