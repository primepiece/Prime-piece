# Renders the labelled placeholder for the continuous talent recording (no person, no voice).
import sys, os
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]  # frames dir; encode with ffmpeg (see README)
W, H, FPS, DUR = 1080, 1920, 30, 10.0
def D(size, bold=False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(p, size)
INK=(44,42,38); CREAM=(245,241,234); TEAL=(123,165,168); STONE=(138,130,117)
segments = [
  (0.0, 3.0, "VIDEO SLOT A", "OPENING SHOT", "“She’d love Prime Piece…\nbut what do I get her?”"),
  (3.0, 7.8, "COVERED BY PRODUCT MONTAGE", "VOICE ONLY", "“A marble board? That coffee table?\nWait… which colour?”"),
  (7.8, 10.0, "VIDEO SLOT B", "SOLUTION SHOT", "“Actually… let her choose.”"),
]
def dashed_rect(d, box, color, dash=24, gap=16, width=4):
    x0,y0,x1,y1 = box
    for (a,b,horiz,fixed) in [(x0,x1,True,y0),(x0,x1,True,y1),(y0,y1,False,x0),(y0,y1,False,x1)]:
        p=a
        while p<b:
            q=min(p+dash,b)
            d.line([(p,fixed),(q,fixed)] if horiz else [(fixed,p),(fixed,q)], fill=color, width=width)
            p=q+gap
os.makedirs(out, exist_ok=True)
for i in range(int(DUR*FPS)):
    t = i/FPS
    seg = [s for s in segments if s[0] <= t < s[1]][0]
    img = Image.new("RGB", (W,H), (58,54,49))
    d = ImageDraw.Draw(img)
    # soft vertical gradient
    for y in range(0,H,8):
        k = y/H; c = tuple(int(58*(1-k)+40*k + 0) for _ in range(3))
        d.rectangle([0,y,W,y+8], fill=(int(62*(1-k)+40*k), int(58*(1-k)+38*k), int(52*(1-k)+34*k)))
    dashed_rect(d, (40,40,W-40,H-40), TEAL)
    # framing guides
    dashed_rect(d, (300,330,780,930), STONE, dash=14, gap=12, width=2)
    d.text((W/2, 950), "keep face roughly here", font=D(26), fill=STONE, anchor="ma")
    dashed_rect(d, (90,1170,990,1310), STONE, dash=14, gap=12, width=2)
    d.text((W/2, 1240), "captions sit here", font=D(26), fill=STONE, anchor="mm")
    d.line([(0,1330),(W,1330)], fill=(120,90,80), width=2)
    d.text((W/2, 1350), "below this line: Instagram UI — nothing important", font=D(24), fill=(150,120,105), anchor="ma")
    # labels
    d.text((W/2, 520), seg[2], font=D(64, True), fill=CREAM, anchor="mm")
    d.text((W/2, 600), seg[3], font=D(34), fill=TEAL, anchor="mm")
    d.multiline_text((W/2, 760), seg[4], font=D(36), fill=CREAM, anchor="mm", align="center", spacing=14)
    d.text((W/2, 1500), "PLACEHOLDER — REPLACE WITH YOUR RECORDING", font=D(30, True), fill=CREAM, anchor="mm")
    d.text((W/2, 1560), "assets/footage/recording.mp4", font=D(28), fill=STONE, anchor="mm")
    d.text((W/2, 1660), "REC  %05.2f s" % t, font=D(44, True), fill=(200,90,80), anchor="mm")
    img.save(os.path.join(out, "f%04d.png" % i))
