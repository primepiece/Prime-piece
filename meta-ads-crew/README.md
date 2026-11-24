# Meta Ads crew

Six desks inside Claude Code. Drop in a Prime Piece product URL and they research it, score angles, write 20 hooks, build the campaign **paused** in Ads Manager, and hand you an approval card. Approve from your phone with one reply and it goes live. A daily read kills losers, and winners get queued for a budget step that you approve.

| Desk | Agent | Does | Writes |
|---|---|---|---|
| Research | `rita-research` | Product facts from the page, images, competitors, swipe file, past results | `research.md` |
| Strategy | `sam-strategy` | Scores the 41-angle library, picks 4, designs ad sets and budget | `strategy.md`, `campaign.json` (ad sets) |
| Creative | `charlie-creative` | 20 hooks, picks the best, full ad copy on real product photos | `hooks.md`, `ads.md`, `campaign.json` (ads) |
| Launch | `luca-launch` | Guardrail + pixel preflight, builds it PAUSED, approval card; activates after you approve | `launch.md`, `launched.json` |
| Optimize | `ollie-optimize` | Insights + Klaviyo revenue → MER, pauses clear losers, flags winners | `optimize-<date>.md`, `knowledge/mer.md` |
| Scale | `scott-scale` | +20% budget steps for winners that also clear MER, only after you say yes | `runs/scale-queue.md` |

## Using it (from the Claude app on your phone)

Open a Claude Code session on this repo, then:

| You type | What happens |
|---|---|
| `/desk-brief https://www.primepiece.co.nz/plinths.html Rosso Levanto, $40/day` | Full pipeline. Takes a few minutes; the app notifies you when the approval card is ready. |
| `/desk-approve 2026-11-24-rosso-levanto` | Goes live. |
| `/desk-optimize` | Daily read. Pauses losers, logs MER, queues winners. (Can run on a schedule, see below.) |
| `/desk-scale` / `/desk-scale <adset_id>` | Show the queue / approve a budget step. |
| `/desk-status` | One-screen summary. |
| "add to swipe file: <ad library link> — note" | Rita uses it on the next brief. |

Each run lives in `runs/<date>-<product>/` and is committed, so you get a full paper trail of what was proposed, approved and changed.

## What's enforced in code vs. by the prompts

`tools/meta.mjs` is the only thing that talks to Meta, and it enforces these no matter what an agent decides:
- Writes are dry runs unless `--live` is passed.
- `launch` can only create objects as **PAUSED**.
- `activate` refuses without `approval.json` in the run folder.
- Budgets: max $/day per ad set, max $/day across the account, max +20% per step, 48h between changes, and increases need an entry in `runs/scale-approvals.json`. All of these are in `config.json → guardrails`.
- Every live write is appended to `runs/actions.log`.

The approval files are written by `/desk-approve` and `/desk-scale` when you reply, so the "you must say yes" rule is a workflow rule. The spend caps are the hard backstop: an agent can't exceed them without someone editing config.json in a commit.

## Setup (one-time, about 15 minutes)

1. **IDs in `config.json` → `meta`**: `ad_account_id` (`act_…`, from Ads Manager URL), `page_id` (Facebook Page → About → Page ID), optional `instagram_user_id`. Pixel `722124784327437` is already filled in from the site.
2. **Targets**: set `targets.target_mer`, `breakeven_roas` and the per-category `target_cpa_nzd` to your real numbers. The defaults are placeholders.
3. **Meta access token**: Business Settings → Users → System users → Add (Admin) → Assign assets: the ad account (Manage campaigns), the Page, the Pixel → Generate token with `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`, `pages_show_list`. Choose "Never expire".
4. **Give the token to Claude**: in a cloud session, Claude asks for it with a secure form for host `graph.facebook.com`. It's stored as a network secret on your environment and added to requests by the proxy; it never appears in chat, in the repo, or in the script's memory. Running locally instead? `export META_ACCESS_TOKEN=…`.
5. Check it: `node meta-ads-crew/tools/meta.mjs check`.
6. **Optional, Slack**: connect the Slack connector in claude.ai and set `slack.channel` in config.json. Without it you still get the Claude app's notification.
7. **Optional, scheduled optimize read**: ask Claude to "schedule /desk-optimize every morning at 7:40am NZ time". It runs as a scheduled task in a fresh cloud session and reports back. Only `pause` happens unattended; nothing goes live or gets more budget without you.

## Known gaps (honest list)

- **No Conversions API yet.** The site sends Pixel events from the browser only (Purchase has an `eventID`, so it's ready for dedup). Expect Meta to under-report purchases by 10–30%, which is why scaling also checks MER from Klaviyo revenue. Adding CAPI to `api/webhook.js` (the Stripe webhook) is the next upgrade.
- **Ad Library "spy" is manual.** Meta's Ad Library API doesn't return commercial ads for New Zealand, so `knowledge/ad-library.md` is a swipe file you paste into.
- **Images only.** The crew builds single-image ads from photos already in the repo. Video and UGC still come from you (the reels in `/reels` can be uploaded by hand and swapped in).
- **High AOV.** A $3,000 plinth won't produce a verdict on $50 of spend. Kill/scale thresholds scale with each category's target CPA (`config.json → optimize`). Expect lead-type results (enquiries, showroom visits) on the big pieces; consider running those as traffic + retargeting rather than cold purchase campaigns.
- **API version.** `meta.api_version` is `v24.0`. Meta retires versions about two years after release; bump it when `check` starts warning.
