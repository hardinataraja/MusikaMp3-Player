// === MUSIKA MP3 PLAYER (versi akses otomatis File System Access API) ===
const audio = document.getElementById('audio');
const playlistEl = document.getElementById('playlist');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const miniPlayer = document.getElementById('miniPlayer');
const miniTitle = document.getElementById('miniTitle');
const miniPrev = document.getElementById('miniPrev');
const miniPlay = document.getElementById('miniPlay');
const miniNext = document.getElementById('miniNext');

let playlist = [];
let currentIndex = 0;
let shuffleMode = false;
let musicFolderHandle = null;

// === AUDIO CONTEXT + EQ + VISUALIZER ===
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const source = ctx.createMediaElementSource(audio);
const bass = ctx.createBiquadFilter(); bass.type = "lowshelf";
const mid = ctx.createBiquadFilter(); mid.type = "peaking";
const treble = ctx.createBiquadFilter(); treble.type = "highshelf";
const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
source.connect(bass).connect(mid).connect(treble).connect(analyser).connect(ctx.destination);

['bass','mid','treble'].forEach(id=>{
  document.getElementById(id).addEventListener('input', e=>{
    const v = e.target.value;
    if(id==='bass') bass.gain.value=v;
    if(id==='mid') mid.gain.value=v;
    if(id==='treble') treble.gain.value=v;
  });
});

// === VISUALIZER ===
const canvas = document.getElementById('visualizer');
const vctx = canvas.getContext('2d');
function draw() {
  requestAnimationFrame(draw);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 100;
  vctx.clearRect(0,0,width,height);
  const barW = width / data.length;
  for (let i=0; i<data.length; i++){
    const h = data[i]/2;
    const grad = vctx.createLinearGradient(0,0,0,height);
    grad.addColorStop(0,'#fff');
    grad.addColorStop(1,getComputedStyle(document.documentElement).getPropertyValue('--neon'));
    vctx.fillStyle = grad;
    vctx.fillRect(i*barW,height-h,barW-1,h);
  }
}
draw();

// === SIMPAN DAN MUAT HANDLE FOLDER ===
async function saveFolderHandle(handle) {
  if (window.localStorage && handle) {
    const perm = await handle.requestPermission({ mode: 'read' });
    if (perm === 'granted') {
      localStorage.setItem('musicFolder', await handle.name);
      musicFolderHandle = handle;
    }
  }
}

async function loadSavedFolder() {
  if ('storage' in navigator && 'getDirectory' in navigator.storage) {
    try {
      const handles = await navigator.storage.getDirectory();
      if (handles) {
        // placeholder, not needed here for Chrome
      }
    } catch {}
  }
  // Check if previously granted handle exists (using File System Access API)
  if ('showDirectoryPicker' in window && 'storage' in navigator) {
    try {
      const persisted = await navigator.storage.persist();
      // Not truly restoring yet; browsers still limit this. We'll ask user if needed.
    } catch {}
  }
}

// === PILIH FOLDER / FILE MP3 ===
async function pilihFolderMusik() {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await window.showDirectoryPicker();
      musicFolderHandle = handle;
      await muatSemuaMP3(handle);
      await saveFolderHandle(handle);
    } catch (e) {
      console.log("Folder tidak dipilih:", e);
    }
  } else {
    // fallback ke input file
    buatTombolFileManual();
  }
}

// === MUAT SEMUA MP3 DARI FOLDER ===
async function muatSemuaMP3(handle) {
  playlist = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.mp3')) {
      const file = await entry.getFile();
      const url = URL.createObjectURL(file);
      playlist.push({ name: file.name, url });
    }
  }
  renderPlaylist();
  playIndex(0);
}

// === BUAT TOMBOL PILIH FILE MANUAL JIKA API TIDAK DIDUKUNG ===
function buatTombolFileManual() {
  if (document.getElementById('manualBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'manualBtn';
  btn.textContent = "📂 Pilih File MP3";
  btn.style.marginTop = '10px';
  btn.onclick = async () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'audio/*';
    picker.multiple = true;
    picker.onchange = e => {
      [...e.target.files].forEach(f=>{
        const url = URL.createObjectURL(f);
        playlist.push({ name: f.name, url });
      });
      renderPlaylist();
      playIndex(0);
    };
    picker.click();
  };
  document.querySelector('.container').appendChild(btn);
}

// === RENDER & PUTAR ===
function renderPlaylist(){
  playlistEl.innerHTML = playlist.map((s,i)=>`
    <li class="${i===currentIndex?'active':''}" data-i="${i}">
      ${s.name}
      <button class="delete-btn" data-del="${i}">✖</button>
    </li>
  `).join('');
  localStorage.setItem('playlist', JSON.stringify(playlist.map(p => ({ name: p.name }))));
}

function playIndex(i){
  if(playlist.length===0) return;
  currentIndex = i;
  const song = playlist[i];
  audio.src = song.url;
  audio.play();
  miniTitle.textContent = "▶️ " + song.name;
  renderPlaylist();
}

// === NAVIGASI PLAYLIST ===
playlistEl.addEventListener('click', e=>{
  if(e.target.dataset.del){
    playlist.splice(e.target.dataset.del,1);
    renderPlaylist();
  } else if(e.target.dataset.i){
    playIndex(parseInt(e.target.dataset.i));
  }
});
nextBtn.onclick = miniNext.onclick = ()=> nextSong();
prevBtn.onclick = miniPrev.onclick = ()=> prevSong();
shuffleBtn.onclick = ()=> shuffleMode = !shuffleMode;
miniPlay.onclick = ()=> audio.paused ? audio.play() : audio.pause();
audio.addEventListener('ended', nextSong);
function nextSong(){
  if(playlist.length===0) return;
  if(shuffleMode){
    currentIndex = Math.floor(Math.random()*playlist.length);
  } else {
    currentIndex = (currentIndex+1)%playlist.length;
  }
  playIndex(currentIndex);
}
function prevSong(){
  if(playlist.length===0) return;
  currentIndex = (currentIndex-1+playlist.length)%playlist.length;
  playIndex(currentIndex);
}

// === THEME SWITCHER ===
document.querySelectorAll('.theme-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });
});
const savedTheme = localStorage.getItem('theme');
if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// === INISIASI ===
document.body.addEventListener('click', ()=>{ if(ctx.state==='suspended') ctx.resume(); });

(async ()=>{
  // Jika sudah ada izin sebelumnya, langsung muat
  if ('showDirectoryPicker' in window && (await navigator.permissions.query({name: 'file-system-access'})).state === 'granted') {
    try {
      await loadSavedFolder();
    } catch {}
  } else {
    buatTombolFileManual();
  }
})();