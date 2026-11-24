#!/usr/bin/env node
// Meta Marketing API helper for the Meta Ads crew (.claude/agents/*).
//
// Safety model — the guardrails live HERE in code, not only in the agent prompts:
//   * Every write command is a dry run unless --live is passed. Dry runs print the exact
//     Graph API calls they would make and touch nothing.
//   * `launch` only ever creates objects with status PAUSED ("the sandbox"). Nothing
//     spends money until `activate`, which refuses to run without an approval.json that
//     /desk-approve writes after James says "approve".
//   * Budgets are checked against config.json guardrails (per-ad-set cap, total cap,
//     max scale step, minimum hours between changes). Over-cap requests are refused,
//     not trimmed.
//   * `pause` is the only write the crew may do unattended (it can only reduce spend).
//
// Auth: in a Claude cloud session the token is a network secret saved for
// graph.facebook.com — the session's proxy adds it to each request, so this script never
// sees it. Locally, set META_ACCESS_TOKEN instead. Raw fetch, no SDK, matching the rest
// of this repo (scale-os/lib/*, scripts/market-radar/*).
//
// Usage:
//   node meta-ads-crew/tools/meta.mjs check
//   node meta-ads-crew/tools/meta.mjs validate  <run-dir>
//   node meta-ads-crew/tools/meta.mjs launch    <run-dir> [--live]
//   node meta-ads-crew/tools/meta.mjs activate  <run-dir> [--live]
//   node meta-ads-crew/tools/meta.mjs insights  [--campaign <id>] [--preset last_3d | --since YYYY-MM-DD --until YYYY-MM-DD] [--level ad|adset|campaign]
//   node meta-ads-crew/tools/meta.mjs spend     [--preset last_7d | --since … --until …]
//   node meta-ads-crew/tools/meta.mjs pause     <ad-or-adset-id> [--live]
//   node meta-ads-crew/tools/meta.mjs set-budget <adset-id> <nzd> [--live]   (increase needs an approval file, see below)

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CREW = resolve(HERE, '..');
const REPO = resolve(CREW, '..');
const CONFIG = JSON.parse(readFileSync(join(CREW, 'config.json'), 'utf8'));
const LOG = join(CREW, 'runs', 'actions.log');

const args = process.argv.slice(2);
const cmd = args[0];
const LIVE = args.includes('--live');
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const VALUE_FLAGS = new Set(['--campaign', '--preset', '--since', '--until', '--level']);
const positional = [];
for (let i = 1; i < args.length; i++) {
  if (VALUE_FLAGS.has(args[i])) { i++; continue; }
  if (!args[i].startsWith('--')) positional.push(args[i]);
}

const M = CONFIG.meta;
const G = CONFIG.guardrails;
const BASE = `https://graph.facebook.com/${M.api_version}`;

function die(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1); }
function log(line) {
  mkdirSync(dirname(LOG), { recursive: true });
  appendFileSync(LOG, `${new Date().toISOString()} ${LIVE ? 'LIVE' : 'DRY '} ${line}\n`);
}
function assertConfigured() {
  if (!M.ad_account_id || M.ad_account_id.includes('REPLACE')) die('Set meta.ad_account_id in meta-ads-crew/config.json (format act_1234567890).');
  if (!M.page_id || M.page_id.includes('REPLACE')) die('Set meta.page_id in meta-ads-crew/config.json (the Prime Piece Facebook Page id).');
}
const toMinor = (nzd) => Math.round(Number(nzd) * 100); // NZD has 2 decimal places
const fromMinor = (v) => Number(v) / 100;

// ---------- Graph API ----------
async function graph(method, path, params = {}) {
  const url = new URL(`${BASE}/${path.replace(/^\//, '')}`);
  const headers = {};
  if (process.env.META_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.META_ACCESS_TOKEN}`;
  let body;
  const enc = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, enc(v));
  } else {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) form.set(k, enc(v));
    body = form;
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e) {
    die(`Could not reach graph.facebook.com (${e.message}). In a cloud session, the Meta token must be saved as a network secret for graph.facebook.com — see meta-ads-crew/README.md.`);
  }
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json.error) {
    const e = json.error || {};
    const hint = res.status === 401 || e.code === 190 ? ' (token missing/expired — re-save the graph.facebook.com credential)' : '';
    die(`Meta API ${method} ${path} → ${res.status}: ${e.message || text.slice(0, 300)}${e.error_user_msg ? ` — ${e.error_user_msg}` : ''}${hint}`);
  }
  return json;
}

async function graphAll(path, params) {
  const out = [];
  let page = await graph('GET', path, params);
  out.push(...(page.data || []));
  while (page.paging && page.paging.next) {
    const next = new URL(page.paging.next);
    const p = Object.fromEntries(next.searchParams.entries());
    delete p.access_token;
    page = await graph('GET', path, p);
    out.push(...(page.data || []));
  }
  return out;
}

// ---------- run-dir plan ----------
function loadPlan(runDir) {
  if (!runDir) die('Pass a run directory, e.g. meta-ads-crew/runs/2026-11-24-rosso-levanto-plinth');
  const dir = resolve(REPO, runDir);
  const file = join(dir, 'campaign.json');
  if (!existsSync(file)) die(`No campaign.json in ${dir}`);
  return { dir, plan: JSON.parse(readFileSync(file, 'utf8')) };
}

function validatePlan(plan, dir) {
  const problems = [];
  if (!plan.campaign?.name) problems.push('campaign.name missing');
  if (!Array.isArray(plan.adsets) || !plan.adsets.length) problems.push('no adsets');
  if (!Array.isArray(plan.ads) || !plan.ads.length) problems.push('no ads');
  let total = 0;
  for (const s of plan.adsets || []) {
    if (!s.key || !s.name) problems.push(`adset missing key/name: ${JSON.stringify(s)}`);
    const b = Number(s.daily_budget_nzd);
    if (!(b > 0)) problems.push(`adset ${s.key}: daily_budget_nzd must be > 0`);
    if (b > G.max_daily_budget_per_adset_nzd) problems.push(`adset ${s.key}: $${b}/day is over the per-ad-set cap of $${G.max_daily_budget_per_adset_nzd}`);
    total += b || 0;
  }
  if (total > G.max_total_daily_budget_nzd) problems.push(`total $${total}/day is over the account cap of $${G.max_total_daily_budget_nzd}`);
  const keys = new Set((plan.adsets || []).map((s) => s.key));
  for (const a of plan.ads || []) {
    const where = `ad ${a.key || '?'}`;
    if (!keys.has(a.adset)) problems.push(`${where}: adset "${a.adset}" not in adsets`);
    for (const f of ['primary_text', 'headline', 'link', 'image']) if (!a[f]) problems.push(`${where}: ${f} missing`);
    if (a.headline && a.headline.length > 40) problems.push(`${where}: headline is ${a.headline.length} chars (keep ≤ 40)`);
    if (a.link && !a.link.startsWith(CONFIG.site.base_url)) problems.push(`${where}: link must be on ${CONFIG.site.base_url}`);
    if (a.image && !existsSync(resolve(REPO, a.image))) problems.push(`${where}: image ${a.image} not found in repo`);
  }
  return { problems, total };
}

// ---------- commands ----------
async function check() {
  assertConfigured();
  const me = await graph('GET', 'me', { fields: 'id,name' });
  const acct = await graph('GET', M.ad_account_id, { fields: 'name,account_status,currency,timezone_name,amount_spent,spend_cap,disable_reason' });
  const STATUS = { 1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW', 8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 101: 'CLOSED' };
  const page = await graph('GET', M.page_id, { fields: 'name' });
  const pixel = await graph('GET', M.pixel_id, { fields: 'name,last_fired_time,is_unavailable' });
  const hoursSinceFire = pixel.last_fired_time ? (Date.now() - Date.parse(pixel.last_fired_time)) / 36e5 : Infinity;
  console.log(JSON.stringify({
    token_user: me.name,
    ad_account: { name: acct.name, status: STATUS[acct.account_status] || acct.account_status, currency: acct.currency, timezone: acct.timezone_name },
    page: page.name,
    pixel: { name: pixel.name, last_fired_time: pixel.last_fired_time, healthy: hoursSinceFire < 24 && !pixel.is_unavailable },
    currency_matches_config: acct.currency === M.currency,
  }, null, 2));
  if (acct.account_status !== 1) die('Ad account is not ACTIVE — fix billing/status in Ads Manager before launching.');
}

async function validate(runDir) {
  const { plan, dir } = loadPlan(runDir);
  const { problems, total } = validatePlan(plan, dir);
  if (problems.length) die(`campaign.json failed guardrails:\n  - ${problems.join('\n  - ')}`);
  console.log(`✔ ${plan.ads.length} ads in ${plan.adsets.length} ad sets, $${total}/day total — within guardrails.`);
}

function withUtm(link, plan, ad) {
  const slug = (plan.run || basename(plan.campaign.name)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const q = CONFIG.site.utm.replace('{campaign_slug}', slug).replace('{ad_key}', ad.key);
  return link + (link.includes('?') ? '&' : '?') + q;
}

async function launch(runDir) {
  assertConfigured();
  const { plan, dir } = loadPlan(runDir);
  const { problems, total } = validatePlan(plan, dir);
  if (problems.length) die(`campaign.json failed guardrails:\n  - ${problems.join('\n  - ')}`);
  const outFile = join(dir, 'launched.json');
  if (existsSync(outFile)) die(`${outFile} exists — this run was already launched. Delete it only if you are sure nothing was created.`);

  const calls = [];
  const step = async (label, method, path, params) => {
    calls.push({ label, method, path, params });
    if (!LIVE) return { id: `DRY_${label}` };
    const r = await graph(method, path, params);
    log(`launch ${label} → ${r.id || JSON.stringify(r).slice(0, 120)}`);
    return r;
  };

  const status = 'PAUSED'; // never anything else from launch
  const campaign = await step('campaign', 'POST', `${M.ad_account_id}/campaigns`, {
    name: plan.campaign.name,
    objective: 'OUTCOME_SALES',
    buying_type: 'AUCTION',
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
    status,
  });

  const adsetIds = {};
  for (const s of plan.adsets) {
    const targeting = {
      geo_locations: { countries: s.countries || M.countries },
      age_min: s.age_min || 25,
      targeting_automation: { advantage_audience: 1 },
    };
    const r = await step(`adset:${s.key}`, 'POST', `${M.ad_account_id}/adsets`, {
      name: s.name,
      campaign_id: campaign.id,
      daily_budget: toMinor(s.daily_budget_nzd),
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      promoted_object: { pixel_id: M.pixel_id, custom_event_type: 'PURCHASE' },
      targeting,
      status,
    });
    adsetIds[s.key] = r.id;
  }

  const imageHashes = {};
  for (const img of [...new Set(plan.ads.map((a) => a.image))]) {
    if (!LIVE) { calls.push({ label: `image:${img}`, method: 'POST', path: `${M.ad_account_id}/adimages`, params: { bytes: `<base64 of ${img}>` } }); imageHashes[img] = `DRY_HASH_${img}`; continue; }
    const r = await graph('POST', `${M.ad_account_id}/adimages`, { bytes: readFileSync(resolve(REPO, img)).toString('base64') });
    const first = Object.values(r.images || {})[0];
    if (!first?.hash) die(`Image upload for ${img} returned no hash: ${JSON.stringify(r).slice(0, 200)}`);
    imageHashes[img] = first.hash;
    log(`launch image ${img} → ${first.hash}`);
  }

  const ads = {};
  for (const a of plan.ads) {
    const link = withUtm(a.link, plan, a);
    const story = {
      page_id: M.page_id,
      link_data: {
        image_hash: imageHashes[a.image],
        link,
        message: a.primary_text,
        name: a.headline,
        description: a.description || undefined,
        call_to_action: { type: a.cta || 'SHOP_NOW', value: { link } },
      },
    };
    if (M.instagram_user_id) story.instagram_user_id = M.instagram_user_id;
    const cr = await step(`creative:${a.key}`, 'POST', `${M.ad_account_id}/adcreatives`, { name: `${plan.campaign.name} | ${a.key}`, object_story_spec: story });
    const ad = await step(`ad:${a.key}`, 'POST', `${M.ad_account_id}/ads`, {
      name: `${a.key} | ${a.angle || ''} | ${a.hook_id || ''}`.replace(/\s\|\s*$/g, ''),
      adset_id: adsetIds[a.adset],
      creative: { creative_id: cr.id },
      status,
    });
    ads[a.key] = { ad_id: ad.id, creative_id: cr.id, adset_key: a.adset };
  }

  if (!LIVE) {
    console.log(JSON.stringify(calls, null, 2));
    console.log(`\nDRY RUN — ${calls.length} calls above, nothing sent. Re-run with --live to create everything PAUSED ($${total}/day once activated).`);
    return;
  }
  const record = { launched_at: new Date().toISOString(), status: 'PAUSED', campaign_id: campaign.id, adsets: adsetIds, ads, daily_budget_total_nzd: total };
  writeFileSync(outFile, JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record, null, 2));
  console.log(`\n✔ Created PAUSED in Ads Manager. Nothing is spending. Review: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${M.ad_account_id.replace('act_', '')}&selected_campaign_ids=${campaign.id}`);
}

async function activate(runDir) {
  const { dir } = loadPlan(runDir);
  const launchedFile = join(dir, 'launched.json');
  const approvalFile = join(dir, 'approval.json');
  if (!existsSync(launchedFile)) die('Not launched yet — run `launch <run-dir> --live` first.');
  if (!existsSync(approvalFile)) die('No approval.json — activation needs James\'s explicit approval (/desk-approve writes it).');
  const approval = JSON.parse(readFileSync(approvalFile, 'utf8'));
  if (approval.decision !== 'approved' || approval.action !== 'activate') die('approval.json does not approve activation.');
  const launched = JSON.parse(readFileSync(launchedFile, 'utf8'));
  if (launched.status === 'ACTIVE') die('Already active.');
  const ids = [launched.campaign_id, ...Object.values(launched.adsets), ...Object.values(launched.ads).map((a) => a.ad_id)];
  if (!LIVE) { console.log(`DRY RUN — would set ACTIVE: ${ids.join(', ')}  ($${launched.daily_budget_total_nzd}/day). Re-run with --live.`); return; }
  for (const id of ids) { await graph('POST', id, { status: 'ACTIVE' }); log(`activate ${id}`); }
  launched.status = 'ACTIVE';
  launched.activated_at = new Date().toISOString();
  launched.approved_by = approval.approved_by;
  writeFileSync(launchedFile, JSON.stringify(launched, null, 2));
  console.log(`✔ Live: ${ids.length} objects ACTIVE, $${launched.daily_budget_total_nzd}/day.`);
}

function actionValue(list, types) {
  for (const t of types) { const hit = (list || []).find((x) => x.action_type === t); if (hit) return Number(hit.value); }
  return 0;
}

async function insights() {
  assertConfigured();
  const level = flag('--level') || 'ad';
  const campaign = flag('--campaign');
  const range = flag('--since') ? { time_range: { since: flag('--since'), until: flag('--until') || new Date().toISOString().slice(0, 10) } } : { date_preset: flag('--preset') || 'last_3d' };
  const rows = await graphAll(campaign ? `${campaign}/insights` : `${M.ad_account_id}/insights`, {
    level,
    fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,frequency,cpm,inline_link_clicks,inline_link_click_ctr,actions,action_values',
    limit: 200,
    ...range,
  });
  const P = ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase'];
  const out = rows.map((r) => {
    const spend = Number(r.spend || 0);
    const purchases = actionValue(r.actions, P);
    const value = actionValue(r.action_values, P);
    return {
      level, id: r[`${level}_id`], name: r[`${level}_name`], campaign: r.campaign_name, adset: r.adset_name,
      spend_nzd: spend, impressions: Number(r.impressions || 0), frequency: Number(r.frequency || 0), cpm_nzd: Number(r.cpm || 0),
      link_clicks: Number(r.inline_link_clicks || 0), link_ctr_pct: Number(r.inline_link_click_ctr || 0),
      add_to_cart: actionValue(r.actions, ['offsite_conversion.fb_pixel_add_to_cart', 'add_to_cart', 'omni_add_to_cart']),
      initiate_checkout: actionValue(r.actions, ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout', 'omni_initiated_checkout']),
      purchases, purchase_value_nzd: value,
      roas: spend ? +(value / spend).toFixed(2) : null,
      cpa_nzd: purchases ? +(spend / purchases).toFixed(2) : null,
    };
  });
  console.log(JSON.stringify({ range, rows: out }, null, 2));
}

async function spend() {
  assertConfigured();
  const range = flag('--since') ? { time_range: { since: flag('--since'), until: flag('--until') || new Date().toISOString().slice(0, 10) } } : { date_preset: flag('--preset') || 'last_7d' };
  const rows = await graphAll(`${M.ad_account_id}/insights`, { level: 'account', fields: 'spend', time_increment: 1, limit: 100, ...range });
  const days = rows.map((r) => ({ date: r.date_start, spend_nzd: Number(r.spend || 0) }));
  console.log(JSON.stringify({ range, total_spend_nzd: +days.reduce((s, d) => s + d.spend_nzd, 0).toFixed(2), days }, null, 2));
}

async function pause(id) {
  if (!id) die('pause <ad-or-adset-id>');
  if (!LIVE) { console.log(`DRY RUN — would set ${id} PAUSED. Re-run with --live.`); return; }
  await graph('POST', id, { status: 'PAUSED' });
  log(`pause ${id}`);
  console.log(`✔ ${id} paused.`);
}

async function setBudget(id, nzd) {
  if (!id || !nzd) die('set-budget <adset-id> <nzd>');
  const target = Number(nzd);
  const cur = await graph('GET', id, { fields: 'name,daily_budget,updated_time,campaign_id' });
  const current = fromMinor(cur.daily_budget);
  if (target > G.max_daily_budget_per_adset_nzd) die(`$${target}/day is over the per-ad-set cap of $${G.max_daily_budget_per_adset_nzd} (config.json guardrails).`);
  if (target > current) {
    const maxStep = current * (1 + G.max_scale_step_pct / 100);
    if (target > maxStep + 0.001) die(`$${current} → $${target} is more than the ${G.max_scale_step_pct}% max step (max $${maxStep.toFixed(2)}).`);
    const hours = (Date.now() - Date.parse(cur.updated_time)) / 36e5;
    if (hours < G.min_hours_between_budget_changes) die(`Ad set was edited ${hours.toFixed(1)}h ago — wait ${G.min_hours_between_budget_changes}h between budget changes so the learning phase can settle.`);
    const approvalFile = join(CREW, 'runs', 'scale-approvals.json');
    const approvals = existsSync(approvalFile) ? JSON.parse(readFileSync(approvalFile, 'utf8')) : [];
    const ok = approvals.find((a) => a.adset_id === id && Number(a.to_nzd) === target && a.decision === 'approved' && !a.used);
    if (!ok) die(`Budget increase needs approval. Add {"adset_id":"${id}","from_nzd":${current},"to_nzd":${target},"decision":"approved","approved_by":"James"} to meta-ads-crew/runs/scale-approvals.json (the /desk-scale flow does this when you approve).`);
    const all = await graphAll(`${M.ad_account_id}/adsets`, { fields: 'daily_budget,effective_status', limit: 200 });
    const liveTotal = all.filter((s) => s.effective_status === 'ACTIVE' && s.id !== id).reduce((s, x) => s + fromMinor(x.daily_budget || 0), 0) + target;
    if (liveTotal > G.max_total_daily_budget_nzd) die(`That would take the account to $${liveTotal.toFixed(2)}/day, over the $${G.max_total_daily_budget_nzd} total cap.`);
    if (LIVE) { ok.used = new Date().toISOString(); writeFileSync(approvalFile, JSON.stringify(approvals, null, 2)); }
  }
  if (!LIVE) { console.log(`DRY RUN — would change ${cur.name} (${id}) from $${current}/day to $${target}/day. Re-run with --live.`); return; }
  await graph('POST', id, { daily_budget: toMinor(target) });
  log(`set-budget ${id} ${current} -> ${target}`);
  console.log(`✔ ${cur.name}: $${current}/day → $${target}/day.`);
}

const COMMANDS = {
  check, insights, spend,
  validate: () => validate(positional[0]),
  launch: () => launch(positional[0]),
  activate: () => activate(positional[0]),
  pause: () => pause(positional[0]),
  'set-budget': () => setBudget(positional[0], positional[1]),
};
if (!COMMANDS[cmd]) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//   node')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
await COMMANDS[cmd]();
