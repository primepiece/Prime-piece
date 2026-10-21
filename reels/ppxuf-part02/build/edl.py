"""Edit decision list for the Prime Piece x Ugly Face reel.

Everything is expressed in output frames at 30 fps. The music grid is 120 BPM
(15 frames per beat, 60 per bar) with the first downbeat on frame 16, so every
bar lands on an integer frame: 16, 76, 136, 196 (drop), 256, 316 (reveal),
376, 436 (end card), 496 (typing starts), 556 (title complete + bass hit).
"""

FPS = 30
W, H = 1080, 1920
BEAT = 15
BAR = 60
GRID0 = 16                      # first downbeat (frames)
DROP = 196                      # base footage / full groove
ENGRAVE = 256
BREAK = 301                     # one beat of black before the reveal
REVEAL = 316
CARD = 436
TYPE0 = 496
TITLE_DONE = 556
FADE0 = 605
FADE1 = 623
TOTAL = 630                     # 21.0 s

# (out_start_frame, out_end_frame, src_start_s, src_end_s, label)
# Source time is mapped linearly across the output span (speed = src/out).
VIDEO = [
    (0,   83,  0.367, 3.133, "talk A"),
    (83,  132, 3.420, 4.900, "crate"),
    (132, 184, 5.267, 7.000, "talk C"),
    (184, 196, 7.000, 7.600, "hand wipe (1.5x)"),
    (196, 211, 7.620, 8.120, "base 1"),
    (211, 226, 8.250, 8.750, "base 2"),
    (226, 241, 8.900, 9.400, "base 3"),
    (241, 249, 9.600, 9.867, "base 4"),
    (249, 256, 10.150, 10.383, "base 5"),
    (256, 301, 10.550, 11.900, "engraving"),
    (301, 316, None, None, "black"),
    (316, 436, 11.950, 15.450, "reveal"),
]

# Dialogue: (out_start_frame, src_start_s, src_end_s)
VOICE = [
    (0,   0.367, 3.133),
    (83,  3.633, 5.267),
    (132, 5.267, 7.050),
]

# Subtitles: (start_s, end_s, [(text, accent?)...])  (output seconds)
SUBS = [
    (0.08, 1.00, [("A while back we made", False)]),
    (1.00, 1.80, [("the ", False), ("Ugly Face", True), (" boys", False)]),
    (1.80, 2.74, [("a custom table…", False)]),
    (2.78, 4.36, [("They decided to go to a crate.", False)]),
    (4.42, 5.42, [("But we figured it was time", False)]),
    (5.42, 6.30, [("for an ", False), ("upgrade.", True)]),
]

# Editorial labels: (start_frame, end_frame, number, text)
LABELS = [
    (DROP + 2, ENGRAVE - 4, "01", "THE BASE"),
    (ENGRAVE + 2, BREAK - 6, "02", "THE ENGRAVING"),
    (REVEAL + 30, CARD - 14, "03", "HAND-PAINTED"),
]

# End card glyph slots: 20 typing positions (spaces included for rhythm),
# 16 visible glyphs. Last glyph lands exactly on TITLE_DONE.
TITLE = "PART 02 — THE REVEAL"
SLOTS = len(TITLE)
def glyph_frames():
    out = []
    for k, ch in enumerate(TITLE):
        if ch != " ":
            out.append(TYPE0 + k * (TITLE_DONE - TYPE0) / (SLOTS - 1))
    return out


def f2s(f):
    return f / FPS
