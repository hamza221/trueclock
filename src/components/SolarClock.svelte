<script lang="ts">
  import { DateTime } from 'luxon';
  import {
    apparentSolarTime,
    civilOffsetHours,
    clockMinusSunMinutes,
    equationOfTimeMinutes,
    formatAsClock,
    formatDelta,
    lmtOffsetHours,
  } from '../lib/solar/solar';

  export let lat: number;
  export let lon: number;
  export let zone: string;
  export let placeName: string | undefined = undefined;
  export let at: Date;

  $: civilDt = DateTime.fromJSDate(at, { zone });
  $: civilStr = civilDt.toFormat('HH:mm:ss');
  $: civilZoneAbbr = civilDt.toFormat('ZZZZ');
  $: civilOffset = civilOffsetHours(zone, at);
  $: solarDate = apparentSolarTime(at, lon);
  $: solarStr = formatAsClock(solarDate);
  $: lmt = lmtOffsetHours(lon);
  $: eot = equationOfTimeMinutes(at);
  $: deltaMin = clockMinusSunMinutes(zone, lon, at);

  function fmtOffset(h: number): string {
    const sign = h >= 0 ? '+' : '−';
    const abs = Math.abs(h);
    const hh = Math.floor(abs);
    const mm = Math.round((abs - hh) * 60);
    return `UTC${sign}${hh}:${String(mm).padStart(2, '0')}`;
  }

  function fmtMinutes(m: number): string {
    const sign = m >= 0 ? '+' : '−';
    const abs = Math.abs(m);
    const mm = Math.floor(abs);
    const ss = Math.round((abs - mm) * 60);
    return `${sign}${mm}m ${ss}s`;
  }
</script>

<section class="hero">
  <header>
    <p class="loc">
      {#if placeName}
        <span class="pin">📍</span> {placeName}
      {:else}
        <span class="pin">📍</span> {lat.toFixed(2)}°, {lon.toFixed(2)}°
      {/if}
      <span class="zone-pill mono">{zone}</span>
    </p>
  </header>

  <div class="clocks">
    <div class="clock civil">
      <div class="label">Your clock says</div>
      <div class="time mono">{civilStr}</div>
      <div class="sub mono">{civilZoneAbbr} · {fmtOffset(civilOffset)}</div>
    </div>

    <div class="vs" aria-hidden="true">vs</div>

    <div class="clock solar">
      <div class="label">The sun says</div>
      <div class="time mono">{solarStr}</div>
      <div class="sub mono">solar · {fmtOffset(lmt)} (LMT)</div>
    </div>
  </div>

  <p class="verdict" class:warn={Math.abs(deltaMin) > 30} class:ok={Math.abs(deltaMin) <= 30}>
    You're <strong>{formatDelta(deltaMin)}</strong>
  </p>

  <details class="why">
    <summary>How is this calculated?</summary>
    <table class="mono">
      <tbody>
        <tr><td>Longitude</td><td>{lon.toFixed(4)}°</td></tr>
        <tr><td>Local Mean Time offset (lon ÷ 15)</td><td>{fmtMinutes(lmt * 60)}</td></tr>
        <tr><td>Equation of Time (today)</td><td>{fmtMinutes(eot)}</td></tr>
        <tr><td>Apparent solar offset (LMT + EoT)</td><td>{fmtMinutes(lmt * 60 + eot)}</td></tr>
        <tr><td>Civil offset ({zone})</td><td>{fmtMinutes(civilOffset * 60)}</td></tr>
        <tr class="result"><td>Clock − Sun</td><td>{fmtMinutes(deltaMin)}</td></tr>
      </tbody>
    </table>
  </details>
</section>

<style>
  .hero {
    text-align: center;
    padding: 48px 24px 36px;
    background: linear-gradient(180deg, var(--bg-elev) 0%, var(--bg) 100%);
    border-bottom: 1px solid var(--border);
  }

  .loc {
    color: var(--fg-dim);
    font-size: 14px;
    margin: 0 0 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pin {
    filter: saturate(1.2);
  }

  .zone-pill {
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 12px;
    color: var(--fg);
  }

  .clocks {
    display: flex;
    gap: 28px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .clock {
    min-width: 260px;
  }

  .label {
    color: var(--fg-dim);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }

  .time {
    font-size: clamp(48px, 8vw, 84px);
    line-height: 1;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  .clock.civil .time {
    color: var(--fg);
  }

  .clock.solar .time {
    color: var(--accent);
  }

  .sub {
    margin-top: 8px;
    color: var(--fg-dim);
    font-size: 13px;
  }

  .vs {
    color: var(--fg-mute);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .verdict {
    font-size: clamp(18px, 2.5vw, 24px);
    margin: 0 0 20px;
  }

  .verdict.warn strong {
    color: var(--warn);
  }

  .verdict.ok strong {
    color: var(--good);
  }

  .why {
    max-width: 540px;
    margin: 0 auto;
    text-align: left;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
  }

  .why summary {
    cursor: pointer;
    color: var(--fg-dim);
    font-size: 14px;
    list-style: none;
  }

  .why summary::-webkit-details-marker {
    display: none;
  }

  .why summary::before {
    content: '▶';
    display: inline-block;
    margin-right: 8px;
    transition: transform 120ms;
    font-size: 10px;
  }

  .why[open] summary::before {
    transform: rotate(90deg);
  }

  .why table {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
    font-size: 13px;
  }

  .why td {
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .why td:last-child {
    text-align: right;
    color: var(--fg);
  }

  .why td:first-child {
    color: var(--fg-dim);
  }

  .why .result td {
    border-bottom: none;
    padding-top: 12px;
    font-weight: 600;
    color: var(--accent);
  }
</style>
