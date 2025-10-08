// === MUSIKA MP3 PLAYER (versi offline dengan IndexedDB) ===
import { openDB } from 'https://unpkg.com/idb?module';

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

// === INIT IndexedDB ===
let db;
async function initDB() {
  db = await openDB('musika-db', 1, {
    upgrade(db) {
      db.createObjectStore('songs', { keyPath: 'name' });
    },
  });
}

// === SIMPAN & MUAT MP3 ===
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

// === AUDIO CONTEXT + VISUALIZER ===
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

// === PILIH FILE ===
function buatTombolPilih() {
  if (document.getElementById('pickBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'pickBtn';
  btn.textContent = "📂 Tambah Lagu MP3";
  btn.style.margin = '15px';
  btn.style.fontSize = '16px';
  btn.style.padding = '10px';
  btn.onclick = async () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'audio/*';
    picker.multiple = true;
    picker.onchange = async e => {
      for (const f of e.target.files) {
        await simpanMP3(f);
      }
      await muatSemuaMP3();
      playIndex(0);
    };
    picker.click();
  };
  document.querySelector('.container').prepend(btn);
}

// === RENDER & PLAY ===
function renderPlaylist(){
  playlistEl.innerHTML = playlist.map((s,i)=>`
    <li class="${i===currentIndex?'active':''}" data-i="${i}">
      ${s.name}
      <button class="delete-btn" data-del="${i}">✖</button>
    </li>
  `).join('');
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

// === NAVIGASI ===
playlistEl.addEventListener('click', async e=>{
  if(e.target.dataset.del){
    const i = parseInt(e.target.dataset.del);
    const song = playlist[i];
    await db.delete('songs', song.name);
    playlist.splice(i,1);
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
  currentIndex = shuffleMode
    ? Math.floor(Math.random()*playlist.length)
    : (currentIndex+1)%playlist.length;
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
  await initDB();
  buatTombolPilih();
  await muatSemuaMP3(); // load offline songs
})();