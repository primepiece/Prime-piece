# Prime Piece — Plinth Push-Through Clip

Vertical 1080 × 1920, 30 fps, 2.6 s, silent (add music in Instagram).

- Video: `renders/prime-piece-plinth-push.mp4`
- Rebuild: `python3 build.py` (Python with Pillow + numpy, and ffmpeg)
- Check frames only: `python3 build.py --stills`

| Time | What |
| --- | --- |
| 0.0 – 1.3 | Carrara plinth on the black vanity: slow drift that speeds up into the marble face |
| 1.3 | Match cut inside the stone (zoom blur plus a slight exposure lift hides the swap) |
| 1.3 – 2.6 | Same plinth in the workshop, pulling back out from its front face |

The camera move follows the reference phone clip (handheld push down into a slab).
Zoom blur comes from averaging 10 sub-frames per frame, so it follows camera speed.
Camera start/end positions are `A` and `B` in `build.py`.

## v2 (phone clip first)

`renders/prime-piece-plinth-push-v2.mp4`, 2.67 s: the phone clip of the slabs (first 2 s at 1.5x speed),
a 5-frame dissolve, then a push-in on the plinth on the black vanity. Rebuild with `python3 build_v2.py`.
