# Shared GTM memory

All agents share two files. They're how the agents "talk to each other".

| File | What | Who writes |
|---|---|---|
| `accounts.json` | The pipeline / lightweight CRM: one record per target business | Each agent writes **only its own fields** (table below) |
| `activity-log.md` | Append-only log, one line per action, newest at the bottom | Every agent, after every run |

Run `node gtm/scripts/pipeline.mjs validate` after any edit to `accounts.json`.

## Account record

```jsonc
{
  "id": "hotel-britomart",            // kebab-case, unique, never changes
  "name": "Hotel Britomart",
  "segment": "hotel",                 // see gtm/config/icp.md segment ids
  "city": "Auckland",
  "website": "https://...",
  "contacts": [{
    "name": "Jane Smith", "role": "General Manager",
    "email": "jane@...", "email_type": "personal|generic|guessed",
    "verified": true,                 // true only if seen published, or confirmed by a verifier
    "verified_how": "Listed on /team page 2026-11-17",
    "linkedin": "https://linkedin.com/in/...", "source": "url or note"
  }],
  "fit": { "segment": {"score":10,"why":""}, "premium": {...}, "location": {...}, "aesthetic": {...}, "reachable": {...}, "scored_at": "" },
  "signals": [{ "id": "A02", "date": "2026-11-10", "evidence": "https://...", "detail": "Announced lobby refurb for Q1", "found_by": "gtm-signal" }],
  "score": { "fit": 45, "intent": 28, "total": 73, "tier": "A", "override": null, "scored_at": "" },   // written by pipeline.mjs only
  "research": {
    "updated": "2026-11-17",
    "summary": "2–3 sentences",
    "insights": [{ "fact": "...", "source": "https://..." }],
    "hooks": ["Specific, verifiable reasons to reach out now"],
    "recommended_offer": "trade-account|render|samples|placement|consignment|corporate-gifting|basin-spec",
    "recommended_contact": "Jane Smith (GM)"
  },
  "stage": "new",                     // new → researched → ready → in_sequence → replied → meeting → proposal → won|lost ; nurture ; do_not_contact
  "sequence": {
    "offer": "render", "contact": "jane@...", "started": "2026-11-18",
    "steps": [{ "n": 1, "day": 0, "channel": "email|linkedin|call|visit", "status": "planned|drafted|sent|skipped",
                "subject": "...", "body": "...", "gmail_draft_id": "...", "due": "2026-11-18", "sent_at": null }]
  },
  "next_action": "Human-readable next step", "next_action_date": "2026-11-20",
  "notes": ["Free text from James"],
  "history": [{ "date": "2026-11-17", "agent": "gtm-research", "event": "What changed" }]
}
```

## Field ownership

| Field(s) | Owner agent |
|---|---|
| create account, `website`, `signals` (A/B/C/E) | gtm-signal |
| `signals` (new signals on existing accounts) | gtm-monitor |
| `contacts` | gtm-enrichment |
| `fit` | gtm-scoring (then runs `pipeline.mjs score` → `score`) |
| `research` | gtm-research |
| `sequence.steps[].subject/body` | gtm-copywriter |
| `sequence` (plan, dates, draft ids, status) | gtm-sequence |
| `stage`, `next_action*`, `notes`, D-signals | gtm-crm / gtm-inbox |
| `history` | everyone appends, nobody edits old entries |

Agents that write are run **one at a time**, never in parallel, so they don't overwrite each other's edits.
