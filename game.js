// Elements
const gameArea = document.getElementById('gameArea');
const startBtn = document.getElementById('startBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const statusText = document.getElementById('statusText');
const targetSelect = document.getElementById('targetSelect');
const banner = document.getElementById('banner');


const popup = document.getElementById('popup');
const popupEmoji = document.getElementById('popup-emoji');
const popupMessage = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');

// curated word lists (reliable)
const NOUNS = ["apple","dog","table","computer","chair","book","car","city","phone","banana","shoe","river","moon","house","plant","window","shirt","cup","light","road","flower","stone","tree","pizza","music","game","paper","pen","school","desk"];
const VERBS = ["run","jump","read","write","eat","drink","sleep","code","sing","dance","swim","drive","walk","throw","catch","play","think","build","open","close","laugh","cry","push","pull","scratch","type","draw","fly","breathe","count"];

// combined pool (ensures mix)
const POOL = [...new Set([...NOUNS, ...VERBS, "smile","blink","grow","shine","fall","rise","spin","press","lift","drag"])];

let score = 0;
let misses = 0;
let spawnInterval = 900;
let wordsActive = new Set();
let running = false;
let gameInterval = null;

const TARGET_SCORE = 100;  // Win if score >= 100
const MAX_MISSES = 10;     // Lose if misses >= 10

// classify with curated lists first, fallback to compromise (if available)
function posOf(word) {
  const w = (word || '').toLowerCase().replace(/[^a-z]/g,'');
  if (NOUNS.includes(w)) return 'Noun';
  if (VERBS.includes(w)) return 'Verb';
  try {
    if (typeof nlp !== 'undefined') {
      const doc = nlp(w);
      if (doc.nouns().out('array').length > 0) return 'Noun';
      if (doc.verbs().out('array').length > 0) return 'Verb';
    }
  } catch(e){}
  return 'Other';
}

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function spawnWord(){
  const w = randomFrom(POOL);
  const el = document.createElement('div');
  el.className = 'word';
  el.textContent = w;

  // Mark verb words with class for orange color
  if(posOf(w) === 'Verb') el.classList.add('verb');

  // position
  const maxLeft = Math.max(8, gameArea.clientWidth - 120);
  const left = Math.max(8, Math.random() * maxLeft);
  el.style.left = `${left}px`;
  el.style.top = `-28px`;
  gameArea.appendChild(el);
  wordsActive.add(el);

  let y = -28;
  const speed = 0.3 + Math.random()*0.5;

  let removed = false;
  function step(){
    if (removed) return;
    y += speed;
    el.style.top = y + 'px';
    if (y > gameArea.clientHeight - 110) {
      removed = true;
      // Only count as miss if the word is the current target type
      if(posOf(w) === targetSelect.value) {
        el.classList.add('miss');
        showFloatingText('-2', el, 'red');
        misses++;
        updateStatus();
        if(misses >= MAX_MISSES) {
          endGame(false);
        }
      } else {
        // Different color for missed non-target words (optional: keep default)
        el.classList.add('miss');
      }
      setTimeout(() => removeWord(el, false), 300);
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  el.addEventListener('click', (ev)=>{
    ev.stopPropagation();
    if(removed) return;
    const target = targetSelect.value; // 'Noun' or 'Verb'
    const p = posOf(w);
    if(p === target){
      score += 10;
      el.classList.add('hit');
      showFloatingText('+10', el, 'green');
      if(score >= TARGET_SCORE){
        endGame(true);
      }
    } else {
      score -= 5;
      el.classList.add('miss');
      showFloatingText('-5', el, 'red');
    }
    removed = true;
    setTimeout(() => removeWord(el, true), 220);
    updateScore();
  });
}

function removeWord(el, caught){
  wordsActive.delete(el);
  if(el.parentElement) el.parentElement.removeChild(el);
  if(!caught){
    // No score change here because handled on miss in step()
  }
}

function updateScore(){
  scoreDisplay.textContent = `Score: ${score}`;
}

function updateStatus(){
  statusText.textContent = `Misses: ${misses} / ${MAX_MISSES}`;
  banner.textContent = `Words to catch: ${TARGET_SCORE / 10}`;
}

function showFloatingText(text, el, color){
  const ft = document.createElement('div');
  ft.style.position = 'absolute';
  const left = parseFloat(el.style.left) || 20;
  const top = (parseFloat(el.style.top) || 20) - 18;
  ft.style.left = left + 'px';
  ft.style.top = top + 'px';
  ft.style.color = color === 'green' ? 'lime' : 'tomato';
  ft.style.fontWeight = '700';
  ft.textContent = text;
  gameArea.appendChild(ft);
  let yy = top;
  const anim = setInterval(() => {
    yy -= 1.6;
    ft.style.top = yy + 'px';
  }, 16);
  setTimeout(() => {
    clearInterval(anim);
    if (ft.parentElement) ft.parentElement.removeChild(ft);
  }, 700);
}

function startGame(){
  if(running) return;
  running = true;
  score = 0;
  misses = 0;
  updateScore();
  updateStatus();
  statusText.textContent = 'Go!';
  spawnInterval = 2000;
  gameInterval = setInterval(spawnWord, spawnInterval);
  for(let i=0; i<3; i++) setTimeout(spawnWord, i*250);
  speedUpLoop();
}

function stopGame(){
  running = false;
  statusText.textContent = 'Stopped';
  clearInterval(gameInterval);
  for(const el of Array.from(wordsActive)){
    if(el.parentElement) el.parentElement.removeChild(el);
  }
  wordsActive.clear();
  popup.classList.add('hidden');
}

function speedUpLoop(){
  let ticks = 0;
  const sid = setInterval(() => {
    if(!running){ clearInterval(sid); return; }
    ticks++;
    if(ticks % 10 === 0 && spawnInterval > 280){
      spawnInterval = Math.max(280, spawnInterval - 70);
      clearInterval(gameInterval);
      gameInterval = setInterval(spawnWord, spawnInterval);
    }
  }, 500);
}

function endGame(won){
  stopGame();
  if(won){
    popupEmoji.textContent = '🎉';
    popupMessage.textContent = 'You Win! Great job!';
  } else {
    popupEmoji.textContent = '😞';
    popupMessage.textContent = 'You Lose! Try again!';
  }
  popup.classList.remove('hidden');
}

popupClose.addEventListener('click', () => {
  popup.classList.add('hidden');
  startGame();
});

startBtn.addEventListener('click', () => {
  if(running){
    stopGame();
    startBtn.textContent = 'Start Game';
  } else {
    startGame();
    startBtn.textContent = 'Stop Game';
  }
});

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if(e.key === 'n') targetSelect.value = 'Noun';
  if(e.key === 'v') targetSelect.value = 'Verb';
});

// initial score and status
updateScore();
updateStatus();
