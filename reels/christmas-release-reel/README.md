# Prime Piece — The Christmas Release (Reel)

HyperFrames project. Vertical 1080 × 1920, 30 fps, no voiceover.

**Status: 3-second preview for sign-off** (the colour reveal only). The rest of the reel is built
after the framing and cuts are approved.

- Preview: `renders/prime-piece-christmas-release_preview-3s.mp4`
- Check: `npx hyperframes check` · Render: `npx hyperframes render -q delivery -o renders/<name>.mp4`

## Plan (120 BPM, every cut on a beat)

| Time | Picture | Text |
| --- | --- | --- |
| 0.0 / 1.0 / 2.0 | red → green → white, locked frame, identical framing | “Three Christmas colours.” |
| 3.0 / 4.5 / 6.0 | red → green → white, 1.5 s holds, optional ≤2% push | “One of each.” |
| 7.5 – 10.0 | three stacked panels, each showing its whole board | “The Christmas Release” |
| 10.0 – 12.5 | warm-black end card | PRIME PIECE / Every piece is one of one. / Shop the release · primepiece.co.nz |

## Layout

- Photos are the supplied images, placed full width at their native 4:3 (1448 × 1086 → 1080 × 810,
  top 500 px). Never cropped in the reveal, never stretched. All three share one camera position, so
  the cuts are true match cuts.
- Text sits above the photo, centred, inside Instagram's safe band (168–1330 px).
- Type: Cormorant Garamond Light (the site's serif, OFL), ivory `#F2ECE1` on warm black `#16120F`.

## Music

`assets/music/christmas-release.wav` is an original instrumental synthesised by `music/compose.py`
(piano, celesta-style bells, sleigh-bell shakes, soft kick and brushed snap, D major, 120 BPM). It uses
no samples, loops or third-party recordings, so it is free to use commercially. Re-create it with
`python3 music/compose.py` (needs numpy and scipy). Mastered to about −14 LUFS for Instagram.

## Assets

- `assets/boards/`: the three supplied photos, decoded losslessly from the originals to PNG.
- `assets/fonts/`: Cormorant Garamond and Inter Tight (OFL).
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, vendored so renders don't depend on a CDN.
