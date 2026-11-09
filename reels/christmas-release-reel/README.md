# Prime Piece — Christmas Release 2026 Reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 12.6 s. No voice: add music in the Instagram or TikTok app when you
post, and line its drop up with **9.5 s**, where the end card hits.

| Video | Use it | End card |
| --- | --- | --- |
| `renders/christmas-release_teaser.mp4` | Wed 11 – Sat 14 Nov | Sunday 15 November · 7pm · First look Saturday · Link in bio |
| `renders/christmas-release_live.mp4` | Sun 15 Nov from 7pm | On sale now · One of each · Shop now · Link in bio |

## Timeline

| Film time | What |
| --- | --- |
| 0.0 – 2.0 | Close-up of the Burgundy Red stone under "Christmas Release 2026 / Three boards. One of each." (also the thumbnail) |
| 2.0 – 3.9 | Pulls back to the whole board: "No. 1 of 3 · Burgundy Red" |
| 3.9 – 5.8 | Deep Green: close-up, pull back, "No. 2 of 3" |
| 5.8 – 7.7 | White & Grey: "No. 3 of 3" |
| 7.7 – 9.5 | The three together: "600 × 250mm · Natural stone / Signed & numbered. Never repeated." |
| 9.5 – 12.6 | End card: date (or "On sale now"), $399 each · $999 the set, call to action, PRIME PIECE |

All text sits inside Instagram's safe band (168–1330 px).

## Commands (from this folder)

- Check: `npm run check`
- Teaser: `npx hyperframes render -q high -o renders/christmas-release_teaser.mp4`
- Live now: `npx hyperframes render -q high -o renders/christmas-release_live.mp4 --variables '{"endHead":"On sale now","endTime":"One of each","endCta":"Shop now · Link in bio"}'`

The end card text is three variables (`endHead`, `endTime`, `endCta`) declared on `<html>` in
`index.html`. Change them with `--variables` to make another version without editing the file.

Photos are the site's own `release-*.jpg`, copied into `assets/boards/`.
