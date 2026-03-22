document.addEventListener('DOMContentLoaded', () => {
  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      renderLastUpdated(data.lastUpdated);
      renderProgress(data.phases);
      renderMilestoneTags(data.phases);
      renderTeam(data.team);
      renderFilters(data.phases);
      renderPhases(data.phases);
      setupFilters(data.phases);
      renderChangelog(data.changelog || []);
      renderFooterStats(data.phases);
      setupBackToTop();
    })
    .catch(err => {
      console.error('Failed to load data.json:', err);
    });
});

const milestoneConfig = {
  'v1.0':    { label: 'v1.0 FOUNDATION',     cssClass: 'v1' },
  'v2.0':    { label: 'v2.0 VERTICAL SLICE',  cssClass: 'v2' },
  'v2.1':    { label: 'v2.1 CONTENT',         cssClass: 'v21' },
  'Alpha':   { label: 'ALPHA',                cssClass: 'alpha' },
  'Beta':    { label: 'BETA',                 cssClass: 'beta' },
  'Release': { label: 'RELEASE',              cssClass: 'release' }
};

// --- Relative date ---
function relativeDate(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  if (diff < 7) return diff + ' дн. назад';
  if (diff < 30) return Math.floor(diff / 7) + ' нед. назад';
  return Math.floor(diff / 30) + ' мес. назад';
}

function renderLastUpdated(date) {
  document.getElementById('lastUpdated').textContent = date;
  document.getElementById('lastUpdatedRelative').textContent = '(' + relativeDate(date) + ')';
}

// --- Progress bar ---
function renderProgress(phases) {
  const totalPlans = phases.reduce((s, p) => s + p.plans, 0);
  const donePlans = phases.reduce((s, p) => s + p.plansDone, 0);
  const percent = totalPlans > 0 ? Math.round((donePlans / totalPlans) * 100) : 0;

  document.getElementById('progressPercent').textContent = percent + '%';

  setTimeout(() => {
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressBarGlow').style.width = percent + '%';
  }, 300);
}

// --- Milestone tags with mini progress ---
function renderMilestoneTags(phases) {
  const container = document.getElementById('milestoneTags');
  const milestones = [...new Set(phases.map(p => p.milestone))];

  container.innerHTML = milestones.map(m => {
    const config = milestoneConfig[m] || { label: m, cssClass: '' };
    const phasesInM = phases.filter(p => p.milestone === m);
    const allDone = phasesInM.every(p => p.status === 'done');
    const anyActive = phasesInM.some(p => p.status === 'in_progress');

    const totalP = phasesInM.reduce((s, p) => s + p.plans, 0);
    const doneP = phasesInM.reduce((s, p) => s + p.plansDone, 0);
    const pct = totalP > 0 ? Math.round((doneP / totalP) * 100) : 0;

    let stateClass = '';
    if (allDone) stateClass = 'done';
    else if (anyActive) stateClass = 'active';

    return `<span class="milestone-tag ${stateClass}">
      ${config.label}<span class="milestone-pct">${pct}%</span>
      <span class="milestone-progress" style="width: ${pct}%"></span>
    </span>`;
  }).join('');
}

// --- Team ---
function renderTeam(team) {
  const grid = document.getElementById('teamGrid');
  grid.innerHTML = team.map((member, i) => `
    <div class="team-card fade-in" style="animation-delay: ${i * 0.15}s">
      <div class="name">${member.name}</div>
      <div class="role">${member.role}</div>
      <div class="focus">${member.focus}</div>
      <div class="current-task-label">СЕЙЧАС РАБОТАЕТ НАД:</div>
      <div class="current-task">
        <span class="status-dot"></span>
        ${member.currentTask}
      </div>
    </div>
  `).join('');
}

// --- Filters ---
function renderFilters(phases) {
  const container = document.getElementById('milestoneFilters');
  const milestones = [...new Set(phases.map(p => p.milestone))];

  let html = '<button class="filter-btn active" data-filter="all">ВСЕ</button>';
  milestones.forEach(m => {
    const config = milestoneConfig[m] || { label: m };
    html += `<button class="filter-btn" data-filter="${m}">${config.label}</button>`;
  });
  container.innerHTML = html;
}

// --- Phases with expandable plans ---
function renderPhases(phases, filter) {
  filter = filter || 'all';
  const list = document.getElementById('phasesList');
  const filtered = filter === 'all'
    ? phases
    : phases.filter(p => p.milestone === filter);

  list.innerHTML = filtered.map((phase, i) => {
    const statusClass = phase.status;
    const statusIcon = getStatusIcon(phase.status);
    const config = milestoneConfig[phase.milestone] || { label: phase.milestone, cssClass: '' };
    const phaseNum = phase.id % 1 !== 0 ? phase.id.toFixed(1) : phase.id;
    const plansText = phase.plans > 0
      ? `${phase.plansDone}/${phase.plans}`
      : '\u2014';

    // Mini progress width
    const miniPct = phase.plans > 0 ? Math.round((phase.plansDone / phase.plans) * 100) : 0;

    // Plan items for expandable detail
    let plansHtml = '';
    if (phase.plans > 0) {
      const items = [];
      for (let p = 1; p <= phase.plans; p++) {
        const done = p <= phase.plansDone;
        items.push(`<div class="plan-item">
          <span class="plan-check ${done ? 'done' : 'pending'}">${done ? '\u2714' : ''}</span>
          <span>Plan ${phaseNum}-${String(p).padStart(2, '0')}</span>
        </div>`);
      }
      plansHtml = `<div class="phase-plans-detail">${items.join('')}</div>`;
    }

    return `
      <div class="phase-card ${statusClass} fade-in" style="animation-delay: ${i * 0.04}s" data-milestone="${phase.milestone}">
        <div class="phase-number">${phaseNum}</div>
        <div class="phase-info">
          <div class="phase-name">
            ${phase.name}
            <span class="phase-milestone-badge ${config.cssClass}">${phase.milestone}</span>
            ${phase.plans > 0 ? '<span class="phase-expand-hint">\u25BC</span>' : ''}
          </div>
          <div class="phase-desc">${phase.description}</div>
          <div class="phase-mini-progress"><div class="phase-mini-progress-fill" style="width: ${miniPct}%"></div></div>
        </div>
        <div class="phase-status">
          <span class="plans-count">${plansText}</span>
          <span class="status-icon ${statusClass}">${statusIcon}</span>
        </div>
        ${plansHtml}
      </div>
    `;
  }).join('');

  // Setup click-to-expand
  list.querySelectorAll('.phase-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
      const hint = card.querySelector('.phase-expand-hint');
      if (hint) hint.textContent = card.classList.contains('expanded') ? '\u25B2' : '\u25BC';
    });
  });
}

function getStatusIcon(status) {
  switch (status) {
    case 'done': return '\u2714';
    case 'in_progress': return '\u25C9';
    case 'blocked': return '\u25CB';
    case 'planned': return '\u25CB';
    default: return '\u25CB';
  }
}

function setupFilters(phases) {
  document.getElementById('milestoneFilters').addEventListener('click', (e) => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderPhases(phases, e.target.dataset.filter);
  });
}

// --- Changelog ---
function renderChangelog(changelog) {
  const container = document.getElementById('changelogList');
  if (!changelog.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Нет записей</p>';
    return;
  }

  container.innerHTML = changelog.map((entry, i) => `
    <div class="changelog-entry fade-in" style="animation-delay: ${i * 0.1}s">
      <div class="changelog-date">${entry.date} <span class="relative-date">${relativeDate(entry.date)}</span></div>
      <ul class="changelog-items">
        ${entry.entries.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

// --- Footer stats ---
function renderFooterStats(phases) {
  const container = document.getElementById('footerStats');
  const totalPhases = phases.length;
  const donePhases = phases.filter(p => p.status === 'done').length;
  const totalPlans = phases.reduce((s, p) => s + p.plans, 0);
  const donePlans = phases.reduce((s, p) => s + p.plansDone, 0);
  const inProgress = phases.filter(p => p.status === 'in_progress').length;

  container.innerHTML = `
    <div class="footer-stat">
      <span class="footer-stat-value">${totalPhases}</span>
      <span class="footer-stat-label">Фаз</span>
    </div>
    <div class="footer-stat">
      <span class="footer-stat-value">${donePhases}/${totalPhases}</span>
      <span class="footer-stat-label">Завершено</span>
    </div>
    <div class="footer-stat">
      <span class="footer-stat-value">${donePlans}/${totalPlans}</span>
      <span class="footer-stat-label">Планов</span>
    </div>
    <div class="footer-stat">
      <span class="footer-stat-value">${inProgress}</span>
      <span class="footer-stat-label">В работе</span>
    </div>
  `;
}

// --- Back to top ---
function setupBackToTop() {
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
