// Solar time math: Local Mean Time (LMT), Equation of Time (EoT),
// and Apparent Solar Time (AST).
//
// Civil time = the clock on the wall (IANA zone offset + DST).
// LMT        = UTC + longitude/15  (each meridian's mean noon).
// AST        = LMT + EoT           (what a sundial reads).
//
// Delta presented to users = civil - AST  (how far the clock leads the sun).

import { DateTime } from 'luxon';

/**
 * NOAA equation-of-time approximation, in minutes.
 * Accurate to within ~15 seconds across the year.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 */
export function equationOfTimeMinutes(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60;
  const gamma =
    ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hourUTC - 12) / 24);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  );
}

/** Local Mean Time offset from UTC, in hours, for a given longitude. */
export function lmtOffsetHours(longitudeDeg: number): number {
  return longitudeDeg / 15;
}

/** Apparent (true) solar time as a Date in UTC-ms (the wall-clock interpretation
 *  is "what hour is it where the sun is right now at this longitude").
 */
export function apparentSolarTime(now: Date, longitudeDeg: number): Date {
  const offsetMs =
    lmtOffsetHours(longitudeDeg) * 3_600_000 +
    equationOfTimeMinutes(now) * 60_000;
  return new Date(now.getTime() + offsetMs);
}

/**
 * Format a Date as HH:MM:SS treating its UTC fields as wall-clock.
 * Used to render solar time where the "UTC" value is actually solar-local.
 */
export function formatAsClock(d: Date): string {
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/** Civil offset from UTC, in hours, for an IANA zone at a given instant. */
export function civilOffsetHours(zone: string, at: Date): number {
  const dt = DateTime.fromJSDate(at, { zone });
  return dt.offset / 60; // luxon returns minutes
}

/**
 * Signed "wrongness": positive means clock is ahead of the sun (Spain summer).
 * Returns minutes.
 */
export function clockMinusSunMinutes(
  zone: string,
  longitudeDeg: number,
  at: Date,
): number {
  const civil = civilOffsetHours(zone, at) * 60;
  const sun = lmtOffsetHours(longitudeDeg) * 60 + equationOfTimeMinutes(at);
  return civil - sun;
}

/** Pretty-print a signed minute delta as "1h 45m ahead/behind". */
export function formatDelta(deltaMin: number): string {
  const sign = deltaMin >= 0 ? 'ahead of' : 'behind';
  const abs = Math.abs(deltaMin);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  if (h === 0) return `${m}m ${sign} the sun`;
  return `${h}h ${m}m ${sign} the sun`;
}

/**
 * Solar declination, equation-of-time, and solar position (elevation +
 * azimuth) for an observer. NOAA approximations; good to ~0.1° for elevation
 * and well within a minute for EoT.
 *
 * Azimuth is reported clockwise from true north:
 *   0° = N, 90° = E, 180° = S, 270° = W.
 * Elevation is 0° at the horizon, 90° at zenith (negative below horizon).
 */
export interface SolarPosition {
  elevationDeg: number;
  azimuthDeg: number;
}

export function solarPosition(
  at: Date,
  lat: number,
  lon: number,
): SolarPosition {
  const start = Date.UTC(at.getUTCFullYear(), 0, 0);
  const dayOfYear = (at.getTime() - start) / 86_400_000;
  const hourUTC =
    at.getUTCHours() +
    at.getUTCMinutes() / 60 +
    at.getUTCSeconds() / 3600;
  const gamma =
    ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hourUTC - 12) / 24);

  // Declination (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Equation of time (minutes) — same formula as above, kept inline so this
  // function is self-contained.
  const eot =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // True solar time (minutes), then hour angle in degrees.
  const utcMin = hourUTC * 60;
  const tst = utcMin + eot + 4 * lon;
  const haDeg = tst / 4 - 180;
  const haRad = (haDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  const cosZen =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  const clampedCosZen = Math.max(-1, Math.min(1, cosZen));
  const zenRad = Math.acos(clampedCosZen);
  const elevationDeg = 90 - (zenRad * 180) / Math.PI;

  const sinZen = Math.sin(zenRad);
  let azDeg: number;
  if (sinZen < 1e-6) {
    // sun straight overhead — azimuth is undefined; pick north
    azDeg = 0;
  } else {
    const cosAz =
      (Math.sin(decl) - Math.cos(zenRad) * Math.sin(latRad)) /
      (sinZen * Math.cos(latRad));
    const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
    const azBase = (Math.acos(clampedCosAz) * 180) / Math.PI;
    // Before solar noon (negative hour angle) sun is in the east half;
    // after, in the west half.
    azDeg = haDeg > 0 ? 360 - azBase : azBase;
  }

  return { elevationDeg, azimuthDeg: azDeg };
}

/** Two-letter ISO country code → flag emoji. Returns '' if invalid. */
export function flagEmoji(cc?: string): string {
  if (!cc || cc.length !== 2 || !/^[a-zA-Z]{2}$/.test(cc)) return '';
  const base = 0x1f1e6 - 'A'.charCodeAt(0);
  return [...cc.toUpperCase()]
    .map((c) => String.fromCodePoint(base + c.charCodeAt(0)))
    .join('');
}
