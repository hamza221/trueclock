<script lang="ts">
  // Year/time scrubber. Lets users see DST jumps and EoT swing through the year.
  export let value: Date;
  export let onChange: (d: Date) => void;

  // value is a Date. Slider control is the day-of-year (0-365) + minute-of-day.
  // For simplicity expose day-of-year. Time-of-day is fixed to "now" so DST
  // boundaries (typically Sunday 02:00) show cleanly.

  function setDayOfYear(day: number) {
    const d = new Date(value);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    const target = new Date(start.getTime() + day * 86_400_000);
    // keep the current time-of-day
    target.setUTCHours(d.getUTCHours(), d.getUTCMinutes(), 0, 0);
    onChange(target);
  }

  $: dayOfYear = Math.floor(
    (value.getTime() - Date.UTC(value.getUTCFullYear(), 0, 0)) /
      86_400_000,
  );

  $: monthLabel = value.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });

  function resetToNow() {
    onChange(new Date());
  }
</script>

<div class="bar">
  <div class="meta">
    <span class="label">Time travel</span>
    <span class="date mono">{monthLabel}</span>
  </div>
  <input
    type="range"
    min="1"
    max="365"
    bind:value={dayOfYear}
    on:input={(e) =>
      setDayOfYear(parseInt((e.currentTarget as HTMLInputElement).value, 10))}
  />
  <div class="ticks mono">
    <span>Jan</span>
    <span>Apr</span>
    <span>Jul</span>
    <span>Oct</span>
    <span>Dec</span>
  </div>
  <div class="actions">
    <button on:click={resetToNow}>Now</button>
  </div>
</div>

<style>
  .bar {
    padding: 14px 20px 18px;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr 4fr auto;
    grid-template-areas:
      'meta slider actions'
      'meta ticks  actions';
    gap: 4px 18px;
    align-items: center;
  }

  .meta {
    grid-area: meta;
    display: flex;
    flex-direction: column;
  }

  .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--fg-dim);
  }

  .date {
    font-size: 18px;
    color: var(--accent);
  }

  input[type='range'] {
    grid-area: slider;
    appearance: none;
    width: 100%;
    height: 4px;
    background: linear-gradient(
      90deg,
      #5ac8fa,
      #2a3550,
      #ffb454,
      #2a3550,
      #5ac8fa
    );
    border-radius: 2px;
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--accent);
    cursor: pointer;
  }

  input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--accent);
    cursor: pointer;
  }

  .ticks {
    grid-area: ticks;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--fg-mute);
  }

  .actions {
    grid-area: actions;
  }

  @media (max-width: 640px) {
    .bar {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'meta actions'
        'slider slider'
        'ticks ticks';
    }
  }
</style>
