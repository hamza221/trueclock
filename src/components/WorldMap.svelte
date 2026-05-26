<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl, { type Map as MlMap, type GeoJSONSource } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import {
    clockMinusSunMinutes,
    formatDelta,
  } from '../lib/solar/solar';
  import { deltaColor } from '../lib/colormap';

  export let at: Date;
  export let userLon: number | undefined = undefined;
  export let userLat: number | undefined = undefined;

  interface Zone {
    tzid: string;
    lon: number;
    lat: number;
  }

  let mapEl: HTMLDivElement;
  let map: MlMap | undefined;
  let zones: Zone[] = [];
  let zoneByTzid = new Map<string, Zone>();
  let loaded = false;
  let lastAtMs = 0;

  // Build a fill-color expression Map-side: a match() against tzid.
  function buildFillExpression(currentAt: Date): unknown[] {
    const expr: unknown[] = ['match', ['get', 'tzid']];
    for (const z of zones) {
      const delta = clockMinusSunMinutes(z.tzid, z.lon, currentAt);
      expr.push(z.tzid, deltaColor(delta));
    }
    expr.push('#1a2238'); // default for missing
    return expr;
  }

  async function loadZoneMeta() {
    const res = await fetch('data/zones.json');
    zones = await res.json();
    zoneByTzid = new Map(zones.map((z) => [z.tzid, z]));
  }

  async function setupMap() {
    await loadZoneMeta();

    map = new maplibregl.Map({
      container: mapEl,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#0a0e1a' },
          },
        ],
        glyphs:
          'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [userLon ?? 0, userLat ?? 20],
      zoom: 1.4,
      attributionControl: false,
      maxZoom: 6,
      minZoom: 0.5,
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://github.com/evansiroky/timezone-boundary-builder">Timezone Boundary Builder</a>',
      }),
    );

    map.on('load', async () => {
      const res = await fetch('data/timezones.geojson');
      const gj = await res.json();
      map!.addSource('tz', { type: 'geojson', data: gj });

      map!.addLayer({
        id: 'tz-fill',
        type: 'fill',
        source: 'tz',
        paint: {
          'fill-color': buildFillExpression(at) as never,
          'fill-opacity': 0.78,
        },
      });

      map!.addLayer({
        id: 'tz-stroke',
        type: 'line',
        source: 'tz',
        paint: {
          'line-color': '#0a0e1a',
          'line-width': 0.4,
        },
      });

      map!.addLayer({
        id: 'tz-highlight',
        type: 'line',
        source: 'tz',
        paint: {
          'line-color': '#ffb454',
          'line-width': 2,
        },
        filter: ['==', 'tzid', '___none___'],
      });

      loaded = true;
      attachInteractions();
    });
  }

  function attachInteractions() {
    if (!map) return;
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'tz-popup',
      offset: 8,
    });

    map.on('mousemove', 'tz-fill', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const tzid = f.properties?.tzid as string;
      const z = zoneByTzid.get(tzid);
      if (!z) return;
      map!.getCanvas().style.cursor = 'pointer';
      map!.setFilter('tz-highlight', ['==', 'tzid', tzid]);
      const delta = clockMinusSunMinutes(z.tzid, z.lon, at);
      const html = `
        <div class="popup">
          <div class="tz">${escapeHtml(tzid)}</div>
          <div class="delta ${delta >= 0 ? 'ahead' : 'behind'}">${escapeHtml(
            formatDelta(delta),
          )}</div>
        </div>`;
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map!);
    });

    map.on('mouseleave', 'tz-fill', () => {
      map!.getCanvas().style.cursor = '';
      map!.setFilter('tz-highlight', ['==', 'tzid', '___none___']);
      popup.remove();
    });
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
    );
  }

  function refreshColors() {
    if (!map || !loaded) return;
    // Recompute when the date has moved meaningfully (>= 5 min)
    if (Math.abs(at.getTime() - lastAtMs) < 5 * 60_000) return;
    lastAtMs = at.getTime();
    map.setPaintProperty(
      'tz-fill',
      'fill-color',
      buildFillExpression(at) as never,
    );
  }

  $: if (loaded && at) refreshColors();

  onMount(() => {
    setupMap();
  });

  onDestroy(() => {
    map?.remove();
  });
</script>

<div class="wrap">
  <div class="map" bind:this={mapEl}></div>
  <div class="legend">
    <span class="label">Clock vs sun</span>
    <div class="gradient"></div>
    <div class="ticks mono">
      <span>−2h</span>
      <span>0</span>
      <span>+2h</span>
    </div>
    <div class="ticks mono caps">
      <span>behind</span>
      <span></span>
      <span>ahead</span>
    </div>
  </div>
</div>

<style>
  .wrap {
    position: relative;
    width: 100%;
    height: 60vh;
    min-height: 420px;
    background: var(--bg);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .legend {
    position: absolute;
    left: 16px;
    bottom: 16px;
    background: rgba(10, 14, 26, 0.85);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    width: 240px;
    backdrop-filter: blur(6px);
    z-index: 1;
  }

  .legend .label {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--fg-dim);
    margin-bottom: 8px;
  }

  .gradient {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      rgb(90, 200, 250),
      rgb(40, 50, 80),
      rgb(255, 110, 90)
    );
  }

  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--fg-dim);
    margin-top: 4px;
  }

  .ticks.caps {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 9px;
  }

  :global(.maplibregl-popup.tz-popup .maplibregl-popup-content) {
    background: var(--bg-elev);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    font-family: inherit;
  }

  :global(.maplibregl-popup.tz-popup .maplibregl-popup-tip) {
    border-top-color: var(--bg-elev);
    border-bottom-color: var(--bg-elev);
  }

  :global(.tz-popup .popup .tz) {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 2px;
  }

  :global(.tz-popup .popup .delta) {
    font-size: 12px;
    color: var(--fg-dim);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  :global(.tz-popup .popup .delta.ahead) {
    color: #ff8c70;
  }

  :global(.tz-popup .popup .delta.behind) {
    color: #6fb8e8;
  }

  :global(.maplibregl-ctrl-attrib) {
    background: rgba(10, 14, 26, 0.7) !important;
    color: var(--fg-dim) !important;
  }

  :global(.maplibregl-ctrl-attrib a) {
    color: var(--fg-dim) !important;
  }
</style>
