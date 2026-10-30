# Prime Piece — Gift Voucher Reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 10.2 s. **Status: v4, ready to post.** The opening and the "I'll let her
choose" line are the Runway presenter. Music is added in the Instagram app at upload (see Music).

- Latest: `renders/prime-piece-gift-vouchers_v4.mp4` (v1–v3 are earlier work-in-progress cuts)
- Open in Studio: `npx hyperframes preview` (from this folder)
- Check: `npm run check` · Render: `npx hyperframes render -q high -o renders/<name>.mp4`

## Timeline

| Film time | What | Where |
| --- | --- | --- |
| 0.0 – 1.5 | **Presenter**: "She's impossible to buy for." Slow punch-in | `#slot-a` in `index.html` |
| 1.5 – 2.3 | "The marble board?" White Haven board, full screen | `compositions/montage.html` |
| 2.3 – 3.25 | "The table?" Side table in Nero black | `#m-shot-table` |
| 3.25 – 4.6 | "Which colour?" The same table changes stone on every cut, faster and faster: gold, blue, burgundy, pink, sage, teal, white, black. Each photo is placed so the tabletops line up | `.m-swap` shots |
| 4.6 – 5.85 | **Presenter**: "I'll let her choose." Tighter framing | `#slot-b` |
| 5.85 – 6.29 | $100, $200, $500 vouchers slam in full width, one per hit | `compositions/vouchers.html` → `T.card*` |
| 6.65 – 7.3 | Cards fan out; "Our pick" lands on the $200; "Their taste. Their choice." | `T.fan`, `T.pick`, `T.head` |
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
- `renders/*_4x5.mp4`: 1080×1350 versions of v4, v4b and v4c for Facebook and Instagram feed placements, cropped
  from the vertical renders (`ffmpeg -i in.mp4 -vf crop=1080:1350:0:170 …`).

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
4. Re-render. The WIP label is already removed; music is added in Instagram.

## Assets

- `assets/vouchers/`: the supplied voucher artwork, byte-for-byte (1400 × 840). It is only ever scaled
  and rotated, never redrawn or filtered.
- `assets/products/`: product photos copied from the site (`table-jade-rain.jpg` is
  `table-green-calacatta (3).jpg`, the Jade Rain coffee table; `table-3.jpg` is Jade Jewel).
- `assets/fonts/`: Cormorant Garamond and Inter Tight (the site's fonts, OFL).
- `assets/sfx/`: HyperFrames' bundled offline sound effects.
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, vendored so renders don't depend on a CDN.
