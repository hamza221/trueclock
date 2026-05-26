<script lang="ts">
  import { onMount } from 'svelte';
  import SolarClock from './components/SolarClock.svelte';
  import WorldMap from './components/WorldMap.svelte';
  import DateSlider from './components/DateSlider.svelte';
  import Leaderboard from './components/Leaderboard.svelte';
  import SolarDetail from './components/SolarDetail.svelte';
  import CitySearch from './components/CitySearch.svelte';
  import { resolveLocation, tzFromLatLon, type LocationFix } from './lib/location';
  import { reverseGeocode, type PlaceHit, type PlaceName } from './lib/geocode';

  let fix: LocationFix | undefined;
  let zone: string | undefined;
  let place: PlaceName | undefined;
  let error: string | undefined;
  let busy = true;

  let at = new Date();
  let pinned = false;
  let liveTimer: ReturnType<typeof setInterval>;

  let zones: Array<{ tzid: string; lon: number; lat: number }> = [];

  async function locate() {
    busy = true;
    error = undefined;
    try {
      fix = await resolveLocation();
      zone = tzFromLatLon(fix.lat, fix.lon);
      try {
        place = await reverseGeocode(fix.lat, fix.lon);
      } catch {
        place = undefined;
      }
    } catch (e) {
      error =
        e instanceof Error ? e.message : 'Could not determine your location.';
    } finally {
      busy = false;
    }
  }

  async function loadZoneMeta() {
    try {
      const r = await fetch('data/zones.json');
      zones = await r.json();
    } catch {
      zones = [];
    }
  }

  onMount(() => {
    locate();
    loadZoneMeta();
    liveTimer = setInterval(() => {
      if (!pinned) at = new Date();
    }, 1000);
    return () => clearInterval(liveTimer);
  });

  function onSliderChange(d: Date) {
    pinned = true;
    at = d;
  }

  function onCityPick(hit: PlaceHit) {
    fix = { lat: hit.lat, lon: hit.lon, source: 'manual' };
    zone = tzFromLatLon(hit.lat, hit.lon);
    place = {
      city: hit.name,
      region: hit.region,
      country: hit.country,
      display: hit.display,
    };
    error = undefined;
  }

  function resumeLive() {
    pinned = false;
    at = new Date();
  }

  $: placeLabel = (() => {
    if (!place) return undefined;
    const parts = [place.city, place.region, place.country].filter(Boolean);
    return parts.join(', ');
  })();
</script>

<main>
  <nav class="topnav">
    <div class="brand mono">trueclock</div>
    <div class="nav-right">
      <CitySearch onPick={onCityPick} />
      <div class="links">
        <a href="#about">About</a>
        <a
          href="https://github.com/hamza221/trueclock"
          target="_blank"
          rel="noopener">GitHub</a
        >
      </div>
    </div>
  </nav>

  {#if busy && !fix}
    <div class="splash">
      <div class="spinner"></div>
      <p>Locating you…</p>
      <p class="hint">We'll ask permission. Denying falls back to IP.</p>
    </div>
  {:else if error && !fix}
    <div class="splash">
      <p class="err">{error}</p>
      <button on:click={locate}>Try again</button>
    </div>
  {:else if fix && zone}
    <SolarClock
      {at}
      lat={fix.lat}
      lon={fix.lon}
      {zone}
      placeName={placeLabel}
    />

    <DateSlider value={at} onChange={onSliderChange} />

    {#if pinned}
      <div class="pinned-banner">
        Showing <strong class="mono"
          >{at.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong
        >
        — <button class="link" on:click={resumeLive}>resume live</button>
      </div>
    {/if}

    <WorldMap {at} userLon={fix.lon} userLat={fix.lat} />

    <SolarDetail
      {at}
      lat={fix.lat}
      lon={fix.lon}
      {zone}
      city={place?.city}
      region={place?.region}
      country={place?.country}
      countryCode={place?.countryCode}
    />

    <Leaderboard {at} {zones} />

    <section class="about" id="about">
      <h2>The science</h2>
      <p>
        Your phone's clock shows <em>civil time</em> — a political offset from
        UTC that may include daylight saving. The sun doesn't care about
        politics. At your longitude, true noon (the sun crossing your meridian)
        happens at a specific moment we can compute exactly.
      </p>
      <p>
        We take your longitude, divide by 15° to get
        <strong>Local Mean Time</strong>, add the
        <strong>Equation of Time</strong>
        (a ±16 minute correction for Earth's elliptical orbit and axial tilt),
        and compare against your civil offset. The gap is your "wrongness".
      </p>
      <p>
        Spain runs on Central European Time because Franco aligned the country
        with Nazi Germany in 1940 and never reverted. France was caught in the
        same shift. China spans five solar hours but uses a single timezone.
        India offsets by 30 minutes for a country half a continent wide. The
        map above shows how big the gap is everywhere on Earth, right now.
      </p>
      <p class="credits">
        Time zones from
        <a href="https://github.com/evansiroky/timezone-boundary-builder"
          >Timezone Boundary Builder</a
        >. Equation of time from
        <a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF">NOAA</a>.
        Geolocation via your browser, with IP fallback by
        <a href="https://ipapi.co">ipapi.co</a>.
      </p>
    </section>

    <footer>
      <p class="mono">trueclock · {new Date().getFullYear()}</p>
    </footer>
  {/if}
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .topnav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .brand {
    font-size: 14px;
    color: var(--accent);
    letter-spacing: 0.04em;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .links {
    display: flex;
    gap: 16px;
    font-size: 13px;
  }

  @media (max-width: 540px) {
    .links {
      display: none;
    }
  }

  .links a {
    color: var(--fg-dim);
  }

  .links a:hover {
    color: var(--accent);
  }

  .splash {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 64px 24px;
    text-align: center;
    color: var(--fg-dim);
  }

  .splash .hint {
    font-size: 12px;
    color: var(--fg-mute);
  }

  .splash .err {
    color: var(--warn);
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .pinned-banner {
    background: rgba(255, 180, 84, 0.08);
    border-bottom: 1px solid var(--border);
    padding: 8px 20px;
    text-align: center;
    font-size: 13px;
    color: var(--fg-dim);
  }

  .pinned-banner strong {
    color: var(--accent);
  }

  button.link {
    background: none;
    border: none;
    color: var(--accent);
    padding: 0;
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }

  .about {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 24px 48px;
    color: var(--fg-dim);
    line-height: 1.6;
    font-size: 15px;
  }

  .about h2 {
    color: var(--fg);
    font-size: 22px;
    margin-bottom: 16px;
  }

  .about p {
    margin: 0 0 14px;
  }

  .about p.credits {
    font-size: 12px;
    color: var(--fg-mute);
    margin-top: 24px;
  }

  footer {
    padding: 20px;
    text-align: center;
    color: var(--fg-mute);
    font-size: 11px;
    border-top: 1px solid var(--border);
  }
</style>
