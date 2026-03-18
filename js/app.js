/* ============================================================
   PILOT IT — NOC Status Board — app.js
   ============================================================ */

'use strict';

/* ---------------------------------------------------------------
   Configuration constants
--------------------------------------------------------------- */
const DURATION_UPDATE_INTERVAL  = 60000; // ms — refresh alert durations
const ALERT_SIMULATION_INTERVAL = 30000; // ms — inject a random alert
const MAX_LIVE_ALERTS    = 8;  // max items shown in the live alerts panel
const MAX_SPARKLINE_POINTS = 24; // one data point per hour over 24 h

/* ---------------------------------------------------------------
   Helpers
--------------------------------------------------------------- */
function pad2(n) { return String(n).padStart(2, '0'); }

function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDate(date) {
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['janvier','février','mars','avril','mai','juin',
                  'juillet','août','septembre','octobre','novembre','décembre'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/* ---------------------------------------------------------------
   Real-time clock
--------------------------------------------------------------- */
function updateClock() {
  const now = new Date();
  const timeStr = formatTime(now);
  const dateStr = formatDate(now);

  const liveTime = document.getElementById('live-time');
  const datetime = document.getElementById('topbar-datetime');
  if (liveTime) liveTime.textContent = timeStr;
  if (datetime) datetime.textContent = dateStr;
}

/* ---------------------------------------------------------------
   Alert duration tracking
   Each row stores start timestamp derived from initial minutes.
--------------------------------------------------------------- */
const alertStartTimes = new Map(); // row element → Date

function initAlertTimes() {
  const rows = document.querySelectorAll('#alerts-tbody .alert-row');
  const now = Date.now();
  rows.forEach(row => {
    const minutes = parseInt(row.dataset.startMin, 10) || 0;
    alertStartTimes.set(row, new Date(now - minutes * 60 * 1000));
  });

  // Same for live panel items — use timestamps relative to now
  const liveItems = document.querySelectorAll('#live-alerts-list .alert-live-item');
  const offsets = [23, 35, 48]; // minutes ago
  const timeIds = ['alert-time-1','alert-time-2','alert-time-3'];
  offsets.forEach((offset, i) => {
    const t = new Date(now - offset * 60 * 1000);
    const el = document.getElementById(timeIds[i]);
    if (el) el.textContent = `${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
  });
}

function updateDurations() {
  const now = Date.now();
  document.querySelectorAll('#alerts-tbody .duration-cell').forEach(cell => {
    const row = cell.closest('.alert-row');
    const start = alertStartTimes.get(row);
    if (!start) return;
    const elapsed = Math.floor((now - start.getTime()) / 60000);
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;
    cell.textContent = hours > 0 ? `${hours}h ${pad2(mins)} min` : `${elapsed} min`;
    cell.classList.toggle('old', elapsed > 30);
  });
}

/* ---------------------------------------------------------------
   Sidebar toggle
--------------------------------------------------------------- */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  const btn = sidebar.querySelector('.sidebar-collapse-btn');
  if (btn) {
    const icon = btn.querySelector('span:first-child');
    if (icon) icon.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
  }
}

function toggleSubnav(item) {
  const sub = item.nextElementSibling;
  if (sub && sub.classList.contains('nav-sub')) {
    const isHidden = sub.style.display === 'none';
    sub.style.display = isHidden ? '' : 'none';
    const arrow = item.querySelector('span:last-child');
    if (arrow) arrow.textContent = isHidden ? '▴' : '▾';
  }
}

/* ---------------------------------------------------------------
   Right panel toggle (< 1440px)
--------------------------------------------------------------- */
function togglePanel() {
  const panel = document.getElementById('right-panel');
  panel.classList.toggle('panel-open');
}

/* ---------------------------------------------------------------
   Toggle "Masquer les OK"
--------------------------------------------------------------- */
function toggleHideOK(checkbox) {
  const grid = document.getElementById('services-grid');
  if (grid) grid.classList.toggle('hidden-ok', checkbox.checked);
}

/* ---------------------------------------------------------------
   Acknowledge all alerts
--------------------------------------------------------------- */
function acknowledgeAll() {
  const rows = document.querySelectorAll('#alerts-tbody .alert-row');
  rows.forEach(row => {
    row.style.opacity = '0.4';
    row.style.textDecoration = 'line-through';
  });
  const count = document.getElementById('alert-count');
  if (count) count.textContent = '— 0 alertes (acquittées)';
  updateBadge(0);
}

/* ---------------------------------------------------------------
   Badge counter
--------------------------------------------------------------- */
let activeAlertCount = 3;

function updateBadge(count) {
  activeAlertCount = count;
  ['bell-badge','bell-badge-main','sidebar-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

/* ---------------------------------------------------------------
   Simulate a random new alert every 30 seconds
--------------------------------------------------------------- */
const randomAlerts = [
  { name: 'Portail RH',        desc: '1 service dégradé', severity: 'warning' },
  { name: 'Nginx Proxy',       desc: 'Timeout 504 détecté', severity: 'critical' },
  { name: 'PostgreSQL',        desc: 'Latence anormale (>500ms)', severity: 'warning' },
  { name: 'VPN SSL',           desc: 'Certificat expirant (7j)', severity: 'warning' },
  { name: 'Backup Veeam',      desc: 'Tâche en échec', severity: 'critical' },
  { name: 'Hyperviseur VMware',desc: 'CPU > 90%', severity: 'warning' },
];

function addRandomAlert() {
  const alert = randomAlerts[Math.floor(Math.random() * randomAlerts.length)];
  const now = new Date();

  /* --- Table row --- */
  const tbody = document.getElementById('alerts-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.className = `alert-row ${alert.severity} flash`;
    tr.dataset.startMin = '0';
    tr.innerHTML = `
      <td><span class="severity-badge ${alert.severity}"><span class="dot"></span>${alert.severity.toUpperCase()}</span></td>
      <td>${alert.name}</td>
      <td class="duration-cell" data-minutes="0">0 min</td>
      <td><span class="detail-link">Détail ›</span></td>
    `;
    alertStartTimes.set(tr, now);
    tbody.insertBefore(tr, tbody.firstChild);

    activeAlertCount++;
    updateBadge(activeAlertCount);
    const countEl = document.getElementById('alert-count');
    if (countEl) countEl.textContent = `— ${activeAlertCount} alertes`;
  }

  /* --- Live panel item --- */
  const list = document.getElementById('live-alerts-list');
  if (list) {
    const emoji = alert.severity === 'critical' ? '🔴' : '🟠';
    const div = document.createElement('div');
    div.className = `alert-live-item ${alert.severity === 'critical' ? 'critical' : ''} flash`;
    div.innerHTML = `
      <div class="alert-time">${pad2(now.getHours())}:${pad2(now.getMinutes())}</div>
      <div class="alert-name">${emoji} ${alert.name}</div>
      <div class="alert-desc">${alert.desc}</div>
    `;
    list.insertBefore(div, list.firstChild);
    // Keep max MAX_LIVE_ALERTS items
    while (list.children.length > MAX_LIVE_ALERTS) list.removeChild(list.lastChild);
  }

  /* --- Sparkline update --- */
  sparklineData.push(activeAlertCount);
  if (sparklineData.length > MAX_SPARKLINE_POINTS) sparklineData.shift();
  drawSparkline();

  /* --- Resolution average update --- */
  updateResolutionAvg();
}

/* ---------------------------------------------------------------
   Sparkline (canvas)
--------------------------------------------------------------- */
// MAX_SPARKLINE_POINTS data points (one per hour)
let sparklineData = [1, 0, 2, 1, 3, 2, 1, 0, 1, 2, 4, 3, 2, 1, 2, 3, 3, 2, 1, 2, 2, 3, 3, 3];

function drawSparkline() {
  const canvas = document.getElementById('sparkline');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const data = sparklineData;
  const max = Math.max(...data, 1);
  const step = W / (data.length - 1);

  /* Gradient fill */
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(6,182,212,0.35)');
  grad.addColorStop(1, 'rgba(6,182,212,0)');

  ctx.beginPath();
  data.forEach((val, i) => {
    const x = i * step;
    const y = H - (val / max) * (H - 8) - 4;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  // Close fill path
  ctx.lineTo((data.length - 1) * step, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* Line */
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = i * step;
    const y = H - (val / max) * (H - 8) - 4;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  /* Dot on last point */
  const lastX = (data.length - 1) * step;
  const lastY = H - (data[data.length - 1] / max) * (H - 8) - 4;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#06B6D4';
  ctx.fill();
}

/* ---------------------------------------------------------------
   Resolution average (fictional)
--------------------------------------------------------------- */
const resolutionTimes = [8, 12, 15, 9, 20, 7, 14, 11];
let resolutionIdx = 0;

function updateResolutionAvg() {
  resolutionIdx = (resolutionIdx + 1) % resolutionTimes.length;
  const avg = resolutionTimes.slice(0, resolutionIdx + 1)
    .reduce((a, b) => a + b, 0) / (resolutionIdx + 1);
  const el = document.getElementById('resolution-avg');
  if (el) el.textContent = `⌀ ${Math.round(avg)} min`;
}

/* ---------------------------------------------------------------
   Progress bar animation on load
--------------------------------------------------------------- */
function animateProgressBars() {
  document.querySelectorAll('.progress-bar-fill[data-target]').forEach(bar => {
    const target = parseFloat(bar.dataset.target);
    requestAnimationFrame(() => {
      setTimeout(() => { bar.style.width = target + '%'; }, 100);
    });
  });
}

/* ---------------------------------------------------------------
   Initialisation
--------------------------------------------------------------- */
function init() {
  updateClock();
  setInterval(updateClock, 1000);

  initAlertTimes();
  updateDurations();
  setInterval(updateDurations, DURATION_UPDATE_INTERVAL); // refresh every minute

  animateProgressBars();
  drawSparkline();
  updateResolutionAvg();

  // Random alert simulation every 30 seconds
  setInterval(addRandomAlert, ALERT_SIMULATION_INTERVAL);
}

document.addEventListener('DOMContentLoaded', init);
