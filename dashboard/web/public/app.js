// Career-Copilot Dashboard — Client-Side Application

const API = '';
let currentSort = { field: 'num', dir: 'asc' };
let appData = [];
let pipelineData = { evaluated: [], pending: [] };
let statsData = {};

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupSortHeaders();
  setupAddUrlForm();
  setupCommands();
  loadAll();
  // Auto-refresh every 15 seconds
  setInterval(loadAll, 15000);
});

async function loadAll() {
  await Promise.all([loadApplications(), loadPipeline(), loadStats(), loadReports()]);
}

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadApplications() {
  try {
    const res = await fetch(`${API}/api/applications`);
    appData = await res.json();
    renderApplications();
  } catch (e) { console.error('Failed to load applications:', e); }
}

async function loadPipeline() {
  try {
    const res = await fetch(`${API}/api/pipeline`);
    pipelineData = await res.json();
    renderPipeline();
    document.getElementById('pipeCount').textContent = pipelineData.pending.length;
  } catch (e) { console.error('Failed to load pipeline:', e); }
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    statsData = await res.json();
    renderStats();
    renderHeaderStats();
  } catch (e) { console.error('Failed to load stats:', e); }
}

async function loadReports() {
  try {
    const res = await fetch(`${API}/api/reports`);
    const reports = await res.json();
    document.getElementById('reportCount').textContent = reports.length;
    renderReportsList(reports);
  } catch (e) { console.error('Failed to load reports:', e); }
}

// ─── Applications Rendering ──────────────────────────────────────────────────

function renderApplications() {
  const sorted = [...appData].sort((a, b) => {
    let va = a[currentSort.field], vb = b[currentSort.field];
    if (currentSort.field === 'score') { va = a.score; vb = b.score; }
    if (currentSort.field === 'num') { va = parseInt(a.num); vb = parseInt(b.num); }
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return currentSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentSort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  document.getElementById('appCount').textContent = appData.length;
  const tbody = document.getElementById('appTableBody');
  const empty = document.getElementById('appEmpty');

  if (sorted.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = sorted.map(app => `
    <tr>
      <td class="date-cell">${app.num}</td>
      <td class="date-cell">${app.date}</td>
      <td class="company-cell">${app.jobUrl
        ? `<a href="${escHtml(app.jobUrl)}" target="_blank" rel="noopener">${escHtml(app.company)}</a>`
        : escHtml(app.company)
      }</td>
      <td class="role-cell" title="${escHtml(app.role)}">${escHtml(app.role)}</td>
      <td><span class="score-badge ${scoreClass(app.score)}">${app.score.toFixed(1)}</span></td>
      <td>
        <div class="status-dropdown">
          <span class="status-badge status-${app.status.toLowerCase()}" onclick="toggleStatus(this, '${app.num}')">${escHtml(app.status)}</span>
          <div class="status-options" id="status-${app.num}">
            ${['Evaluated','Applied','Responded','Interview','Offer','Rejected','Discarded','SKIP']
              .map(s => `<div class="status-option" onclick="updateStatus('${app.num}','${s}')">${s}</div>`)
              .join('')}
          </div>
        </div>
      </td>
      <td>${app.hasPdf ? '📄' : '—'}</td>
      <td>${app.reportPath
        ? `<span class="report-link" onclick="viewReport('${escHtml(app.reportPath.split('/').pop())}')">#${app.reportNum}</span>`
        : '—'
      }</td>
      <td class="notes-cell" title="${escHtml(app.notes)}">${escHtml(app.notes)}</td>
    </tr>
  `).join('');
}

function scoreClass(score) {
  if (score >= 4.5) return 'score-strong';
  if (score >= 4.0) return 'score-good';
  if (score >= 3.5) return 'score-decent';
  return 'score-weak';
}

// ─── Status Update ───────────────────────────────────────────────────────────

function toggleStatus(el, num) {
  // Close all other dropdowns
  document.querySelectorAll('.status-options.open').forEach(d => d.classList.remove('open'));
  const dropdown = document.getElementById(`status-${num}`);
  dropdown.classList.toggle('open');
}

async function updateStatus(num, status) {
  document.querySelectorAll('.status-options.open').forEach(d => d.classList.remove('open'));
  try {
    const res = await fetch(`${API}/api/applications/${num}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Updated #${num} → ${status}`);
      await loadApplications();
    } else {
      showToast('Failed to update status', true);
    }
  } catch (e) {
    showToast('Error updating status', true);
  }
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.status-dropdown')) {
    document.querySelectorAll('.status-options.open').forEach(d => d.classList.remove('open'));
  }
});

// ─── Pipeline Rendering ─────────────────────────────────────────────────────

function renderPipeline() {
  const pendingEl = document.getElementById('pipelinePending');
  const evalEl = document.getElementById('pipelineEvaluated');
  document.getElementById('pendingCount').textContent = pipelineData.pending.length;
  document.getElementById('evalCount').textContent = pipelineData.evaluated.length;

  pendingEl.innerHTML = pipelineData.pending.length === 0
    ? '<div class="empty-state"><p>No pending evaluations</p></div>'
    : pipelineData.pending.map(p => `
      <div class="pipeline-item">
        <div>
          <span class="pipeline-company">${escHtml(p.company || 'Unknown')}</span>
          <span class="pipeline-role"> — ${escHtml(p.role || 'Unknown Role')}</span>
        </div>
        <span class="pipeline-location">${escHtml(p.location || '')}</span>
        <span class="tier-label">${p.tier.includes('1') ? 'Tier 1' : 'Tier 2'}</span>
        <span class="pipeline-url"><a href="${escHtml(p.url)}" target="_blank" rel="noopener">Open ↗</a></span>
      </div>
    `).join('');

  evalEl.innerHTML = pipelineData.evaluated.length === 0
    ? '<div class="empty-state"><p>No evaluated entries</p></div>'
    : pipelineData.evaluated.map(p => `
      <div class="pipeline-item">
        <div>
          <span class="pipeline-company">${escHtml(p.company)}</span>
          <span class="pipeline-role"> — ${escHtml(p.role)}</span>
        </div>
        <span class="score-badge ${scoreClass(p.score)}">${p.grade} (${p.score.toFixed(1)})</span>
        <span class="tier-label">${p.tier.includes('1') ? 'Tier 1' : 'Tier 2'}</span>
        <span class="notes-cell">${escHtml(p.notes)}</span>
      </div>
    `).join('');
}

// ─── Stats Rendering ────────────────────────────────────────────────────────

function renderStats() {
  const grid = document.getElementById('statsGrid');
  grid.innerHTML = `
    <div class="stat-card highlight">
      <div class="stat-number">${statsData.total || 0}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${statsData.avgScore || 0}</div>
      <div class="stat-label">Avg Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${statsData.topScore || 0}</div>
      <div class="stat-label">Top Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${statsData.pipelinePending || 0}</div>
      <div class="stat-label">Pipeline</div>
    </div>
  `;

  const dist = document.getElementById('distChart');
  const d = statsData.distribution || { strong: 0, good: 0, decent: 0, weak: 0 };
  const max = Math.max(d.strong, d.good, d.decent, d.weak, 1);
  dist.innerHTML = `
    <div class="dist-row">
      <span class="dist-label">≥ 4.5</span>
      <div class="dist-bar"><div class="dist-fill strong" style="width:${(d.strong/max)*100}%"></div></div>
      <span class="dist-count">${d.strong}</span>
    </div>
    <div class="dist-row">
      <span class="dist-label">4.0–4.4</span>
      <div class="dist-bar"><div class="dist-fill good" style="width:${(d.good/max)*100}%"></div></div>
      <span class="dist-count">${d.good}</span>
    </div>
    <div class="dist-row">
      <span class="dist-label">3.5–3.9</span>
      <div class="dist-bar"><div class="dist-fill decent" style="width:${(d.decent/max)*100}%"></div></div>
      <span class="dist-count">${d.decent}</span>
    </div>
    <div class="dist-row">
      <span class="dist-label">< 3.5</span>
      <div class="dist-bar"><div class="dist-fill weak" style="width:${(d.weak/max)*100}%"></div></div>
      <span class="dist-count">${d.weak}</span>
    </div>
  `;
}

function renderHeaderStats() {
  const el = document.getElementById('headerStats');
  const byStatus = statsData.byStatus || {};
  el.innerHTML = `
    <span>Total:<span class="stat-value">${statsData.total || 0}</span></span>
    <span>Avg:<span class="stat-value">${statsData.avgScore || 0}</span></span>
    <span>Pipeline:<span class="stat-value">${statsData.pipelinePending || 0}</span></span>
    ${byStatus.Interview ? `<span>Interviews:<span class="stat-value">${byStatus.Interview}</span></span>` : ''}
    ${byStatus.Offer ? `<span>Offers:<span class="stat-value">${byStatus.Offer}</span></span>` : ''}
  `;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

function renderReportsList(reports) {
  const el = document.getElementById('reportsList');
  if (reports.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No reports yet</p></div>';
    return;
  }
  el.innerHTML = reports.map(r => `
    <div class="pipeline-item" style="cursor:pointer" onclick="viewReport('${escHtml(r.filename)}')">
      <div>
        <span class="pipeline-company">#${r.num} — ${escHtml(r.slug)}</span>
      </div>
      <span class="date-cell">${r.date}</span>
      <span></span>
      <span class="report-link">View →</span>
    </div>
  `).join('');
}

async function viewReport(filename) {
  const listEl = document.getElementById('reportsList');
  const viewerEl = document.getElementById('reportViewer');
  try {
    const res = await fetch(`${API}/api/reports/${encodeURIComponent(filename)}`);
    const report = await res.json();
    listEl.style.display = 'none';
    viewerEl.style.display = '';
    viewerEl.innerHTML = `
      <div class="report-viewer">
        <div class="report-back" onclick="closeReport()">← Back to reports</div>
        ${report.html}
      </div>
    `;
  } catch (e) {
    showToast('Failed to load report', true);
  }
}

function closeReport() {
  document.getElementById('reportsList').style.display = '';
  document.getElementById('reportViewer').style.display = 'none';
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).style.display = '';
      // Reset report viewer when switching away
      if (tab.dataset.tab !== 'reports') closeReport();
    });
  });
}

// ─── Sort Headers ────────────────────────────────────────────────────────────

function setupSortHeaders() {
  document.querySelectorAll('.app-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { field, dir: 'asc' };
      }
      // Update sort indicators
      document.querySelectorAll('.app-table th').forEach(h => h.classList.remove('sorted'));
      th.classList.add('sorted');
      th.querySelector('.sort-arrow').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
      renderApplications();
    });
  });
}

// ─── Add URL Form ────────────────────────────────────────────────────────────

function setupAddUrlForm() {
  document.getElementById('addUrlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      url: form.url.value,
      company: form.company.value,
      role: form.role.value,
      location: form.location.value
    };
    try {
      const res = await fetch(`${API}/api/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showToast('Added to pipeline! Tell your AI agent: "process pipeline"');
        form.reset();
        await loadPipeline();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add', true);
      }
    } catch (e) {
      showToast('Error adding to pipeline', true);
    }
  });
}

// ─── Commands (copy to clipboard) ────────────────────────────────────────────

function setupCommands() {
  document.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', async () => {
      const cmd = item.dataset.cmd;
      try {
        await navigator.clipboard.writeText(cmd);
        showToast(`Copied: "${cmd}"`);
        item.querySelector('.command-copy').textContent = '✅ copied';
        setTimeout(() => { item.querySelector('.command-copy').textContent = '📋 copy'; }, 2000);
      } catch {
        showToast('Copy failed — select and copy manually', true);
      }
    });
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}
