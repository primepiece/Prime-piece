# Prime Piece GTM system: 10 agents + GTM Brain inside Claude

An AI sales & marketing department for Prime Piece's **trade / B2B** side (interior designers, architects, developers, stylists, hotels, hospitality, showrooms, galleries, corporate gifting). It runs inside Claude Code as subagents. They share one pipeline file, and nothing is ever sent without James.

```
            ┌────────────── GTM Brain (measures, plans next week) ──────────────┐
            ▼                                                                    │
 Signal → Enrichment → Scoring → Research → Copywriting → Sequence ──► Gmail drafts / LinkedIn to-do
   ▲                                                         │                          │
   └──────── Monitoring (re-checks targets weekly) ◄─────────┘        Inbox (replies) ◄─┘
                                   Content (LinkedIn/X)          CRM (logs what James did)

                 all read/write ──►  gtm/data/accounts.json  +  activity-log.md
```

| # | Agent | File | Does |
|---|---|---|---|
| 1 | Signal | `.claude/agents/gtm-signal.md` | Finds NZ businesses showing any of the **45 buying signals** in `config/signals.md` |
| 2 | Enrichment | `gtm-enrichment.md` | Finds the decision-maker and a verified business email + LinkedIn |
| 3 | Scoring | `gtm-scoring.md` | Fit (0–50) by rubric + intent (0–50) from signals → Tier A–D |
| 4 | Research | `gtm-research.md` | Sourced account brief + 2–4 specific "why now" hooks |
| 5 | Copywriting | `gtm-copywriter.md` | 4-step email + LinkedIn sequence in James's voice |
| 6 | Sequence | `gtm-sequence.md` | Schedules steps, creates **Gmail drafts**, LinkedIn to-do list |
| 7 | Monitoring | `gtm-monitor.md` | Watches target accounts for fresh signals and flags "now" moments |
| 8 | Content | `gtm-content.md` | Weekly LinkedIn + X posts using the repo's own photography |
| 9 | CRM | `gtm-crm.md` | Logs what James did, stages, deals, pipeline hygiene |
| 10 | Inbox | `gtm-inbox.md` | Triages replies and inbound leads, drafts responses |
| 🧠 | GTM Brain | `gtm-brain.md` | Funnel and reply-rate analysis, decides next week's plan |

## What's in this folder

```
gtm/
  config/icp.md        ← WHO we sell to, offers, voice, compliance. Edit this first.
  config/signals.md    ← 45 buying signals + weights
  config/scoring.md    ← fit/intent rubric and tiers
  data/accounts.json   ← the shared pipeline (seeded with the 50 targets from outreach-emails.html)
  data/SCHEMA.md       ← record format + which agent owns which field
  data/activity-log.md ← every agent appends what it did
  data/content-calendar.md
  playbooks/           ← copy structures/offer angles, content pillars
  scripts/pipeline.mjs ← deterministic scoring + reports (no dependencies)
  outputs/             ← weekly Brain reports, fallback drafts
.claude/agents/        ← the 11 agent definitions
.claude/commands/      ← /gtm-prospect, /gtm-daily, /gtm-weekly, /gtm-log
```

## Setup (step by step)

### 1. Open the repo in Claude Code
Either on the web/app (claude.ai/code → this repo) or locally:
```bash
git clone <this repo> && cd Prime-piece && claude
```
Claude Code picks up `.claude/agents` and `.claude/commands` automatically. Type `/agents` to see the 11 GTM agents.

### 2. Connect your tools (MCP)
| Tool | Needed by | How |
|---|---|---|
| **Gmail** | Sequence, Inbox | claude.ai → Settings → Connectors → Gmail (already connected on this account). Locally: add a Gmail MCP server. |
| Web search / fetch | Signal, Enrichment, Research, Monitor | Built into Claude Code. Nothing to do. |
| Tavily *(optional, better search)* | Signal, Monitor | Copy from `gtm/mcp.example.json` into `.mcp.json`, and set `TAVILY_API_KEY`, which you already have for Market Radar |
| Klaviyo *(optional)* | Content, Brain (D07 signal) | claude.ai connector. It needs re-authorising in Settings → Connectors |
| HubSpot / Apollo / Hunter *(optional)* | CRM / Enrichment | Add their connector or MCP server if you sign up. The agents will use them if they're there. Without them, `accounts.json` is the CRM. |

Without any optional tools the system still works: web research + Gmail drafts + the JSON pipeline.

### 3. Personalise the brain
Read and edit `gtm/config/icp.md`: segments, offers, prices, voice, signature. Everything the agents write comes from it.

### 4. Clean up the 50 imported targets
The old `outreach-emails.html` list is imported with `legacy_outreach: true` because the system doesn't know which of those emails you already sent. Either:
```
/gtm-log I already emailed Hotel Britomart, ECC Furniture and Matisse on 3 Nov, no replies
```
or ask: *"use gtm-sequence to check Gmail for prior contact with every legacy account"*.

### 5. Run it
| When | Command | What you get |
|---|---|---|
| First run / weekly | `/gtm-prospect interior designers Auckland` | New accounts → enriched → scored → researched → sequenced → Gmail drafts |
| Score the imported 50 | *"Use gtm-enrichment then gtm-scoring on all legacy accounts"* | Tiers for your existing list |
| Every morning (5 min) | `/gtm-daily` | Replies triaged with drafted responses, today's drafts in Gmail, your LinkedIn to-do |
| Friday | `/gtm-weekly` | New signals on targets, next week's posts, performance report + plan |
| Anytime | `/gtm-log Matisse wants a quote for 2 plinths, ~$9k` | Pipeline updated |
| Anytime | *"Ask gtm-research to brief me on Jasmax before my call"* | Any single agent on demand |

You review and hit **send** in Gmail, and send LinkedIn messages by hand. That's the human-in-the-loop by design.

### 6. Check the numbers yourself (optional)
```bash
node gtm/scripts/pipeline.mjs report     # funnel, tiers, top accounts
node gtm/scripts/pipeline.mjs due        # what needs doing
node gtm/scripts/pipeline.mjs list --tier A
```

### 7. Automate (optional, later)
Once you trust the output, schedule `/gtm-daily` on weekday mornings and `/gtm-weekly` on Fridays as **scheduled tasks** in Claude Code on the web. Leave sending manual.

## Guardrails built in
- **Nothing is auto-sent.** Emails are Gmail drafts, and LinkedIn is copy-paste for you.
- **NZ Unsolicited Electronic Messages Act**: only conspicuously-published business addresses, relevant to the person's role; every email identifies you and has an opt-out; opt-outs → `do_not_contact` forever.
- Guessed emails are never used without your approval. Duplicate-contact check against Gmail before any sequence.
- Every research claim and signal carries a source URL, and agents are told never to invent facts.
- Scores are reproducible arithmetic (`pipeline.mjs`), not model guesswork.
- `gtm/` and `.claude/` are in `.vercelignore`, so the pipeline (which holds contact details) is **not** published on primepiece.co.nz.
- Volume caps: 10 new accounts/run, 15 new sequences/week, so you can actually handle the replies.
