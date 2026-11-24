---
description: Scott proposes +20% budget steps for winners, or executes approved ones
argument-hint: [approve <adset-id> ...]
---
Arguments: $ARGUMENTS

- If the arguments start with "approve" followed by ad set ids, James has explicitly approved exactly those ad sets. Use the `scott-scale` subagent in **execute** mode for those ids only.
- Otherwise use `scott-scale` in **propose** mode.

Commit `meta-ads-crew/reports/` and `ledger.jsonl`, push, and reply with the proposal or result in ≤ 6 lines. For proposals, end with the exact command to approve, e.g. `/scale approve 1234567890`.
