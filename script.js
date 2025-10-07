const audio = document.getElementById('audio');
const fileInput = document.getElementById('fileInput');
const playlistEl = document.getElementById('playlist');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const miniPlayer = document.getElementById('miniPlayer');
const miniTitle = document.getElementById('miniTitle');
const miniPrev = document.getElementById('miniPrev');
const miniPlay = document.getElementById('miniPlay');
const miniNext = document.getElementById('miniNext');

let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
let currentIndex = 0;
let shuffleMode = false;

// audio context + EQ + visualizer
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const source = ctx.createMediaElementSource(audio);
const bass = ctx.createBiquadFilter(); bass.type = "lowshelf";
const mid = ctx.createBiquadFilter(); mid.type = "peaking";
const treble = ctx.createBiquadFilter(); treble.type = "highshelf";
const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
source.connect(bass).connect(mid).connect(treble).connect(analyser).connect(ctx.destination);

// sliders
['bass','mid','treble'].forEach(id=>{
  document.getElementById(id).addEventListener('input', e=>{
    const v = e.target.value;
    if(id==='bass') bass.gain.value=v;
    if(id==='mid') mid.gain.value=v;
    if(id==='treble') treble.gain.value=v;
  });
});

// visualizer
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

// file input
fileInput.addEventListener('change', e => {
  [...e.target.files].forEach(f=>{
    const url = URL.createObjectURL(f);
    playlist.push({name:f.name,url});
  });
  savePlaylist();
  renderPlaylist();
  if(audio.paused) playIndex(playlist.length-1);
});

// play index
function playIndex(i){
  if(playlist.length===0) return;
  currentIndex = i;
  const song = playlist[i];
  audio.src = song.url;
  audio.play();
  miniTitle.textContent = "▶️ " + song.name;
  renderPlaylist();
}

// render playlist
function renderPlaylist(){
  playlistEl.innerHTML = playlist.map((s,i)=>`
    <li class="${i===currentIndex?'active':''}" data-i="${i}">
      ${s.name}
      <button class="delete-btn" data-del="${i}">✖</button>
    </li>
  `).join('');
  localStorage.setItem('playlist', JSON.stringify(playlist));
}
renderPlaylist();

// click playlist
playlistEl.addEventListener('click', e=>{
  if(e.target.dataset.del){
    playlist.splice(e.target.dataset.del,1);
    savePlaylist();
    renderPlaylist();
  } else if(e.target.dataset.i){
    playIndex(parseInt(e.target.dataset.i));
  }
});

function savePlaylist(){ localStorage.setItem('playlist', JSON.stringify(playlist)); }

// next / prev
nextBtn.onclick = miniNext.onclick = ()=> nextSong();
prevBtn.onclick = miniPrev.onclick = ()=> prevSong();
shuffleBtn.onclick = ()=> shuffleMode = !shuffleMode;

function nextSong(){
  if(shuffleMode){
    currentIndex = Math.floor(Math.random()*playlist.length);
  } else {
    currentIndex = (currentIndex+1)%playlist.length;
  }
  playIndex(currentIndex);
}
function prevSong(){
  currentIndex = (currentIndex-1+playlist.length)%playlist.length;
  playIndex(currentIndex);
}

// mini player play/pause
miniPlay.onclick = ()=>{
  if(audio.paused) audio.play();
  else audio.pause();
};

// auto next
audio.addEventListener('ended', nextSong);

// theme switcher
document.querySelectorAll('.theme-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const theme = btn.dataset.theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  });
});

// load saved theme
const savedTheme = localStorage.getItem('theme');
if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

// resume audio context on click
document.body.addEventListener('click', ()=>{ if(ctx.state==='suspended') ctx.resume(); });