// === MUSIKA MP3 PLAYER - Versi Final (Offline + Folder + UI Modern) ===
import { openDB } from 'https://unpkg.com/idb?module';

// Elemen utama
const audio = document.getElementById('audio');
const playlistEl = document.getElementById('playlist');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const playBtn = document.getElementById('playBtn');
const pickBtn = document.getElementById('pickBtn');

let playlist = [];
let currentIndex = 0;
let shuffleMode = false;

// === IndexedDB untuk offline storage ===
let db;
async function initDB() {
  db = await openDB('musika-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'name' });
      }
    },
  });
}

// === Simpan & muat MP3 ===
async function simpanMP3(file) {
  const arrayBuffer = await file.arrayBuffer();
  await db.put('songs', { name: file.name, data: arrayBuffer });
}

async function muatSemuaMP3() {
  const all = await db.getAll('songs');
  playlist = all.map(song => {
    const blob = new Blob([song.data], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    return { name: song.name, url };
  });
  renderPlaylist();
}

// === VISUALIZER & AUDIO FILTERS ===
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const source = ctx.createMediaElementSource(audio);
const bass = ctx.createBiquadFilter(); bass.type = "lowshelf";
const mid = ctx.createBiquadFilter(); mid.type = "peaking";
const treble = ctx.createBiquadFilter(); treble.type = "highshelf";
const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
source.connect(bass).connect(mid).connect(treble).connect(analyser).connect(ctx.destination);

// visualizer DJ style (vertical bars)
const canvas = document.getElementById('visualizer');
const vctx = canvas.getContext('2d');
function draw() {
  requestAnimationFrame(draw);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 100;
  vctx.clearRect(0, 0, width, height);
  const barW = width / data.length;
  for (let i = 0; i < data.length; i++) {
    const h = (data[i] / 255) * height;
    const grad = vctx.createLinearGradient(0, height - h, 0, height);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, getComputedStyle(document.documentElement).getPropertyValue('--neon'));
    vctx.fillStyle = grad;
    vctx.fillRect(i * barW, height - h, barW - 1, h);
  }
}
draw();

// === Pilih File / Folder ===
pickBtn.onclick = async () => {
  try {
    if ('showDirectoryPicker' in window) {
      const folder = await window.showDirectoryPicker();
      for await (const entry of folder.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.mp3')) {
          const file = await entry.getFile();
          await simpanMP3(file);
        }
      }
    } else {
      // fallback: pilih file manual
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.multiple = true;
      input.onchange = async e => {
        for (const f of e.target.files) {
          await simpanMP3(f);
        }
        await muatSemuaMP3();
        playIndex(0);
      };
      input.click();
      return;
    }
    await muatSemuaMP3();
    playIndex(0);
  } catch (err) {
    console.log('Folder/file tidak dipilih:', err);
  }
};

// === Render playlist grid ===
function renderPlaylist() {
  playlistEl.innerHTML = playlist.map((s, i) => `
    <div class="song-card ${i === currentIndex ? 'active' : ''}" data-i="${i}">
      <p>${s.name}</p>
    </div>
  `).join('');
}

// === Kontrol pemutaran ===
function playIndex(i) {
  if (playlist.length === 0) return;
  currentIndex = i;
  const song = playlist[i];
  audio.src = song.url;
  audio.play();
  playBtn.textContent = "⏸️";
  renderPlaylist();
}

playBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸️";
  } else {
    audio.pause();
    playBtn.textContent = "▶️";
  }
};

// tombol navigasi
nextBtn.onclick = () => nextSong();
prevBtn.onclick = () => prevSong();
shuffleBtn.onclick = () => shuffleMode = !shuffleMode;

function nextSong() {
  if (playlist.length === 0) return;
  currentIndex = shuffleMode
    ? Math.floor(Math.random() * playlist.length)
    : (currentIndex + 1) % playlist.length;
  playIndex(currentIndex);
}

function prevSong() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  playIndex(currentIndex);
}

audio.addEventListener('ended', nextSong);

// === Klik pada grid card ===
playlistEl.addEventListener('click', e => {
  const i = e.target.closest('.song-card')?.dataset.i;
  if (i !== undefined) playIndex(parseInt(i));
});

// === Tema ===
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });
});
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// === Init ===
document.body.addEventListener('click', () => {
  if (ctx.state === 'suspended') ctx.resume();
});

(async () => {
  await initDB();
  await muatSemuaMP3(); // load lagu tersimpan (offline)
})();