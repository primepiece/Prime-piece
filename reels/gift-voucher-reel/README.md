# Prime Piece — Gift Voucher Reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 13.95 s. **Status: work-in-progress, v2.** It uses the Runway version's
script, with the Runway export standing in for the on-camera shots. The music bed has not been added yet.

- Latest preview: `renders/prime-piece-gift-vouchers_WIP-preview_v2.mp4` (v1 = the original 18 s script)
- Open in Studio: `npx hyperframes preview` (from this folder)
- Check: `npm run check` · Render: `npx hyperframes render -q high -o renders/<name>.mp4`

## Timeline

| Film time | What | Where |
| --- | --- | --- |
| 0.0 – 1.5 | **VIDEO SLOT A**: "She's impossible to buy for." | `#slot-a` in `index.html` |
| 1.5 – 4.6 | Montage, voice only: "The marble board?" → White Haven board, "The table?" → Jade Rain coffee table, "Which colour?" → accelerating matched cuts | `compositions/montage.html` + `#vo-montage` |
| 4.6 – 5.85 | **VIDEO SLOT B**: "I'll let her choose." | `#slot-b` |
| 5.85 – 6.15 | Breath, the musical pause | `compositions/vouchers.html` |
| 6.15 / 6.75 / 7.35 | $100, $200 and $500 vouchers land, one per beat | `vouchers.html` → `T.card100/200/500` |
| 7.95 | Cards spread into the fan | `T.fan` |
| 8.55 | "Their taste. Their choice.", the product line, the values, "Delivered instantly by email" | `T.head` … `T.delivery` |
| 11.15 – 13.95 | Close: "Give something one of one.", Shop gift vouchers, `primepiece.co.nz/gifts.html`, delivery line | `T.close` … `T.delivery2` |

Captions are in `compositions/captions.html`. The beat grid is 100 BPM (0.6 s per beat), with the
downbeat on 6.15 s.

## The stand-in footage

`assets/footage/runway-standin.mp4` is the Runway export (720p). Both slots and the montage voice are cut
from it. Its own captions and hook line are burned in, so the matching caption groups are hidden
(`data-hidden`) and the montage captions are ours. Some of Runway's own sound effects from 1.5–4.0 s
also come through with the voice.

## Swapping in the clean clips

Export the two on-camera shots from Runway **without captions or text**, plus the audio of all five
lines (or one continuous take).

1. Put them in `assets/footage/` and point `#slot-a`, `#slot-b` and `#vo-montage` at them. Set each
   clip's `data-media-start` to where its line begins in that file.
2. If the line timings change, move the montage cuts (each push-in follows its own `data-start` and
   `data-duration`), the caption groups, the `#vouchers` host and the SFX after it.
3. In `captions.html`, remove `data-hidden` from `c-hook`, `c-1` and `c-5`.
4. Add the music (below), then delete the `#wip-label` host in `index.html` before the final export.

## Music

The music slot is commented in `index.html`. Use a licensed, restrained instrumental at about 100 BPM.
It plays up to 5.55 s, stays silent until 6.15 s (the pause), then re-enters on a strong downbeat at
6.15 s, under the reveal hit. With a different tempo, run `npx hyperframes beats` and move the
`T.card*` / `T.fan` times onto its beats.

## Assets

- `assets/vouchers/`: the supplied voucher artwork, byte-for-byte (1400 × 840). It is only ever scaled
  and rotated, never redrawn or filtered.
- `assets/products/`: product photos copied from the site (`table-jade-rain.jpg` is
  `table-green-calacatta (3).jpg`, the Jade Rain coffee table; `table-3.jpg` is Jade Jewel).
- `assets/fonts/`: Cormorant Garamond and Inter Tight (the site's fonts, OFL).
- `assets/sfx/`: HyperFrames' bundled offline sound effects.
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, vendored so renders don't depend on a CDN.
