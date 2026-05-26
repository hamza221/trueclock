<script lang="ts">
  import { DateTime } from 'luxon';
  import {
    apparentSolarTime,
    civilOffsetHours,
    equationOfTimeMinutes,
    flagEmoji,
    formatAsClock,
    lmtOffsetHours,
    solarPosition,
  } from '../lib/solar/solar';

  export let at: Date;
  export let lat: number;
  export let lon: number;
  export let zone: string;
  export let city: string | undefined = undefined;
  export let region: string | undefined = undefined;
  export let country: string | undefined = undefined;
  export let countryCode: string | undefined = undefined;

  // Two carousel views: top-down compass, and side (horizon + sun arc).
  let view: 0 | 1 = 0;
  function prev() {
    view = ((view - 1 + 2) % 2) as 0 | 1;
  }
  function next() {
    view = ((view + 1) % 2) as 0 | 1;
  }

  $: civilDt = DateTime.fromJSDate(at, { zone });
  $: civilOffsetH = civilOffsetHours(zone, at);
  $: civilStr = civilDt.toFormat('HH:mm:ss');
  $: utcDt = DateTime.fromJSDate(at, { zone: 'utc' });
  $: utcStr = utcDt.toFormat('HH:mm:ss');
  $: dateLong = civilDt.toFormat('d LLLL yyyy');
  $: dst = civilDt.isInDST;

  $: solarDate = apparentSolarTime(at, lon);
  $: solarStr = formatAsClock(solarDate);

  $: eotMin = equationOfTimeMinutes(at);
  $: lmtMin = lmtOffsetHours(lon) * 60;
  $: civilMin = civilOffsetH * 60;
  $: locationOffsetMin = lmtMin - civilMin;
  $: totalDiffMin = -((civilMin) - (lmtMin + eotMin)); // (sun - clock) = -(clock - sun)
  // Note: presenting as (sun - clock) keeps "negative" = clock ahead of sun
  // matching the screenshot's "-132 min" framing.

  $: tzCenterLonDeg = civilOffsetH * 15;
  $: lonDiffDeg = lon - tzCenterLonDeg;

  // Longitude diagram — focus the view around the user and the TZ center
  // with enough padding to show the timezone band (±7.5°) and the labels.
  const LONVB_W = 600;
  const LONVB_H = 140;
  const LONVB_PAD_X = 60;
  $: lonMin = Math.min(lon, tzCenterLonDeg) - 12;
  $: lonMax = Math.max(lon, tzCenterLonDeg) + 12;
  $: lonRange = Math.max(30, lonMax - lonMin);
  function lonToX(
    deg: number,
    min: number,
    range: number,
    padX: number,
    vbW: number,
  ): number {
    return padX + ((deg - min) / range) * (vbW - 2 * padX);
  }
  $: tzCenterX = lonToX(tzCenterLonDeg, lonMin, lonRange, LONVB_PAD_X, LONVB_W);
  $: userX = lonToX(lon, lonMin, lonRange, LONVB_PAD_X, LONVB_W);
  $: bandLeftX = lonToX(tzCenterLonDeg - 7.5, lonMin, lonRange, LONVB_PAD_X, LONVB_W);
  $: bandRightX = lonToX(tzCenterLonDeg + 7.5, lonMin, lonRange, LONVB_PAD_X, LONVB_W);
  // If user and TZ markers are close together, stagger their bottom labels
  $: labelsClose = Math.abs(userX - tzCenterX) < 90;

  $: pos = solarPosition(at, lat, lon);
  $: belowHorizon = pos.elevationDeg < 0;

  function fmtHMS(totalMin: number): string {
    const sign = totalMin >= 0 ? '+' : '−';
    const abs = Math.abs(totalMin);
    const h = Math.floor(abs / 60);
    const m = Math.floor(abs % 60);
    const s = Math.round((abs - Math.floor(abs)) * 60);
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function fmtMinSign(m: number): string {
    const sign = m >= 0 ? '+' : '−';
    return `${sign}${Math.round(Math.abs(m))}`;
  }

  function fmtOffset(h: number): string {
    const sign = h >= 0 ? '+' : '−';
    const abs = Math.abs(h);
    const hh = Math.floor(abs);
    const mm = Math.round((abs - hh) * 60);
    return `UTC${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  function fmtLat(v: number): string {
    return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? 'N' : 'S'}`;
  }

  function fmtLon(v: number): string {
    return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? 'E' : 'W'}`;
  }

  $: confidence =
    Math.abs(totalDiffMin) > 90
      ? 'HIGH'
      : Math.abs(totalDiffMin) > 30
        ? 'MEDIUM'
        : 'LOW';

  // For the top-down view: compass radius
  const R = 110;
  $: azRad = (pos.azimuthDeg * Math.PI) / 180;
  // place sun at radius proportional to (1 - elevation/90); 0 elev = horizon = R
  $: sunR = R * Math.max(0, Math.min(1, 1 - pos.elevationDeg / 90));
  // Convert (azimuth from N, clockwise) into SVG coords with N up, E right.
  // x = R + sunR*sin(az), y = R - sunR*cos(az)
  $: sunX = R + sunR * Math.sin(azRad);
  $: sunY = R - sunR * Math.cos(azRad);

  // Side view: x is azimuth (we'll just show sun at proper elevation along
  // horizon arc east→west). The arc spans az 90→270 (E→S→W) above horizon.
  const SVW = 360;
  const SVH = 160;
</script>

<section class="panel">
  <header class="title">
    <span class="kicker">True Solar Time</span>
    <div class="big mono">{solarStr}</div>
    <p class="datetime">
      <span>{dateLong}</span>
      <span class="dot">·</span>
      {#if countryCode}
        <span class="flag" aria-hidden="true">{flagEmoji(countryCode)}</span>
      {/if}
      <span>{city ?? 'Unknown'}</span>
    </p>
  </header>

  <div class="compare">
    <div class="cell">
      <div class="label">Your clock</div>
      <div class="t mono">{civilStr}</div>
      <div class="sub mono">{fmtOffset(civilOffsetH)}</div>
    </div>
    <div class="arrow" aria-hidden="true">→</div>
    <div class="cell">
      <div class="label">True Solar Time</div>
      <div class="t mono accent">{solarStr}</div>
      <div class="sub mono">{dateLong}</div>
    </div>
  </div>

  <div class="grid">
    <div class="col">
      <div class="row"><span>UTC Time</span><span class="mono">{utcStr}</span></div>
      <div class="row"><span>UTC Offset</span><span class="mono">{fmtOffset(civilOffsetH).replace('UTC', '')}</span></div>
      <div class="row"><span>Timezone</span><span class="mono">{zone}</span></div>
      <div class="row">
        <span>Daylight Saving</span>
        <span class="mono" class:dst-on={dst} class:dst-off={!dst}>{dst ? 'Active' : 'Off'}</span>
      </div>
      <div class="row"><span>Equation of Time</span><span class="mono">{fmtHMS(eotMin)}</span></div>
      <div class="row"><span>Longitude Correction</span><span class="mono">{fmtHMS(locationOffsetMin)}</span></div>
    </div>
    <div class="col">
      <div class="row place">
        <span>Place</span>
        <span class="place-val">
          {#if countryCode}<span class="flag">{flagEmoji(countryCode)}</span>{/if}
          {[city, region, country].filter(Boolean).join(', ')}
        </span>
      </div>
      <div class="row"><span>Latitude</span><span class="mono">{fmtLat(lat)}</span></div>
      <div class="row"><span>Longitude</span><span class="mono">{fmtLon(lon)}</span></div>
      <div class="row">
        <span>Confidence</span>
        <span class="badge {confidence.toLowerCase()}">{confidence}</span>
      </div>
    </div>
  </div>

  <h3 class="why">Why there's a difference</h3>
  <div class="reasons">
    <div class="reason">
      <div class="rlabel">Location offset</div>
      <div class="rval" class:warn={locationOffsetMin < -1} class:cool={locationOffsetMin > 1}>
        <span class="num">{fmtMinSign(locationOffsetMin)}</span><span class="unit">min</span>
      </div>
      <div class="rdesc">
        {#if locationOffsetMin < 0}West of the timezone centre line{:else if locationOffsetMin > 0}East of the timezone centre line{:else}On the timezone centre line{/if}
      </div>
    </div>
    <div class="reason">
      <div class="rlabel">Earth's orbit & tilt</div>
      <div class="rval" class:good={eotMin > 0} class:warn={eotMin < 0}>
        <span class="num">{fmtMinSign(eotMin)}</span><span class="unit">min</span>
      </div>
      <div class="rdesc">Elliptical orbit and axial tilt</div>
    </div>
    <div class="reason total">
      <div class="rlabel">Total difference</div>
      <div class="rval accent">
        <span class="num">{fmtMinSign(locationOffsetMin + eotMin)}</span><span class="unit">min</span>
      </div>
    </div>
  </div>

  <h3 class="why">Solar position — same moment, different perspectives</h3>

  <div class="carousel">
    <button class="arrow-btn left" on:click={prev} aria-label="Previous view">‹</button>
    <div class="view">
      <div class="view-label">
        {view === 0 ? 'Top-down view' : 'Side view'}
      </div>
      {#if view === 0}
        <svg viewBox="0 0 {R * 2} {R * 2 + 20}" class="diagram" role="img" aria-label="Top-down compass with sun position">
          <!-- compass rings -->
          <circle cx={R} cy={R} r={R} fill="none" stroke="rgba(140,170,220,0.18)" stroke-width="1" />
          <circle cx={R} cy={R} r={R * 0.66} fill="none" stroke="rgba(140,170,220,0.10)" stroke-width="1" stroke-dasharray="3 4" />
          <circle cx={R} cy={R} r={R * 0.33} fill="none" stroke="rgba(140,170,220,0.10)" stroke-width="1" stroke-dasharray="3 4" />
          <!-- cardinal labels -->
          <text x={R} y={12} text-anchor="middle" class="card">N</text>
          <text x={R} y={R * 2 + 16} text-anchor="middle" class="card">S</text>
          <text x={6} y={R + 4} class="card">W</text>
          <text x={R * 2 - 6} y={R + 4} text-anchor="end" class="card">E</text>
          <!-- horizon legend -->
          <text x={R} y={R - R + 22} text-anchor="middle" class="tiny">Horizon (90° from zenith)</text>
          <text x={R} y={R - R * 0.66 + 14} text-anchor="middle" class="tiny">30° from zenith</text>
          <!-- you marker -->
          <circle cx={R} cy={R} r="3" fill="#5ac8fa" />
          <text x={R + 8} y={R + 12} class="tiny">You</text>
          <!-- sun marker -->
          {#if !belowHorizon}
            <circle cx={sunX} cy={sunY} r="16" fill="rgba(255,180,84,0.18)" />
            <circle cx={sunX} cy={sunY} r="9" fill="#ffb454" />
            <text x={sunX} y={sunY - 14} text-anchor="middle" class="sun-lbl">Sun</text>
          {:else}
            <text x={R} y={R * 2 + 6} text-anchor="middle" class="tiny dim">Sun below horizon</text>
          {/if}
        </svg>
        <div class="stats">
          <span class="stat accent mono">{pos.elevationDeg.toFixed(0)}° elevation</span>
          <span class="dot">·</span>
          <span class="stat accent mono">{pos.azimuthDeg.toFixed(0)}° azimuth</span>
        </div>
        <div class="caption">Observer at center; Sun shown on the horizon plane</div>
      {:else}
        <svg viewBox="0 0 {SVW} {SVH}" class="diagram" role="img" aria-label="Side view of sun above the horizon">
          <!-- horizon -->
          <line x1="20" y1={SVH - 30} x2={SVW - 20} y2={SVH - 30} stroke="rgba(140,170,220,0.3)" stroke-width="1" />
          <!-- arc from east to west representing today's path (idealized) -->
          <path
            d={`M ${20} ${SVH - 30} A ${(SVW - 40) / 2} ${SVH - 60} 0 0 1 ${SVW - 20} ${SVH - 30}`}
            fill="none"
            stroke="rgba(255,180,84,0.25)"
            stroke-width="1"
            stroke-dasharray="3 5"
          />
          <text x="20" y={SVH - 14} class="card">E</text>
          <text x={SVW - 20} y={SVH - 14} text-anchor="end" class="card">W</text>
          <text x={SVW / 2} y={SVH - 14} text-anchor="middle" class="card">S</text>
          <!-- sun position along arc; param t in [0,1] from E to W using azimuth in 90..270 -->
          {#if pos.azimuthDeg > 90 && pos.azimuthDeg < 270 && !belowHorizon}
            {@const t = (pos.azimuthDeg - 90) / 180}
            {@const cx = 20 + t * (SVW - 40)}
            {@const cy = SVH - 30 - Math.sin(t * Math.PI) * (SVH - 60) * (pos.elevationDeg / 90)}
            <circle cx={cx} cy={cy} r="14" fill="rgba(255,180,84,0.18)" />
            <circle cx={cx} cy={cy} r="8" fill="#ffb454" />
            <text x={cx} y={cy - 14} text-anchor="middle" class="sun-lbl">Sun</text>
            <line x1={cx} y1={cy} x2={cx} y2={SVH - 30} stroke="rgba(255,180,84,0.3)" stroke-dasharray="2 3" />
            <text x={cx + 6} y={cy + 4} class="tiny">{pos.elevationDeg.toFixed(0)}°</text>
          {:else}
            <text x={SVW / 2} y={SVH / 2} text-anchor="middle" class="tiny dim">Sun is below horizon or behind observer</text>
          {/if}
        </svg>
        <div class="stats">
          <span class="stat accent mono">{pos.elevationDeg.toFixed(0)}° above horizon</span>
        </div>
        <div class="caption">Looking south; arc shows idealized daytime path</div>
      {/if}
    </div>
    <button class="arrow-btn right" on:click={next} aria-label="Next view">›</button>
  </div>

  <div class="lon-line">
    Your longitude:
    <strong class="mono">{fmtLon(lon)}</strong>
    <span class="dot">·</span>
    TZ center: <strong class="mono">{fmtLon(tzCenterLonDeg)}</strong>
    <span class="dim">({Math.abs(lonDiffDeg).toFixed(1)}° {lonDiffDeg < 0 ? 'west' : 'east'})</span>
  </div>

  <svg viewBox="0 0 {LONVB_W} {LONVB_H}" class="lon-diagram" role="img" aria-label="Longitude relative to timezone center">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L7,4 L0,8 z" fill="rgba(230,237,243,0.7)" />
      </marker>
    </defs>

    <!-- axis -->
    <line x1={LONVB_PAD_X - 10} y1="70" x2={LONVB_W - LONVB_PAD_X + 10} y2="70" stroke="rgba(140,170,220,0.18)" stroke-width="1" />

    <!-- timezone band (15° wide) -->
    <rect x={bandLeftX} y="46" width={bandRightX - bandLeftX} height="48" fill="rgba(90,200,250,0.12)" stroke="rgba(90,200,250,0.4)" />
    <text x={bandLeftX} y="40" class="ax" text-anchor="middle">{(tzCenterLonDeg - 7.5).toFixed(1)}°</text>
    <text x={bandRightX} y="40" class="ax" text-anchor="middle">{(tzCenterLonDeg + 7.5).toFixed(1)}°</text>

    <!-- timezone center marker -->
    <line x1={tzCenterX} y1="42" x2={tzCenterX} y2="98" stroke="#5ac8fa" stroke-width="2" stroke-dasharray="4 3" />
    <text x={tzCenterX} y="116" text-anchor="middle" class="ax-strong cool">{tzCenterLonDeg.toFixed(0)}° · {fmtOffset(civilOffsetH)}</text>
    <text x={tzCenterX} y="132" text-anchor="middle" class="lbl cool">Timezone center</text>

    <!-- user marker -->
    <line x1={userX} y1="42" x2={userX} y2="98" stroke="#ffb454" stroke-width="3" />
    <text x={userX} y={labelsClose ? 14 : 116} text-anchor="middle" class="ax-strong accent">{fmtLon(lon)}</text>
    <text x={userX} y={labelsClose ? 28 : 132} text-anchor="middle" class="lbl accent">Your longitude</text>

    <!-- arrow between user and tz center -->
    <line x1={userX} y1="70" x2={tzCenterX - (tzCenterX > userX ? 3 : -3)} y2="70" stroke="rgba(230,237,243,0.7)" stroke-width="1.2" marker-end="url(#arrowhead)" />
    <text x={(userX + tzCenterX) / 2} y="62" text-anchor="middle" class="ax-strong">
      {Math.abs(lonDiffDeg).toFixed(1)}° {lonDiffDeg < 0 ? 'west' : 'east'}
    </text>
  </svg>

  <div class="footnote">
    <span class="mono">{dateLong} · {civilStr}</span>
    <span class="mono dim">15° = 1 hour</span>
  </div>

  <div class="formula">
    <span class="label">Formula</span>
    <code>True Solar Time = Local Time + Equation of Time + Longitude Correction</code>
  </div>
</section>

<style>
  .panel {
    max-width: 900px;
    margin: 24px auto;
    padding: 28px 24px 24px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 0 0 1px rgba(255, 180, 84, 0.1);
  }

  .title {
    text-align: center;
    margin-bottom: 24px;
  }

  .kicker {
    display: inline-block;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 12px;
    font-weight: 600;
  }

  .big {
    font-size: clamp(48px, 8vw, 84px);
    font-weight: 700;
    color: var(--accent);
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-top: 4px;
  }

  .datetime {
    color: var(--fg-dim);
    font-size: 14px;
    margin: 8px 0 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .flag {
    font-size: 18px;
    line-height: 1;
  }

  .dot {
    color: var(--fg-mute);
  }

  .compare {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 18px;
    align-items: center;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 24px;
    margin-bottom: 24px;
  }

  .compare .cell {
    text-align: left;
  }

  .compare .cell:last-child {
    text-align: right;
  }

  .compare .label {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    color: var(--fg-dim);
    margin-bottom: 6px;
  }

  .compare .t {
    font-size: clamp(28px, 4.5vw, 40px);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .compare .t.accent {
    color: var(--accent);
  }

  .compare .sub {
    color: var(--fg-dim);
    font-size: 12px;
    margin-top: 4px;
  }

  .compare .arrow {
    color: var(--fg-mute);
    font-size: 22px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 32px;
    margin-bottom: 24px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    gap: 12px;
  }

  .row span:first-child {
    color: var(--fg-dim);
  }

  .row .dst-on {
    color: var(--cool);
  }

  .row .dst-off {
    color: var(--fg-mute);
  }

  .row.place .place-val {
    text-align: right;
    display: inline-flex;
    gap: 6px;
    justify-content: flex-end;
    align-items: center;
    color: var(--fg);
  }

  .badge {
    border: 1px solid;
    padding: 2px 10px;
    border-radius: 5px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .badge.high {
    color: var(--good);
    border-color: rgba(109, 217, 109, 0.5);
    background: rgba(109, 217, 109, 0.08);
  }

  .badge.medium {
    color: var(--accent);
    border-color: rgba(255, 180, 84, 0.5);
    background: rgba(255, 180, 84, 0.08);
  }

  .badge.low {
    color: var(--fg-mute);
    border-color: var(--border);
  }

  .why {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    color: var(--fg-dim);
    font-weight: 600;
    margin: 8px 0 12px;
  }

  .reasons {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 28px;
  }

  .reason {
    display: grid;
    grid-template-columns: 1fr auto 1.4fr;
    align-items: baseline;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }

  .reason.total {
    border-bottom: none;
    padding-top: 14px;
  }

  .reason .rlabel {
    color: var(--fg);
  }

  .reason.total .rlabel {
    font-weight: 600;
  }

  .reason .rval {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    min-width: 90px;
    text-align: right;
    color: var(--fg);
  }

  .reason .rval .num {
    font-size: 16px;
  }

  .reason .rval .unit {
    color: var(--fg-dim);
    font-size: 12px;
    margin-left: 4px;
    font-weight: 400;
  }

  .reason .rval.warn {
    color: var(--warn);
  }

  .reason .rval.cool {
    color: var(--cool);
  }

  .reason .rval.good {
    color: var(--good);
  }

  .reason .rval.accent {
    color: var(--accent);
  }

  .reason .rdesc {
    color: var(--fg-dim);
    font-size: 13px;
  }

  .carousel {
    position: relative;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    gap: 4px;
    align-items: center;
    margin-bottom: 18px;
  }

  .arrow-btn {
    background: var(--bg-elev-2);
    color: var(--fg-dim);
    border: 1px solid var(--border);
    border-radius: 8px;
    height: 120px;
    font-size: 22px;
    cursor: pointer;
  }

  .arrow-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }

  .view {
    text-align: center;
  }

  .view-label {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    color: var(--fg-dim);
    text-align: left;
    margin-bottom: 4px;
  }

  .diagram {
    max-width: 320px;
    width: 100%;
    height: auto;
  }

  .diagram :global(.card) {
    fill: var(--fg-dim);
    font-size: 11px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  .diagram :global(.tiny) {
    fill: var(--fg-dim);
    font-size: 9px;
  }

  .diagram :global(.tiny.dim) {
    fill: var(--fg-mute);
  }

  .diagram :global(.sun-lbl) {
    fill: var(--accent);
    font-size: 11px;
    font-weight: 600;
  }

  .diagram :global(.lbl) {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .diagram :global(.lbl.cool) {
    fill: var(--cool);
  }

  .diagram :global(.lbl.accent) {
    fill: var(--accent);
  }

  .stats {
    margin-top: 6px;
    font-size: 13px;
    color: var(--fg);
  }

  .stat.accent {
    color: var(--cool);
  }

  .caption {
    color: var(--fg-dim);
    font-size: 12px;
    margin-top: 4px;
  }

  .lon-line {
    text-align: center;
    color: var(--fg-dim);
    font-size: 14px;
    margin-bottom: 8px;
  }

  .lon-line strong {
    color: var(--fg);
  }

  .lon-line .dim {
    color: var(--fg-mute);
    font-size: 12px;
  }

  .lon-diagram {
    width: 100%;
    max-width: 560px;
    height: auto;
    display: block;
    margin: 0 auto 12px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  .lon-diagram :global(text) {
    font-size: 11px;
    fill: var(--fg-dim);
  }

  .lon-diagram :global(.ax) {
    fill: var(--fg-mute);
    font-size: 10px;
  }

  .lon-diagram :global(.ax-strong) {
    fill: var(--fg);
    font-size: 11px;
    font-weight: 600;
  }

  .lon-diagram :global(.ax-strong.cool) {
    fill: var(--cool);
  }

  .lon-diagram :global(.ax-strong.accent) {
    fill: var(--accent);
  }

  .lon-diagram :global(.lbl) {
    font-size: 10px;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .lon-diagram :global(.lbl.cool) {
    fill: var(--cool);
  }

  .lon-diagram :global(.lbl.accent) {
    fill: var(--accent);
  }

  .footnote {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--fg-mute);
    border-top: 1px solid var(--border);
    padding-top: 10px;
    margin-top: 6px;
  }

  .footnote .dim {
    color: var(--fg-mute);
  }

  .formula {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 12px;
    align-items: center;
  }

  .formula .label {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 10px;
    color: var(--fg-dim);
  }

  .formula code {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    color: var(--cool);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 13px;
    display: block;
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .compare {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .compare .cell,
    .compare .cell:last-child {
      text-align: center;
    }
    .compare .arrow {
      transform: rotate(90deg);
    }
    .reason {
      grid-template-columns: 1fr auto;
    }
    .reason .rdesc {
      grid-column: 1 / -1;
    }
    .carousel {
      grid-template-columns: 32px 1fr 32px;
    }
    .arrow-btn {
      height: 80px;
    }
    .formula {
      grid-template-columns: 1fr;
    }
  }
</style>
