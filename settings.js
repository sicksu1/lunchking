const grades = [1, 2, 3];

function defaultSettings(){
  const s = {};
  grades.forEach(g => s[g] = { current: 1, start: 1, count: 10 });
  return s;
}

let tempSettings = defaultSettings();

function showError(msg){
  const div = document.createElement('p');
  div.style.color = 'red';
  div.textContent = '⚠ ' + msg;
  document.body.insertBefore(div, document.body.firstChild.nextSibling);
}

function clamp(block){
  block.count = Math.max(1, Math.min(20, block.count));
  if(block.start < 1) block.start = 1;
  if(block.start > block.count) block.start = block.count;
  if(block.current < 1) block.current = 1;
  if(block.current > block.count) block.current = block.count;
}

function renderSettings(){
  const body = document.getElementById('settingsBody');
  body.innerHTML = '';

  grades.forEach(g => {
    const block = tempSettings[g];
    const section = document.createElement('div');
    section.innerHTML = `
      <h2>${g}학년</h2>
      <p>
        시작 반: ${block.start}반
        <button onclick="adjust(${g}, 'start', -1)">-</button>
        <button onclick="adjust(${g}, 'start', 1)">+</button>
      </p>
      <p>
        반 개수: ${block.count}
        <button onclick="adjust(${g}, 'count', -1)">-</button>
        <button onclick="adjust(${g}, 'count', 1)">+</button>
      </p>
    `;
    body.appendChild(section);
  });
}

renderSettings();

try{
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  db.ref('settings').once('value', (snapshot) => {
    const data = snapshot.val();
    if(data){
      grades.forEach(g => {
        if(data[g]) tempSettings[g] = { ...tempSettings[g], ...data[g] };
      });
    }
    renderSettings();
  }, (err) => {
    showError('ㅈ됨;;: ' + err.message);
  });

  window.adjust = function(g, field, delta){
    const block = tempSettings[g];
    if(field === 'start'){
      let next = block.start + delta;
      if(next < 1) next = block.count;
      if(next > block.count) next = 1;
      block.start = next;
    } else if(field === 'count'){
      block.count += delta;
    }
    clamp(block);
    renderSettings();
  };

  window.saveSettings = function(){
    grades.forEach(g => {
      const block = tempSettings[g];
      clamp(block);
      block.current = block.start;
    });
    db.ref('settings').set(tempSettings).then(() => {
      const status = document.getElementById('saveStatus');
      status.textContent = '저장됨';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  };

} catch(e){
  showError('Firebase 연결에 실패 (' + e.message + ')');
  console.error(e);
}
