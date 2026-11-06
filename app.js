(() => {
'use strict';

/* =========================================================
   Helpers
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtShort = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
const fmtDay = s => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const inr = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
const fmtMobile = m => m && m.length === 10 ? m.slice(0, 5) + ' ' + m.slice(5) : (m || '');
const newId = () => 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function ago(t) {
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d + ' days ago';
}

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8.5 15l2.5 2.5 4.5-5"/></svg>',
  leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.7.8 2.8 2.5 3 5.2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2"/></svg>',
  pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
};

/* =========================================================
   Calculator (the disguise)
   ========================================================= */
// Per-staff unlock codes, stored only as SHA-256 hashes.
// Demo codes: Owner 9-4 · Amit 7+2 · Priya 8×3
const CODES = {
  'dfcbc3748fa8e4ba4e49afe648e755ff785fc4cf0978e6fd0231f47c9e0f67ac': { name: 'Owner', role: 'owner' },
  '9c5461a26e3f2e08e84aee1fa638c63d693700133b5ac5acc9ce5d56492313cb': { name: 'Amit', role: 'staff' },
  'fd43652bd65e78ac195e439617746178534e9ef1079600582dfeb13d4a6e3b2e': { name: 'Priya', role: 'staff' },
};
const OPS = '+-*/';
let expr = '', justEval = false;
const cExpr = $('#cExpr'), cOut = $('#cOut');
const showSym = s => s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/(^|[^e])-/g, '$1−');
const lastNum = () => (expr.match(/(\d*\.?\d*)$/) || ['', ''])[1];
const fmtNum = v => { const r = parseFloat(v.toPrecision(12)); return Math.abs(r) >= 1e15 ? r.toExponential(6) : String(r); };

function fitCalc() {
  const n = cOut.textContent.length;
  cOut.style.fontSize = n <= 8 ? '64px' : n <= 11 ? '50px' : n <= 15 ? '38px' : '28px';
}
function paintCalc() { cOut.textContent = expr ? showSym(expr) : '0'; fitCalc(); }

function evaluate(s) {
  const toks = s.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[+\-*/]/g);
  if (!toks) return null;
  const out = [], ops = [], prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const apply = op => { const b = out.pop(), a = out.pop(); if (a === undefined || b === undefined) throw 0; out.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b); };
  let expectNum = true, neg = false;
  try {
    for (const t of toks) {
      if (OPS.includes(t)) {
        if (expectNum) { if (t === '-') { neg = !neg; continue; } return null; }
        while (ops.length && prec[ops.at(-1)] >= prec[t]) apply(ops.pop());
        ops.push(t); expectNum = true;
      } else { out.push(neg ? -parseFloat(t) : parseFloat(t)); neg = false; expectNum = false; }
    }
    if (expectNum && ops.length) ops.pop();
    while (ops.length) apply(ops.pop());
  } catch { return null; }
  return out.length === 1 ? out[0] : null;
}

async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function press(k) {
  if (/\d/.test(k)) {
    if (justEval) { expr = ''; justEval = false; cExpr.textContent = ''; }
    if (lastNum() === '0') expr = expr.slice(0, -1);
    expr += k;
  } else if (k === '.') {
    if (justEval) { expr = ''; justEval = false; cExpr.textContent = ''; }
    const n = lastNum(); if (!n.includes('.')) expr += n === '' ? '0.' : '.';
  } else if (OPS.includes(k)) {
    if (justEval) { justEval = false; cExpr.textContent = ''; }
    if (expr === '') { if (k === '-') expr = '-'; }
    else if (OPS.includes(expr.at(-1))) expr = expr.length === 1 ? (k === '-' ? '-' : '') : expr.slice(0, -1) + k;
    else expr += k;
  } else if (k === 'AC') { expr = ''; justEval = false; cExpr.textContent = ''; }
  else if (k === 'DEL') { if (justEval) { expr = ''; justEval = false; cExpr.textContent = ''; } else expr = expr.slice(0, -1); }
  else if (k === '%') { const n = lastNum(); if (n && n !== '.') expr = expr.slice(0, expr.length - n.length) + fmtNum(parseFloat(n) / 100); }
  else if (k === '=') {
    if (!expr || justEval) return;
    let u = null;
    try { u = CODES[await sha(expr)]; } catch { /* no secure context */ }
    if (u) { expr = ''; justEval = false; cExpr.textContent = ''; paintCalc(); unlock(u); return; }
    const r = evaluate(expr);
    cExpr.textContent = showSym(expr) + ' =';
    if (r === null || !isFinite(r)) { expr = ''; justEval = true; cOut.textContent = 'Error'; fitCalc(); return; }
    expr = fmtNum(r); justEval = true; paintCalc(); return;
  }
  paintCalc();
}

$('#keys').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
document.addEventListener('keydown', e => {
  if (!$('#calc').hidden) {
    const map = { Enter: '=', '=': '=', Backspace: 'DEL', Escape: 'AC', x: '*', X: '*' };
    const k = map[e.key] || e.key;
    if (/^[\d.%+\-*/=]$/.test(k) || k === 'DEL' || k === 'AC') { e.preventDefault(); press(k); }
  }
});

/* =========================================================
   Data (demo: browser storage; production: shared database)
   ========================================================= */
const KEY = 'evx_crm_v1';
const STAGES = ['New', 'Contacted', 'Visit Scheduled', 'Visited', 'Quotation Sent', 'Tentative', 'Booked', 'Event Done', 'Lost'];
const STAGE_CLS = { New: 'b-new', Contacted: 'b-info', 'Visit Scheduled': 'b-info', Visited: 'b-info', 'Quotation Sent': 'b-info', Tentative: 'b-warn', Booked: 'b-ok', 'Event Done': 'b-ok', Lost: 'b-bad' };
const SOURCES = ['Meta', 'Walk-in', 'Call', 'Reference'];
const FUNCTIONS = ['Wedding', 'Reception', 'Engagement', 'Ring Ceremony', 'Sagan', 'Birthday', 'Anniversary', 'Corporate', 'Kitty Party', 'Other'];
const LOST = ['Price too high', 'Date not available', 'Went with another venue', 'No response', 'Plans changed', 'Other'];
const STAFF = ['Owner', 'Amit', 'Priya'];
const CAMPAIGNS = ['Wedding Season – Nov', 'Engagement Offer', 'Party Hall – Weekday'];
const HOLDING = ['Tentative', 'Booked', 'Event Done'];

let mem = null;
function readStore() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return mem; } }
function writeStore(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ } }
let db;
function load() { const d = readStore(); db = d && Array.isArray(d.leads) ? d : seed(); if (!d) writeStore(db); }
function save() { db.rev = (db.rev || 0) + 1; writeStore(db); }

function blank() {
  return { id: null, name: '', mobile: '', source: 'Walk-in', campaign: '', refBy: '', fn: 'Wedding', date: '', meals: { lunch: false, dinner: true }, guests: '', hall: null, stage: 'New', visitDate: '', followUp: '', holdUntil: '', lostReason: '', assigned: 'Owner', preparedBy: 'Owner', packageValue: 0, payments: [], notes: [], createdAt: null };
}

function seed() {
  const T = todayISO(), d = n => addDays(T, n), at = (n, h = 11) => `${d(n)}T${pad(h)}:20:00`;
  const L = [];
  const mk = o => { const l = Object.assign(blank(), o); l.id = 'S' + (L.length + 1); l.preparedBy = l.assigned; L.push(l); };
  const M = (lunch, dinner) => ({ lunch, dinner });
  mk({ name: 'Rohit & Simran Malhotra', mobile: '9810012345', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Wedding', date: d(3), meals: M(0, 1), guests: 650, hall: 'BOTH', stage: 'Booked', packageValue: 1450000, payments: [{ amt: 500000, date: d(-40), mode: 'Bank' }, { amt: 400000, date: d(-10), mode: 'UPI' }], assigned: 'Amit', createdAt: at(-48) });
  mk({ name: 'Ankit Bansal', mobile: '9873301122', source: 'Walk-in', fn: 'Engagement', date: d(5), meals: M(1, 0), guests: 250, hall: 'H1', stage: 'Booked', packageValue: 425000, payments: [{ amt: 150000, date: d(-15), mode: 'Cash' }], assigned: 'Priya', createdAt: at(-25) });
  mk({ name: 'Neha Kapoor', mobile: '9911223344', source: 'Meta', campaign: CAMPAIGNS[2], fn: 'Birthday', date: d(5), meals: M(0, 1), guests: 120, hall: 'H2', stage: 'Tentative', holdUntil: d(2), packageValue: 210000, assigned: 'Amit', createdAt: at(-3), notes: [{ t: at(-1, 16), by: 'Amit', text: '50th birthday for her father. Holding Hall 2; advance promised by Saturday.' }] });
  mk({ name: 'Vikas Sharma', mobile: '9958877665', source: 'Reference', refBy: 'Mr. Gupta (past client)', fn: 'Wedding', date: d(9), meals: M(1, 1), guests: 800, hall: 'BOTH', stage: 'Booked', packageValue: 1800000, payments: [{ amt: 600000, date: d(-30), mode: 'Bank' }], assigned: 'Owner', createdAt: at(-60) });
  mk({ name: 'Pooja Arora', mobile: '9899012211', source: 'Meta', campaign: CAMPAIGNS[1], fn: 'Ring Ceremony', date: d(12), meals: M(0, 1), guests: 180, hall: 'H2', stage: 'Booked', packageValue: 310000, payments: [{ amt: 100000, date: d(-20), mode: 'UPI' }, { amt: 50000, date: d(-5), mode: 'UPI' }], assigned: 'Priya', createdAt: at(-26) });
  mk({ name: 'Karan Mehta', mobile: '9811156789', source: 'Call', fn: 'Corporate', date: d(12), meals: M(0, 1), guests: 300, hall: 'H1', stage: 'Quotation Sent', followUp: d(0), assigned: 'Amit', createdAt: at(-6), notes: [{ t: at(-2, 15), by: 'Amit', text: 'Annual party for 300. Quotation sent on WhatsApp, comparing with 2 venues.' }] });
  mk({ name: 'Ritu Jain', mobile: '9871234560', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Wedding', date: d(16), meals: M(1, 1), guests: 700, stage: 'Visit Scheduled', visitDate: d(0), assigned: 'Priya', createdAt: at(-4) });
  mk({ name: 'Deepak Chawla', mobile: '9810998877', source: 'Meta', campaign: CAMPAIGNS[1], fn: 'Sagan', date: d(18), meals: M(1, 0), guests: 200, hall: 'H1', stage: 'Tentative', holdUntil: d(-1), packageValue: 280000, assigned: 'Amit', createdAt: at(-9) });
  mk({ name: 'Simran Kaur', mobile: '9999012345', source: 'Walk-in', fn: 'Wedding', date: d(21), meals: M(0, 1), guests: 550, hall: 'H1', stage: 'Booked', packageValue: 1100000, payments: [{ amt: 300000, date: d(-12), mode: 'Bank' }], assigned: 'Owner', createdAt: at(-14) });
  mk({ name: 'Mohit Kalra', mobile: '9811778899', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Reception', date: d(21), meals: M(0, 1), guests: 400, hall: 'H2', stage: 'Booked', packageValue: 820000, payments: [{ amt: 250000, date: d(-6), mode: 'UPI' }], assigned: 'Amit', createdAt: at(-13) });
  mk({ name: 'Amit Verma', mobile: '9876501234', source: 'Meta', campaign: CAMPAIGNS[2], fn: 'Birthday', date: d(2), meals: M(0, 1), guests: 80, stage: 'New', assigned: 'Amit', createdAt: at(0, 9) });
  mk({ name: 'Sonal Gupta', mobile: '9818822334', source: 'Meta', campaign: CAMPAIGNS[1], fn: 'Engagement', date: d(25), meals: M(0, 1), guests: 220, stage: 'New', assigned: 'Priya', createdAt: at(0, 10) });
  mk({ name: 'Aarti Sood', mobile: '9650123456', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Wedding', date: d(45), meals: M(0, 1), guests: 600, stage: 'New', assigned: 'Amit', createdAt: at(0, 8) });
  mk({ name: 'Harpreet Singh', mobile: '9910101010', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Wedding', date: d(30), meals: M(1, 1), guests: 900, stage: 'Contacted', followUp: d(1), assigned: 'Amit', createdAt: at(-2) });
  mk({ name: 'Jatin Malik', mobile: '9711223344', source: 'Meta', campaign: CAMPAIGNS[2], fn: 'Birthday', date: d(4), meals: M(0, 1), guests: 90, stage: 'Contacted', followUp: d(-1), assigned: 'Priya', createdAt: at(-1) });
  mk({ name: 'Rajesh Kohli', mobile: '9958011223', source: 'Reference', refBy: 'Sunil (banquet staff)', fn: 'Anniversary', date: d(14), meals: M(0, 1), guests: 150, hall: 'H2', stage: 'Visited', followUp: d(0), assigned: 'Owner', createdAt: at(-7) });
  mk({ name: 'Manish Agarwal', mobile: '9873456789', source: 'Call', fn: 'Kitty Party', date: d(7), meals: M(1, 0), guests: 60, stage: 'Lost', lostReason: 'Price too high', assigned: 'Priya', createdAt: at(-8) });
  mk({ name: 'Tanya Bhatia', mobile: '9811445566', source: 'Meta', campaign: CAMPAIGNS[0], fn: 'Wedding', date: d(9), meals: M(0, 1), guests: 500, stage: 'Lost', lostReason: 'Date not available', assigned: 'Amit', createdAt: at(-11) });
  mk({ name: 'Vivek Saini', mobile: '9876123450', source: 'Meta', campaign: CAMPAIGNS[2], fn: 'Corporate', date: d(40), meals: M(1, 0), guests: 150, stage: 'Lost', lostReason: 'Went with another venue', assigned: 'Amit', createdAt: at(-5) });
  mk({ name: 'Nidhi Sethi', mobile: '9899776655', source: 'Meta', campaign: CAMPAIGNS[1], fn: 'Engagement', date: d(-6), meals: M(0, 1), guests: 200, hall: 'H1', stage: 'Event Done', packageValue: 340000, payments: [{ amt: 200000, date: d(-30), mode: 'UPI' }, { amt: 140000, date: d(-7), mode: 'Bank' }], assigned: 'Priya', createdAt: at(-45) });
  mk({ name: 'Gurpreet Anand', mobile: '9810203040', source: 'Walk-in', fn: 'Wedding', date: d(-2), meals: M(1, 1), guests: 750, hall: 'BOTH', stage: 'Event Done', packageValue: 1650000, payments: [{ amt: 700000, date: d(-50), mode: 'Bank' }, { amt: 800000, date: d(-3), mode: 'Bank' }], assigned: 'Owner', createdAt: at(-70) });
  return { leads: L, rev: 1 };
}

/* ---------- Availability engine ---------- */
const hallsOf = h => h === 'BOTH' ? ['H1', 'H2'] : h ? [h] : [];
const hallName = h => h === 'BOTH' ? 'Both halls' : h === 'H1' ? 'Hall 1' : h === 'H2' ? 'Hall 2' : 'Not decided';
const holds = l => HOLDING.includes(l.stage) && l.hall && l.date;
const rank = l => l.stage === 'Tentative' ? 1 : 2;
function occupancy(date, excludeId) {
  const r = { H1: null, H2: null };
  for (const l of db.leads) {
    if (l.id === excludeId || l.date !== date || !holds(l)) continue;
    for (const h of hallsOf(l.hall)) if (!r[h] || rank(l) > rank(r[h])) r[h] = l;
  }
  return r;
}
const status = l => !l ? 'free' : l.stage === 'Tentative' ? 'hold' : 'booked';
const statusText = l => ({ free: 'Available', hold: 'On hold', booked: 'Not available' }[status(l)]);
const hallFree = (date, hall, ex) => { const o = occupancy(date, ex); return hallsOf(hall).every(h => !o[h]); };
function nextFree(date, hall, n = 3) {
  const out = [];
  for (let i = 1; i <= 90 && out.length < n; i++) { const d = addDays(date, i); if (hallFree(d, hall)) out.push(d); }
  return out;
}
function expireHolds() {
  const t = todayISO(); let changed = 0;
  for (const l of db.leads) {
    if (l.stage === 'Tentative' && l.holdUntil && l.holdUntil < t) {
      l.stage = 'Quotation Sent';
      l.notes.unshift({ t: new Date().toISOString(), by: 'System', text: `Hold on ${hallName(l.hall)} expired on ${fmtDate(l.holdUntil)} without advance. Date released automatically.` });
      l.holdUntil = ''; changed++;
    }
  }
  if (changed) save();
}

const isOpen = l => !['Booked', 'Event Done', 'Lost'].includes(l.stage);
const isBooked = l => l.stage === 'Booked' || l.stage === 'Event Done';
const paid = l => sum(l.payments || [], p => p.amt);
const balance = l => (l.packageValue || 0) - paid(l);

/* =========================================================
   Session: unlock / lock
   ========================================================= */
let user = null, idleT = null;
const IDLE_MS = 3 * 60 * 1000;
function unlock(u) {
  user = u; load(); expireHolds();
  view = 'home';
  $('#calc').hidden = true; $('#app').hidden = false;
  render(); bumpIdle();
}
function lock() {
  if (!user) return;
  user = null; closeSheet();
  $('#app').hidden = true; $('#calc').hidden = false;
  $('#main').innerHTML = '';
  expr = ''; justEval = false; cExpr.textContent = ''; paintCalc();
  clearTimeout(idleT);
}
function bumpIdle() { clearTimeout(idleT); if (user) idleT = setTimeout(lock, IDLE_MS); }
['pointerdown', 'keydown', 'scroll'].forEach(ev => document.addEventListener(ev, bumpIdle, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) lock(); });
window.addEventListener('pagehide', lock);

/* =========================================================
   Rendering
   ========================================================= */
let view = 'home';
const state = { ad: todayISO(), lf: { q: '', src: 'All', stage: 'Open' }, calMonth: todayISO().slice(0, 7), payF: 'due', fresh: null };
const TABS = [['home', 'Home', ICON.home], ['avail', 'Check', ICON.check], ['leads', 'Leads', ICON.leads], ['cal', 'Calendar', ICON.cal], ['pay', 'Payments', ICON.pay]];

$('.top .icon-btn').innerHTML = ICON.lock;
$('.fab').innerHTML = ICON.plus;

function render() {
  if (!user) return;
  $('#who').textContent = user.name;
  const nNew = db.leads.filter(l => l.stage === 'New').length;
  $('#tabs').innerHTML = TABS.map(([v, label, ic]) =>
    `<button class="tab ${view === v ? 'on' : ''}" data-act="go" data-v="${v}">${ic}<span>${label}</span>${v === 'leads' && nNew ? `<i class="dot">${nNew}</i>` : ''}</button>`).join('');
  $('#main').innerHTML = ({ home: vHome, avail: vAvail, leads: vLeads, cal: vCal, pay: vPay })[view]();
}

function hallCard(h, l, big) {
  const st = status(l);
  let d = '';
  if (l) d = `${esc(l.name)}<br>${esc(l.fn)}${l.guests ? ' · ' + l.guests + ' guests' : ''}${l.hall === 'BOTH' ? ' · both halls' : ''}${st === 'hold' && l.holdUntil ? `<br>Hold till ${fmtShort(l.holdUntil)}` : ''}`;
  else d = big ? 'Free for the full day' : 'Free today';
  return `<button class="hall ${st}" ${l ? `data-act="open" data-id="${l.id}"` : ''}><span class="hn">${hallName(h)}</span><span class="hs">${statusText(l)}</span><span class="hd">${d}</span></button>`;
}
const stageBadge = s => `<span class="badge ${STAGE_CLS[s]}">${esc(s)}</span>`;
const srcBadge = l => `<span class="src ${l.source === 'Meta' ? 'meta' : ''}">${esc(l.source)}</span>`;

/* ---------- Home ---------- */
function vHome() {
  const t = todayISO(), L = db.leads, o = occupancy(t);
  const booked = L.filter(isBooked);
  const value = sum(booked, l => l.packageValue), recv = sum(booked, paid);
  const newT = L.filter(l => (l.createdAt || '').slice(0, 10) === t);
  const due = L.filter(l => isOpen(l) && l.followUp && l.followUp <= t).sort((a, b) => a.followUp.localeCompare(b.followUp));
  const visits = L.filter(l => l.visitDate === t);
  const decided = L.filter(l => isBooked(l) || l.stage === 'Lost');
  const conv = decided.length ? Math.round(booked.length / decided.length * 100) : 0;
  const upcoming = L.filter(l => isBooked(l) && l.date >= t && l.date <= addDays(t, 7)).sort((a, b) => a.date.localeCompare(b.date));

  const srcRows = SOURCES.map(s => { const a = L.filter(l => l.source === s); return { s, n: a.length, b: a.filter(isBooked).length }; });
  const max = Math.max(1, ...srcRows.map(r => r.n));
  const meta = L.filter(l => l.source === 'Meta');
  const camp = CAMPAIGNS.map(c => { const a = meta.filter(l => l.campaign === c), b = a.filter(isBooked); return { c, n: a.length, b: b.length, v: sum(b, l => l.packageValue) }; }).filter(r => r.n);
  const team = STAFF.map(s => { const a = L.filter(l => l.assigned === s), b = a.filter(isBooked); return { s, n: a.length, open: a.filter(isOpen).length, b: b.length, v: sum(b, l => l.packageValue) }; });
  const lost = LOST.map(r => ({ r, n: L.filter(l => l.stage === 'Lost' && l.lostReason === r).length })).filter(x => x.n).sort((a, b) => b.n - a.n);

  const miniRow = (l, right) => `<button data-act="open" data-id="${l.id}"><span><b>${esc(l.name)}</b><small>${esc(l.fn)} · ${fmtShort(l.date)} · ${esc(l.assigned)}</small></span>${right}</button>`;

  return `
  <section class="hello"><div><div class="muted">${fmtDay(t)}</div><h1>Hello, ${esc(user.name)}</h1></div>
    <button class="btn ghost sm" data-act="metaLead">${ICON.bolt}Demo: Meta lead</button></section>

  <section class="card"><div class="card-h"><h2>Today's halls</h2><button class="link" data-act="go" data-v="avail">Check a date →</button></div>
    <div class="halls">${hallCard('H1', o.H1)}${hallCard('H2', o.H2)}</div></section>

  <section class="stats">
    <button class="stat" data-act="leadsF" data-stage="New"><span>New leads today</span><b>${newT.length}</b></button>
    <button class="stat" data-act="leadsF" data-stage="Open"><span>Follow-ups due</span><b class="${due.length ? 'bad-t' : ''}">${due.length}</b></button>
    <button class="stat" data-act="leadsF" data-stage="Visit Scheduled"><span>Site visits today</span><b>${visits.length}</b></button>
    <button class="stat" data-act="go" data-v="pay"><span>Win rate (booked vs lost)</span><b>${conv}%</b></button>
  </section>

  <section class="card"><div class="card-h"><h2>Bookings</h2><button class="link" data-act="go" data-v="pay">Payments →</button></div>
    <div class="money"><div><span>Booked value</span><b>${inr(value)}</b></div><div><span>Received</span><b class="ok-t">${inr(recv)}</b></div><div><span>Pending</span><b class="bad-t">${inr(value - recv)}</b></div></div></section>

  ${due.length ? `<section class="card"><div class="card-h"><h2>Follow-ups due</h2><span class="muted">${due.length}</span></div><div class="mini">${due.map(l => miniRow(l, `<span class="badge ${l.followUp < t ? 'b-bad' : 'b-warn'}">${l.followUp < t ? 'Overdue' : 'Today'}</span>`)).join('')}</div></section>` : ''}
  ${visits.length ? `<section class="card"><div class="card-h"><h2>Site visits today</h2></div><div class="mini">${visits.map(l => miniRow(l, stageBadge(l.stage))).join('')}</div></section>` : ''}
  ${upcoming.length ? `<section class="card"><div class="card-h"><h2>Events in the next 7 days</h2></div><div class="mini">${upcoming.map(l => miniRow(l, `<span class="badge ${balance(l) > 0 ? 'b-warn' : 'b-ok'}">${balance(l) > 0 ? inr(balance(l)) + ' due' : 'Paid'}</span>`)).join('')}</div></section>` : ''}

  <section class="card"><div class="card-h"><h2>Leads by source</h2></div>
    ${srcRows.map(r => `<div class="bar-row"><span>${r.s}</span><div class="bar"><i style="width:${r.n / max * 100}%"></i><i class="b" style="width:${r.b / max * 100}%"></i></div><span class="bar-v">${r.n} leads · <b>${r.b} booked</b></span></div>`).join('')}
    <div class="legend"><span><i style="background:#d7c3cb"></i>All leads</span><span><i style="background:var(--brand)"></i>Booked</span></div></section>

  <section class="card"><div class="card-h"><h2>Which Meta ads bring bookings</h2></div>
    <table class="t"><tr><th>Campaign</th><th class="n">Leads</th><th class="n">Booked</th><th class="n">Value</th></tr>
    ${camp.map(r => `<tr><td>${esc(r.c)}</td><td class="n">${r.n}</td><td class="n">${r.b}</td><td class="n">${inr(r.v)}</td></tr>`).join('')}</table>
    <p class="muted small" style="margin:10px 0 0">Each booking is sent back to Meta, so ads learn to find people who actually book.</p></section>

  <section class="card"><div class="card-h"><h2>Team</h2></div>
    <table class="t"><tr><th>Staff</th><th class="n">Leads</th><th class="n">Open</th><th class="n">Booked</th><th class="n">Value</th></tr>
    ${team.map(r => `<tr><td>${r.s}</td><td class="n">${r.n}</td><td class="n">${r.open}</td><td class="n">${r.b}</td><td class="n">${inr(r.v)}</td></tr>`).join('')}</table></section>

  ${lost.length ? `<section class="card"><div class="card-h"><h2>Why leads were lost</h2></div>
    ${lost.map(x => `<div class="bar-row" style="grid-template-columns:1fr auto"><span>${esc(x.r)}</span><span class="bar-v"><b>${x.n}</b></span></div>`).join('')}</section>` : ''}

  <div class="foot"><button class="link" data-act="reset">Reset demo data</button></div>`;
}

/* ---------- Availability ---------- */
function vAvail() {
  const d = state.ad, o = occupancy(d), t = todayISO();
  let sug = '';
  const busy = ['H1', 'H2'].filter(h => o[h]);
  if (busy.length) {
    const chips = h => nextFree(d, h).map(x => `<button data-act="pickDay" data-d="${x}">${fmtShort(x)}</button>`).join('');
    sug = `<div class="suggest">${busy.length === 2
      ? `<b>Both halls are taken.</b> Nearest free dates:<br>Hall 1: ${chips('H1')}<br>Hall 2: ${chips('H2')}`
      : `<b>${hallName(busy[0])} is taken</b>, ${hallName(busy[0] === 'H1' ? 'H2' : 'H1')} is free on this date.<br>${hallName(busy[0])} free on: ${chips(busy[0])}`}</div>`;
  }
  const days = Array.from({ length: 14 }, (_, i) => addDays(d < t ? t : d, i - (d > t ? Math.min(3, Math.round((new Date(d) - new Date(t)) / 864e5)) : 0)));
  return `
  <section class="card"><h2>Check hall availability</h2>
    <div class="datebar"><button class="icon-btn" data-act="adStep" data-n="-1" aria-label="Previous day">‹</button>
      <input type="date" id="adate" value="${d}"><button class="icon-btn" data-act="adStep" data-n="1" aria-label="Next day">›</button></div>
    <p class="muted center" style="margin:4px 0 10px">${fmtDay(d)}${d === t ? ' · Today' : ''}</p>
    <div class="halls big">${hallCard('H1', o.H1, 1)}${hallCard('H2', o.H2, 1)}</div>
    ${sug}
    ${busy.length < 2 && d >= t ? `<button class="btn primary block" data-act="newLead" data-d="${d}">${ICON.plus}New enquiry for ${fmtShort(d)}</button>` : ''}
  </section>
  <section class="card"><div class="card-h"><h2>Two weeks at a glance</h2></div>
    ${days.map(x => { const q = occupancy(x); return `<button class="strip-row ${x === d ? 'sel' : ''}" data-act="pickDay" data-d="${x}"><span>${fmtDay(x)}</span><span class="pill ${status(q.H1)}">Hall 1</span><span class="pill ${status(q.H2)}">Hall 2</span></button>`; }).join('')}
    <div class="legend"><span><i style="background:var(--ok-bg);border:1px solid #9fd3b2"></i>Available</span><span><i style="background:#f1bf5b"></i>On hold</span><span><i style="background:#d65a4b"></i>Booked</span></div>
  </section>`;
}

/* ---------- Leads ---------- */
function filteredLeads() {
  const f = state.lf; let L = [...db.leads];
  if (f.src !== 'All') L = L.filter(l => l.source === f.src);
  if (f.stage === 'Open') L = L.filter(isOpen); else if (f.stage !== 'All') L = L.filter(l => l.stage === f.stage);
  if (f.q) { const q = f.q.toLowerCase().replace(/\s/g, ''); L = L.filter(l => l.name.toLowerCase().replace(/\s/g, '').includes(q) || l.mobile.includes(q)); }
  return L.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
function leadRow(l) {
  const t = todayISO();
  const flag = isOpen(l) && l.followUp && l.followUp <= t ? `<span class="badge ${l.followUp < t ? 'b-bad' : 'b-warn'}">Follow-up ${l.followUp < t ? 'overdue' : 'today'}</span>` : '';
  return `<button class="lead ${state.fresh === l.id ? 'fresh' : ''}" data-act="open" data-id="${l.id}">
    <div class="lead-top"><b>${esc(l.name)}</b>${stageBadge(l.stage)}</div>
    <div class="lead-sub">${esc(l.fn)} · ${l.date ? fmtShort(l.date) : 'date TBD'}${l.guests ? ' · ' + l.guests + ' guests' : ''}${l.hall ? ' · ' + hallName(l.hall) : ''}</div>
    <div class="lead-meta">${srcBadge(l)}${l.campaign ? `<span>${esc(l.campaign)}</span>` : ''}<span>· ${esc(l.assigned)}</span><span>· ${ago(l.createdAt)}</span>${flag}</div></button>`;
}
function leadList() { const L = filteredLeads(); return `<div class="muted" style="margin-bottom:8px">${L.length} lead${L.length === 1 ? '' : 's'}</div>` + (L.map(leadRow).join('') || '<div class="empty">No leads match.</div>'); }
function vLeads() {
  const f = state.lf;
  return `
  <div class="toolbar"><input type="search" id="lq" placeholder="Search name or mobile" value="${esc(f.q)}">
    <select id="lstage">${[['Open', 'Open leads'], ['All', 'All stages'], ...STAGES.map(s => [s, s])].map(([v, n]) => opt(v, f.stage, n)).join('')}</select></div>
  <div class="chips">${['All', ...SOURCES].map(s => `<button class="chip ${f.src === s ? 'on' : ''}" data-act="src" data-s="${s}">${s}</button>`).join('')}</div>
  <div class="row-between"><span></span><button class="btn ghost sm" data-act="metaLead">${ICON.bolt}Demo: receive a Meta lead</button></div>
  <div id="leadList">${leadList()}</div>`;
}

/* ---------- Calendar ---------- */
function vCal() {
  const [y, m] = state.calMonth.split('-').map(Number), t = todayISO();
  const first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = '', full = 0, free = 0;
  for (let i = 0; i < lead; i++) cells += '<div class="day blank"></div>';
  for (let dd = 1; dd <= days; dd++) {
    const ds = `${y}-${pad(m)}-${pad(dd)}`, o = occupancy(ds);
    if (ds >= t) { if (o.H1 && o.H2) full++; else if (!o.H1 && !o.H2) free++; }
    cells += `<button class="day ${ds === t ? 'today' : ''} ${ds < t ? 'past' : ''}" data-act="pickDay" data-d="${ds}" aria-label="${fmtDate(ds)}"><span class="dn">${dd}</span><span class="hb ${status(o.H1)}"></span><span class="hb ${status(o.H2)}"></span></button>`;
  }
  const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return `
  <section class="card">
    <div class="cal-h"><button class="icon-btn" data-act="calStep" data-n="-1" aria-label="Previous month">‹</button><h2>${label}</h2><button class="icon-btn" data-act="calStep" data-n="1" aria-label="Next month">›</button></div>
    <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div>
    <div class="legend"><span>Top bar Hall 1 · bottom bar Hall 2</span></div>
    <div class="legend"><span><i style="background:#e7f3eb"></i>Available</span><span><i style="background:#f1bf5b"></i>On hold</span><span><i style="background:#d65a4b"></i>Booked</span></div>
  </section>
  <section class="card"><div class="money" style="grid-template-columns:1fr 1fr">
    <div><span>Dates fully booked (upcoming)</span><b class="bad-t">${full}</b></div><div><span>Dates fully free (upcoming)</span><b class="ok-t">${free}</b></div></div>
    <p class="muted small" style="margin:10px 0 0">Tap any date to see who has it, or to start an enquiry.</p></section>`;
}

/* ---------- Payments ---------- */
function vPay() {
  const t = todayISO();
  const B = db.leads.filter(l => HOLDING.includes(l.stage) && l.packageValue > 0);
  const conf = B.filter(isBooked);
  const value = sum(conf, l => l.packageValue), recv = sum(conf, paid);
  const list = B.filter(l => state.payF === 'due' ? balance(l) > 0 : state.payF === 'paid' ? balance(l) <= 0 : true)
    .sort((a, b) => a.date.localeCompare(b.date));
  const row = l => {
    const pct = Math.min(100, Math.round(paid(l) / l.packageValue * 100)), bal = balance(l);
    const soon = bal > 0 && l.date <= addDays(t, 7);
    const tag = bal <= 0 ? '<span class="badge b-ok">Fully paid</span>' : l.date < t ? '<span class="badge b-bad">Overdue</span>' : soon ? '<span class="badge b-warn">Due before event</span>' : stageBadge(l.stage);
    return `<button class="pay" data-act="open" data-id="${l.id}"><div class="lead-top"><b>${esc(l.name)}</b>${tag}</div>
      <div class="lead-sub muted">${esc(l.fn)} · ${fmtDate(l.date)} · ${hallName(l.hall)}</div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="lead-top small"><span>${inr(paid(l))} of ${inr(l.packageValue)}</span><b class="${bal > 0 ? 'bad-t' : 'ok-t'}" style="font-size:13px">${bal > 0 ? inr(bal) + ' balance' : 'Done'}</b></div></button>`;
  };
  return `
  <section class="card"><div class="money"><div><span>Booked value</span><b>${inr(value)}</b></div><div><span>Received</span><b class="ok-t">${inr(recv)}</b></div><div><span>Pending</span><b class="bad-t">${inr(value - recv)}</b></div></div></section>
  <div class="chips">${[['due', 'Balance pending'], ['paid', 'Fully paid'], ['all', 'All']].map(([k, n]) => `<button class="chip ${state.payF === k ? 'on' : ''}" data-act="payF" data-f="${k}">${n}</button>`).join('')}</div>
  ${list.map(row).join('') || '<div class="empty">Nothing here.</div>'}`;
}

/* =========================================================
   Lead sheet (new enquiry + edit) — mirrors the paper form
   ========================================================= */
let draft = null;
const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label ?? v)}</option>`;

function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; $('#sheetBody').scrollTop = 0; requestAnimationFrame(() => $('#sheet').classList.add('open')); }
function closeSheet() { const s = $('#sheet'); s.classList.remove('open'); s.hidden = true; $('#sheetBody').innerHTML = ''; draft = null; }

function leadSheet(id, preset = {}) {
  const ex = id ? db.leads.find(x => x.id === id) : null;
  if (id && !ex) return toast('This lead no longer exists', 'bad');
  const l = ex ? JSON.parse(JSON.stringify(ex)) : Object.assign(blank(), { assigned: user.name, preparedBy: user.name, date: preset.date || '' });
  draft = l;
  const t = todayISO();
  openSheet(`
  <div class="sheet-h"><div><h2 style="font-size:19px">${ex ? esc(l.name) : 'New enquiry'}</h2>
    <div class="muted" style="margin-top:4px">${ex ? `${srcBadge(l)} ${l.campaign ? esc(l.campaign) + ' · ' : ''}added ${ago(l.createdAt)}` : 'Same fields as the paper enquiry form'}</div></div>
    <button class="icon-btn" data-act="close" aria-label="Close">✕</button></div>
  ${ex ? `<div class="quick"><a class="btn ghost sm" href="tel:+91${l.mobile}">Call ${fmtMobile(l.mobile)}</a><a class="btn ghost sm" href="https://wa.me/91${l.mobile}" target="_blank" rel="noopener">WhatsApp</a>${stageBadge(l.stage)}</div>` : ''}
  <form id="lf" autocomplete="off" onsubmit="return false">
    <div class="grid2"><label>Prepared by<input value="${esc(l.preparedBy)}" disabled></label>
      <label>Visit date<input type="date" name="visitDate" value="${l.visitDate}"></label></div>
    <label>Name of customer *<input name="name" value="${esc(l.name)}" placeholder="e.g. Rohit Malhotra"></label>
    <label>Mobile number *<input name="mobile" id="fMobile" inputmode="numeric" maxlength="10" value="${esc(l.mobile)}" placeholder="10-digit mobile"></label>
    <div id="dupWarn"></div>
    <label>Function<select name="fn">${FUNCTIONS.map(f => opt(f, l.fn)).join('')}</select></label>
    <label>Function date<input type="date" name="date" id="fDate" value="${l.date}"></label>
    <div class="grid2" style="margin-bottom:11px"><label class="check" style="margin:0"><input type="checkbox" name="lunch" ${l.meals.lunch ? 'checked' : ''}>Lunch</label><label class="check" style="margin:0"><input type="checkbox" name="dinner" ${l.meals.dinner ? 'checked' : ''}>Dinner</label></div>
    <label>Gathering (guests)<input type="number" name="guests" inputmode="numeric" min="0" value="${l.guests}"></label>
    <fieldset><legend>Hall</legend><div class="hopts" id="hallOpts"></div></fieldset>
    <div id="fAvail"></div>
    <div class="grid2"><label>Lead source<select name="source" id="fSource">${SOURCES.map(s => opt(s, l.source)).join('')}</select></label>
      <label id="refWrap">Ref. by<input name="refBy" value="${esc(l.refBy)}" placeholder="Who referred"></label></div>
    ${l.campaign ? `<label>Meta campaign<input value="${esc(l.campaign)}" disabled></label>` : ''}
    <div class="sep"></div>
    <div class="grid2"><label>Stage<select name="stage" id="fStage">${STAGES.map(s => opt(s, l.stage)).join('')}</select></label>
      <label>Assigned to<select name="assigned">${STAFF.map(s => opt(s, l.assigned)).join('')}</select></label></div>
    <label id="holdWrap">Hold until (auto-release if no advance)<input type="date" name="holdUntil" value="${l.holdUntil || addDays(t, 3)}"></label>
    <label id="lostWrap">Why was it lost?<select name="lostReason"><option value="">Choose a reason</option>${LOST.map(r => opt(r, l.lostReason)).join('')}</select></label>
    <label>Next follow-up<input type="date" name="followUp" value="${l.followUp}"></label>
    <div class="box" id="payWrap"><h3>Package & payments</h3>
      <label>Package value (₹)<input type="number" name="packageValue" id="fPkg" inputmode="numeric" min="0" value="${l.packageValue || ''}" placeholder="e.g. 450000"></label>
      <div id="payList"></div>
      <div class="addpay"><input type="number" id="payAmt" inputmode="numeric" min="1" placeholder="Amount ₹"><select id="payMode"><option>UPI</option><option>Cash</option><option>Bank</option></select><button class="btn ghost sm" data-act="addPay">Add</button></div>
    </div>
    <label>Add a note<textarea name="note" rows="2" placeholder="e.g. Wants veg menu, coming for visit on Sunday"></textarea></label>
    ${l.notes.length ? `<div style="margin-bottom:10px">${l.notes.map(n => `<div class="note">${esc(n.text)}<small>${esc(n.by)} · ${ago(n.t)}</small></div>`).join('')}</div>` : ''}
    <div id="formErr"></div>
    <div class="sheet-actions"><button class="btn ghost" data-act="close">Cancel</button><button class="btn primary" data-act="saveLead">${ex ? 'Save changes' : 'Save enquiry'}</button></div>
  </form>`);
  refreshForm(); dupCheck();
}

function formVal(n) { const f = $('#lf'); if (!f) return ''; const el = f.elements[n]; if (!el) return ''; if (el.type === 'checkbox') return el.checked; return (el.value ?? '').trim(); }

function refreshForm() {
  if (!draft || !$('#lf')) return;
  const date = formVal('date'), radios = $('#hallOpts').querySelector('input'), cur = radios ? ($('#lf').elements.hall.value || '') : (draft.hall || '');
  const o = date ? occupancy(date, draft.id) : null;
  const optHtml = [['', 'Not decided'], ['H1', 'Hall 1'], ['H2', 'Hall 2'], ['BOTH', 'Both halls']].map(([v, n]) => {
    let st = 'free', txt = date ? 'Available' : '', dis = false;
    if (o && v) {
      const occ = hallsOf(v).map(h => o[h]).filter(Boolean);
      if (occ.length) { st = occ.some(x => status(x) === 'booked') ? 'booked' : 'hold'; txt = st === 'booked' ? 'Booked' : 'On hold'; dis = true; }
    }
    if (!v) { st = ''; txt = ''; }
    const checked = !dis && v === cur;
    if (dis && v && v === cur) draft._taken = { hall: v, by: hallsOf(v).map(h => o[h]).find(Boolean) };
    return `<label class="hopt ${st} ${dis ? 'dis' : ''}" style="margin:0"><input type="radio" name="hall" value="${v}" ${checked ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${n}${txt ? `<small>${txt}</small>` : ''}</span></label>`;
  }).join('');
  $('#hallOpts').innerHTML = optHtml;
  let msg = '';
  if (!date) msg = '<div class="alert info">Pick the function date to see which halls are free.</div>';
  else {
    const busy = ['H1', 'H2'].filter(h => o[h]);
    if (!busy.length) msg = `<div class="alert ok"><b>Both halls are available</b> on ${fmtDate(date)}.</div>`;
    else {
      const who = busy.map(h => `${hallName(h)}: ${statusText(o[h]).toLowerCase()} (${esc(o[h].name)})`).join('<br>');
      const sugH = busy.length === 2 ? 'H1' : busy[0];
      const sug = nextFree(date, sugH, 3).map(x => `<button data-act="setFormDate" data-d="${x}">${fmtShort(x)}</button>`).join(' · ');
      msg = `<div class="alert ${busy.length === 2 ? 'bad' : 'warn'}">${who}${busy.length === 2 ? `<br>Nearest dates with Hall 1 free: ${sug}` : `<br>${hallName(busy[0] === 'H1' ? 'H2' : 'H1')} is free.`}</div>`;
    }
    if (cur && hallsOf(cur).some(h => o[h])) msg += `<div class="alert bad">${hallName(cur)} is no longer free on this date. Choose another hall or date.</div>`;
  }
  $('#fAvail').innerHTML = msg;
  const stage = formVal('stage') || draft.stage;
  $('#holdWrap').hidden = stage !== 'Tentative';
  $('#lostWrap').hidden = stage !== 'Lost';
  $('#refWrap').style.visibility = formVal('source') === 'Reference' ? 'visible' : 'hidden';
  $('#payWrap').hidden = !HOLDING.includes(stage);
  renderPays();
}

function renderPays() {
  if (!draft || !$('#payList')) return;
  const pkg = Number(formVal('packageValue')) || 0, p = sum(draft.payments, x => x.amt);
  $('#payList').innerHTML = (draft.payments.map(x => `<div class="prow"><span>${fmtShort(x.date)} · ${esc(x.mode)}</span><b>${inr(x.amt)}</b></div>`).join('') || '<div class="muted small">No payments yet.</div>')
    + (pkg ? `<div class="prow" style="border:0"><span>Received ${inr(p)}</span><b class="${pkg - p > 0 ? 'bad-t' : 'ok-t'}">${pkg - p > 0 ? 'Balance ' + inr(pkg - p) : 'Fully paid'}</b></div>` : '');
}

function dupCheck() {
  const m = formVal('mobile').replace(/\D/g, '');
  const box = $('#dupWarn'); if (!box) return;
  const hit = m.length === 10 ? db.leads.find(l => l.mobile === m && l.id !== draft.id) : null;
  box.innerHTML = hit ? `<div class="alert warn">Already in CRM: <b>${esc(hit.name)}</b> (${esc(hit.stage)}, ${esc(hit.fn)} on ${fmtShort(hit.date)}). <button data-act="open" data-id="${hit.id}">Open that lead</button></div>` : '';
}

function saveLead() {
  const d = draft; if (!d) return;
  const err = m => { $('#formErr').innerHTML = `<div class="alert bad">${m}</div>`; $('#formErr').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  Object.assign(d, {
    name: formVal('name'), mobile: formVal('mobile').replace(/\D/g, ''), fn: formVal('fn'), date: formVal('date'),
    meals: { lunch: formVal('lunch'), dinner: formVal('dinner') }, guests: formVal('guests') ? Number(formVal('guests')) : '',
    hall: ($('#lf').elements.hall?.value) || null, source: formVal('source'), refBy: formVal('source') === 'Reference' ? formVal('refBy') : '',
    stage: formVal('stage'), assigned: formVal('assigned'), visitDate: formVal('visitDate'), followUp: formVal('followUp'),
    holdUntil: formVal('stage') === 'Tentative' ? formVal('holdUntil') : '', lostReason: formVal('stage') === 'Lost' ? formVal('lostReason') : '',
    packageValue: Number(formVal('packageValue')) || 0,
  });
  if (!d.name) return err('Enter the customer name.');
  if (d.mobile.length !== 10) return err('Enter a 10-digit mobile number.');
  if (HOLDING.includes(d.stage)) {
    if (!d.date) return err('Pick the function date before holding a hall.');
    if (!d.hall && d._taken) return err(`<b>${hallName(d._taken.hall)} on ${fmtDate(d.date)} was just taken</b> by another staff member: ${status(d._taken.by) === 'hold' ? 'on hold' : 'booked'} for ${esc(d._taken.by.name)}. Choose another hall or date.`);
    if (!d.hall) return err('Choose Hall 1, Hall 2 or both halls to hold this date.');
    if (d.stage === 'Tentative' && !d.holdUntil) d.holdUntil = addDays(todayISO(), 3);
  }
  if (d.stage === 'Lost' && !d.lostReason) return err('Choose why this lead was lost.');

  // Re-read the latest data right before writing (in production this check runs inside the database).
  load();
  if (HOLDING.includes(d.stage) && d.stage !== 'Event Done') {
    const o = occupancy(d.date, d.id), clash = hallsOf(d.hall).map(h => o[h]).find(Boolean);
    if (clash) {
      refreshForm();
      const sug = nextFree(d.date, d.hall, 3);
      return err(`<b>${hallName(d.hall)} on ${fmtDate(d.date)} was just taken</b>: ${status(clash) === 'hold' ? 'on hold' : 'booked'} for ${esc(clash.name)}.${sug.length ? `<br>Nearest free dates: ${sug.map(x => `<button data-act="setFormDate" data-d="${x}">${fmtShort(x)}</button>`).join(' · ')}` : ''}`);
    }
  }
  const note = formVal('note');
  delete d._taken;
  if (note) d.notes.unshift({ t: new Date().toISOString(), by: user.name, text: note });
  const isNew = !d.id;
  if (isNew) { d.id = newId(); d.createdAt = new Date().toISOString(); d.preparedBy = user.name; db.leads.push(d); }
  else { const i = db.leads.findIndex(x => x.id === d.id); if (i < 0) db.leads.push(d); else db.leads[i] = d; }
  save();
  const msg = isNew ? `Enquiry saved for ${d.name}` : d.stage === 'Booked' ? `${hallName(d.hall)} booked for ${fmtShort(d.date)}` : d.stage === 'Tentative' ? `${hallName(d.hall)} on hold till ${fmtShort(d.holdUntil)}` : 'Saved';
  closeSheet(); render(); toast(msg, 'ok');
}

/* ---------- Meta lead simulation ---------- */
const POOL = [['Kunal Arora', 'Wedding', 600], ['Shreya Malhotra', 'Engagement', 250], ['Rahul Bedi', 'Birthday', 100], ['Ishita Grover', 'Reception', 450], ['Sahil Taneja', 'Corporate', 200], ['Megha Khurana', 'Ring Ceremony', 180], ['Varun Sachdeva', 'Wedding', 750], ['Nikita Chopra', 'Anniversary', 120]];
function metaLead() {
  load();
  const p = POOL[Math.floor(Math.random() * POOL.length)];
  const mobile = '98' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const assigned = ['Amit', 'Priya'][db.leads.length % 2];
  const camp = p[1] === 'Wedding' || p[1] === 'Reception' ? CAMPAIGNS[0] : p[1] === 'Engagement' || p[1] === 'Ring Ceremony' ? CAMPAIGNS[1] : CAMPAIGNS[2];
  const l = Object.assign(blank(), {
    id: newId(), name: p[0], mobile, source: 'Meta', campaign: camp, fn: p[1], date: addDays(todayISO(), 8 + Math.floor(Math.random() * 50)),
    guests: p[2], stage: 'New', assigned, preparedBy: 'Meta form', createdAt: new Date().toISOString(),
    notes: [{ t: new Date().toISOString(), by: 'System', text: `Lead form filled on Instagram ad "${camp}". WhatsApp auto-reply with brochure and hall photos sent. Assigned to ${assigned}.` }],
  });
  db.leads.push(l); save();
  state.fresh = l.id;
  if (view === 'leads') { state.lf.src = 'All'; state.lf.stage = 'Open'; state.lf.q = ''; }
  render();
  toast(`New Meta lead: ${p[0]} · ${p[1]} · assigned to ${assigned}`, 'ok');
}

/* =========================================================
   Events
   ========================================================= */
let toastT;
function toast(msg, kind = '') { const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + kind; clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'toast'; }, 2800); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !user) return;
  const a = b.dataset.act;
  if (b.tagName === 'BUTTON') e.preventDefault();
  switch (a) {
    case 'go': view = b.dataset.v; state.fresh = null; render(); $('#main').scrollTop = 0; break;
    case 'lock': lock(); break;
    case 'open': leadSheet(b.dataset.id); break;
    case 'close': closeSheet(); break;
    case 'newLead': leadSheet(null, { date: b.dataset.d || '' }); break;
    case 'saveLead': saveLead(); break;
    case 'metaLead': metaLead(); break;
    case 'src': state.lf.src = b.dataset.s; render(); break;
    case 'leadsF': state.lf = { q: '', src: 'All', stage: b.dataset.stage }; view = 'leads'; render(); break;
    case 'adStep': state.ad = addDays(state.ad, Number(b.dataset.n)); render(); break;
    case 'pickDay': state.ad = b.dataset.d; view = 'avail'; render(); $('#main').scrollTop = 0; break;
    case 'calStep': { const [y, m] = state.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(b.dataset.n), 1); state.calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); break; }
    case 'payF': state.payF = b.dataset.f; render(); break;
    case 'setFormDate': { const el = $('#fDate'); if (el) { el.value = b.dataset.d; $('#formErr').innerHTML = ''; refreshForm(); } break; }
    case 'addPay': {
      const amt = Number($('#payAmt').value);
      if (!amt || amt <= 0) { toast('Enter the amount received', 'bad'); break; }
      draft.payments.push({ amt, date: todayISO(), mode: $('#payMode').value });
      $('#payAmt').value = ''; renderPays(); toast(`${inr(amt)} added. Tap Save to keep it.`); break;
    }
    case 'reset': if (confirmReset()) { db = seed(); save(); expireHolds(); state.fresh = null; render(); toast('Demo data reset'); } break;
  }
});
let resetArmed = 0;
function confirmReset() { if (Date.now() - resetArmed < 4000) return true; resetArmed = Date.now(); toast('Tap "Reset demo data" again to confirm'); return false; }

$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
document.addEventListener('input', e => {
  if (!user) return;
  const id = e.target.id;
  if (id === 'lq') { state.lf.q = e.target.value; $('#leadList').innerHTML = leadList(); }
  else if (id === 'fMobile') { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); dupCheck(); }
  else if (id === 'fPkg') renderPays();
});
document.addEventListener('change', e => {
  if (!user) return;
  const id = e.target.id;
  if (id === 'lstage') { state.lf.stage = e.target.value; $('#leadList').innerHTML = leadList(); }
  else if (id === 'adate' && e.target.value) { state.ad = e.target.value; render(); }
  else if (e.target.closest('#lf') && ['fDate', 'fStage', 'fSource'].includes(id)) refreshForm();
});

// Live sync: when another device/tab changes data, refresh instantly.
window.addEventListener('storage', e => {
  if (e.key !== KEY || !user) return;
  load(); render();
  if (draft && $('#lf')) refreshForm();
  toast('Updated live from another device');
});

/* =========================================================
   Boot
   ========================================================= */
paintCalc();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
