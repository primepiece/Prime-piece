# Prime Piece — Christmas Release launch reel (HyperFrames project)

Vertical 1080 × 1920, 30 fps, 16.3 s. Launch video for the three Christmas Release boards (drop: first-look list
Sat 14 Nov 7pm, everyone Sun 15 Nov 7pm). Post it first, then the carousel in `brand-kit/social/out/christmas-*.png`.

- Latest: `renders/christmas-release_v1.mp4`
- Check: `npm run check` · Render: `npx hyperframes render -q high -o renders/<name>.mp4`

## Timeline

| Film time | What |
| --- | --- |
| 0.0 – 3.5 | Hook. "We made three Christmas boards." then (1.5 s) "You can only buy one of each." over close-ups of the stone: red 0–1.15, green 1.15–2.3, white 2.3–3.5. Frame 0 is the thumbnail |
| 3.5 – 9.5 | One board every 2 s (red 3.5, green 5.5, white 7.5): a wipe in that stone's colour, the name, the photo with a slow push-in, a "$399 · One only" gift tag and "600 × 250mm · signed & numbered" |
| 9.5 – 12.3 | "One of each. Never repeated." The three boards slide in from alternating sides. "$399 each · $999 the set" |
| 12.3 – 16.3 | End card: "Drops Sunday 15 November, 7pm", the two dates, "Get first look · link in bio", "When they're gone, they're gone.", logo |

Snow falls over the whole film (`#snow`, 40 flakes with fixed positions and speeds). Sound effects: clicks on the
hook cuts, a whoosh on each colour wipe, a pop on each gift tag, whooshes on the trio, a bass hit on the end card.

## Music

Add it in Instagram when you post: keep the original audio (the sound effects) at about 100% and the music at
25–35%. Pick a track with a strong beat near 3.5 s, where the first board lands. On a business account, use the
sounds Instagram offers for business accounts.

## Swapping in the making footage

When the workshop clips exist (slab, saw cut, corners, polish, signing), they replace or follow the hook close-ups
(`#h-band-*` in `index.html`) as `<video class="clip">` elements with `muted` (or `data-has-audio="true"` to keep
the saw sound). Shoot vertical.
