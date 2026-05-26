<script lang="ts">
  import { searchCity, type PlaceHit } from '../lib/geocode';

  export let onPick: (hit: PlaceHit) => void;

  let query = '';
  let hits: PlaceHit[] = [];
  let open = false;
  let busy = false;
  let activeIdx = -1;
  let inputEl: HTMLInputElement;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let activeAbort: AbortController | undefined;

  function onInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    activeAbort?.abort();
    const q = query.trim();
    if (q.length < 2) {
      hits = [];
      open = false;
      return;
    }
    open = true;
    debounceTimer = setTimeout(async () => {
      busy = true;
      activeAbort = new AbortController();
      try {
        hits = await searchCity(q, activeAbort.signal);
        activeIdx = hits.length > 0 ? 0 : -1;
      } catch (e) {
        if ((e as Error).name !== 'AbortError') hits = [];
      } finally {
        busy = false;
      }
    }, 250);
  }

  function pick(h: PlaceHit) {
    onPick(h);
    query = h.name + (h.country ? `, ${h.country}` : '');
    hits = [];
    open = false;
    inputEl?.blur();
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open || hits.length === 0) {
      if (e.key === 'Escape') {
        open = false;
        inputEl?.blur();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % hits.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + hits.length) % hits.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) pick(hits[activeIdx]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function onBlur() {
    // delay so mousedown on a result can register first
    setTimeout(() => (open = false), 150);
  }
</script>

<div class="search">
  <span class="icon" aria-hidden="true">🔎</span>
  <input
    bind:this={inputEl}
    bind:value={query}
    on:input={onInput}
    on:focus={() => (open = hits.length > 0)}
    on:blur={onBlur}
    on:keydown={onKeydown}
    type="text"
    placeholder="Try another city…"
    aria-label="Search a city"
    autocomplete="off"
    spellcheck="false"
  />
  {#if busy}
    <span class="spinner" aria-hidden="true"></span>
  {/if}

  {#if open && hits.length > 0}
    <ul class="results" role="listbox">
      {#each hits as h, i}
        <li
          role="option"
          aria-selected={i === activeIdx}
          class:active={i === activeIdx}
          on:mousedown={(e) => {
            e.preventDefault();
            pick(h);
          }}
          on:mouseenter={() => (activeIdx = i)}
        >
          <span class="name">{h.name}</span>
          <span class="sub">{[h.region, h.country].filter(Boolean).join(', ')}</span>
        </li>
      {/each}
    </ul>
  {:else if open && !busy && query.trim().length >= 2}
    <ul class="results">
      <li class="empty">No matches</li>
    </ul>
  {/if}
</div>

<style>
  .search {
    position: relative;
    display: inline-flex;
    align-items: center;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
    min-width: 220px;
    transition: border-color 120ms;
  }

  .search:focus-within {
    border-color: var(--accent);
  }

  .icon {
    font-size: 12px;
    opacity: 0.7;
    margin-right: 6px;
  }

  input {
    background: transparent;
    border: none;
    color: var(--fg);
    font: inherit;
    font-size: 13px;
    outline: none;
    width: 100%;
    padding: 4px 0;
  }

  input::placeholder {
    color: var(--fg-mute);
  }

  .spinner {
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 700ms linear infinite;
    margin-left: 6px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .results {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    list-style: none;
    margin: 0;
    padding: 4px;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    z-index: 10;
    max-height: 280px;
    overflow-y: auto;
    text-align: left;
  }

  .results li {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  .results li.active {
    background: var(--bg-elev-2);
  }

  .results li.empty {
    color: var(--fg-mute);
    font-size: 12px;
    cursor: default;
  }

  .results .name {
    font-size: 13px;
    color: var(--fg);
  }

  .results .sub {
    font-size: 11px;
    color: var(--fg-dim);
    margin-top: 2px;
  }
</style>
