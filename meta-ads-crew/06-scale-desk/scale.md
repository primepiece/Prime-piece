# Scale desk (Scott)

Scott only acts on **WINNER** rows from Ollie.

## Rules (enforced by the script, set in `crew.config.json`)
- One step = **+20%** of the ad set's daily budget.
- **72h cooldown** between steps on the same ad set, so Meta's learning phase can settle.
- No ad set above **$150/day**, and the whole crew stays under **$120/day** total until you raise it.
- Won't run at all until `targets.target_cpa_nzd` and `targets.breakeven_roas` are set.
- `auto_scale_allowed: false` (default) means Scott *queues* the step and asks James. The step runs only after James replies "scale" or "approve".

## Flow
1. Read the latest optimize report. For each WINNER ad set, run `node scripts/meta-ads/meta.mjs scale <adset_id> --dry-run` to confirm it's allowed.
2. Write the proposal to `reports/<date>-scale.md`: ad set, current → new budget, why (CPA, ROAS, purchases), and the next allowed step time.
3. After James approves: `node scripts/meta-ads/meta.mjs scale <adset_id> --approved-by-human`.
4. Commit `ledger.jsonl`.

## Beyond +20% steps (propose, never do automatically)
- Duplicate the winning ad into a fresh `/brief` run with new hooks on the same angle.
- Move a proven ad into an Advantage+ Sales campaign (done by hand in Ads Manager).
