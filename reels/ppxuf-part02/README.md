# Prime Piece × Ugly Face — Part 02: The Reveal (Instagram Reel)

1080 × 1920 · 30 fps · 21.0 s · H.264 / AAC 48 kHz · −14 LUFS, −1.2 dBTP

Everything on screen is your real footage plus your supplied collaboration graphic.
There are no AI-generated replacements, no stock video and no watermarks.

---

## 1. Footage assessment

The source is one 18.9 s, 512 × 910 phone export (`copy_0AD45C07…mp4`).

| Source time | Content | Usable? |
|---|---|---|
| 0.00–3.40 | Talk to camera in the car: "A while back we made the Ugly Face boys a custom table…" | Yes. Trim 0.37 s of dead air at the head |
| 3.40–4.90 | Old marble top sitting on the pine crate (showroom) | Yes, as the "before" shot |
| 3.12–3.63 (audio) | Pause plus filler ("uh/or") | Cut |
| 4.90–7.20 | Talk: "…they decided to go to a crate. But we figured it was time for an upgrade." | Yes |
| 7.20–7.60 | Hand reaches into the lens | Yes, used as a natural wipe into the drop |
| 7.60–10.45 | New black steel base in the workshop (handheld orbit) | Yes. The audio here is wind/workshop noise and is muted |
| 10.50–11.90 | Engraved "UGLY FACE" outline, unpainted (soft pan) | Yes, as the "process" beat |
| 11.93–15.80 | Hand-painted bag logo and "UGLY FACE" lettering on the finished stone (pan) | Yes, as the reveal |
| 15.80–18.93 | "Pt 2 coming soon" text card | Replaced by the new animated end card |

Limitations of the current footage:
- **Resolution.** 512 × 910 is roughly a quarter of 1080p. The render upscales it with Lanczos, restores some micro-contrast and adds fine grain, but it will never be as crisp as the original camera files. Send the original iPhone clips (4K/1080p) and the same EDL will re-render sharply.
- **No hand-painting process footage.** The clip shows the logo before painting (engraved outline) and after (painted). It has no brush-in-hand shot. If you have one, it slots in at 8.53 s, replacing half of the engraving beat.
- **No wide shot of the finished table** (top on the new base). The reveal is the painted logo on the stone, which is the strongest shot available. A slow wide push-in on the assembled table would be the ideal reveal or follow-up.
- **Please check the transcript.** Speech recognition gives "they decided to go to a crate". If you said "go with a crate", change subtitle 4 in `subtitles.srt` / `build/edl.py`.

---

## 2. Shot-by-shot edit (as rendered)

Music grid: 120 BPM. One beat is 0.5 s (15 frames) and one bar is 2.0 s. Bars land on **0.53, 2.53, 4.53, 6.53 (drop), 8.53, 10.53 (reveal), 12.53, 14.53 (end card), 16.53 (typing), 18.53 (title complete)**.

| # | Out time (s) | Source (s) | Speed | Picture | Sound | On-screen text |
|---|---|---|---|---|---|---|
| 1 | 0.00–2.77 | 0.37–3.13 | 1.0× | Talk to camera | Voice (cleaned). Music bed ~19 dB under the voice: low-passed Rhodes chords and shaker | "A while back we made" → "the **Ugly Face** boys" → "a custom table…" |
| 2 | 2.77–4.40 | Video 3.42–4.90 / audio 3.63–5.27 | 0.91× video | Old top on the crate | Voice continues. Soft whoosh in | "They decided to go to a crate." |
| 3 | 4.40–6.13 | 5.27–7.00 | 1.0× | Talk to camera | Voice. Riser starts at 4.8 | "But we figured it was time" → "for an **upgrade.**" |
| 4 | 6.13–6.53 | 7.00–7.60 | 1.5× ramp | Hand sweeps into the lens (natural wipe) | Whoosh up, music swells | — |
| 5 | **6.53 DROP** – 8.53 | Base: 7.62–8.12 / 8.25–8.75 / 8.90–9.40 / 9.60–9.87 / 10.15–10.38 | 1.0× | Five beat-synced jump cuts around the steel base (1, 1, 1, ½, ½ beats) | Full groove: 4/4 kick, clap 2 & 4, open hats, funk bass, stabs. Sub impact on the drop | Label "01 — THE BASE" |
| 6 | 8.53–10.03 | 10.55–11.90 | 0.9× | Engraved UGLY FACE outline. Sinks to ~15 % exposure over the last 0.5 s | Groove plus rising noise sweep | Label "02 — THE ENGRAVING" |
| 7 | 10.03–10.53 | — | — | **One beat of black** (anticipation) | Music cuts out and only the riser remains | — |
| 8 | **10.53 REVEAL** – 14.53 | 11.95–15.45 | 0.875× (frame-blended) | Hand-painted bag logo and lettering on the finished stone. Hard cut on the downbeat | Big impact (sub boom and air), full groove returns | Label "03 — HAND-PAINTED" (11.53–14.07, lower left, small) |
| 9 | **14.53** – 21.00 | Supplied graphic | — | Animated end card (below) | Stripped groove, typing, final bass hit | PART 02 — THE REVEAL |

No dissolves, zooms, glitches or template transitions are used. Every cut is a hard cut on the grid. The only "transitions" are the hand-in-lens wipe from the original footage and the black beat before the reveal.

### End card (14.53–21.00), frame-accurate

The static "PART 02 — THE REVEAL" title, the rule and "COMING SOON" are removed from the supplied graphic. The covered area is rebuilt from the surrounding marble (`endcard-layers/01_marble_plate_clean.png`), so no lettering or ghost remains underneath. The logos and title are then composited back from the **original graphic's own pixels**. They are not redrawn, retyped or recoloured: the finished card matches the supplied artwork to within ~1/255 per pixel inside the logo and title areas.

| Out time (s) | Event |
|---|---|
| 14.53 | Hard cut on the bar. Marble opens from black over 0.5 s, with a soft impact |
| 14.80–15.80 | PRIME PIECE / one of one fades in (smoothstep, 1.0 s) |
| 15.07–15.97 | × divider fades in |
| 15.37–16.37 | UGLY FACE logo fades in. A very quiet air swell sits under each logo |
| 14.53–20.8 | Warm light band drifts diagonally (32°) across the marble, lifting the veins. It is masked off the logos and text so their colours stay exact |
| 16.53–18.53 | "PART 02 — THE REVEAL" types on: 20 slots (spaces keep the rhythm), one glyph every 0.105 s, each glyph in 2 frames. One crisp key click per glyph, panned left to right across the stereo field |
| **18.53** | Last letter lands on the downbeat. **Final bass hit** (F1 808-style boom with harmonics so phones can hear it) plus a subtle exposure pulse on the marble |
| 18.53–18.93 | Rule draws out from the centre with a soft "shing" |
| 18.70–19.17 | COMING SOON fades in |
| 19.17–20.17 | Completed graphic holds (~1.0 s) |
| 20.17–20.77 | Fade to black. Music and reverb tail fade together |
| 20.77–21.00 | Black |

---

## 3. Music and licensing

**Render version.** The score in `reel_final` is an **original instrumental made for this edit** (120 BPM, F minor, funky-house × hip-hop: FM Rhodes chords, syncopated filtered bass, 4/4 kick, claps, hats). Every sound, SFX included, was synthesised from scratch, with no samples, loops or library audio. There is no third-party licence to clear, and it is safe for a branded collaboration on both brands' accounts.

**If you prefer a commercial track,** use `reel_voice-sfx-only.mp4` (dialogue and SFX, no music) and add one of the following. All are cleared for branded/brand-collab use **when you hold the right plan**:
- **Meta Sound Collection** (free, inside Instagram/Facebook for business accounts): cleared for branded content on Meta platforms. Search "funk", "house", "hip hop", "groovy".
- **Epidemic Sound or Artlist**: needs a *commercial/business* plan that covers brand and client work. Personal or creator plans do not cover brand collaborations. Both brands' accounts need to be covered (whitelist both handles where the service supports it).
- **Musicbed / Soundstripe**: same rule, use a business licence.

Do **not** use trending tracks from Instagram's standard music picker on a business or branded post. Those licences exclude commercial use, and the audio can be muted or the post removed.

Brief for searching: *instrumental, 115–124 BPM, funky house / nu-disco bass or jazzy boom-bap, strong bassline, confident and playful, minimal vocals, has a clear drop.* Useful filters: "funky house", "nu disco", "lo-fi house", "jazz hop", "boom bap instrumental", mood "groovy/confident".

**How to align a replacement track:** put a strong downbeat at **6.53 s** (drop) and another at **10.53 s** (reveal). Cut or duck the music for **10.03–10.53** (the black beat). Pull it to −18 to −20 dB under the dialogue for 0–6.1 s. Strip it back (low-pass, or bass and kick only) from **14.53 s** so the typing reads. If the track isn't 120 BPM, prioritise the drop and the reveal, then nudge the base jump cuts onto the new beat.

---

## 4. Recreating the edit in CapCut (if you want to tweak it yourself)

Project: **9:16, 1080p, 30 fps**. Import the original clip, the files in `endcard-layers/`, `subtitles.srt` and the audio stems (`voice.wav`, `music.wav`, `sfx.wav`, from the render outputs).

### Picture
1. Drop the clip on the main track. Split and arrange using the source times in table §2. For each clip use **Speed → Normal** with the value shown (0.91×, 1.5×, 0.9×, 0.875×). Turn **Smooth slow-mo** *off* for 0.875–0.91× (frame blending looks more natural at these speeds).
2. Mute the clip's original audio after 7.05 s of source (wind noise).
3. Base section: five cuts starting at 6.53, 7.03, 7.53, 8.03, 8.30 s, each beginning at the source in-points listed.
4. Engraving clip (8.53–10.03): add keyframes on **Adjust → Exposure**: 0 at 9.50 s, −80 at 10.03 s.
5. Black: 10.03–10.53 (leave a gap, or use a black solid).
6. Reveal: hard cut at 10.53, clip 11.95–15.45 at 0.875×.
7. Grade (all clips): **Contrast +6, Highlights −10 (car shots −25), Sharpen +15, Grain +8**. Keep saturation and temperature at 0 for natural stone colour.

### Subtitles
Import `subtitles.srt` (Text → Auto captions → Import, or paste each line). Style:
- Font **Inter SemiBold** (or CapCut "Montserrat Semibold" as a fallback), size equivalent to **58 px at 1080 width**, sentence case, white.
- Shadow: black, opacity 55 %, blur 9, distance 2. No box or background.
- Position: centred horizontally, **y ≈ 1300 px** (about 68 % down the frame, clear of the Reels UI).
- Colour the words "Ugly Face" and "upgrade." **#D9A46E** (sampled from the bag logo).
- Animation In: **Fade + Rise** (or "Slide up"), 0.15 s. Out: Fade 0.1 s.

### Editorial labels
Text "01 — THE BASE", "02 — THE ENGRAVING", "03 — HAND-PAINTED". Font **Lora Regular** (Google Fonts, free, the closest match to the graphic's serif), 34 px, **letter spacing +9**, white, x ≈ 74 px, y ≈ 1465 px.
Timing: 6.60–8.40, 8.60–9.83, 11.53–14.07. In: **Wipe right 0.33 s**; Out: Fade 0.2 s.
Under each label, add a black-to-transparent gradient (bottom 40 % of frame, max opacity 40 %) so the text stays readable on pale marble.

### End card (14.53–21.00), keyframes
Layers, bottom to top:

| Layer | File | Keyframes |
|---|---|---|
| Base | `01_marble_plate_clean.png` | Opacity 0 % @14.53 → 100 % @15.03 |
| Light | `07_light_sweep_screen.png`, Blend **Screen**, opacity 30 % | Position X **−1080 → +1080** from 14.53 → 20.80 (linear). Keep the layer below the logos |
| Logo 1 | `03a_logo_prime_piece_transparent.png` | Opacity 0 @14.80 → 100 @15.80 (ease in-out) |
| Logo 2 | `03b_logo_x_divider_transparent.png` | 0 @15.07 → 100 @15.97 |
| Logo 3 | `03c_logo_ugly_face_transparent.png` | 0 @15.37 → 100 @16.37 |
| Title | **Option A (exact pixels):** `04_title_PART02_THE_REVEAL_transparent.png` with a **Linear mask** (vertical edge, feather 0) | Mask position moves left → right, stepping to each glyph edge on its click (16 hold keyframes, 16.53 → 18.53) |
| | **Option B (quicker):** a text layer "PART 02 — THE REVEAL", Lora Regular, letter spacing ≈ +30, matched to the PNG's position | Animation In **Typewriter**, duration **2.00 s**, starting 16.53 |
| Rule | `05_rule_transparent.png` | Scale X 0 % @18.53 → 100 % @18.93 (ease out), anchored centre |
| Coming soon | `06_coming_soon_transparent.png` | Opacity 0 @18.70 → 100 @19.17 |
| Fade | Black solid (or "Fade out" on the whole stack) | 0 % @20.17 → 100 % @20.77 |

Only one title layer may be visible: the plate has no title baked in, so nothing can double up.

### Audio
- Dialogue: CapCut **Enhance voice ON**, **Reduce noise ON**. Volume 0 dB.
- Music: −20 dB for 0–6.1 s, ramp to 0 dB at 6.53 (keyframes). Cut at 10.03 and resume at 10.53. From 14.53, apply a low-pass filter or drop the music to −10 dB.
- SFX (`sfx.wav` from the render, or CapCut library "keyboard click", "sub drop", "whoosh"): whoosh 6.13; impact 6.53 and 10.53; riser 8.53 → 10.53; one click per glyph 16.53 → 18.53; bass hit 18.53.
- Export at 1080p, 30 fps, high bitrate, and normalise to around −14 LUFS.

---

## 5. Re-rendering from source

```
reels/ppxuf-part02/
  src.mp4                    # your original clip (not committed)
  fonts/Lora.ttf             # Google Fonts, OFL (not committed)
  collab-graphic-supplied.webp
  build/card_prep.py         # cleans the graphic: removes title, builds masks/plate
  build/edl.py               # every cut, speed, subtitle and timing (edit here)
  build/audio.py             # original score + SFX + dialogue clean-up
  build/render.py            # picture: cuts, upscale, grade, text, end card
  build/master.sh            # two-pass loudness to −14 LUFS
```

```
pip install numpy opencv-python-headless pillow scipy
cd reels/ppxuf-part02/build
python3 card_prep.py && python3 audio.py && python3 render.py
cd out && ../master.sh mix_premaster.wav mix_master.wav
ffmpeg -i video_only.mp4 -i mix_master.wav -map 0:v -map 1:a -c:v libx264 -crf 17 \
  -preset slow -pix_fmt yuv420p -c:a aac -b:a 320k -ar 48000 -movflags +faststart reel.mp4
```

With higher-resolution originals, change the source size in `render.py` (`load_source`) and the source in/out points in `edl.py` if the clips differ.
