"""Draws three 64x64 Team Dominator storm-chaser skins (classic arms) without any image library:
team_reed.png for jdj125 (a Reed Timmer-style chaser: black team cap, dark hair, stubble), team_claude.png for Claude
(crew #2: terracotta beanie, the Claude spark on the sleeve) and team_ollama.png for Ollama (crew #3: cream llama-wool
hair). All wear the black team shirt with a yellow stripe and their number on the back, jeans and dark sneakers."""
import random, struct, zlib

W = H = 64
INK = (31, 30, 29)
BLACK, BLACK_D = (34, 34, 38), (24, 24, 28)
YELLOW, YELLOW_D = (236, 222, 52), (205, 190, 36)
JEANS, JEANS_D = (58, 78, 112), (46, 62, 92)
SHOE, SHOE_D = (44, 44, 48), (30, 30, 34)
WHITE = (238, 238, 232)

PEOPLE = {
    "reed":   dict(skin=(226, 178, 146), hair=(52, 40, 32), hat="cap", hat_c=(30, 30, 34), hat_logo=YELLOW, num=1,
                   stubble=True),
    "claude": dict(skin=(236, 190, 160), hair=(74, 52, 40), hat="beanie", hat_c=(217, 119, 87), hat_logo=None, num=2,
                   stubble=False, spark=True),
    "ollama": dict(skin=(214, 172, 140), hair=(236, 226, 204), hat=None, hat_c=None, hat_logo=None, num=3,
                   stubble=False),
}

def draw(p):
    px = [[(0, 0, 0, 0)] * W for _ in range(H)]
    rnd = random.Random(p["num"] * 31)

    def fill(x0, y0, x1, y1, c, dark=None, grain=0.18):
        for y in range(y0, y1):
            for x in range(x0, x1):
                px[y][x] = (*(dark if dark and rnd.random() < grain else c), 255)

    def dot(x, y, c):
        px[y][x] = (*c, 255)

    skin = p["skin"]; skin_d = tuple(max(0, v - 22) for v in skin)
    hair = p["hair"]; hair_d = tuple(max(0, v - 16) for v in hair)

    # Head: skin all round, hair on top, back and upper sides, a fringe on the face.
    fill(0, 0, 32, 16, skin, skin_d, 0.08)
    fill(8, 0, 16, 8, hair, hair_d)
    fill(24, 8, 32, 16, hair, hair_d)
    fill(0, 8, 8, 12, hair, hair_d); fill(16, 8, 24, 12, hair, hair_d)
    fill(8, 8, 16, 10, hair, hair_d)
    if p["hair"][0] > 200:                       # Ollama's fluffy wool: longer at the sides and over the ears
        fill(0, 8, 8, 14, hair, hair_d, 0.3); fill(16, 8, 24, 14, hair, hair_d, 0.3)
        dot(8, 10, hair); dot(15, 10, hair); dot(8, 11, hair); dot(15, 11, hair)
    for x in (9, 10, 13, 14):
        dot(x, 12, WHITE)
    dot(10, 12, INK); dot(13, 12, INK)
    dot(11, 14, skin_d); dot(12, 14, skin_d)
    if p["stubble"]:                             # a bit of dark stubble on the chin and jaw
        for x in range(9, 15):
            if rnd.random() < 0.6: dot(x, 15, tuple(max(0, v - 60) for v in skin))
        for x in (8, 15):
            dot(x, 14, tuple(max(0, v - 55) for v in skin))

    # Hat on the overlay layer (x 32-63, y 0-15).
    if p["hat"] == "cap":
        c = p["hat_c"]; cd = tuple(max(0, v - 10) for v in c)
        fill(40, 0, 48, 8, c, cd)                # crown
        fill(32, 8, 64, 10, c, cd)               # band all round
        fill(40, 10, 48, 11, c, cd)              # brim over the eyes
        for x, y in ((43, 9), (44, 9), (43, 8), (44, 8)):
            dot(x, y, p["hat_logo"])             # small yellow logo on the front
    elif p["hat"] == "beanie":
        c = p["hat_c"]; cd = tuple(max(0, v - 25) for v in c)
        fill(40, 0, 48, 8, c, cd)
        fill(32, 8, 64, 11, c, cd)
        for x in range(32, 64, 2):
            dot(x, 10, cd)                       # ribbed cuff

    # Body and arms: the black team shirt, a yellow stripe across the chest and down the sleeves, hands.
    fill(16, 16, 40, 32, BLACK, BLACK_D)
    fill(40, 16, 56, 32, BLACK, BLACK_D)
    fill(32, 48, 48, 64, BLACK, BLACK_D)
    fill(20, 24, 28, 25, YELLOW, YELLOW_D)       # chest stripe (front)
    fill(32, 24, 40, 25, YELLOW, YELLOW_D)       # back stripe
    fill(44, 20, 48, 21, YELLOW); fill(36, 52, 40, 53, YELLOW)   # sleeve bands
    fill(21, 21, 24, 23, YELLOW)                 # little team logo, left chest
    fill(40, 29, 56, 32, skin, skin_d, 0.1); fill(48, 16, 52, 20, skin)
    fill(32, 61, 48, 64, skin, skin_d, 0.1); fill(40, 48, 44, 52, skin)
    # Their crew number on the back, 3x5 pixels in yellow.
    digits = {1: ["010", "110", "010", "010", "111"], 2: ["111", "001", "111", "100", "111"],
              3: ["111", "001", "011", "001", "111"]}
    for r, row in enumerate(digits[p["num"]]):
        for c_, bit in enumerate(row):
            if bit == "1": dot(35 + c_, 26 + r, YELLOW)
    if p.get("spark"):                           # Claude's spark on the right sleeve
        for x, y in ((49, 23), (50, 22), (50, 23), (50, 24), (51, 23)):
            dot(x, y, (217, 119, 87))

    # Legs: jeans and dark sneakers with white soles.
    fill(0, 16, 16, 32, JEANS, JEANS_D)
    fill(16, 48, 32, 64, JEANS, JEANS_D)
    fill(0, 29, 16, 32, SHOE, SHOE_D, 0.1); fill(8, 16, 12, 20, SHOE)
    fill(16, 61, 32, 64, SHOE, SHOE_D, 0.1); fill(24, 48, 28, 52, SHOE)
    fill(0, 31, 16, 32, WHITE); fill(16, 63, 32, 64, WHITE)
    return px

def png(px):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")

for name, person in PEOPLE.items():
    open(__file__.replace("make_team_skins.py", f"team_{name}.png"), "wb").write(png(draw(person)))
    print("wrote", f"team_{name}.png")
