# trueclock

The time you actually live in.

Most countries' clocks disagree with the sun. Spain runs on German time
(courtesy of Franco, 1940). China spans five solar hours on one offset.
France, Argentina, Alaska, India — all noticeably off. **trueclock**
shows the gap for your exact location and for every timezone on Earth,
right now.

## How it works

- Your longitude → **Local Mean Time** (`lon ÷ 15` hours from UTC).
- A daily **Equation of Time** correction (±16 min for orbital eccentricity
  and axial tilt) gives **Apparent Solar Time** — what a sundial reads.
- Your IANA timezone → **civil offset** (with DST).
- The map colors each zone by `civil − sun` in minutes.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # regenerates public/data/* from data-src/, then vite build
```

## Stack

Vite · Svelte · TypeScript · MapLibre GL · Luxon · `tz-lookup` ·
Timezone Boundary Builder polygons (simplified) · OSM Nominatim ·
ipapi.co (fallback).

## License

[The Unlicense](LICENSE) — public domain.

## Warning 

Vibe coded, take the results with a grain of salt
