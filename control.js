const grades = [1, 2, 3];

function defaultSettings(){
  const s = {};
  grades.forEach(g => s[g] = { current: 1, start: 1, count: 10 });
  return s;
}

let liveSettings = defaultSettings();

let liveColors = { 1: '#e64848', 2: '#d9a300', 3: '#3b5bdb' };

function clamp(block){
  block.count = Math.max(1, Math.min(20, block.count));
  if(block.start < 1) block.start = 1;
  if(block.start > block.count) block.start = block.count;
  if(block.current < 1) block.current = 1;
  if(block.current > block.count) block.current = block.count;
}


function showError(msg){
  const div = document.createElement('p');
  div.style.color = 'red';
  div.textContent = '⚠ ' + msg;
  document.body.insertBefore(div, document.body.firstChild.nextSibling);
}

function renderControl(){
  const body = document.getElementById('controlBody');
  body.innerHTML = '';

  grades.forEach(g => {
    const block = liveSettings[g];
    const section = document.createElement('div');
    section.innerHTML = `
      <h2>${g}학년 (현재 ${g}-${block.current})</h2>
      <button class="sq" onclick="moveClass(${g}, -1)">${g}학년 이전 반</button>
      <button class="sq" onclick="moveClass(${g}, 1)">${g}학년 다음 반</button>
      <p>${g}학년 색상: <input type="color" value="${liveColors[g]}" onchange="setColor(${g}, this.value)"></p>
    `;
    body.appendChild(section);
  });
}

renderControl();

try{
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  db.ref('settings').on('value', (snapshot) => {
    const data = snapshot.val();
    if(data){
      grades.forEach(g => {
        if(data[g]) liveSettings[g] = data[g];
      });
    }
    renderControl();
  }, (err) => {
    showError('ㅈ된거야ㅋ: ' + err.message);
  });

  window.moveClass = function(g, delta){
    const block = liveSettings[g];
    let next = block.current + delta;
    if(next < 1) next = block.count;
    if(next > block.count) next = 1;
    block.current = next;
    clamp(block);

    db.ref('settings/' + g).set(block);
    broadcastCurrent([g]); 
  };

  function broadcastCurrent(changedGrades){
    const snapshot = {};
    changedGrades.forEach(g => snapshot[g] = liveSettings[g].current);
    db.ref('broadcast').set({ current: snapshot, ts: Date.now() });
  }

  db.ref('colors').on('value', (snapshot) => {
    const data = snapshot.val();
    if(data){
      grades.forEach(g => { if(data[g]) liveColors[g] = data[g]; });
    }
    renderControl();
  });

  window.setColor = function(g, value){
    liveColors[g] = value;
    db.ref('colors/' + g).set(value);
  };

  db.ref('menu').once('value', (snapshot) => {
    const text = snapshot.val();
    if(text) document.getElementById('menuInput').value = text;
  });

  window.saveMenu = function(){
    const text = document.getElementById('menuInput').value;
    db.ref('menu').set(text);
  };

  let autoTimer = null;

  function applyAutoUI(isOn){
    document.getElementById('autoToggle').textContent = '자동 넘김: ' + (isOn ? '켜짐 (누르면 끄기)' : '꺼짐 (누르면 켜기)');
  }

  function startAutoTimer(){
    if(autoTimer) return;
    autoTimer = setInterval(() => {
      grades.forEach(g => {
        const block = liveSettings[g];
        let next = block.current + 1;
        if(next > block.count) next = 1;
        block.current = next;
        clamp(block);
        db.ref('settings/' + g).set(block);
      });
      broadcastCurrent(grades); 
    }, 60 * 1000);
  }

  function stopAutoTimer(){
    clearInterval(autoTimer);
    autoTimer = null;
  }

  db.ref('autoAdvance').on('value', (snapshot) => {
    const isOn = !!snapshot.val();
    applyAutoUI(isOn);
    if(isOn) startAutoTimer();
    else stopAutoTimer();
  });

  window.toggleAuto = function(){
    db.ref('autoAdvance').once('value', (snapshot) => {
      db.ref('autoAdvance').set(!snapshot.val());
    });
  };

} catch(e){
  showError('Firebase 연결에 실패 (' + e.message + ')');
  console.error(e);
}
