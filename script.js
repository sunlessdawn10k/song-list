const STORAGE_KEY = 'songs';
let songs = [];
let searchTerm = '';
let editingId = null;
let currentPickId = null;

const listEl = document.getElementById('list');
const emptyMsg = document.getElementById('empty-msg');
const inputEl = document.getElementById('song-input');
const addBtn = document.getElementById('add-btn');
const errorMsg = document.getElementById('error-msg');
const progressCount = document.getElementById('progress-count');
const progressFill = document.getElementById('progress-fill');
const banner = document.getElementById('banner');
const progressWrap = document.getElementById('progress-wrap');
const resetBig = document.getElementById('reset-big');
const searchInput = document.getElementById('search-input');
const randomBtn = document.getElementById('random-btn');
const randomResult = document.getElementById('random-result');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.innerHTML = theme === 'dark' ? SUN : MOON;
  localStorage.setItem('theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

initTheme();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadSongs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    songs = raw ? JSON.parse(raw) : [];
  } catch (e) {
    songs = [];
  }
  render();
}

function saveSongs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch (e) {
    console.error('Uložení se nezdařilo', e);
  }
}

function render() {
  listEl.innerHTML = '';

  const filtered = searchTerm
    ? songs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : songs;

  emptyMsg.style.display = songs.length === 0 ? 'block' : 'none';
  emptyMsg.textContent = searchTerm && songs.length > 0 && filtered.length === 0
    ? 'Žádná písnička neodpovídá hledání.'
    : 'Zatím žádné písničky. Přidej první výše.';
  if (searchTerm && songs.length > 0 && filtered.length === 0) {
    emptyMsg.style.display = 'block';
  }

  filtered.forEach(song => {
    const row = document.createElement('div');
    row.className = 'row' + (song.played ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'check' + (song.played ? ' done' : '');
    check.setAttribute('aria-label', song.played ? 'Označit jako neodehráno' : 'Označit jako odehráno');
    check.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8.5 6.5,12 13,4"/></svg>';
    check.addEventListener('click', () => {
      if (!songs.find(s => s.id === song.id).played) {
        check.classList.add('bump');
      }
      togglePlayed(song.id);
    });

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = song.name;

    const edit = document.createElement('button');
    edit.className = 'edit';
    edit.setAttribute('aria-label', 'Upravit název');
    edit.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    edit.addEventListener('click', () => {
      editingId = song.id;
      render();
    });

    const del = document.createElement('button');
    del.className = 'del';
    del.setAttribute('aria-label', 'Smazat');
    del.textContent = '\u00d7';
    del.addEventListener('click', () => deleteSong(song.id));

    if (editingId === song.id) {
      const nameInput = document.createElement('input');
      nameInput.className = 'name-input';
      nameInput.type = 'text';
      nameInput.value = song.name;
      nameInput.maxLength = 80;

      const commit = () => {
        const value = nameInput.value.trim();
        if (value) {
          song.name = value;
          saveSongs();
        }
        editingId = null;
        render();
      };

      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { editingId = null; render(); }
      });
      nameInput.addEventListener('blur', commit);

      row.appendChild(check);
      row.appendChild(nameInput);
      row.appendChild(del);
      listEl.appendChild(row);
      nameInput.focus();
      nameInput.select();
      return;
    }

    row.appendChild(check);
    row.appendChild(name);
    row.appendChild(edit);
    row.appendChild(del);
    listEl.appendChild(row);
  });

  const total = songs.length;
  const done = songs.filter(s => s.played).length;
  const allDone = total > 0 && done === total;

  progressCount.textContent = done + ' / ' + total;
  progressFill.style.width = total ? (done / total * 100) + '%' : '0%';

  progressWrap.style.display = allDone ? 'none' : 'block';
  resetBig.classList.toggle('show', allDone);
  banner.classList.toggle('show', allDone);

  randomBtn.disabled = songs.filter(s => !s.played).length === 0;

  if (currentPickId) {
    const pickedSong = songs.find(s => s.id === currentPickId);
    if (!pickedSong || pickedSong.played) {
      randomResult.classList.remove('show');
      currentPickId = null;
    }
  }
}

function resetList() {
  songs.forEach(s => s.played = false);
  render();
  saveSongs();
  randomResult.classList.remove('show');
}

resetBig.addEventListener('click', resetList);

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value.trim();
  render();
});

randomBtn.addEventListener('click', () => {
  const unplayed = songs.filter(s => !s.played);
  if (unplayed.length === 0) return;
  const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
  currentPickId = pick.id;
  randomResult.innerHTML = '<div class="random-result-row">Zahraj: <strong>' +
    pick.name.replace(/</g, '&lt;') +
    '</strong><button id="confirm-random">Zahráno ✓</button></div>';
  randomResult.classList.add('show');
  document.getElementById('confirm-random').addEventListener('click', () => {
    const song = songs.find(s => s.id === currentPickId);
    if (song) {
      song.played = true;
      saveSongs();
    }
    randomResult.classList.remove('show');
    currentPickId = null;
    render();
  });
});

function togglePlayed(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;
  song.played = !song.played;
  render();
  saveSongs();
}

function deleteSong(id) {
  songs = songs.filter(s => s.id !== id);
  render();
  saveSongs();
}

function addSong() {
  const value = inputEl.value.trim();
  if (!value) {
    errorMsg.style.display = 'block';
    return;
  }
  errorMsg.style.display = 'none';
  songs.push({ id: uid(), name: value, played: false });
  inputEl.value = '';
  render();
  saveSongs();
  inputEl.focus();
}

addBtn.addEventListener('click', addSong);
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') addSong();
});
inputEl.addEventListener('input', () => {
  errorMsg.style.display = 'none';
});

loadSongs();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('Service worker se nepodařilo zaregistrovat', err);
    });
  });
}

