# Prime Piece — Gift Voucher Reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 18 s. **Status: work-in-progress.** The talent footage is a labelled
placeholder, and the music bed has not been added yet.

- Preview render: `renders/prime-piece-gift-vouchers_WIP-preview_v1.mp4`
- Open in Studio: `npx hyperframes preview` (from this folder)
- Check: `npm run check` · Render: `npx hyperframes render -q high -o renders/<name>.mp4`

## Timeline

| Film time | What | Where |
| --- | --- | --- |
| 0.0 – 3.0 | **VIDEO SLOT A**, the opening line on camera | `#slot-a` in `index.html` |
| 3.0 – 7.8 | Product montage; the recording plays as voice only | `compositions/montage.html` + `#vo-montage` |
| 7.8 – 9.9 | **VIDEO SLOT B**, the solution line on camera | `#slot-b` in `index.html` |
| 9.9 – 10.2 | Breath, the musical pause (sage hairline on ivory) | `compositions/vouchers.html` |
| 10.2 / 10.8 / 11.4 | $100, $200 and $500 vouchers land, one per beat | `vouchers.html` → `T.card100/200/500` |
| 12.0 | Cards spread into the fan | `T.fan` |
| 12.6 | "Their taste. Their choice." | `T.head` |
| 13.6 | "Prime Piece digital gift vouchers" and "$100 / $200 / $500 NZD" | `T.kicker`, `T.prices` |
| 15.0 – 18.0 | Close: "Give something one of one.", Shop gift vouchers, URL | `T.close` … `T.url` |

Dialogue captions are in `compositions/captions.html`, one group per phrase.
The beat grid is 100 BPM (0.6 s per beat), with the downbeat on 10.2 s.

## Supplying the recording

1. Film one continuous vertical take (1080 × 1920 or larger, 9:16) of the full line:
   *"She'd love Prime Piece… but what do I get her? A marble board? That coffee table? Wait… which
   colour? Actually… let her choose."*
   Keep the face in the upper half of the frame (the placeholder shows a guide box). Nothing important
   should sit below about 62 % of the frame height, where Instagram draws its interface.
2. Save it as `assets/footage/recording.mp4`, replacing the placeholder.
3. Note four times in the recording: where "A marble board?" starts, where "That coffee table?" starts,
   where "Wait…" starts, and where "Actually…" starts.
4. Retime to match:
   - `#slot-a`: `data-duration` = the start of "A marble board?".
   - `#vo-montage` and the `#montage` host: `data-start` and `data-media-start` = that same time;
     `data-duration` = the start of "Actually…" minus it.
   - `#slot-b`: `data-start` and `data-media-start` = the start of "Actually…"; end it about 0.3 s after
     "choose."
   - In `montage.html`, move the second hero shot to "That coffee table?" and the colour cuts to
     "Wait…". Each cut's push-in follows its own `data-start` and `data-duration` automatically.
   - Shift the `#vouchers` host and the SFX after it so the pause still falls straight after the last word.
   - Set each caption group in `captions.html` to its phrase.
5. Delete the `#wip-label` host in `index.html` before the final export.

## Music

The music slot is commented in `index.html`. Use a licensed, restrained instrumental at about 100 BPM.
It plays up to 9.6 s, stays silent until 10.2 s (the pause), then re-enters on a strong downbeat at
10.2 s, under the reveal hit. With a different tempo, run `npx hyperframes beats` and move the
`T.card*` / `T.fan` times onto its beats.

## Assets

- `assets/vouchers/`: the supplied voucher artwork, byte-for-byte (1400 × 840). It is only ever scaled
  and rotated, never redrawn or filtered.
- `assets/products/`: product photos copied from the site (`table-jade-rain.jpg` is
  `table-green-calacatta (3).jpg`, the Jade Rain coffee table; `table-3.jpg` is Jade Jewel).
- `assets/fonts/`: Cormorant Garamond and Inter Tight (the site's fonts, OFL).
- `assets/sfx/`: HyperFrames' bundled offline sound effects.
- `assets/footage/recording.mp4`: the placeholder (title cards and silence, no person or voice),
  regenerated with `python3 tools/make-placeholder.py <frames-dir>` and then
  `ffmpeg -framerate 30 -i <frames-dir>/f%04d.png -f lavfi -i anullsrc=r=48000:cl=stereo -t 10 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest assets/footage/recording.mp4`.
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, vendored so renders don't depend on a CDN.
