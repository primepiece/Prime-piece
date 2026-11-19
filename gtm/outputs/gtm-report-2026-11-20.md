# GTM report: week ending Fri 20 Nov 2026

**Week 1 baseline.** The system went in on 17 Nov, so there's no earlier report to compare with. These numbers are the baseline for next Friday. The pipeline holds 109 accounts. Sources: `pipeline.mjs report` and `due`, accounts.json, the activity log, the content calendar, and Gmail facts James confirmed this week.

## 1. Funnel

| Stage | n |
|---|---|
| new | 38 |
| ready (draft waiting) | 14 |
| in_sequence | 34 |
| replied | 5 |
| meeting / proposal | 0 / 0 |
| won | 1 (Olga, clinic table) |
| lost | 2 |
| nurture | 15 |

All-time outbound: **59 accounts contacted → 10 replied (17%) → 1 meeting (Trove, 16 Oct, now paused) → 0 proposals.** The one win came in outside outbound (a direct client of James's).

- **Pipeline value: $0 recorded.** No account has `deal.value_nzd`, Olga's included, so neither pipeline value nor won value can be measured yet.
- Data note: the script's line `contacted 42 → replied+ 6 (14%)` undercounts. It counts by current stage, so it misses the replies now parked in nurture or lost (Sojo, Nicola Manning, Good Form, Trove, Cocolea, Parnell).

## 2. What's driving replies

**By outreach type. This is the main finding:**

| Cohort | Replied | Rate |
|---|---|---|
| James's personal "Prime Piece × studio" intros, Sep–Oct | 8/37 | 22% (7 positive, 1 decline) |
| Old generic `outreach-emails.html` template to info@ inboxes, Jun + Aug | 0/10 | 0% |
| Christmas gifting, sent 18 Nov | 1/6 | too early (2 days in) |

- **The legacy "no reply" data is unreliable.** info@rtastudio and studio@pattersonassociates both hard-bounced on 18 Nov, so the Jun/Aug emails probably never arrived. Whitespace and Koush had already bounced. That's 4 dead addresses in the legacy set. Don't treat legacy nurture accounts as "not interested".
- **The copy matters more than the inbox.** The personal intro got 3/19 replies even when sent to generic addresses, against 0/10 for the template. Named addresses did better again at 5/18.

**By segment** (personal intros only, n = sent):

| Segment | Replied | Rate |
|---|---|---|
| interior-design | 5/22 | 23% |
| architecture | 0/6 | 0% |
| furniture-retail | 1/2 | too early |
| other | 1/3 | too early |
| staging | 1/1 | too early |
| hotel | 0/2 | too early |
| hospitality | 0/1 | too early |

Interior design is the only segment with enough sends to read. Architecture at 0/6 is a weak negative.

**By step:** 7 of the 8 replies came on step 1. The one step-2 reply was Cocolea's decline. The 29 non-repliers have only ever had 1–2 touches.

**By offer and signal family:** can't be measured yet. All 37 intros used the same intro with no `sequence.offer`, and none were signal-triggered (no A/B/C signals). Christmas gifting is the first offer-tagged test (`corporate-gifting`, signals B04/C08/E01), at 1/6 so far.

## 3. Speed

- **Time to reply:** median 1.5 days from first touch (n=8). Bayleys Takapuna replied the same day. Replies come fast or not at all.
- **Reply to meeting:** 11 days (n=1, Trove).
- **Replies still waiting on James:** 0 replies older than 24h are missing a draft, but 4 drafted replies are unsent:

| Account | Waiting since | Draft |
|---|---|---|
| Zarby Designs | their last message on 1 Nov (19 days) | drafted 17 Nov. It offers Thu 19 / Fri 20, which have now passed, so re-date it |
| Spatial Studio | reply on 11 Oct | free render offer, drafted 17 Nov |
| Rarebirds Interiors | back from away | studio visit with tiger onyx, drafted 17 Nov |
| Bayleys Takapuna | reply on 18 Nov | reply plus the flyer and board drop were due 19 Nov; not logged as done |

- **Also due today:** the Halliburton Gibbons basin follow-up (Ocean Blue options sent 16 Nov).

## 4. Coverage

- **Tier A/B accounts not in a sequence: 0.** All 5 Tier A accounts are already warm (Trove, Zarby, Rarebirds, Bayleys Takapuna, Halliburton). But **104 of 109 accounts are unscored**: no account has a `fit` score, so tiers currently reflect only replies.
- **Stalled:** nothing is stale by history (the system is 3 days old). In practice, 29 personal-intro accounts have had no touch for 29–60 days. Follow-up #2 or #3 has been due since 17 Nov and none has been drafted.
- **Legacy accounts still unconfirmed:** 38 accounts at stage `new`, with 0 named and 0 verified contacts. That's 36 legacy accounts never contacted (generic or guessed addresses) plus RTA and Patterson. On top of that, 4 dead addresses need replacing: RTA (lead: Richard Naish), Patterson, Whitespace and Koush.
- **Research is blocked.** Unattended runs can't approve new website hosts, so research agents were blocked 3 mornings running:
  - gtm-signal on 18 Nov: 0 accounts added.
  - gtm-monitor on 18 Nov: nzia, archipro, matisse and denizen fetches failed.
  - gtm-enrichment on 19 Nov: 0 contacts fixed.

## 5. Content

- **Published:** 0. Nothing was scheduled before 23 Nov.
- **Planned for the week of 23 Nov:** 6 posts (3 LinkedIn, 3 X), all at `draft`.
- **Blocked:** Tue 24 Nov, the clinic table post. It needs James's details, a delivery photo and Olga's OK. Notes say not to name her without permission.

## Next week's plan

1. **James, today:** send the 3 warm drafts. Re-date Zarby to Mon 23 or Tue 24 Nov first; he's been waiting 19 days. Send Spatial and Rarebirds as drafted. Send the Bayleys Takapuna reply and drop the flyers and board at reception if that hasn't happened yet. Follow up Halliburton.
2. **James, by Mon 23 Nov:** review and send the 14 unsent Christmas drafts. Seven are Bayleys Takapuna agents, so use the lunchroom flyer as the hook. The gifting window closes at the end of November (order by end Nov for an office drop-off), so drafts sent after about 25 Nov lose most of their value. Target: 20/20 sent, at least 3 replies by next Friday.
3. **gtm-copywriter, then gtm-sequence:** draft follow-ups for the 29 overdue intros in James's personal voice, not the template. Start with the 17 interior-design accounts (5/22 replied so far), then 12 others. Use a new angle each time: a render of their project or a specific stone. Send in batches of about 10 a day for James to approve.
4. **James, a one-off config change, by Mon:** approve the research hosts for unattended runs, or run gtm-enrichment and gtm-signal once interactively. Hosts: archipro.co.nz, nzia.co.nz, rtastudio.co.nz, pattersonassociates.com, plus the firm sites agents hit. Then **gtm-enrichment** finds named, published emails for the 4 dead addresses (RTA, Patterson, Whitespace, Koush) and resends the 2 congrats notes.
5. **gtm-enrichment, then gtm-scoring:** no more sends to info@ inboxes (0/10, with dead addresses). Before any of the 36 never-contacted legacy accounts goes into a sequence, find a named contact and score `fit`. Do interior design and furniture retail first. Target: 15 accounts with verified named contacts and fit scores by 27 Nov.
6. **James:** add `deal.value_nzd` for Olga's table so won value is tracked. Ask her for a delivery photo and permission for the 24 Nov post, or swap in the fallback image noted in the calendar.
