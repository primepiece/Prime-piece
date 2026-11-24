#!/usr/bin/env node
// Meta Ads crew — the only code that touches the Meta Marketing API.
//
// The six desks in .claude/agents/ decide WHAT to do; this script decides whether
// it is ALLOWED. Every spend-related rule in meta-ads-crew/crew.config.json
// ("guardrails") is enforced here, so a confused agent cannot overspend by writing
// a bigger number — the script just refuses.
//
// Hard rules (not configurable):
//   - Everything the crew creates starts PAUSED. Nothing goes live without
//     `activate ... --approved-by-human`.
//   - The script only ever modifies campaigns whose name starts with "CREW | ".
//     Hand-built campaigns in the account are read-only to the crew.
//   - Budgets only go up via `scale`, in fixed % steps, with a cooldown, under caps.
//   - Pausing (spend goes DOWN) is the only write allowed without a human, and only
//     if guardrails.auto_pause_allowed is true.
//
// Auth: the access token is read from META_ACCESS_TOKEN if set. In a Claude Code
// cloud session it is normally injected by the network proxy for graph.facebook.com
// instead, so the placeholder below is replaced on the wire and never stored here.
//
// Usage:
//   node scripts/meta-ads/meta.mjs whoami
//   node scripts/meta-ads/meta.mjs check-pixel
//   node scripts/meta-ads/meta.mjs list
//   node scripts/meta-ads/meta.mjs draft <run-dir> [--dry-run]
//   node scripts/meta-ads/meta.mjs activate <run-dir> --approved-by-human [--dry-run]
//   node scripts/meta-ads/meta.mjs insights [--days 7]
//   node scripts/meta-ads/meta.mjs pause <id> --reason "..." [--approved-by-human] [--dry-run]
//   node scripts/meta-ads/meta.mjs scale <adset-id> [--approved-by-human] [--dry-run]
//   node scripts/meta-ads/meta.mjs mer [--days 7] [--revenue 1234.56]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CREW = path.join(ROOT, 'meta-ads-crew');
const CONFIG_PATH = path.join(CREW, 'crew.config.json');
const LEDGER_PATH = path.join(CREW, 'ledger.jsonl');

// ---------- small helpers ----------

function die(msg, code = 1) {
  console.error(`\n✋ ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return cfg;
}

function requireAccountConfig(cfg) {
  const m = cfg.meta;
  if (!m.ad_account_id || m.ad_account_id.includes('REPLACE')) die('Set meta.ad_account_id (e.g. "act_1234567890") in meta-ads-crew/crew.config.json first.');
  if (!m.ad_account_id.startsWith('act_')) die('meta.ad_account_id must start with "act_".');
  if (!m.page_id || m.page_id.includes('REPLACE')) die('Set meta.page_id (your Facebook Page id) in meta-ads-crew/crew.config.json first.');
}

const nzdToMinor = (nzd) => Math.round(Number(nzd) * 100);
const minorToNzd = (minor) => Number(minor) / 100;
const PREFIX = (cfg) => `${cfg.naming.prefix} | `;
const isCrew = (cfg, name) => typeof name === 'string' && name.startsWith(PREFIX(cfg));

function appendLedger(entry) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  fs.appendFileSync(LEDGER_PATH, line + '\n');
}

function readLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  return fs.readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ---------- Graph API ----------

function graph(cfg) {
  const base = `https://graph.facebook.com/${cfg.meta.api_version}`;
  const token = process.env.META_ACCESS_TOKEN || 'injected-by-proxy';
  const headers = { Authorization: `Bearer ${token}` };

  async function handle(res) {
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok || data.error) {
      const e = data.error || {};
      const detail = [e.message, e.error_user_title, e.error_user_msg].filter(Boolean).join(' — ');
      throw new Error(`Meta API ${res.status}: ${detail || text.slice(0, 400)}`);
    }
    return data;
  }

  function encode(params) {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      body.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    return body;
  }

  return {
    async get(p, params = {}) {
      const url = `${base}/${p}?${encode(params).toString()}`;
      return handle(await fetch(url, { headers }));
    },
    async getAll(p, params = {}) {
      let data = await this.get(p, { limit: 200, ...params });
      const rows = [...(data.data || [])];
      while (data.paging && data.paging.next) {
        data = await handle(await fetch(data.paging.next, { headers }));
        rows.push(...(data.data || []));
      }
      return rows;
    },
    async post(p, params = {}) {
      return handle(await fetch(`${base}/${p}`, { method: 'POST', headers, body: encode(params) }));
    },
  };
}

// Fetch any campaign/adset/ad and return { id, type, name, campaignName }.
async function describeObject(g, id) {
  const meta = await g.get(id, { metadata: 1, fields: 'id,name' });
  const type = meta.metadata && meta.metadata.type;
  if (type === 'campaign') return { id, type, name: meta.name, campaignName: meta.name };
  if (type === 'adset' || type === 'ad') {
    const full = await g.get(id, { fields: 'id,name,campaign{name}' });
    return { id, type, name: full.name, campaignName: full.campaign && full.campaign.name };
  }
  throw new Error(`Object ${id} is a "${type}", not a campaign, ad set or ad.`);
}

async function crewActiveDailyBudgetMinor(g, cfg) {
  const adsets = await g.getAll(`${cfg.meta.ad_account_id}/adsets`, {
    fields: 'id,name,daily_budget,effective_status,campaign{name}',
    filtering: [{ field: 'campaign.name', operator: 'CONTAIN', value: PREFIX(cfg) }],
  });
  return adsets
    .filter((a) => isCrew(cfg, a.campaign && a.campaign.name))
    .filter((a) => ['ACTIVE', 'PENDING_REVIEW', 'IN_PROCESS', 'WITH_ISSUES'].includes(a.effective_status))
    .reduce((sum, a) => sum + Number(a.daily_budget || 0), 0);
}

function pickAction(list, types) {
  if (!Array.isArray(list)) return 0;
  for (const t of types) {
    const hit = list.find((x) => x.action_type === t);
    if (hit) return Number(hit.value);
  }
  return 0;
}
const PURCHASE_TYPES = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];

// ---------- commands ----------

async function cmdWhoami(cfg) {
  requireAccountConfig(cfg);
  const g = graph(cfg);
  const acct = await g.get(cfg.meta.ad_account_id, { fields: 'name,account_status,currency,timezone_name,amount_spent,spend_cap,disable_reason' });
  const page = await g.get(cfg.meta.page_id, { fields: 'name' }).catch((e) => ({ error: e.message }));
  out({ ad_account: acct, page });
  if (acct.currency && acct.currency !== cfg.meta.currency) {
    console.error(`⚠️  Account currency is ${acct.currency} but crew.config.json says ${cfg.meta.currency}. Budgets would be wrong — fix the config.`);
  }
}

async function pixelStatus(g, cfg) {
  const px = await g.get(cfg.meta.pixel_id, { fields: 'name,last_fired_time,is_unavailable' });
  const last = px.last_fired_time ? new Date(px.last_fired_time) : null;
  const hours = last ? (Date.now() - last.getTime()) / 36e5 : Infinity;
  return { ...px, hours_since_last_fire: Number.isFinite(hours) ? Math.round(hours * 10) / 10 : null, healthy: hours <= cfg.guardrails.require_pixel_fired_within_hours && !px.is_unavailable };
}

async function cmdCheckPixel(cfg) {
  const g = graph(cfg);
  const st = await pixelStatus(g, cfg);
  out(st);
  console.error(st.healthy
    ? `✅ Pixel fired ${st.hours_since_last_fire}h ago.`
    : `❌ Pixel has not fired in the last ${cfg.guardrails.require_pixel_fired_within_hours}h — the crew will refuse to launch.`);
  console.error('ℹ️  Server-side Conversions API (CAPI) is not checked here: confirm "Server" events for Purchase in Events Manager → Overview. See meta-ads-crew/04-launch-desk/launch.md.');
}

async function cmdList(cfg) {
  requireAccountConfig(cfg);
  const g = graph(cfg);
  const camps = await g.getAll(`${cfg.meta.ad_account_id}/campaigns`, {
    fields: 'id,name,effective_status,created_time,adsets{id,name,daily_budget,effective_status}',
    filtering: [{ field: 'name', operator: 'CONTAIN', value: PREFIX(cfg) }],
  });
  out(camps.filter((c) => isCrew(cfg, c.name)).map((c) => ({
    id: c.id, name: c.name, status: c.effective_status, created: c.created_time,
    adsets: ((c.adsets && c.adsets.data) || []).map((a) => ({ id: a.id, name: a.name, status: a.effective_status, daily_budget_nzd: minorToNzd(a.daily_budget || 0) })),
  })));
}

function validateCampaignSpec(cfg, spec, runDir) {
  const errs = [];
  const gr = cfg.guardrails;
  if (!spec.name) errs.push('campaign.json: "name" is required.');
  if (!(spec.daily_budget_nzd > 0)) errs.push('campaign.json: "daily_budget_nzd" must be a positive number.');
  if (spec.daily_budget_nzd > gr.max_daily_budget_per_campaign_nzd) errs.push(`daily_budget_nzd ${spec.daily_budget_nzd} is over the cap of ${gr.max_daily_budget_per_campaign_nzd} (guardrails.max_daily_budget_per_campaign_nzd).`);
  if (!Array.isArray(spec.ads) || spec.ads.length === 0) errs.push('campaign.json: "ads" must be a non-empty array.');
  if (Array.isArray(spec.ads) && spec.ads.length > gr.max_ads_per_launch) errs.push(`${spec.ads.length} ads is over the cap of ${gr.max_ads_per_launch} (guardrails.max_ads_per_launch).`);
  for (const [i, ad] of (spec.ads || []).entries()) {
    const tag = `ads[${i}] (${ad.name || 'unnamed'})`;
    for (const f of ['name', 'primary_text', 'headline', 'link', 'image']) if (!ad[f]) errs.push(`${tag}: "${f}" is required.`);
    if (ad.link) {
      try {
        const host = new URL(ad.link).hostname;
        if (!cfg.allowed_link_domains.includes(host)) errs.push(`${tag}: link host "${host}" is not in allowed_link_domains.`);
      } catch { errs.push(`${tag}: link is not a valid URL.`); }
    }
    if (ad.image) {
      const p = path.resolve(ROOT, ad.image);
      if (!p.startsWith(ROOT)) errs.push(`${tag}: image must be inside the repo.`);
      else if (!fs.existsSync(p)) errs.push(`${tag}: image "${ad.image}" not found.`);
      else if (!/\.(jpe?g|png)$/i.test(p)) errs.push(`${tag}: image must be .jpg or .png (the Meta image upload only reliably accepts these).`);
    }
    if (ad.headline && ad.headline.length > 40) errs.push(`${tag}: headline is ${ad.headline.length} chars; keep it ≤ 40.`);
    if (ad.primary_text && ad.primary_text.length > 600) errs.push(`${tag}: primary_text is ${ad.primary_text.length} chars; keep it ≤ 600.`);
  }
  if (errs.length) die(`campaign.json in ${path.relative(ROOT, runDir)} failed checks:\n  - ${errs.join('\n  - ')}`);
}

function utmFor(cfg, campaign, ad) {
  return cfg.defaults.utm
    .replace('{{campaign}}', encodeURIComponent(campaign))
    .replace('{{ad}}', encodeURIComponent(ad));
}

async function cmdDraft(cfg, runDirArg, flags) {
  if (!runDirArg) die('Usage: draft <run-dir>');
  const runDir = path.resolve(ROOT, runDirArg);
  const specPath = path.join(runDir, 'campaign.json');
  const launchPath = path.join(runDir, 'launch.json');
  if (!fs.existsSync(specPath)) die(`No campaign.json in ${runDirArg}.`);
  if (fs.existsSync(launchPath) && !flags['dry-run']) die(`${runDirArg}/launch.json already exists — this run was already drafted. Make a new run instead of drafting twice.`);
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  validateCampaignSpec(cfg, spec, runDir);
  if (!flags['dry-run']) requireAccountConfig(cfg);

  const acct = cfg.meta.ad_account_id;
  const campaignName = isCrew(cfg, spec.name) ? spec.name : `${PREFIX(cfg)}${spec.name}`;
  const d = cfg.defaults;
  const advantage = d.advantage_audience !== false;
  const targeting = {
    geo_locations: { countries: [d.country] },
    age_min: advantage ? Math.min(d.age_min, 25) : d.age_min,
    age_max: advantage ? 65 : d.age_max,
    targeting_automation: { advantage_audience: advantage ? 1 : 0 },
  };

  const plan = {
    campaign: { name: campaignName, objective: 'OUTCOME_SALES', status: 'PAUSED', buying_type: 'AUCTION', special_ad_categories: [], is_adset_budget_sharing_enabled: false },
    adset: {
      name: `${campaignName} | Broad ${d.country}`,
      daily_budget: nzdToMinor(spec.daily_budget_nzd),
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      promoted_object: { pixel_id: cfg.meta.pixel_id, custom_event_type: cfg.targets.primary_event || 'PURCHASE' },
      targeting,
      status: 'PAUSED',
    },
    ads: spec.ads.map((ad) => ({
      name: `${campaignName} | ${ad.name}`,
      image: ad.image,
      creative: {
        name: `${campaignName} | ${ad.name}`,
        url_tags: utmFor(cfg, campaignName, ad.name),
        object_story_spec: {
          page_id: cfg.meta.page_id,
          ...(cfg.meta.instagram_user_id ? { instagram_user_id: cfg.meta.instagram_user_id } : {}),
          link_data: {
            link: ad.link,
            message: ad.primary_text,
            name: ad.headline,
            ...(ad.description ? { description: ad.description } : {}),
            call_to_action: { type: ad.cta || d.call_to_action, value: { link: ad.link } },
          },
        },
      },
    })),
  };

  if (flags['dry-run']) {
    console.error('🧪 Dry run — nothing sent to Meta. This is exactly what would be created (all PAUSED):');
    out(plan);
    return;
  }

  const g = graph(cfg);
  const result = { drafted_at: new Date().toISOString(), campaign_name: campaignName, daily_budget_nzd: spec.daily_budget_nzd, ads: [] };
  const camp = await g.post(`${acct}/campaigns`, plan.campaign);
  result.campaign_id = camp.id;
  // Write progress as we go so a mid-way failure leaves a record of what exists.
  const save = () => fs.writeFileSync(launchPath, JSON.stringify(result, null, 2));
  save();
  const adset = await g.post(`${acct}/adsets`, { ...plan.adset, campaign_id: camp.id });
  result.adset_id = adset.id;
  save();

  const hashes = {};
  for (const ad of plan.ads) {
    if (!hashes[ad.image]) {
      const bytes = fs.readFileSync(path.resolve(ROOT, ad.image)).toString('base64');
      const up = await g.post(`${acct}/adimages`, { bytes });
      const first = Object.values(up.images || {})[0];
      if (!first || !first.hash) throw new Error(`Image upload for ${ad.image} returned no hash.`);
      hashes[ad.image] = first.hash;
    }
    const creative = structuredClone(ad.creative);
    creative.object_story_spec.link_data.image_hash = hashes[ad.image];
    const cr = await g.post(`${acct}/adcreatives`, creative);
    const created = await g.post(`${acct}/ads`, { name: ad.name, adset_id: adset.id, creative: { creative_id: cr.id }, status: 'PAUSED' });
    result.ads.push({ name: ad.name, ad_id: created.id, creative_id: cr.id });
    save();
  }
  appendLedger({ action: 'draft', run: path.relative(ROOT, runDir), campaign_id: camp.id, adset_id: adset.id, daily_budget_nzd: spec.daily_budget_nzd, ads: result.ads.length });
  console.error(`✅ Drafted ${result.ads.length} ads in PAUSED campaign ${camp.id}. Nothing is spending. Review in Ads Manager, then approve to go live.`);
  out(result);
}

async function cmdActivate(cfg, runDirArg, flags) {
  if (!runDirArg) die('Usage: activate <run-dir> --approved-by-human');
  if (!flags['approved-by-human']) die('Going live spends real money. Only run this after the human has explicitly approved this run, then pass --approved-by-human.');
  requireAccountConfig(cfg);
  const runDir = path.resolve(ROOT, runDirArg);
  const launchPath = path.join(runDir, 'launch.json');
  if (!fs.existsSync(launchPath)) die(`No launch.json in ${runDirArg} — draft it first.`);
  const launch = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
  if (launch.activated_at) die(`${runDirArg} was already activated at ${launch.activated_at}.`);

  const g = graph(cfg);
  const camp = await describeObject(g, launch.campaign_id);
  if (!isCrew(cfg, camp.name)) die(`Campaign ${camp.id} is not a crew campaign ("${camp.name}"). Refusing.`);

  const px = await pixelStatus(g, cfg);
  if (!px.healthy) die(`Pixel ${cfg.meta.pixel_id} last fired ${px.hours_since_last_fire ?? 'never'}h ago (limit ${cfg.guardrails.require_pixel_fired_within_hours}h). Fix tracking before spending — Meta would be optimising blind.`);

  const adset = await g.get(launch.adset_id, { fields: 'daily_budget' });
  const current = await crewActiveDailyBudgetMinor(g, cfg);
  const after = current + Number(adset.daily_budget);
  const cap = nzdToMinor(cfg.guardrails.max_total_crew_daily_budget_nzd);
  if (after > cap) die(`Going live would take total crew daily budget to $${minorToNzd(after)} (cap $${minorToNzd(cap)}). Pause something or raise guardrails.max_total_crew_daily_budget_nzd.`);

  const writes = [
    [launch.campaign_id, { status: 'ACTIVE' }],
    [launch.adset_id, { status: 'ACTIVE' }],
    ...launch.ads.map((a) => [a.ad_id, { status: 'ACTIVE' }]),
  ];
  if (flags['dry-run']) { console.error('🧪 Dry run — would set ACTIVE:'); out(writes); return; }
  for (const [id, body] of writes) await g.post(id, body);
  launch.activated_at = new Date().toISOString();
  fs.writeFileSync(launchPath, JSON.stringify(launch, null, 2));
  appendLedger({ action: 'activate', run: path.relative(ROOT, runDir), campaign_id: launch.campaign_id, adset_id: launch.adset_id, daily_budget_nzd: minorToNzd(adset.daily_budget), crew_total_after_nzd: minorToNzd(after) });
  console.error(`🚀 Live. Campaign ${launch.campaign_id} at $${minorToNzd(adset.daily_budget)}/day. Total crew budget now $${minorToNzd(after)}/day. Ads enter Meta review first.`);
}

async function cmdInsights(cfg, flags) {
  requireAccountConfig(cfg);
  const g = graph(cfg);
  const days = Number(flags.days || 7);
  const until = new Date();
  const since = new Date(Date.now() - days * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const rows = await g.getAll(`${cfg.meta.ad_account_id}/insights`, {
    level: 'ad',
    time_range: { since: fmt(since), until: fmt(until) },
    fields: 'campaign_id,campaign_name,adset_id,ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,frequency,actions,action_values',
    filtering: [{ field: 'campaign.name', operator: 'CONTAIN', value: PREFIX(cfg) }],
  });
  const ads = await g.getAll(`${cfg.meta.ad_account_id}/ads`, {
    fields: 'id,effective_status,created_time,campaign{name}',
    filtering: [{ field: 'campaign.name', operator: 'CONTAIN', value: PREFIX(cfg) }],
  });
  const ledger = readLedger();
  const activatedAt = {};
  for (const e of ledger) if (e.action === 'activate') activatedAt[e.campaign_id] = e.at;
  const status = Object.fromEntries(ads.map((a) => [a.id, a]));

  const gr = cfg.guardrails;
  const tgt = cfg.targets;
  const result = rows.filter((r) => isCrew(cfg, r.campaign_name)).map((r) => {
    const spend = Number(r.spend || 0);
    const purchases = pickAction(r.actions, PURCHASE_TYPES);
    const revenue = pickAction(r.action_values, PURCHASE_TYPES);
    const live = activatedAt[r.campaign_id] || (status[r.ad_id] && status[r.ad_id].created_time);
    const hoursLive = live ? (Date.now() - new Date(live).getTime()) / 36e5 : 0;
    const cpa = purchases ? spend / purchases : null;
    const roas = spend ? revenue / spend : null;

    // Mechanical verdict. Ollie interprets it; the numbers come from config, not vibes.
    let verdict = 'KEEP';
    let why = '';
    if (hoursLive < gr.min_hours_before_judging || spend < gr.min_spend_before_judging_nzd) {
      verdict = 'TOO_EARLY'; why = `needs ${gr.min_hours_before_judging}h live and $${gr.min_spend_before_judging_nzd} spent`;
    } else if (tgt.target_cpa_nzd && purchases === 0 && spend >= tgt.target_cpa_nzd * gr.kill_if_spend_over_cpa_multiple_with_zero_purchases) {
      verdict = 'KILL'; why = `$${spend.toFixed(2)} spent, 0 purchases (limit ${gr.kill_if_spend_over_cpa_multiple_with_zero_purchases}× target CPA)`;
    } else if (tgt.target_cpa_nzd && cpa !== null && cpa <= tgt.target_cpa_nzd && (!tgt.breakeven_roas || (roas ?? 0) >= tgt.breakeven_roas)) {
      verdict = 'WINNER'; why = `CPA $${cpa.toFixed(2)} ≤ target $${tgt.target_cpa_nzd}`;
    } else if (!tgt.target_cpa_nzd) {
      why = 'targets.target_cpa_nzd not set — cannot judge KILL/WINNER';
    }
    return {
      campaign: r.campaign_name, adset_id: r.adset_id, ad_id: r.ad_id, ad: r.ad_name,
      status: status[r.ad_id] ? status[r.ad_id].effective_status : 'UNKNOWN',
      hours_live: Math.round(hoursLive), spend_nzd: spend, impressions: Number(r.impressions || 0),
      ctr: Number(r.ctr || 0), cpm: Number(r.cpm || 0), frequency: Number(r.frequency || 0),
      purchases, revenue_nzd: revenue, cpa_nzd: cpa, roas, verdict, why,
    };
  });
  out({ window_days: days, rows: result });
}

async function cmdPause(cfg, id, flags) {
  if (!id) die('Usage: pause <campaign|adset|ad id> --reason "..."');
  if (!flags.reason || flags.reason === true) die('Pass --reason "why" so the ledger explains every pause.');
  if (!cfg.guardrails.auto_pause_allowed && !flags['approved-by-human']) die('guardrails.auto_pause_allowed is false — pausing needs --approved-by-human.');
  const g = graph(cfg);
  const obj = await describeObject(g, id);
  if (!isCrew(cfg, obj.campaignName)) die(`${obj.type} ${id} belongs to "${obj.campaignName}", which is not a crew campaign. Refusing to touch it.`);
  if (flags['dry-run']) { console.error(`🧪 Dry run — would pause ${obj.type} "${obj.name}".`); return; }
  await g.post(id, { status: 'PAUSED' });
  appendLedger({ action: 'pause', id, type: obj.type, name: obj.name, reason: flags.reason });
  console.error(`⏸️  Paused ${obj.type} "${obj.name}". Reason: ${flags.reason}`);
}

async function cmdScale(cfg, adsetId, flags) {
  if (!adsetId) die('Usage: scale <adset-id> --approved-by-human');
  const gr = cfg.guardrails;
  if (!gr.auto_scale_allowed && !flags['approved-by-human']) die('Scaling spends more money. guardrails.auto_scale_allowed is false, so the human must approve this step first, then pass --approved-by-human.');
  if (!cfg.targets.target_cpa_nzd || !cfg.targets.breakeven_roas) die('Set targets.target_cpa_nzd and targets.breakeven_roas in crew.config.json before scaling anything.');
  requireAccountConfig(cfg);

  const g = graph(cfg);
  const a = await g.get(adsetId, { fields: 'id,name,daily_budget,effective_status,campaign{name}' });
  if (!isCrew(cfg, a.campaign && a.campaign.name)) die(`Ad set ${adsetId} is not in a crew campaign. Refusing.`);
  if (!a.daily_budget) die('This ad set has no daily_budget (campaign budget?). The crew only scales ad-set daily budgets.');
  if (a.effective_status !== 'ACTIVE') die(`Ad set is ${a.effective_status}, not ACTIVE.`);

  const last = readLedger().filter((e) => e.action === 'scale' && e.adset_id === adsetId).pop();
  if (last) {
    const hrs = (Date.now() - new Date(last.at).getTime()) / 36e5;
    if (hrs < gr.min_hours_between_scale_steps) die(`Last scale step was ${hrs.toFixed(1)}h ago; cooldown is ${gr.min_hours_between_scale_steps}h so Meta's learning can settle.`);
  }

  const before = Number(a.daily_budget);
  let next = Math.round(before * (1 + gr.scale_step_pct / 100));
  const perCap = nzdToMinor(gr.max_daily_budget_after_scaling_nzd);
  if (next > perCap) next = perCap;
  if (next <= before) die(`Ad set is already at the per-ad-set ceiling ($${minorToNzd(perCap)}/day).`);

  const totalNow = await crewActiveDailyBudgetMinor(g, cfg);
  const totalAfter = totalNow - before + next;
  const totalCap = nzdToMinor(gr.max_total_crew_daily_budget_nzd);
  if (totalAfter > totalCap) die(`Would take total crew budget to $${minorToNzd(totalAfter)}/day (cap $${minorToNzd(totalCap)}).`);

  if (flags['dry-run']) { console.error(`🧪 Dry run — would move "${a.name}" from $${minorToNzd(before)} to $${minorToNzd(next)}/day.`); return; }
  await g.post(adsetId, { daily_budget: next });
  appendLedger({ action: 'scale', adset_id: adsetId, name: a.name, from_nzd: minorToNzd(before), to_nzd: minorToNzd(next), crew_total_after_nzd: minorToNzd(totalAfter) });
  console.error(`📈 "${a.name}": $${minorToNzd(before)} → $${minorToNzd(next)}/day (+${gr.scale_step_pct}%). Crew total $${minorToNzd(totalAfter)}/day. Next step allowed in ${gr.min_hours_between_scale_steps}h.`);
}

async function stripeRevenueNzd(sinceSec) {
  const headers = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY || 'injected-by-proxy'}` };
  let total = 0;
  let startingAfter;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ limit: '100', 'created[gte]': String(sinceSec) });
    if (startingAfter) qs.set('starting_after', startingAfter);
    const res = await fetch(`https://api.stripe.com/v1/charges?${qs}`, { headers });
    if (!res.ok) throw new Error(`Stripe ${res.status}`);
    const data = await res.json();
    for (const c of data.data) {
      if (c.paid && c.status === 'succeeded' && c.currency === 'nzd') total += (c.amount - (c.amount_refunded || 0)) / 100;
    }
    if (!data.has_more) break;
    startingAfter = data.data[data.data.length - 1].id;
  }
  return total;
}

async function cmdMer(cfg, flags) {
  requireAccountConfig(cfg);
  const g = graph(cfg);
  const days = Number(flags.days || 7);
  const since = new Date(Date.now() - days * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const ins = await g.get(`${cfg.meta.ad_account_id}/insights`, { level: 'account', fields: 'spend', time_range: { since: fmt(since), until: fmt(new Date()) } });
  const spend = Number((ins.data && ins.data[0] && ins.data[0].spend) || 0);

  let revenue = flags.revenue !== undefined ? Number(flags.revenue) : null;
  let source = 'manual';
  if (revenue === null) {
    try { revenue = await stripeRevenueNzd(Math.floor(since.getTime() / 1000)); source = 'stripe'; }
    catch (e) { source = `unavailable (${e.message}) — pass --revenue <total NZD> instead`; }
  }
  const mer = revenue !== null && spend ? revenue / spend : null;
  out({ window_days: days, meta_spend_nzd: spend, revenue_nzd: revenue, revenue_source: source, mer, target_mer: cfg.targets.target_mer, on_target: mer !== null && cfg.targets.target_mer ? mer >= cfg.targets.target_mer : null });
}

// ---------- main ----------

const [, , cmd, ...rest] = process.argv;
const { pos, flags } = parseArgs(rest);
const cfg = loadConfig();

const commands = {
  whoami: () => cmdWhoami(cfg),
  'check-pixel': () => cmdCheckPixel(cfg),
  list: () => cmdList(cfg),
  draft: () => cmdDraft(cfg, pos[0], flags),
  activate: () => cmdActivate(cfg, pos[0], flags),
  insights: () => cmdInsights(cfg, flags),
  pause: () => cmdPause(cfg, pos[0], flags),
  scale: () => cmdScale(cfg, pos[0], flags),
  mer: () => cmdMer(cfg, flags),
};

if (!commands[cmd]) {
  console.error('Commands: whoami | check-pixel | list | draft <run-dir> | activate <run-dir> --approved-by-human | insights [--days N] | pause <id> --reason ".." | scale <adset-id> --approved-by-human | mer [--days N]');
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch((e) => die(e.message));
