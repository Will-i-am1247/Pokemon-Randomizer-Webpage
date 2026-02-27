/* I used ChatGPT to assist me in writing this file. It contains the database of all the pokemon from PokeApi and the randomizing, showing everything, closing, and turning off and on the names because it wasn't required for me to do but I wanted it to work*/
(() => {
  'use strict';

  const MAX_SPECIES_ID = 1025;

  const btnRandom = document.getElementById('roll');
  const btnAll    = document.getElementById('show-all');
  const btnClose  = document.getElementById('close-all');
  const statusEl  = document.getElementById('status');
  const cards     = document.getElementById('cards');
  const toggle    = document.getElementById('toggle-names');

  let allController = null;

  const randInt = (min, max) => Math.floor(Math.random()*(max-min+1))+min;
  const uniqueRandomIds = (n, min, max) => {
    const s = new Set(); while (s.size < n) s.add(randInt(min, max)); return [...s];
  };

  async function getPokemon(id, signal) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { signal });
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    const name = data?.name;
    const img =
      data?.sprites?.other?.['official-artwork']?.front_default ??
      data?.sprites?.other?.dream_world?.front_default ??
      data?.sprites?.front_default;
    if (!name || !img) throw new Error('Missing sprite');
    return { id, name, img };
  }

  // label has class="name"
  const renderCard = ({ name, img }) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${img}" alt="${name}" loading="lazy">
      <label class="name">${name}</label>
    `;
    return div;
  };

  // apply current toggle state to the container + aria for labels
  function applyNameVisibility() {
    const show = toggle?.checked ?? true;
    cards.classList.toggle('names-off', !show);
    cards.querySelectorAll('.name').forEach(el =>
      el.setAttribute('aria-hidden', String(!show))
    );
  }

  async function roll() {
    btnRandom.disabled = true; btnAll.disabled = true;
    statusEl.textContent = ''; cards.innerHTML = '';
    try {
      const ids = uniqueRandomIds(5, 1, MAX_SPECIES_ID);
      const results = await Promise.all(ids.map(id => getPokemon(id)));
      const frag = document.createDocumentFragment();
      results.forEach(p => frag.appendChild(renderCard(p)));
      cards.appendChild(frag);
      applyNameVisibility();              // <-- make new cards follow the toggle
    } catch (e) {
      console.error(e); cards.textContent = "Couldn't load Pokémon.";
    } finally {
      btnRandom.disabled = false; btnAll.disabled = false;
    }
  }

  async function showAll() {
    allController?.abort();
    allController = new AbortController();
    const { signal } = allController;

    btnRandom.disabled = true; btnAll.disabled = true;
    cards.innerHTML = ''; statusEl.textContent = 'Starting…';

    const ids = Array.from({ length: MAX_SPECIES_ID }, (_, i) => i + 1);
    const BATCH = 24; let loaded = 0;

    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        if (signal.aborted) break;
        const slice = ids.slice(i, i + BATCH);
        const settled = await Promise.allSettled(slice.map(id => getPokemon(id, signal)));
        const frag = document.createDocumentFragment();
        for (const s of settled) if (s.status === 'fulfilled') {
          frag.appendChild(renderCard(s.value)); loaded++;
        }
        cards.appendChild(frag);
        applyNameVisibility();            // <-- keep honoring the toggle
        statusEl.textContent = `Loaded ${loaded} / ${MAX_SPECIES_ID}`;
      }
      if (!signal.aborted) statusEl.textContent = '';
    } catch (e) {
      if (signal.aborted) return;
      console.error(e); statusEl.textContent = 'Error while loading.';
    } finally {
      btnRandom.disabled = false; btnAll.disabled = false;
    }
  }

  function closeAll() {
    allController?.abort();
    statusEl.textContent = '';
    cards.innerHTML = '';
    btnRandom.disabled = false;
    btnAll.disabled = false;
  }

  // wire up
  btnRandom?.addEventListener('click', roll);
  btnAll?.addEventListener('click', showAll);
  btnClose?.addEventListener('click', closeAll);
  toggle?.addEventListener('change', applyNameVisibility);

  // initial state
  applyNameVisibility();
})();
