<script lang="ts">
  import { onMount } from 'svelte';

  // EEA + UK + Switzerland — the same regions we deny by default in
  // index.html. If the visitor is in one of these we surface an opt-in
  // banner; elsewhere Consent Mode is already 'granted' and the banner
  // never shows.
  const CONSENT_REQUIRED = new Set([
    'at','be','bg','hr','cy','cz','dk','ee','fi','fr','de','gr','hu',
    'ie','it','lv','lt','lu','mt','nl','pl','pt','ro','sk','si','es',
    'se','is','li','no','gb','ch',
  ]);
  const STORAGE_KEY = 'tc_consent_v1';

  let visible = false;

  function gtagPush(...args: unknown[]) {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(args);
  }

  function updateConsent(granted: boolean) {
    const state = granted ? 'granted' : 'denied';
    gtagPush('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
  }

  onMount(async () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable (private mode, etc.) — ignore.
    }
    if (stored === 'granted') {
      updateConsent(true);
      return;
    }
    if (stored === 'denied') {
      // Already denied — defaults are denied for EU; for non-EU this
      // explicitly overrides the default grant.
      updateConsent(false);
      return;
    }

    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return;
      const j = await res.json();
      const cc = String(j.country_code ?? '').toLowerCase();
      if (CONSENT_REQUIRED.has(cc)) visible = true;
    } catch {
      // If we can't tell, surface the banner — safer to ask than to assume.
      visible = true;
    }
  });

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'granted');
    } catch {
      /* ignore */
    }
    updateConsent(true);
    visible = false;
  }

  function reject() {
    try {
      localStorage.setItem(STORAGE_KEY, 'denied');
    } catch {
      /* ignore */
    }
    updateConsent(false);
    visible = false;
  }
</script>

{#if visible}
  <div class="banner" role="dialog" aria-label="Cookie consent">
    <p>
      trueclock uses Google Analytics to count visits. Analytics cookies
      are off until you accept.
      <a
        href="https://policies.google.com/technologies/partner-sites"
        target="_blank"
        rel="noopener">Learn more</a
      >.
    </p>
    <div class="actions">
      <button class="ghost" on:click={reject}>Reject</button>
      <button class="primary" on:click={accept}>Accept</button>
    </div>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 16px;
    z-index: 1000;
    max-width: 720px;
    margin: 0 auto;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    color: var(--fg-dim);
  }

  .banner p {
    margin: 0;
    flex: 1;
    line-height: 1.45;
  }

  .banner a {
    color: var(--accent);
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  button {
    padding: 8px 14px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid var(--border);
    cursor: pointer;
    background: transparent;
    color: var(--fg);
  }

  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #1a1100;
    font-weight: 600;
  }

  button.primary:hover {
    filter: brightness(1.08);
  }

  button.ghost:hover {
    border-color: var(--accent);
  }

  @media (max-width: 560px) {
    .banner {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .actions {
      justify-content: flex-end;
    }
  }
</style>
