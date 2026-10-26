/**
 * Channapatna Toys — Pure HTML/CSS/JS Frontend
 * Handles: SPA navigation, form validation, API calls, chart rendering
 */

'use strict';

// ─── API Config ────────────────────────────────────────────────────────────
// In production (Render), frontend is served by the same FastAPI server,
// so we use a relative URL. Locally, we fall back to localhost:8000.
const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
  ? 'http://127.0.0.1:8000'
  : '';

// ─── App State ─────────────────────────────────────────────────────────────
const state = {
  currentView: 'home',
  fairStep: 1,
  marketStep: 1,
  fairResult: null,
  marketResult: null,
  fairChart: null,       // Chart.js instance
  apiOnline: null,
};

// Fair form data
const fairData = {
  name: '', mat: '', len: null, wid: null, hgt: null, wt: null,
  hours: null, wage: 140, margin: 25, qty: 1
};

// Market form data
const marketData = {
  name: '', mrp: null, cat: '', mat: '',
  len: null, wid: null, hgt: null, wt: null,
  qty: 1, age: 12
};

// ─── Utility Helpers ───────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const fmt = (n, dec = 2) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function showToast(msg, type = 'info', dur = 4000) {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.28s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, dur);
}

function setHidden(el, hidden) {
  if (typeof el === 'string') el = $(el);
  if (!el) return;
  if (hidden) { el.hidden = true; el.classList.remove('active'); }
  else { el.hidden = false; }
}

function setLoading(btn, loading) {
  const textSpan = btn.querySelector('.btn-text');
  const spinner  = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (textSpan) textSpan.style.opacity = loading ? '0.4' : '1';
  if (spinner) { spinner.hidden = !loading; spinner.setAttribute('aria-hidden', String(!loading)); }
}

// ─── API Calls ─────────────────────────────────────────────────────────────
async function apiFetch(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function checkApiHealth() {
  try {
    const data = await apiFetch('/health');
    updateApiStatus(data.status === 'healthy');
  } catch {
    updateApiStatus(false);
  }
}

function updateApiStatus(online) {
  state.apiOnline = online;
  const tag  = document.querySelector('.ch-brand-tag');
  const dot  = $('api-status-dot');
  const text = $('api-status-text');
  if (online) {
    tag.classList.remove('disconnected');
    tag.classList.add('connected');
    text.textContent = 'Backend Online';
  } else {
    tag.classList.remove('connected');
    tag.classList.add('disconnected');
    text.textContent = 'Backend Offline';
  }
}

// ─── Navigation ────────────────────────────────────────────────────────────
const VIEWS = ['home', 'fair', 'market', 'about', 'insights'];

function showView(view) {
  if (!VIEWS.includes(view)) view = 'home';
  state.currentView = view;

  VIEWS.forEach(v => {
    const el = $(`view-${v}`);
    if (!el) return;
    el.hidden = (v !== view);
    el.classList.toggle('active', v === view);
  });

  // Update active nav link
  document.querySelectorAll('.ch-nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lazy load insights
  if (view === 'insights') loadInsights();

  // Close drawer if open
  closeDrawer();
}

// Back buttons
['fair', 'market', 'about', 'insights'].forEach(v => {
  const btn = $(`back-from-${v}`);
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); showView('home'); });
});

// Nav links & card anchors
document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showView(el.dataset.view);
  });
});

// Logo → home
$('logo-home-link').addEventListener('click', (e) => { e.preventDefault(); showView('home'); });

// ─── Hamburger / Drawer ────────────────────────────────────────────────────
function openDrawer() {
  $('ch-mobile-drawer').classList.add('open');
  $('ch-drawer-overlay').classList.add('open');
  $('hamburger-mobile').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  $('ch-mobile-drawer').classList.remove('open');
  $('ch-drawer-overlay').classList.remove('open');
  $('hamburger-mobile').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

$('hamburger-mobile').addEventListener('click', openDrawer);
$('hamburger-desktop').addEventListener('click', openDrawer);
$('ch-drawer-close').addEventListener('click', closeDrawer);
$('ch-drawer-overlay').addEventListener('click', closeDrawer);
document.querySelectorAll('.ch-drawer-link').forEach(a => {
  a.addEventListener('click', (e) => { e.preventDefault(); showView(a.dataset.view); });
});

// ─── Slider sync helpers ───────────────────────────────────────────────────
function syncSlider(sliderId, displayId, formatFn) {
  const slider = $(sliderId);
  const display = $(displayId);
  if (!slider || !display) return;

  function update() {
    display.textContent = formatFn(slider.value);
    // update gradient fill
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--val', `${pct}%`);
    slider.setAttribute('aria-valuenow', slider.value);
  }

  slider.addEventListener('input', update);
  update(); // initial
}

syncSlider('f-margin', 'f-margin-val', v => `${v}%`);
syncSlider('m-age', 'm-age-val', v => `${v} months`);

// ─── FAIR PRICE FORM ───────────────────────────────────────────────────────
function setFairStep(step) {
  state.fairStep = step;
  setHidden('fair-form-step1', step !== 1);
  setHidden('fair-form-step2', step !== 2);

  // Stepper UI
  $('fair-step-1-indicator').classList.toggle('active', step === 1);
  $('fair-step-1-indicator').classList.toggle('done',   step > 1);
  $('fair-step-2-indicator').classList.toggle('active', step === 2);
}

function showFairError(msg) {
  const banner = $('fair-error-banner');
  banner.textContent = `⚠️ ${msg}`;
  banner.hidden = false;
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideFairError() { $('fair-error-banner').hidden = true; }

// Step 1 → Next
$('fair-next-btn').addEventListener('click', () => {
  hideFairError();
  const missing = [];
  const f_mat = $('f-mat').value;
  const f_len = parseFloat($('f-len').value);
  const f_wid = parseFloat($('f-wid').value);
  const f_hgt = parseFloat($('f-hgt').value);
  const f_wt  = parseFloat($('f-wt').value);

  if (!f_mat)       missing.push('Primary Wood Species');
  if (!f_len || f_len <= 0) missing.push('Toy Length (cm)');
  if (!f_wid || f_wid <= 0) missing.push('Toy Width (cm)');
  if (!f_hgt || f_hgt <= 0) missing.push('Toy Height (cm)');
  if (!f_wt  || f_wt  <= 0) missing.push('Weight (grams)');

  if (missing.length) { showFairError(`Please fill in: ${missing.join(', ')}.`); return; }
  setFairStep(2);
  window.scrollTo({ top: $('fair-stepper').offsetTop - 90, behavior: 'smooth' });
});

// Step 2 → Back
$('fair-back-btn').addEventListener('click', () => { hideFairError(); setFairStep(1); });

// Step 2 → Submit
$('fair-submit-btn').addEventListener('click', async () => {
  hideFairError();
  const hours  = parseFloat($('f-hours').value);
  const wage   = parseFloat($('f-wage').value);
  const margin = parseFloat($('f-margin').value);

  const missing = [];
  if (!hours || hours <= 0) missing.push('Lathe & Carving Time');
  if (!wage  || wage  <= 0) missing.push('Artisan Wage Rate');
  if (missing.length) { showFairError(`Please fill in: ${missing.join(', ')}.`); return; }

  const rawMat = $('f-mat').value;
  const material = rawMat.split(' (')[0].trim().toLowerCase();

  const payload = {
    length_cm: parseFloat($('f-len').value),
    width_cm:  parseFloat($('f-wid').value),
    height_cm: parseFloat($('f-hgt').value),
    weight_g:  parseFloat($('f-wt').value),
    material,
    set_quantity: parseInt($('f-qty').value) || 1,
    crafting_hours: hours,
    hourly_wage: wage,
    artisan_margin_percent: margin
  };

  const btn = $('fair-submit-btn');
  setLoading(btn, true);

  try {
    const res = await apiFetch('/api/artisan-fair-price', 'POST', payload);
    state.fairResult = res.data;
    renderFairResult(res.data, $('f-name').value.trim(), rawMat, payload);
  } catch (err) {
    showFairError(`Calculation failed: ${err.message}`);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(btn, false);
  }
});

function renderFairResult(data, productName, displayMat, inputs) {
  const fairVal  = data.fair_artisan_price_inr;
  const baseCost = data.base_production_cost_inr;
  const params   = data.parameters;
  const breakdown = data.cost_breakdown;

  const below = (fairVal * 0.90).toFixed(2);
  const above = (fairVal * 1.15).toFixed(2);

  // Price card
  $('fair-price-figure').textContent = `₹${fmt(fairVal)}`;
  $('fair-meta-text').innerHTML =
    `Base Production Cost: <strong>₹${fmt(baseCost)}</strong> &bull; ` +
    `Living Wage: <strong>₹${params.hourly_wage_inr}/hr</strong> &bull; ` +
    `Artisan Margin: <strong>${params.artisan_margin_percent}%</strong>`;

  $('fair-range-grid').innerHTML = `
    <div class="range-box-item" style="border-left:5px solid #C07028;">
      <div class="range-box-label">Below Range (Floor)</div>
      <div class="range-box-val" style="color:#C07028;">₹${fmt(below)}</div>
      <div class="range-box-sub">Below this causes artisan wage loss</div>
    </div>
    <div class="range-box-item" style="border-left:5px solid #0B4B35;background:#F8FAF7;">
      <div class="range-box-label" style="color:#0B4B35;">Recommended Fair Price</div>
      <div class="range-box-val" style="color:#0B4B35;">₹${fmt(fairVal)}</div>
      <div class="range-box-sub">Balanced sustainable living price</div>
    </div>
    <div class="range-box-item" style="border-left:5px solid #073F2D;">
      <div class="range-box-label">Above Range (Premium)</div>
      <div class="range-box-val" style="color:#073F2D;">₹${fmt(above)}</div>
      <div class="range-box-sub">For master artisan collector grade toys</div>
    </div>
  `;

  setHidden('fair-result-card', false);

  // Cost sheet
  const woodRate = params.wood_cost_rate_inr_per_cm3;
  const woodBasis = woodRate != null
    ? `${fmt(params.volume_cm3, 2)} cm³ × ₹${Number(woodRate).toFixed(3)}/cm³ × ${(1 + (params.wood_wastage_allowance_percent || 25) / 100).toFixed(2)} allowance × ${params.set_quantity} pc(s)`
    : `${fmt(params.volume_cm3, 2)} cm³ volume × ${params.set_quantity} pc(s); calculated by engine`;

  const rows = [
    { comp: `🌲 ${displayMat} raw material`, calc: woodBasis, amt: breakdown.wood_raw_material_inr },
    { comp: '🎨 Natural lacquer & dyes',     calc: `${fmt(params.weight_g, 0)} g × ₹${Number(params.natural_lacquer_rate_inr_per_g || 0).toFixed(2)}/g × ${params.set_quantity} pc(s), min ₹25/pc`, amt: breakdown.natural_lacquer_and_dyes_inr },
    { comp: '⏱️ Artisan labor',               calc: `${fmt(params.crafting_hours, 2)} hrs × ₹${fmt(params.hourly_wage_inr, 2)}/hr`, amt: breakdown.artisan_labor_inr },
    { comp: '🛠️ Workshop overhead',           calc: `${params.workshop_overhead_percent || 15}% of wood, lacquer & labor`, amt: breakdown.workshop_overhead_tools_inr },
    { comp: '✨ Artisan margin',              calc: `${params.artisan_margin_percent}% of base cost (₹${fmt(baseCost)})`, amt: breakdown.fair_artisan_margin_inr },
  ];

  const tbody = $('fair-cost-tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.comp}</td>
      <td style="color:var(--light-muted);font-size:13px;">${r.calc}</td>
      <td style="font-weight:700;text-align:right;">₹${fmt(r.amt)}</td>
    </tr>
  `).join('');

  $('fair-chart-caption').textContent = `Cost breakdown for ${productName || 'your toy'} (₹)`;

  // Chart
  if (state.fairChart) state.fairChart.destroy();
  const ctx = $('fair-cost-chart').getContext('2d');
  state.fairChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.comp.replace(/^\S+\s/, '')),
      datasets: [{
        label: 'Amount (₹)',
        data: rows.map(r => r.amt),
        backgroundColor: ['#0B4B35CC', '#3A8A60CC', '#22c55eAA', '#C07028CC', '#073F2DCC'],
        borderRadius: 8,
        borderWidth: 0,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ₹${fmt(ctx.parsed.x)}` } } },
      scales: {
        x: { ticks: { callback: v => `₹${fmt(v, 0)}`, font: { size: 12 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { ticks: { font: { size: 12 } }, grid: { display: false } }
      }
    }
  });

  setHidden('fair-cost-sheet', false);

  // Scroll to result
  setTimeout(() => $('fair-result-anchor').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ─── MARKET PRICE FORM ─────────────────────────────────────────────────────
function setMarketStep(step) {
  state.marketStep = step;
  setHidden('market-form-step1', step !== 1);
  setHidden('market-form-step2', step !== 2);
  setHidden('market-form-step3', step !== 3);

  [1,2,3].forEach(s => {
    const ind = $(`market-step-${s}-indicator`);
    ind.classList.toggle('active', s === step);
    ind.classList.toggle('done',   s < step);
    ind.classList.remove('active');
    if (s === step) ind.classList.add('active');
    else if (s < step) ind.classList.add('done');
  });
}

function showMarketError(msg) {
  const banner = $('market-error-banner');
  banner.textContent = `⚠️ ${msg}`;
  banner.hidden = false;
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideMarketError() { $('market-error-banner').hidden = true; }

// Step 1 → Next
$('market-step1-next').addEventListener('click', () => {
  hideMarketError();
  const missing = [];
  if (!$('m-name').value.trim()) missing.push('Toy Name');
  const mrp = parseFloat($('m-mrp').value);
  if (!mrp || mrp <= 0) missing.push('Reference MRP');
  if (!$('m-cat').value) missing.push('Toy Category');
  if (!$('m-mat').value) missing.push('Primary Material');
  if (missing.length) { showMarketError(`Please fill in: ${missing.join(', ')}.`); return; }
  setMarketStep(2);
  window.scrollTo({ top: $('market-stepper').offsetTop - 90, behavior: 'smooth' });
});

// Step 2 → Back
$('market-step2-back').addEventListener('click', () => { hideMarketError(); setMarketStep(1); });

// Step 2 → Next
$('market-step2-next').addEventListener('click', () => {
  hideMarketError();
  const missing = [];
  const len = parseFloat($('m-len').value);
  const wid = parseFloat($('m-wid').value);
  const hgt = parseFloat($('m-hgt').value);
  const wt  = parseFloat($('m-wt').value);
  if (!len || len <= 0) missing.push('Length');
  if (!wid || wid <= 0) missing.push('Width');
  if (!hgt || hgt <= 0) missing.push('Height');
  if (!wt  || wt  <= 0) missing.push('Weight');
  if (missing.length) { showMarketError(`Please fill in: ${missing.join(', ')}.`); return; }
  setMarketStep(3);
  window.scrollTo({ top: $('market-stepper').offsetTop - 90, behavior: 'smooth' });
});

// Step 3 → Back
$('market-step3-back').addEventListener('click', () => { hideMarketError(); setMarketStep(2); });

// Step 3 → Submit
$('market-submit-btn').addEventListener('click', async () => {
  hideMarketError();

  const payload = {
    product_name: $('m-name').value.trim(),
    product_type: $('m-cat').value,
    material:     $('m-mat').value,
    mrp:          parseFloat($('m-mrp').value),
    length_cm:    parseFloat($('m-len').value),
    width_cm:     parseFloat($('m-wid').value),
    height_cm:    parseFloat($('m-hgt').value),
    weight_g:     parseFloat($('m-wt').value),
    set_quantity: parseInt($('m-qty').value) || 1,
    age_group_months: parseFloat($('m-age').value) || 12
  };

  const btn = $('market-submit-btn');
  setLoading(btn, true);

  try {
    const res = await apiFetch('/api/predict', 'POST', payload);
    state.marketResult = res.data;
    renderMarketResult(res.data);
  } catch (err) {
    showMarketError(`Prediction failed: ${err.message}`);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(btn, false);
  }
});

function renderMarketResult(data) {
  const predicted = data.predicted_price_inr;
  const rangeL = data.price_range_low  ?? (predicted * 0.90);
  const rangeH = data.price_range_high ?? (predicted * 1.15);

  $('market-price-figure').textContent = `₹${fmt(predicted)}`;

  $('market-range-grid').innerHTML = `
    <div class="range-box-item" style="border-left:5px solid #C07028;">
      <div class="range-box-label">Below Range</div>
      <div class="range-box-val" style="color:#C07028;">₹${fmt(rangeL)}</div>
      <div class="range-box-sub">Lower confidence floor</div>
    </div>
    <div class="range-box-item" style="border-left:5px solid #0B4B35;background:#F8FAF7;">
      <div class="range-box-label" style="color:#0B4B35;">Predicted Market Price</div>
      <div class="range-box-val" style="color:#0B4B35;">₹${fmt(predicted)}</div>
      <div class="range-box-sub">Expected sell value</div>
    </div>
    <div class="range-box-item" style="border-left:5px solid #073F2D;">
      <div class="range-box-label">Above Range</div>
      <div class="range-box-val" style="color:#073F2D;">₹${fmt(rangeH)}</div>
      <div class="range-box-sub">Premium market band</div>
    </div>
  `;

  setHidden('market-result-card', false);
  setTimeout(() => $('market-result-anchor').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// Market → "Make Another Prediction"
$('market-make-another').addEventListener('click', () => {
  state.marketResult = null;
  setHidden('market-result-card', true);
  hideMarketError();
  // Reset form fields
  ['m-name','m-mrp','m-len','m-wid','m-hgt','m-wt'].forEach(id => { $(id).value = ''; });
  $('m-cat').value = '';
  $('m-mat').value = '';
  $('m-qty').value = 1;
  $('m-age').value = 12;
  syncSlider('m-age', 'm-age-val', v => `${v} months`);
  setMarketStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── INSIGHTS ──────────────────────────────────────────────────────────────
let insightsLoaded = false;

async function loadInsights() {
  if (insightsLoaded) return;
  try {
    const data = await apiFetch('/api/metrics');
    const m = data.production_model || {};
    const b = data.baseline_comparison || {};

    $('insights-r2').textContent = Number(m.r2_score || 0.9225).toFixed(4);
    $('insights-mae').textContent = `₹${fmt(m.mae_inr || 194.43)}`;
    $('insights-mape').textContent = `${Number(m.mape_percent || 15.30).toFixed(2)}%`;
    $('insights-features').textContent = m.features_count || 100;

    $('insights-mae-red').textContent = `${b.mae_reduction_percent || 56.3}%`;
    $('insights-rmse-red').textContent = `${b.rmse_reduction_percent || 44.5}%`;
    $('insights-base-r2').textContent = Number(b.baseline_r2 || 0.8467).toFixed(4);

    insightsLoaded = true;
  } catch {
    // Use fallback values
    $('insights-r2').textContent      = '0.9225';
    $('insights-mae').textContent     = '₹194.43';
    $('insights-mape').textContent    = '15.30%';
    $('insights-features').textContent = '100';
    $('insights-mae-red').textContent  = '56.3%';
    $('insights-rmse-red').textContent = '44.5%';
    $('insights-base-r2').textContent  = '0.8467';
    insightsLoaded = true;
  }
}

// ─── URL HASH ROUTING ──────────────────────────────────────────────────────
function handleHash() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (VIEWS.includes(hash)) showView(hash);
}

window.addEventListener('hashchange', handleHash);

// ─── KEYBOARD ACCESSIBILITY ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

// Enter key on tooltip help circles
document.querySelectorAll('.ch-help-circle').forEach(btn => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const tooltip = btn.nextElementSibling;
      tooltip.classList.toggle('is-open');
    }
  });
});

// ─── INIT ────────────────────────────────────────────────────────────────
(function init() {
  handleHash();
  checkApiHealth();
  // Poll health every 30s
  setInterval(checkApiHealth, 30000);

  // If no hash, show home
  if (!window.location.hash) showView('home');

  // Initial step states
  setFairStep(1);
  setMarketStep(1);

  // Sync sliders initial values
  syncSlider('f-margin', 'f-margin-val', v => `${v}%`);
  syncSlider('m-age', 'm-age-val', v => `${v} months`);

  console.log('%cChannapatna Toys AI Frontend loaded ✓', 'color:#0B4B35;font-weight:700;font-size:14px;');
})();
