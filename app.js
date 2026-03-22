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
    })
    .catch(err => {
      console.error('Failed to load data.json:', err);
    });
});

// Milestone display config
const milestoneConfig = {
  'v1.0':    { label: 'v1.0 FOUNDATION',     cssClass: 'v1' },
  'v2.0':    { label: 'v2.0 VERTICAL SLICE',  cssClass: 'v2' },
  'v2.1':    { label: 'v2.1 CONTENT',         cssClass: 'v21' },
  'Alpha':   { label: 'ALPHA',                cssClass: 'alpha' },
  'Beta':    { label: 'BETA',                 cssClass: 'beta' },
  'Release': { label: 'RELEASE',              cssClass: 'release' }
};

function renderLastUpdated(date) {
  document.getElementById('lastUpdated').textContent = date;
}

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

function renderMilestoneTags(phases) {
  const container = document.getElementById('milestoneTags');
  const milestones = [...new Set(phases.map(p => p.milestone))];

  container.innerHTML = milestones.map(m => {
    const config = milestoneConfig[m] || { label: m, cssClass: '' };
    const phasesInM = phases.filter(p => p.milestone === m);
    const allDone = phasesInM.every(p => p.status === 'done');
    const anyActive = phasesInM.some(p => p.status === 'in_progress');

    let stateClass = '';
    if (allDone) stateClass = 'done';
    else if (anyActive) stateClass = 'active';

    return `<span class="milestone-tag ${stateClass}">${config.label}</span>`;
  }).join('');
}

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

    return `
      <div class="phase-card ${statusClass} fade-in" style="animation-delay: ${i * 0.04}s" data-milestone="${phase.milestone}">
        <div class="phase-number">${phaseNum}</div>
        <div class="phase-info">
          <div class="phase-name">
            ${phase.name}
            <span class="phase-milestone-badge ${config.cssClass}">${phase.milestone}</span>
          </div>
          <div class="phase-desc">${phase.description}</div>
        </div>
        <div class="phase-status">
          <span class="plans-count">${plansText}</span>
          <span class="status-icon ${statusClass}">${statusIcon}</span>
        </div>
      </div>
    `;
  }).join('');
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
