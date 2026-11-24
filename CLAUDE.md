# Prime Piece

Static site + Vercel API functions for Prime Piece (handcrafted one-of-one stone furniture, Auckland NZ).

## Meta ads crew
`meta-ads-crew/README.md` explains it. Six desk subagents in `.claude/agents/`, commands `/brief`, `/approve`, `/optimize`, `/scale`, `/crew-status`.
- All Meta API calls go through `scripts/meta-ads/meta.mjs`, which enforces the guardrails in `meta-ads-crew/crew.config.json`.
- Never pass `--approved-by-human` unless James explicitly approved that specific run or ad set in this conversation.
- Never edit the `guardrails` block of `crew.config.json` unless James asks.
- Commit and push run folders, reports and `ledger.jsonl` after every crew action (the cloud container is ephemeral).
