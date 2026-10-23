"""Draws Claude's 64x64 Minecraft skin (classic arms) to claude_skin.png, or the sculk-corrupted Backrooms version to\nclaude_skin_sculk.png with --sculk, without any image library."""
import random, struct, zlib

W = H = 64
px = [[(0, 0, 0, 0)] * W for _ in range(H)]
rnd = random.Random(7)

ORANGE, ORANGE_D = (217, 119, 87), (190, 98, 68)   # Claude terracotta hoodie
CREAM, CREAM_D = (240, 238, 230), (214, 210, 198)
INK = (31, 30, 29)
SKIN, SKIN_D = (236, 190, 160), (214, 166, 136)
HAIR, HAIR_D = (74, 52, 40), (58, 40, 31)
PANTS, PANTS_D = (54, 52, 60), (44, 42, 50)

def fill(x0, y0, x1, y1, c, dark=None, grain=0.18):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[y][x] = (*(dark if dark and rnd.random() < grain else c), 255)

def dot(x, y, c):
    px[y][x] = (*c, 255)

# Head: skin all round, hair on top, back and upper sides, fringe on the face.
fill(0, 0, 32, 16, SKIN, SKIN_D, 0.08)
fill(8, 0, 16, 8, HAIR, HAIR_D)                      # top
fill(24, 8, 32, 16, HAIR, HAIR_D)                    # back
fill(0, 8, 8, 12, HAIR, HAIR_D); fill(16, 8, 24, 12, HAIR, HAIR_D)   # sides
fill(8, 8, 16, 10, HAIR, HAIR_D); dot(8, 10, HAIR); dot(15, 10, HAIR)  # fringe
for x in (9, 10, 13, 14):
    dot(x, 12, CREAM)
dot(10, 12, INK); dot(13, 12, INK)                   # eyes looking a little inward
dot(11, 14, SKIN_D); dot(12, 14, SKIN_D)             # small smile
dot(10, 13, (230, 160, 140)); dot(13, 13, (230, 160, 140))

# Body and both arms: the hoodie, with skin-coloured hands at the bottom.
fill(16, 16, 40, 32, ORANGE, ORANGE_D)
fill(40, 16, 56, 32, ORANGE, ORANGE_D)
fill(32, 48, 48, 64, ORANGE, ORANGE_D)
fill(40, 29, 56, 32, SKIN, SKIN_D, 0.1); fill(48, 16, 52, 20, SKIN)
fill(32, 61, 48, 64, SKIN, SKIN_D, 0.1); fill(40, 48, 44, 52, SKIN)
fill(20, 20, 28, 21, CREAM_D)                        # collar
fill(20, 30, 28, 32, ORANGE_D, None)                 # hem
# The spark on the chest.
cx, cy = 23, 25
for d in range(-3, 4):
    dot(cx + d, cy, CREAM); dot(cx, cy + d, CREAM)
for d in (-2, -1, 1, 2):
    dot(cx + d, cy + d, CREAM); dot(cx + d, cy - d, CREAM)
dot(cx, cy, ORANGE_D)

# Legs: dark trousers, cream trainers.
fill(0, 16, 16, 32, PANTS, PANTS_D)
fill(16, 48, 32, 64, PANTS, PANTS_D)
fill(0, 29, 16, 32, CREAM, CREAM_D, 0.1); fill(8, 16, 12, 20, CREAM)
fill(16, 61, 32, 64, CREAM, CREAM_D, 0.1); fill(24, 48, 28, 52, CREAM)

# --sculk: the Backrooms version. Sculk spreads over the skin in patches, the eyes and the spark glow cyan.
import sys
SCULK = "--sculk" in sys.argv
if SCULK:
    DARK, DEEP, GLOW = (10, 26, 38), (6, 44, 53), (41, 223, 213)
    seeds = [(rnd.randrange(W), rnd.randrange(H)) for _ in range(26)]
    for y in range(H):
        for x in range(W):
            if px[y][x][3] == 0:
                continue
            d = min(abs(x - sx) + abs(y - sy) for sx, sy in seeds)
            if d < 4 + rnd.random() * 3:
                px[y][x] = (*(GLOW if rnd.random() < 0.08 else DARK if rnd.random() < 0.6 else DEEP), 255)
            elif d < 7 and rnd.random() < 0.35:
                px[y][x] = (*DEEP, 255)
    for x, y in ((10, 12), (13, 12)):
        px[y][x] = (*GLOW, 255)
    for d in range(-3, 4):
        for x, y in ((cx + d, cy), (cx, cy + d)):
            px[y][x] = (*GLOW, 255)

def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) \
    + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
open(__file__.replace("make_skin.py", "claude_skin_sculk.png" if SCULK else "claude_skin.png"), "wb").write(png)
