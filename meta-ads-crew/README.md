# Claude Code for Meta Ads: the Prime Piece crew

Drop in a product URL. Six desks research it, write it, launch it and scale it. You make the creative call and tap approve.

```
/brief https://primepiece.co.nz/tables.html  focus Teal Tide, $30/day
```

| Desk | Agent | Does | Can spend money? |
|---|---|---|---|
| 01 Research | **Rita** `rita-research` | Product facts, competitors, Ad Library, buyer language → `research.md` | No |
| 02 Strategy | **Sam** `sam-strategy` | Scores the 47-angle library, picks the top 3 → `angles.md` | No |
| 03 Creative | **Charlie** `charlie-creative` | 20 hooks, full copy, picks real photos → `hooks.md`, `campaign.json` | No |
| 04 Launch | **Luca** `luca-launch` | Builds the campaign in Meta **PAUSED**, writes `approval.md`; goes live only on your approve | Only after you approve |
| 05 Optimize | **Ollie** `ollie-optimize` | Daily verdicts, pauses clear losers, MER → `reports/` | Can only *lower* spend |
| 06 Scale | **Scott** `scott-scale` | +20% budget steps for winners | Only after you approve |

## Commands (all work from the Claude app on your phone)
| Command | What happens |
|---|---|
| `/brief <url> [notes]` | Rita → Sam → Charlie → Luca draft. You get a notification and the approval summary. |
| `/approve <run>` | Luca checks the Pixel and takes that run live. |
| `/optimize` | Ollie's daily read: verdicts, auto-pause losers, MER. |
| `/scale` / `/scale approve <adset-id>` | Scott proposes budget steps, then runs the ones you approve. |
| `/crew-status` | One-screen summary. |

## Guardrails (in `crew.config.json`, enforced by `scripts/meta-ads/meta.mjs`)
- Everything is created **PAUSED**. Nothing goes live without your approval.
- The crew only touches campaigns named `CREW | …`. Your existing campaigns are read-only to it.
- $40/day max per new campaign, $120/day max across all crew campaigns, max 6 ads per launch.
- No judging before 24h **and** $50 spent. Kill = 2× target CPA with zero purchases.
- Scale = +20% per step, 72h apart, never above $150/day per ad set. Off until you set target CPA and breakeven ROAS.
- Won't launch if the Pixel hasn't fired in 48h.
- Every action is logged to `ledger.jsonl` and committed to git.

To change any limit, edit `crew.config.json`. The agents are told never to.

## Folder map
```
meta-ads-crew/
  crew.config.json          ← account ids, targets, guardrails
  01-research-desk/         ad-library.md (competitor memory), product-url.md (brief template)
  02-strategy-desk/         angles.md (47 angles + performance log)
  03-creative-desk/         hooks.md (patterns, winners, shipped log), voice.md
  04-launch-desk/           launch.md (checklist, tracking status)
  05-optimize-desk/         optimize.md (rules)
  06-scale-desk/            scale.md (rules)
  runs/<date>-<slug>/       brief → research → angles → hooks → campaign.json → launch.json → approval.md
  reports/                  daily optimize/scale reports
  ledger.jsonl              every draft/activate/pause/scale
.claude/agents/             the six desks
.claude/commands/           /brief /approve /optimize /scale /crew-status
scripts/meta-ads/meta.mjs   the only code that calls the Meta API
```

## One-time setup
1. **Fill in `crew.config.json`**: `ad_account_id` (`act_…`, from Ads Manager URL), `page_id`, optional `instagram_user_id`, and **targets** (target CPA, breakeven ROAS).
2. **Create a Meta access token**: Business Settings → Users → System users → Add (Admin) → Assign assets (ad account: *Manage campaigns*; Page; Pixel) → Generate token with `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`, `pages_show_list`. Never paste it into chat. Save it as a Claude Code network credential for `graph.facebook.com` (Claude will open the secure form).
3. *(Optional, for MER)*: a Stripe **restricted** key with read-only Charges, saved the same way for `api.stripe.com`. Without it, Ollie asks you for revenue.
4. Test: `node scripts/meta-ads/meta.mjs whoami` then `check-pixel`.
5. *(Optional)* Daily scheduled task that runs `/optimize` and pushes the report to your phone.

## Known gaps
- **Conversions API** isn't set up (browser Pixel only). See `04-launch-desk/launch.md`.
- **Ad Library API** can't list NZ commercial ads, so Rita uses the public Ad Library page and web search.
- Single-image ads only for now. Video/carousel come from the Ads Manager or a later upgrade.
