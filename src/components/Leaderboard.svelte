<script lang="ts">
  import { clockMinusSunMinutes, formatDelta } from '../lib/solar/solar';

  export let at: Date;
  export let zones: Array<{ tzid: string; lon: number; lat: number }>;
  export let limit = 10;

  $: ranked = zones
    .filter((z) => Math.abs(z.lat) < 66.5) // skip polar zones (sun goes weird)
    .map((z) => ({
      tzid: z.tzid,
      lon: z.lon,
      delta: clockMinusSunMinutes(z.tzid, z.lon, at),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
</script>

<section class="board">
  <header>
    <h2>Worst offenders right now</h2>
    <p class="sub">
      Largest gap between civil time and apparent solar time. (Excluding polar
      zones where solar time misbehaves.)
    </p>
  </header>
  <ol>
    {#each ranked as r, i}
      <li>
        <span class="rank mono">{i + 1}</span>
        <span class="tz mono">{r.tzid}</span>
        <span class="delta mono" class:ahead={r.delta >= 0} class:behind={r.delta < 0}>
          {formatDelta(r.delta)}
        </span>
      </li>
    {/each}
  </ol>
</section>

<style>
  .board {
    padding: 32px 24px 48px;
    max-width: 720px;
    margin: 0 auto;
  }

  header {
    margin-bottom: 20px;
  }

  h2 {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .sub {
    color: var(--fg-dim);
    font-size: 13px;
    margin: 0;
  }

  ol {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  li {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elev);
  }

  li:last-child {
    border-bottom: none;
  }

  .rank {
    color: var(--fg-mute);
    font-size: 12px;
  }

  .tz {
    font-size: 14px;
  }

  .delta {
    font-size: 13px;
    font-weight: 600;
  }

  .delta.ahead {
    color: var(--warn);
  }

  .delta.behind {
    color: var(--cool);
  }
</style>
