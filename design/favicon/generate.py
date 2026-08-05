#!/usr/bin/env python3
"""Generate the oddjob icon: an ascii-shaded hex nut on a black disc.

A sibling to the donut on justin06lee.dev and chrome.justin06lee.dev, the cup on
coffee.justin06lee.dev and the hourglass on hours.justin06lee.dev — same
pipeline, same ramp, same disc. A real form is raymarched, lit, sampled onto a
character grid, and each cell is drawn as the rect skeleton of the glyph its
luminance lands on.

Glyphs are rects rather than <text>, for the reason coffee gives: a favicon is
rendered where font availability isn't guaranteed, and a missing monospace face
would leave an empty disc. Rect geometry always draws.

The object is the same hex nut the site's hero raymarches (src/lib/hero-shader.ts).
That is the point of picking it: the mark in the tab and the thing turning over
on the page are one object, so the icon reads as a still frame of the site
rather than as a logo bolted onto it.

WHAT THIS ONE DOES DIFFERENTLY

The silhouette is a polygon, and every other mark in the family is round. A
torus, a cup, an hourglass and a disc all resolve at 16px to soft blobs
distinguished only by their interior; a hexagon resolves to *corners*, which
survive downsampling better than any interior detail does. So the tuning here
spends less on internal shading than its siblings and more on keeping the
outline crisp — the rim term is strong and the camera is chosen to show three
faces at once, because a hexagon seen flat-on is a stop sign, and a hexagon seen
in perspective is a machined part.

Two materials, the way the cup separates ceramic from coffee:

  METAL is the nut itself: a wide tonal range across the top face and the two
  visible side walls. The pitch is deliberately shallow enough that the side
  walls keep real area — at a steeper angle you see only the top face and the
  mark flattens into a hexagonal outline with a hole in it.

  BORE is the inner wall of the hole, and it is forced dark. Physically it would
  catch some light; here it is clamped low on purpose, because the hole is the
  single feature that says "nut" rather than "hexagon", and at 16px a hole only
  reads if it is meaningfully darker than everything around it. An early pass
  let the bore shade naturally, and at tab size the hole filled in and the mark
  became a plain hexagon.

The bore is also drawn wider than a real fastener's. On an M-series nut the
thread is roughly half the across-flats width; here it is more, for the same
reason coffee fattens its handle — the hole has to stay open after a 30x30 grid
has been averaged down to under one cell per pixel.

TUNING is for 16px, not for the 136px artboard, exactly as coffee argues.
`--preview` prints the character grid to stdout, which is the fastest way to see
what the mark actually resolves to before rasterising anything.

    python3 design/favicon/generate.py > src/app/icon.svg
    python3 design/favicon/generate.py --preview
"""
import argparse
import math
import sys

N = 30                  # cells across
VIEW = 136.0            # viewBox units
CELL = VIEW / N
DISC = 0.97             # black disc radius, normalised
LEVELS = 11             # 1..11; 0 is empty, mirroring the ramp's leading space
# World units across the disc radius; lower zooms in. Set by comparing this
# mark's downsampled footprint against coffee's and hours' at 16px — the first
# pass sat visibly smaller in its disc than either sibling, which is the kind of
# thing that only shows up side by side.
SCALE = 1.12

NUT_R = 0.80            # across-flats radius, world units
# Half-height. A hex nut is roughly half as tall as it is wide across the
# flats, and that ratio is load-bearing: taller reads as a coupling nut, and an
# early pass at 0.52 turned the side wall into most of the mark's area, which
# made it read as a bucket.
NUT_H = 0.40
BORE_R = 0.46           # see the note above: wider than a real fastener's

# Shallow enough to keep the side wall in view. At 45 degrees and up you see
# only the top face and the mark flattens into a hexagonal outline with a hole
# in it; much below 25 and the bore closes to a slot.
PITCH = math.radians(30)
# Rotates the hexagon so a flat runs across the bottom and the corners sit at
# the diagonals. A vertex pointing straight down reads as a spinner or a
# gemstone; a flat base reads as a part resting on a bench.
YAW = math.radians(8)
# Off-axis on all three, so the top face, the near wall and the far wall all
# land on different steps of the ramp. A light near the camera flattens the
# whole thing to one tone.
LIGHT = (-0.62, 0.66, -0.42)

# Stronger than coffee's 0.58 and hours' equivalent, because this silhouette is
# a polygon: the corners are the only feature that survives downsampling, and
# they only survive if the outline is the brightest thing in the mark. Pushed
# past ~1.0 the lift reaches the shaded right-hand wall too, and the
# light-to-dark gradient that makes it look three-dimensional goes flat.
RIM = 0.85
RIM_FALLOFF = 1.9       # higher confines the lift to a thinner outline

# Every sibling in the family is a surface of revolution, so its shading varies
# continuously and spreads itself across the whole ramp. A nut is faceted: each
# flat lands on exactly one step, and the first version used seven levels with
# gaps at four of them, which posterised it next to coffee's nine contiguous.
# A slight fall-off with distance from the camera restores the gradient —
# physically it is aerial perspective, and on machined metal it reads as the
# sheen along a face.
DEPTH = 0.30            # how much the far side of the nut is dropped
DEPTH_NEAR = 2.25       # ray distance at which the fall-off starts
DEPTH_SPAN = 1.30       # and over which it reaches its full amount

RAMP = " ,-~:;=!*#$@"   # for --preview only; the SVG draws rects, not glyphs


def norm(v):
    m = math.sqrt(sum(c * c for c in v)) or 1.0
    return (v[0] / m, v[1] / m, v[2] / m)


LIGHT = norm(LIGHT)


def sd_hex_prism(p, r, h):
    """Hexagonal cross-section in xz, extruded along y — a nut lying flat.

    iq's prism folds the plane about the hex's mirror lines so only one edge has
    to be measured against. `r` is the across-flats radius (the apothem), which
    is what a spanner size means, rather than the corner-to-corner radius.
    """
    k0, k1, k2 = -0.8660254, 0.5, 0.57735
    px, pz, py = abs(p[0]), abs(p[2]), abs(p[1])

    fold = 2.0 * min(k0 * px + k1 * pz, 0.0)
    px -= fold * k0
    pz -= fold * k1

    limit = k2 * r
    cx = max(-limit, min(limit, px))
    d_radial = math.hypot(px - cx, pz - r) * (1.0 if pz > r else -1.0)
    d_axial = py - h

    outside = math.hypot(max(d_radial, 0.0), max(d_axial, 0.0))
    return min(max(d_radial, d_axial), 0.0) + outside


def sd_cylinder_y(p, r, h):
    """Capped cylinder about the y axis — the bore."""
    dr = math.hypot(p[0], p[2]) - r
    dy = abs(p[1]) - h
    return min(max(dr, dy), 0.0) + math.hypot(max(dr, 0.0), max(dy, 0.0))


# Surface ids, so the bore can be shaded differently from the metal.
METAL, BORE = 0, 1


def scene(p):
    """Signed distance to the nut, and which material was nearest."""
    body = sd_hex_prism(p, NUT_R, NUT_H)
    # Cut deeper than the body is tall, or the subtraction leaves a membrane
    # across the hole at exactly the face height.
    bore = sd_cylinder_y(p, BORE_R, NUT_H + 0.08)

    d = max(body, -bore)
    # When the bore is the binding constraint, the surface being hit is the
    # inside of the hole rather than the outside of the nut.
    material = BORE if -bore > body else METAL
    return d, material


def normal_at(p):
    e = 0.0015
    dx = scene((p[0] + e, p[1], p[2]))[0] - scene((p[0] - e, p[1], p[2]))[0]
    dy = scene((p[0], p[1] + e, p[2]))[0] - scene((p[0], p[1] - e, p[2]))[0]
    dz = scene((p[0], p[1], p[2] + e))[0] - scene((p[0], p[1], p[2] - e))[0]
    return norm((dx, dy, dz))


def rotate(v):
    """Camera space to world space: yaw about y, then pitch about x."""
    x, y, z = v
    cy, sy = math.cos(YAW), math.sin(YAW)
    x, z = x * cy - z * sy, x * sy + z * cy
    cp, sp = math.cos(PITCH), math.sin(PITCH)
    y, z = y * cp - z * sp, y * sp + z * cp
    return (x, y, z)


def trace(u, v):
    """Luminance in 0..1 for a ray through screen point (u, v), 0 for a miss."""
    origin = rotate((u, v, -3.0))
    direction = rotate((0.0, 0.0, 1.0))

    t = 0.0
    for _ in range(96):
        p = (origin[0] + direction[0] * t,
             origin[1] + direction[1] * t,
             origin[2] + direction[2] * t)
        d, material = scene(p)
        if d < 0.002:
            n = normal_at(p)
            lambert = max(0.0, sum(n[i] * LIGHT[i] for i in range(3)))

            if material == BORE:
                # Clamped low, and deliberately given no rim: the hole has to
                # stay the darkest thing in the mark at every size, and a rim
                # term here would outline the bore and close it up visually.
                return 0.05 + 0.14 * lambert

            # Cells whose normal has turned away from the camera are the ones
            # sitting on the silhouette. Lifting them draws the outline in
            # bright glyphs — and on a polygon that outline is the corners,
            # which is the one feature that still reads at tab size.
            facing = abs(sum(n[i] * direction[i] for i in range(3)))
            lambert = min(1.0, lambert + RIM * (1.0 - min(1.0, facing)) ** RIM_FALLOFF)
            # A low floor and a gain that reaches the top of the ramp, for the
            # reason coffee spells out: compressing into a mid band survives the
            # artboard and collapses to flat grey at 16px.
            value = 0.12 + 0.88 * lambert
            # Applied after the rim, so the near corners stay the brightest
            # thing in the mark and only the face behind them falls away.
            depth = max(0.0, min(1.0, (t - DEPTH_NEAR) / DEPTH_SPAN))
            return max(0.0, value * (1.0 - DEPTH * depth))
        if t > 6.0:
            break
        t += max(d * 0.85, 0.004)
    return 0.0


def glyph(level, cx, cy):
    """Rects for one cell, shaped to evoke the ascii ramp it stands in for.

    Shared verbatim with coffee and hours — the ramp is the family's, not this
    mark's, and a different glyph skeleton here would make the icons siblings
    in subject only.
    """
    s = CELL
    unit = s / 5.0
    px, py = cx - s / 2.0, cy - s / 2.0

    def rect(gx, gy, gw, gh):
        # Emitted as path data rather than a <rect> element: the icon is a few
        # hundred marks, and "M.. h.. v.. h.. z" is less than half the bytes of
        # the equivalent element once they are all concatenated into one path.
        return (f"M{px + gx * unit:.1f} {py + gy * unit:.1f}"
                f"h{gw * unit:.1f}v{gh * unit:.1f}h{-gw * unit:.1f}z")

    if level <= 1:                      # ,
        return [rect(2, 3, 1.1, 1.1)]
    if level <= 3:                      # - ~
        return [rect(1, 2.1, 3, 1)]
    if level <= 5:                      # : ;
        return [rect(2, 0.6, 1.1, 1.3), rect(2, 3.2, 1.1, 1.3)]
    if level <= 7:                      # = !
        return [rect(0.6, 1.1, 3.8, 1), rect(0.6, 3.0, 3.8, 1)]
    if level <= 9:                      # * #
        return [rect(0.5, 1.1, 4, 0.9), rect(0.5, 3.1, 4, 0.9),
                rect(1.4, 0.3, 0.9, 4.4), rect(2.8, 0.3, 0.9, 4.4)]
    return [rect(0.35, 0.35, 4.3, 4.3)]  # $ @


def levels_grid():
    """Trace the whole grid once, returning a list of rows of levels."""
    rows = []
    for row in range(N):
        line = []
        for col in range(N):
            cx, cy = (col + 0.5) * CELL, (row + 0.5) * CELL
            u = (cx - VIEW / 2) / (VIEW / 2) * SCALE
            v = -(cy - VIEW / 2) / (VIEW / 2) * SCALE
            if math.hypot(u / SCALE, v / SCALE) > DISC - 0.02:
                line.append(0)
                continue
            line.append(int(round(trace(u, v) * LEVELS)))
        rows.append(line)
    return rows


def opacity_for(level):
    # The floor is low on purpose: the faintest glyphs have to actually
    # recede, or every cell contributes ink and the disc fills in.
    return 0.13 + 0.87 * (level / LEVELS)


def build():
    grid = levels_grid()

    buckets = {}
    for row in range(N):
        for col in range(N):
            level = grid[row][col]
            if level <= 0:
                continue
            cx, cy = (col + 0.5) * CELL, (row + 0.5) * CELL
            buckets.setdefault(level, []).extend(glyph(level, cx, cy))

    levels = sorted(buckets)

    # One class per level rather than a fill-opacity attribute per path, so the
    # stylesheet can restyle the whole mark from one rule. It is also fewer
    # bytes: the opacity is stated once instead of on every path.
    rules = ["path{fill:#fff}"]
    rules += [f".l{level}{{fill-opacity:{opacity_for(level):.2f}}}"
              for level in levels]

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW:.0f} {VIEW:.0f}"'
        f' width="{VIEW:.0f}" height="{VIEW:.0f}">',
        "<title>odd jobs</title>",
        "<style>" + "".join(rules) + "</style>",
        # The disc is load-bearing, not decoration: the nut is white ink only,
        # so it needs a ground to sit on wherever a browser paints the tab. It
        # is baked in rather than left to a media query, because this same file
        # is rasterised to the ICO and the Apple icon, and neither format can
        # carry one.
        f'<circle cx="{VIEW / 2:.0f}" cy="{VIEW / 2:.0f}"'
        f' r="{DISC * VIEW / 2:.2f}" fill="#000000"/>',
    ]
    out += [f'<path class="l{level}" d="{"".join(buckets[level])}"/>'
            for level in levels]
    out.append("</svg>")
    return "\n".join(out) + "\n"


def preview():
    """The mark as characters, for judging it without rasterising anything."""
    lines = []
    for row in levels_grid():
        lines.append("".join(RAMP[min(level, len(RAMP) - 1)] for level in row))
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true",
                        help="print the character grid instead of the svg.")
    args = parser.parse_args()
    sys.stdout.write(preview() if args.preview else build())


if __name__ == "__main__":
    main()
