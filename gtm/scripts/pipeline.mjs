#!/usr/bin/env node
// Prime Piece GTM pipeline helper: the deterministic part of the agent system.
// Zero dependencies. Every agent reads/writes gtm/data/accounts.json; this script
// validates it, does the scoring arithmetic, and produces the reports the GTM Brain uses.
//
//   node gtm/scripts/pipeline.mjs validate          schema + consistency checks
//   node gtm/scripts/pipeline.mjs score             recompute intent/total/tier for every account
//   node gtm/scripts/pipeline.mjs report            funnel, tiers, segments, signal mix
//   node gtm/scripts/pipeline.mjs due [YYYY-MM-DD]  next actions due on/before date (default today)
//   node gtm/scripts/pipeline.mjs list [--tier A] [--stage new] [--segment hotel]
//
// Signal weights and decay mirror gtm/config/signals.md; keep the two in step.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(here, '../data/accounts.json');

export const STAGES = ['new', 'researched', 'ready', 'in_sequence', 'replied', 'meeting', 'proposal', 'won', 'lost', 'nurture', 'do_not_contact'];
export const SEGMENTS = ['interior-design', 'architecture', 'developer', 'staging', 'hotel', 'hospitality', 'furniture-retail', 'gallery', 'corporate', 'other'];
const FIT_KEYS = ['segment', 'premium', 'location', 'aesthetic', 'reachable'];

export const SIGNAL_WEIGHTS = {
  A01: 5, A02: 5, A03: 5, A04: 4, A05: 4, A06: 4, A07: 5, A08: 4, A09: 3, A10: 4, A11: 3, A12: 3,
  B01: 4, B02: 3, B03: 3, B04: 3, B05: 3, B06: 2, B07: 2, B08: 3, B09: 3, B10: 3,
  C01: 3, C02: 2, C03: 3, C04: 2, C05: 2, C06: 1, C07: 2, C08: 2,
  D01: 5, D02: 5, D03: 5, D04: 5, D05: 3, D06: 2, D07: 2, D08: 4, D09: 3, D10: 3,
  E01: 3, E02: 2, E03: 1, E04: 4, E05: 2,
};
const HOT_FIRST_PARTY = new Set(['D01', 'D02', 'D03', 'D04']);

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);

export function decay(ageDays) {
  if (ageDays < 0) return 1; // future-dated (e.g. announced opening): treat as fresh
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.6;
  if (ageDays <= 180) return 0.3;
  return 0;
}

export function scoreAccount(a, asOf = today()) {
  if (a.stage === 'do_not_contact') return null;
  let fit = null;
  if (a.fit && FIT_KEYS.every(k => typeof a.fit[k]?.score === 'number')) {
    fit = FIT_KEYS.reduce((s, k) => s + Math.max(0, Math.min(10, a.fit[k].score)), 0);
  }
  let raw = 0;
  let hot = false;
  for (const s of a.signals || []) {
    const w = SIGNAL_WEIGHTS[s.id];
    if (!w || !s.date) continue;
    const age = daysBetween(s.date, asOf);
    raw += w * decay(age);
    if (HOT_FIRST_PARTY.has(s.id) && age <= 30) hot = true;
  }
  const intent = Math.round(Math.min(50, raw * 4));
  if (fit === null) return { fit: null, intent, total: null, tier: hot ? 'A' : null, override: hot ? 'first-party' : null, scored_at: asOf };
  const total = fit + intent;
  let tier = total >= 70 ? 'A' : total >= 50 ? 'B' : total >= 30 ? 'C' : 'D';
  let override = null;
  if (hot && tier !== 'A') { tier = 'A'; override = 'first-party'; }
  return { fit, intent, total, tier, override, scored_at: asOf };
}

function load() { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
function save(db) { db.updated = today(); fs.writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n'); }

function validate(db) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const a of db.accounts) {
    const where = a.id || a.name || '(unnamed)';
    if (!a.id) errors.push(`${where}: missing id`);
    if (ids.has(a.id)) errors.push(`${where}: duplicate id`);
    ids.add(a.id);
    if (!a.name) errors.push(`${where}: missing name`);
    if (!SEGMENTS.includes(a.segment)) errors.push(`${where}: unknown segment "${a.segment}"`);
    if (!STAGES.includes(a.stage)) errors.push(`${where}: unknown stage "${a.stage}"`);
    for (const s of a.signals || []) {
      if (!SIGNAL_WEIGHTS[s.id]) errors.push(`${where}: unknown signal id "${s.id}"`);
      if (!s.date || Number.isNaN(Date.parse(s.date))) errors.push(`${where}: signal ${s.id} has no valid date`);
      if (!s.evidence) warnings.push(`${where}: signal ${s.id} has no evidence`);
    }
    for (const c of a.contacts || []) {
      if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) errors.push(`${where}: bad email "${c.email}"`);
    }
    if (a.stage === 'in_sequence' && !a.sequence) warnings.push(`${where}: in_sequence but no sequence recorded`);
    if (a.stage === 'do_not_contact' && a.sequence?.steps?.some(s => s.status === 'drafted')) errors.push(`${where}: do_not_contact but has drafted steps`);
  }
  return { errors, warnings };
}

function table(rows, cols) {
  const w = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
  const line = r => cols.map((c, i) => String(r[c] ?? '').padEnd(w[i])).join('  ');
  return [line(Object.fromEntries(cols.map(c => [c, c]))), w.map(n => '-'.repeat(n)).join('  '), ...rows.map(line)].join('\n');
}

function count(arr, key) {
  const out = {};
  for (const x of arr) { const k = key(x) ?? '—'; out[k] = (out[k] || 0) + 1; }
  return out;
}

const [cmd = 'report', ...rest] = process.argv.slice(2);
const flag = name => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const db = load();

if (cmd === 'validate') {
  const { errors, warnings } = validate(db);
  warnings.forEach(w => console.log('warn  ' + w));
  errors.forEach(e => console.log('ERROR ' + e));
  console.log(`${db.accounts.length} accounts · ${errors.length} errors · ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
} else if (cmd === 'score') {
  const { errors } = validate(db);
  if (errors.length) { errors.forEach(e => console.log('ERROR ' + e)); process.exit(1); }
  let changed = 0;
  for (const a of db.accounts) {
    const s = scoreAccount(a);
    const before = a.score?.tier;
    a.score = s;
    if (s && (before ?? null) !== (s.tier ?? null)) {
      changed++;
      (a.history ||= []).push({ date: today(), agent: 'pipeline.mjs', event: `Tier ${before ?? '—'} → ${s.tier ?? '—'} (fit ${s.fit ?? '?'}, intent ${s.intent}, total ${s.total ?? '?'})` });
    }
  }
  save(db);
  console.log(`Scored ${db.accounts.length} accounts · ${changed} tier changes`);
  console.log(count(db.accounts, a => a.score?.tier ? `Tier ${a.score.tier}` : 'unscored'));
} else if (cmd === 'report') {
  const acc = db.accounts;
  console.log(`# Pipeline report: ${today()} (${acc.length} accounts)\n`);
  console.log('## Stage');
  for (const s of STAGES) { const n = acc.filter(a => a.stage === s).length; if (n) console.log(`${s.padEnd(15)} ${'█'.repeat(n)} ${n}`); }
  console.log('\n## Tier');
  console.log(count(acc, a => a.score?.tier ? a.score.tier : 'unscored'));
  console.log('\n## Segment');
  console.log(count(acc, a => a.segment));
  const sigs = acc.flatMap(a => (a.signals || []).map(s => s.id));
  console.log('\n## Signals logged by family');
  console.log(count(sigs, id => id[0]));
  const top = acc.filter(a => a.score?.total != null).sort((a, b) => b.score.total - a.score.total).slice(0, 10);
  if (top.length) {
    console.log('\n## Top 10 by score');
    console.log(table(top.map(a => ({ account: a.name, segment: a.segment, tier: a.score.tier, total: a.score.total, stage: a.stage })), ['account', 'segment', 'tier', 'total', 'stage']));
  }
  const replied = acc.filter(a => ['replied', 'meeting', 'proposal', 'won'].includes(a.stage)).length;
  const contacted = acc.filter(a => ['in_sequence', 'replied', 'meeting', 'proposal', 'won', 'lost'].includes(a.stage)).length;
  console.log(`\n## Conversion\ncontacted ${contacted} → replied+ ${replied}${contacted ? ` (${Math.round(100 * replied / contacted)}%)` : ''} → won ${acc.filter(a => a.stage === 'won').length}`);
} else if (cmd === 'due') {
  const asOf = rest[0] || today();
  const due = db.accounts.filter(a => a.next_action && a.stage !== 'do_not_contact' && (!a.next_action_date || a.next_action_date <= asOf));
  console.log(table(due.map(a => ({ account: a.name, tier: a.score?.tier ?? '—', stage: a.stage, due: a.next_action_date ?? 'now', action: a.next_action })), ['account', 'tier', 'stage', 'due', 'action']));
  console.log(`\n${due.length} actions due on/before ${asOf}`);
} else if (cmd === 'list') {
  let acc = db.accounts;
  if (flag('tier')) acc = acc.filter(a => a.score?.tier === flag('tier'));
  if (flag('stage')) acc = acc.filter(a => a.stage === flag('stage'));
  if (flag('segment')) acc = acc.filter(a => a.segment === flag('segment'));
  console.log(table(acc.map(a => ({ id: a.id, name: a.name, segment: a.segment, stage: a.stage, tier: a.score?.tier ?? '—', total: a.score?.total ?? '—', signals: (a.signals || []).length })), ['id', 'name', 'segment', 'stage', 'tier', 'total', 'signals']));
  console.log(`\n${acc.length} accounts`);
} else {
  console.log('Usage: node gtm/scripts/pipeline.mjs <validate|score|report|due|list>');
  process.exit(1);
}
