# oddjob.justin06lee.dev

Where people ask me to build things. A work-order intake, a numbered docket
back, and an inbox to read them in.

Same house style as [justin06lee.dev](https://justin06lee.dev) — dark, square,
Poppins, [chrome](https://chrome.justin06lee.dev) components — wearing a hi-vis
vest: a blueprint grid substrate, hazard tape, and exactly two accent colours.

## surfaces

| route | what |
|---|---|
| `/` | hero — a raymarched ascii hex nut, a pencil that rules its own line, and two doors |
| `/request` | the three-step work order, plus a downloadable template and a dropzone for a written spec |
| `/login` | admin login (rate-limited, generic failure message) |
| `/admin` | the inbox: filter by status, paginated |
| `/admin/[id]` | one work order — full brief, links, attachments, status, private notes |

Anyone who'd rather talk than type is sent to
[coffee.justin06lee.dev](https://coffee.justin06lee.dev).

## running it

```bash
bun install
cp .env.example .env.local   # fill it in
bun run dev
```

`.env.example` names every variable. The Turso credentials and `ADMIN_KEY` are
the same ones the other justin06lee.dev sites use — this site's tables are
namespaced `oddjob_` and its session cookie is its own, so a token from another
site doesn't unlock this one.

Without `RESEND_API_KEY` the site still works: work orders are saved and appear
in `/admin`, and only the notification emails are skipped (with a warning in the
logs). The database is the record; email is just the nudge.

```bash
bun run build      # production build
bun run lint
bun run typecheck
bun run icons      # rebuild the rasters from src/app/icon.svg
bun run icons:draw # redraw the SVG from design/favicon/generate.py, then the rasters
```

## the icon

An ascii-shaded hex nut on a black disc — a sibling to the donut on
justin06lee.dev, the cup on coffee.justin06lee.dev and the hourglass on
hours.justin06lee.dev. Same pipeline: a real form is raymarched, lit, sampled
onto a 30×30 character grid, and each cell drawn as the rect skeleton of the
glyph its luminance lands on.

It is the **same hex nut the hero raymarches**, which is the point of picking it
— the mark in the tab and the thing turning over on the page are one object.

`design/favicon/generate.py` draws it; `--preview` prints the character grid to
stdout, which is the fastest way to judge the mark before rasterising anything.
`src/app/icon.svg` is the only icon committed — `favicon.ico` and
`apple-icon.png` are derived by `scripts/build-icons.mjs` (wired to `predev` and
`prebuild`) and gitignored, because a checked-in binary beside the drawing that
produced it is a copy waiting to go stale.

Two things differ from the round siblings. The silhouette is a polygon, so the
rim term is stronger — corners are the only feature that survives downsampling
to 16px, and they only survive if the outline is the brightest thing in the
mark. And a faceted object shades in flat steps rather than a gradient, so a
slight fall-off with distance spreads the tones across the ramp the way a
surface of revolution does for free.

## how it's put together

- **`src/lib/work-order.ts`** — the vocabulary (job types, budgets, statuses),
  the limits, and the validation. No database import, so the form and the server
  action share one definition of a valid work order and can't drift.
- **`src/lib/requests.ts`** — `server-only` storage. Reference numbers come from
  a counter row rather than `COUNT(*) + 1`, so deleting a work order never hands
  its number to the next one.
- **`src/lib/db.ts`** — the Turso client, built on first use rather than at
  import: Next imports every route to collect page data, and a module-scope
  client turns a missing credential into a failed build instead of a failed
  request.
- **`src/lib/hero-shader.ts`** — the hex nut, as a signed distance field
  evaluated per character cell. A pure `(x, y, t) => luminance`, so it drops
  into chrome's `ascii-shader` with no WebGL context and no geometry.

Attachments are stored inline in the database, capped at 2 MB. There is no
object store in this stack, and adding one for the occasional 200 kb spec would
be the tail wagging the dog; anything bigger should be a link.

## the palette

Two tokens, defined in `src/app/globals.css` and nowhere else:

| token | used for |
|---|---|
| `--hazard` `#ff6a00` | the one interactive accent — submit, active step, required marks, tape |
| `--blueprint` `#2b6cff` | lines only. grid, rules, dimension marks. never text |

Everything else is white on black at the usual opacity ladder. The chrome
components stay monochrome and take their colour through props, which is what
keeps the registry reusable and this site recognisably part of the family.

## components contributed back

Building this added eleven components to the chrome registry rather than keeping
them local: `ascii-shader`, `blueprint`, `hazard`, `dimension`, `pencil-rule`,
`stamp`, `grain`, `marquee`, `dropzone`, `docket`, `pagination` — plus a
character counter on `textarea`.
