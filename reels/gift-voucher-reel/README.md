# Prime Piece — Gift Voucher Reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 10.2 s. **Status: v5, ready to post.** The opening and the "I'll let her
choose" line are the Runway presenter. Music is added in the Instagram app at upload (see Music).

- Latest: `renders/prime-piece-gift-vouchers_v5.mp4` (v1–v4 are earlier cuts)
- v5 changes: Runway's burned-in text is removed from the presenter shots and replaced with on-brand type
  (the hook in Cormorant Garamond, the two lines in the same caption pills as the montage); the end card
  lands on the $200 last and shows it in front, centred and larger, with "Our pick" centred on it.
- Open in Studio: `npx hyperframes preview` (from this folder)
- Check: `npm run check` · Render: `npx hyperframes render -q high -o renders/<name>.mp4`

## Timeline

| Film time | What | Where |
| --- | --- | --- |
| 0.0 – 1.5 | **Presenter**: hook "For the one with *very* specific taste." + "She's impossible to buy for." Slow punch-in | `#slot-a` in `index.html`, `c-hook`/`c-1` in `captions.html` |
| 1.5 – 2.3 | "The marble board?" White Haven board, full screen | `compositions/montage.html` |
| 2.3 – 3.25 | "The table?" Side table in Nero black | `#m-shot-table` |
| 3.25 – 4.6 | "Which colour?" The same table changes stone on every cut, faster and faster: gold, blue, burgundy, pink, sage, teal, white, black. Each photo is placed so the tabletops line up | `.m-swap` shots |
| 4.6 – 5.85 | **Presenter**: "I'll let her choose." Tighter framing | `#slot-b` |
| 5.85 – 6.29 | $100, $500, then $200 slam in full width, one per hit (the pick lands last) | `compositions/vouchers.html` → `T.card*` |
| 6.65 – 7.3 | Cards fan out: $200 in front, centred and larger; $100 and $500 behind, higher; "Our pick" on the $200; "Their taste. Their choice." | `FAN`, `T.pick`, `T.head` |
| 7.6 – 10.2 | $100 · $200 · $500 NZD, Emailed instantly, Shop gift vouchers, Link in bio | `T.prices` … `T.url` |

Captions are in `compositions/captions.html`. Everything sits in Instagram's safe band (168–1330 px).

## Music

Add it in Instagram when you post: pick a track from the sound library, keep the original audio (the voice and
sound effects) at about 100%, and set the music to about 25–35%. Choose a track whose drop or strong beat you
can line up with 5.85 s, where the vouchers slam in. On a business account, use the sounds Instagram offers
for business accounts (they're cleared for commercial use).

## Stone-swap version (A/B test)

`swap.html` is a second cut, 7.65 s, with no presenter and no voice. It opens on the side table changing stone
(0–3.3 s) under two hook lines, "Which one would you pick?" then "Now pick for someone else.", and cuts
straight into the same voucher ending (`compositions/vouchers.html`).

- Scene: `compositions/swap-open.html` (the hook lines are variables `hook1` and `hook2`)
- Render: `npx hyperframes render -c swap.html -q high -o renders/<name>.mp4`
- Latest: `renders/prime-piece-gift-vouchers_v4b-stone-swap.mp4`

`npx hyperframes check` and `snapshot` read `index.html` only. To check this cut, run them on a copy of the
project with `swap.html` as its `index.html`.

## December version and feed crops

- `swap-december.html`: the stone-swap cut for 16–24 December, with "Last-minute gift?" / "It’s emailed in seconds."
  and "Emailed in seconds · No courier, no cut-off" (set with `data-variable-values` on the scene hosts).
  Render: `npx hyperframes render -c swap-december.html -q high -o renders/<name>.mp4`.
  Latest: `renders/prime-piece-gift-vouchers_v4c-december.mp4`.
- `renders/*_4x5.mp4`: 1080×1350 versions of v5, v5b and v5c for Facebook and Instagram feed placements, cropped
  from the vertical renders (`ffmpeg -i in.mp4 -vf crop=1080:1350:0:100 -c:v libx264 -crf 16 -c:a copy out.mp4`).
  The crop starts at 100 px (not 170) so the opening hook line has room above it.

## The presenter footage

`assets/footage/runway-standin.mp4` is the untouched Runway export (720p), with its own hook line and captions
burned in. The reel uses `assets/footage/runway-clean.mp4`, made from it:

- The hook line ("For the one with VERY specific taste.", source rows 106–232) is replaced with a clean plate
  of the window behind it: the median of the 4.0–5.5 s frames, where the locked-off shot has no text
  (`tools/hook-plate.py`).
- The two caption bands (source rows 764–820) are smoothed with ffmpeg `delogo`; our caption pills cover them.

```
python3 tools/hook-plate.py <work dir>   # needs <work dir>/pl (frames 4.0–5.5 s) and /a0 (0–1.5 s), rows 60–320
ffmpeg -i assets/footage/runway-standin.mp4 -loop 1 -i <work dir>/hook-plate.png -filter_complex \
  "[0:v][1:v]overlay=0:0:shortest=1:enable='lt(t,1.6)',delogo=x=128:y=764:w=462:h=56:enable='lt(t,1.6)',\
delogo=x=206:y=764:w=304:h=56:enable='between(t,3.9,5.6)',format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 14 -preset slow -c:a copy assets/footage/runway-clean.mp4
```

Because the pills cover the smoothed bands, `c-1` and `c-5` cut in and out with their shot (`data-cut`), the
opening shot's pill drifts down with its punch-in (`data-drift="54"`), and `#slot-b` scales about the caption
band (`transform-origin: 50% 61.875%`). Some of Runway's own sound effects from 1.5–4.0 s also come through
with the voice.

## Swapping in the clean clips

Export the two on-camera shots from Runway **without captions or text**, plus the audio of all five
lines (or one continuous take).

1. Put them in `assets/footage/` and point `#slot-a`, `#slot-b` and `#vo-montage` at them. Set each
   clip's `data-media-start` to where its line begins in that file. With clean clips, `data-drift`,
   `data-cut` and the `#slot-b` transform-origin are no longer needed.
2. If the line timings change, move the montage cuts (each push-in follows its own `data-start` and
   `data-duration`), the caption groups, the `#vouchers` host and the SFX after it.
3. Re-render. Music is added in Instagram.

## Assets

- `assets/vouchers/`: the supplied voucher artwork, byte-for-byte (1400 × 840). It is only ever scaled
  and rotated, never redrawn or filtered.
- `assets/products/`: product photos copied from the site (`table-jade-rain.jpg` is
  `table-green-calacatta (3).jpg`, the Jade Rain coffee table; `table-3.jpg` is Jade Jewel).
- `assets/fonts/`: Cormorant Garamond and Inter Tight (the site's fonts, OFL).
- `assets/sfx/`: HyperFrames' bundled offline sound effects.
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, vendored so renders don't depend on a CDN.
