# Prime Piece — Sculpture Reel

Vertical 1080 × 1920, 30 fps, 5.0 s, silent (add music in Instagram).

- Video: `renders/prime-piece-sculpture-reel.mp4`
- Rebuild: `python3 build.py` (needs Python with Pillow + numpy, and ffmpeg)
- Check frames only: `python3 build.py --stills`

| Time | Shot | Move |
| --- | --- | --- |
| 0.0 – 1.3 | White plaster torso on Carrara | Tilt up from plinth to hands |
| 1.0 – 2.6 | Gold torso, profile | Slow slide left to right |
| 2.3 – 3.6 | Bronze pair on black marble | Pull back to reveal both |
| 3.3 – 5.0 | Empty Carrara plinth | Gentle push-in, logo fades in above (from 3.9 s) |

Shots are joined by 0.3 s dissolves. Fine grain and a light vignette are added on every frame.
Camera start/end positions live in the `SHOTS` list in `build.py`.

The logo sits at 300 px from the top, inside Instagram's safe band.
