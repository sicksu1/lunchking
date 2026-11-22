const grades = [1, 2, 3];

function defaultSettings(){
  const s = {};
  grades.forEach(g => s[g] = { current: 1, start: 1, count: 10 });
  return s;
}

function clampCurrent(block){
  if(block.current < 1) block.current = 1;
  if(block.current > block.count) block.current = block.count;
}

function getUpcomingAfterCurrent(block){
  const numbers = [];
  for(let i = 1; i < block.count; i++){
    const num = ((block.current - 1 + i) % block.count) + 1;
    numbers.push(num);
  }
  return numbers;
}

function showError(msg){
  const div = document.createElement('p');
  div.style.color = 'red';
  div.style.textAlign = 'center';
  div.textContent = '⚠ ' + msg;
  document.body.insertBefore(div, document.body.firstChild.nextSibling);
}

function renderMain(settings){
  const board = document.getElementById('board');
  board.innerHTML = '';

  grades.forEach(g => {
    const block = settings[g] || { current: 1, start: 1, count: 10 };
    clampCurrent(block);

    const col = document.createElement('div');
    col.className = `column col-${g}`;

    const label = document.createElement('div');
    label.className = 'grade-label';
    label.textContent = `${g}학년`;
    col.appendChild(label);

    const currentEl = document.createElement('div');
    currentEl.className = 'current-display';
    currentEl.textContent = `${g}-${block.current}`;
    col.appendChild(currentEl);

    const list = document.createElement('div');
    list.className = 'upcoming-list';

    getUpcomingAfterCurrent(block).forEach((classNum, idx) => {
      const item = document.createElement('div');
      item.className = 'upcoming-item' + (idx >= 5 ? ' blurred' : '');
      item.textContent = `${g}-${classNum}`;
      list.appendChild(item);
    });
    col.appendChild(list);
    board.appendChild(col);
  });
}

renderMain(defaultSettings());

try{
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  db.ref('settings').on('value', (snapshot) => {
    const data = snapshot.val() || defaultSettings();
    renderMain(data);
  }, (err) => {
    showError('ㅈ됨!!: ' + err.message);
  });

  db.ref('colors').on('value', (snapshot) => {
    const data = snapshot.val();
    if(!data) return;
    grades.forEach(g => {
      if(data[g]) document.documentElement.style.setProperty('--c' + g, data[g]);
    });
  });

  db.ref('menu').on('value', (snapshot) => {
    const text = snapshot.val();
    document.getElementById('menuText').textContent = text && text.trim() ? text : '준비 중';
  });

  let lastBroadcastTs = 0;
  let broadcastTimer = null;
  let isFirstBroadcastLoad = true;

  db.ref('broadcast').on('value', (snapshot) => {
    const data = snapshot.val();
    if(!data) return;

    if(isFirstBroadcastLoad){
      lastBroadcastTs = data.ts;
      isFirstBroadcastLoad = false;
      return;
    }

    if(data.ts === lastBroadcastTs) return;
    lastBroadcastTs = data.ts;
    showBroadcast(data.current);
  });

  function showBroadcast(current){
    const changedGrades = grades.filter(g => current[g] !== undefined);
    const sizeByCount = { 1: '34vw', 2: '22vw', 3: '15vw' };
    const fontSize = sizeByCount[changedGrades.length] || '15vw';

    grades.forEach(g => {
      const panel = document.getElementById('bg' + g);
      if(current[g] !== undefined){
        panel.style.display = 'flex';
        const numEl = document.getElementById('bgNum' + g);
        numEl.textContent = `${g}-${current[g]}`;
        numEl.style.fontSize = fontSize;
      } else {
        panel.style.display = 'none';
      }
    });

    const el = document.getElementById('broadcast');
    clearTimeout(broadcastTimer);
    el.classList.add('show');
    broadcastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 3000);
  }

} catch(e){
  showError('Firebase 연결에 실패 (' + e.message + ')');
  console.error(e);
}
