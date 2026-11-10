const $ = id => document.getElementById(id);
const storage = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
};
const state = { book: null, chapter: 1, positions: storage.read('neuromancer:positions', {}), last: storage.read('neuromancer:last', 1), installPrompt: null };
const scroll = $('reader-scroll');
let saveTimer;

function chapters() { return state.book.chapters; }
function current() { return chapters()[state.chapter - 1]; }
function openMenu(open) {
  $('sidebar').classList.toggle('open', open);
  $('scrim').hidden = !open;
}
function renderContents() {
  const nav = $('chapters');
  nav.replaceChildren();
  let part = '';
  for (const chapter of chapters()) {
    if (chapter.part !== part) {
      part = chapter.part;
      const heading = document.createElement('div');
      heading.className = 'part-heading';
      heading.textContent = `${part} · ${chapter.partName}`;
      nav.append(heading);
    }
    const button = document.createElement('button');
    button.className = 'chapter-link';
    button.dataset.chapter = chapter.number;
    button.innerHTML = `<span class="chapter-number">${String(chapter.number).padStart(2, '0')}</span><span>Chapter ${chapter.number}</span>`;
    button.addEventListener('click', () => navigate(chapter.number));
    nav.append(button);
  }
  updateContents();
}
function updateContents() {
  for (const button of $('chapters').querySelectorAll('.chapter-link')) {
    const number = Number(button.dataset.chapter);
    button.classList.toggle('active', number === state.chapter);
    button.setAttribute('aria-current', number === state.chapter ? 'page' : 'false');
    button.querySelector('.read-dot')?.remove();
    if (Number(state.positions[number] ?? 0) > .95) {
      const dot = document.createElement('span'); dot.className = 'read-dot'; dot.setAttribute('aria-label', 'Read'); button.append(dot);
    }
  }
  const fraction = (state.chapter - 1 + Number(state.positions[state.chapter] ?? 0)) / chapters().length;
  $('overall-percent').textContent = `${Math.round(fraction * 100)}%`;
  $('overall-progress').style.width = `${fraction * 100}%`;
}
function progress() {
  const max = scroll.scrollHeight - scroll.clientHeight;
  const fraction = max > 0 ? Math.max(0, Math.min(1, scroll.scrollTop / max)) : 1;
  state.positions[state.chapter] = fraction;
  $('chapter-progress-label').textContent = `${Math.round(fraction * 100)}% of chapter`;
  $('chapter-progress-bar').style.width = `${fraction * 100}%`;
  updateContents();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.write('neuromancer:positions', state.positions), 200);
}
async function navigate(number, restore = false) {
  if (number < 1 || number > chapters().length) return;
  if (!restore) { progress(); }
  state.chapter = number;
  state.last = number;
  storage.write('neuromancer:last', number);
  const chapter = current();
  $('part-label').textContent = chapter.part;
  $('chapter-title').textContent = `Chapter ${chapter.number}`;
  $('chapter-subtitle').textContent = chapter.partName;
  $('top-chapter').textContent = `Chapter ${chapter.number}`;
  $('chapter-body').innerHTML = '<p>Loading chapter…</p>';
  const response = await fetch(chapter.file);
  if (!response.ok) throw new Error(`Could not load chapter ${number}`);
  $('chapter-body').innerHTML = await response.text();
  $('previous-button').disabled = number === 1;
  $('footer-next').disabled = number === chapters().length;
  $('next-chapter').disabled = number === chapters().length;
  openMenu(false);
  updateContents();
  history.replaceState(null, '', `#chapter-${number}`);
  requestAnimationFrame(() => {
    const max = scroll.scrollHeight - scroll.clientHeight;
    scroll.scrollTop = restore ? Math.round(max * Number(state.positions[number] ?? 0)) : 0;
    progress();
  });
}
function applyDisplay() {
  const size = storage.read('neuromancer:font-size', 18);
  const width = storage.read('neuromancer:line-width', 680);
  document.documentElement.style.setProperty('--font-size', `${size}px`);
  document.documentElement.style.setProperty('--line-width', `${width}px`);
  $('font-size').value = size; $('font-size-value').value = `${size}px`;
  $('line-width').value = width; $('line-width-value').value = `${width}px`;
  setMode(storage.read('neuromancer:mode', 'dark'));
}
function setMode(mode) {
  if (!['dark', 'light', 'eink'].includes(mode)) mode = 'dark';
  document.documentElement.dataset.mode = mode;
  $('mode-label').textContent = mode === 'eink' ? 'E-ink' : mode[0].toUpperCase() + mode.slice(1);
  for (const button of document.querySelectorAll('[data-mode-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.modeChoice === mode));
  }
  storage.write('neuromancer:mode', mode);
}

async function init() {
  applyDisplay();
  try {
    const response = await fetch('book.json');
    if (!response.ok) throw new Error('Book index unavailable');
    state.book = await response.json();
    renderContents();
    const hash = Number(location.hash.match(/^#chapter-(\d+)$/)?.[1]);
    await navigate(hash >= 1 && hash <= chapters().length ? hash : state.last, true);
  } catch (error) {
    $('chapter-title').textContent = 'Reader unavailable';
    $('chapter-body').textContent = `${error.message}. Check your connection and reload. The book is available offline after its first successful load.`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

$('open-menu').addEventListener('click', () => openMenu(true));
$('close-menu').addEventListener('click', () => openMenu(false));
$('scrim').addEventListener('click', () => openMenu(false));
$('settings-button').addEventListener('click', () => $('settings').showModal());
$('mode-button').addEventListener('click', () => {
  const modes = ['dark', 'light', 'eink'];
  setMode(modes[(modes.indexOf(document.documentElement.dataset.mode) + 1) % modes.length]);
});
document.querySelectorAll('[data-mode-choice]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.modeChoice)));
$('font-size').addEventListener('input', event => { const value = Number(event.target.value); storage.write('neuromancer:font-size', value); document.documentElement.style.setProperty('--font-size', `${value}px`); $('font-size-value').value = `${value}px`; });
$('line-width').addEventListener('input', event => { const value = Number(event.target.value); storage.write('neuromancer:line-width', value); document.documentElement.style.setProperty('--line-width', `${value}px`); $('line-width-value').value = `${value}px`; });
$('previous-button').addEventListener('click', () => navigate(state.chapter - 1));
$('footer-next').addEventListener('click', () => navigate(state.chapter + 1));
$('next-chapter').addEventListener('click', () => navigate(state.chapter + 1));
scroll.addEventListener('scroll', progress, { passive: true });
$('chapter-body').addEventListener('click', event => {
  const ref = event.target.closest('a.note-ref');
  if (!ref) return;
  event.preventDefault();
  const number = ref.getAttribute('href').slice(9);
  $('footnote-title').textContent = `Note ${number}`;
  $('footnote-text').textContent = state.book.footnotes[number] || 'Note unavailable.';
  $('footnote-dialog').showModal();
});
window.addEventListener('hashchange', () => {
  if (!state.book) return;
  const number = Number(location.hash.match(/^#chapter-(\d+)$/)?.[1]);
  if (number && number !== state.chapter) navigate(number, true);
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.installPrompt = event; $('install-button').hidden = false; });
$('install-button').addEventListener('click', async () => { if (state.installPrompt) { await state.installPrompt.prompt(); state.installPrompt = null; $('install-button').hidden = true; } });
window.addEventListener('appinstalled', () => { $('install-button').hidden = true; });
init();
