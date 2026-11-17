# Lead Scoring Rubric

Scores are **deterministic**: the Scoring Agent fills in the five fit sub-scores, then `node gtm/scripts/pipeline.mjs score` does the arithmetic. Sub-scores are a model's judgement; the total is plain arithmetic and can be reproduced. This follows the repo's Market Radar convention.

## Fit score (0–50): set by the Scoring Agent, stored in `account.fit`

| Key | 0 | 5 | 10 |
|---|---|---|---|
| `segment` | Disqualified segment | `other` / `corporate` | `interior-design`, `architecture`, `hotel`, `developer` |
| `premium` | Budget / volume work | Mid-market | Clearly luxury / boutique |
| `location` | Outside NZ | NZ, outside Auckland | Auckland |
| `aesthetic` | No natural stone or statement pieces | Some | Stone/sculptural pieces regularly in their work |
| `reachable` | No named contact | Generic inbox only | Named decision-maker with a verified email |

Each key is scored 0–10 (in-between values are allowed) with a one-line `why`.

```json
"fit": {
  "segment":   {"score": 10, "why": "Residential interior design studio"},
  "premium":   {"score": 8,  "why": "Portfolio is Remuera/Herne Bay homes"},
  "location":  {"score": 10, "why": "Ponsonby studio"},
  "aesthetic": {"score": 7,  "why": "Travertine and marble in 3 of last 6 projects"},
  "reachable": {"score": 5,  "why": "Only studio@ inbox so far"},
  "scored_at": "2026-11-17"
}
```

## Intent score (0–50): computed from `account.signals`

`intent = min(50, Σ weight × decay × 4)`. The weights and decay come from `signals.md`. A single fresh 5-weight signal gives 20, so several recent signals are needed to max it out.

## Total & tiers

`total = fit + intent` (0–100)

| Tier | Total | What happens |
|---|---|---|
| **A** | ≥ 70 | Research → personalised sequence this week. James sees these first. |
| **B** | 50–69 | Research → sequence when there's capacity. |
| **C** | 30–49 | Nurture: content + Monitoring Agent watches for new signals. |
| **D** | < 30 | Park. Re-check monthly. |

Overrides: any `D01`–`D04` signal in the last 30 days makes an account **Tier A** whatever its score, because they came to us. Opted-out accounts are never scored.
