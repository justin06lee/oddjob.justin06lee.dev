import type { ShaderFn } from "@/components/chrome/ascii-shader";

/**
 * A hex nut, turning over.
 *
 * `donut` on justin06lee.dev is a torus because the torus is the canonical
 * demo; this site's object should be a fastener. It is a signed-distance
 * hexagonal prism with a cylindrical bore subtracted, raymarched per character
 * cell — so the whole thing is a pure function of (x, y, t) and drops straight
 * into `ascii-shader` with no geometry, no buffers and no WebGL context.
 *
 * The cost profile matters, because this runs on a landing page: the march
 * exits the moment it hits or leaves the bounding sphere, so cells that see
 * only background cost about four iterations rather than the full budget, and
 * the four extra taps for the surface normal are paid only on cells that hit.
 * `ascii-shader` caps the frame rate and stops the loop entirely once the hero
 * scrolls away.
 */

const HEX_K0 = -0.8660254;
const HEX_K1 = 0.5;
const HEX_K2 = 0.57735;

/** iq's hexagonal prism, extruded along z. `r` is the across-flats radius. */
function sdHexPrism(px: number, py: number, pz: number, r: number, halfDepth: number): number {
  let ax = Math.abs(px);
  let ay = Math.abs(py);
  const az = Math.abs(pz);

  const fold = 2 * Math.min(HEX_K0 * ax + HEX_K1 * ay, 0);
  ax -= fold * HEX_K0;
  ay -= fold * HEX_K1;

  const limit = HEX_K2 * r;
  const cx = ax < -limit ? -limit : ax > limit ? limit : ax;
  const dx = Math.hypot(ax - cx, ay - r) * Math.sign(ay - r);
  const dz = az - halfDepth;

  return (
    Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0))
  );
}

/** Capped cylinder along z — the bore. */
function sdCylinderZ(px: number, py: number, pz: number, r: number, halfDepth: number): number {
  const dx = Math.hypot(px, py) - r;
  const dz = Math.abs(pz) - halfDepth;
  return Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
}

const NUT_RADIUS = 0.62;
const NUT_DEPTH = 0.22;
const BORE_RADIUS = 0.33;
/** Anything past this can't be the nut, so the march can stop looking. */
const BOUND = 2.6;

function scene(px: number, py: number, pz: number): number {
  const body = sdHexPrism(px, py, pz, NUT_RADIUS, NUT_DEPTH);
  // The bore is cut slightly deeper than the body so the subtraction leaves a
  // clean hole rather than a membrane at the exact face depth.
  const bore = sdCylinderZ(px, py, pz, BORE_RADIUS, NUT_DEPTH + 0.05);
  return Math.max(body, -bore);
}

export function makeNutShader(speed = 0.55): ShaderFn {
  return ({ x, y, t }) => {
    const angle = t * speed;
    // Two axes, at rates that don't divide evenly, so the tumble never settles
    // into a period short enough to read as a loop.
    const cosY = Math.cos(angle);
    const sinY = Math.sin(angle);
    const cosX = Math.cos(angle * 0.61);
    const sinX = Math.sin(angle * 0.61);

    // Camera at -2.6 looking down +z; 1.7 is the focal length that frames the
    // nut with a little air at the widest point of the tumble.
    const ox = 0;
    const oy = 0;
    const oz = -2.6;
    const len = Math.hypot(x, y, 1.7);
    const dx = x / len;
    const dy = y / len;
    const dz = 1.7 / len;

    let travelled = 0;
    let hit = false;
    let hx = 0;
    let hy = 0;
    let hz = 0;

    for (let step = 0; step < 28; step++) {
      const wx = ox + dx * travelled;
      const wy = oy + dy * travelled;
      const wz = oz + dz * travelled;

      // Rotate the sample point into the object's frame rather than rotating
      // the object: one transform per sample, and the SDF stays axis-aligned.
      const ry = wx * cosY - wz * sinY;
      const rz = wx * sinY + wz * cosY;
      const px = ry;
      const py = wy * cosX - rz * sinX;
      const pz = wy * sinX + rz * cosX;

      const distance = scene(px, py, pz);
      if (distance < 0.004) {
        hit = true;
        hx = px;
        hy = py;
        hz = pz;
        break;
      }
      travelled += distance;
      if (travelled > BOUND * 2) break;
    }

    if (!hit) return 0;

    // Tetrahedral normal — four taps rather than six, and only on cells that
    // actually landed on the surface.
    const e = 0.006;
    const n1 = scene(hx + e, hy - e, hz - e);
    const n2 = scene(hx - e, hy - e, hz + e);
    const n3 = scene(hx - e, hy + e, hz - e);
    const n4 = scene(hx + e, hy + e, hz + e);
    let nx = n1 - n2 - n3 + n4;
    let ny = -n1 - n2 + n3 + n4;
    let nz = -n1 + n2 - n3 + n4;
    const nlen = Math.hypot(nx, ny, nz) || 1;
    nx /= nlen;
    ny /= nlen;
    nz /= nlen;

    // Key light over the shoulder, plus enough ambient that the unlit faces
    // stay as visible glyphs instead of dropping to blank cells.
    const lambert = Math.max(0, nx * 0.4 + ny * 0.7 - nz * 0.58);
    const rim = Math.pow(1 - Math.max(0, -nz), 2) * 0.25;
    return Math.min(1, 0.22 + lambert * 0.78 + rim);
  };
}

export const nutShader = makeNutShader();
