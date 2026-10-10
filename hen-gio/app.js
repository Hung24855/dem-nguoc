/* Hẹn giờ — Task Scheduler */
function $(id){ return document.getElementById(id); }
var LS_KEY='hengio_tasks_v1';
var tasks=loadTasks();
var editingId=null;
var timers={}; // web fallback timers: id -> timeout

function loadTasks(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch(e){ return []; }
}
function persist(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); } catch(e){}
}
function uid(){ return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function hasBridge(){ return (typeof window.SchedulerBridge!=='undefined' && window.SchedulerBridge); }

/* ---------- Tính lần chạy tiếp theo ---------- */
function nextRun(t, fromMs){
  var from=new Date(fromMs==null?Date.now():fromMs);
  var s=t.schedule;
  if (s.type==='once'){
    return (s.at>from.getTime()) ? s.at : null;
  }
  if (s.type==='interval'){
    var mins=Math.max(1, s.minutes||30);
    var base=t.lastRun||from.getTime();
    var n=base+mins*60000;
    while (n<=from.getTime()) n+=mins*60000;
    return n;
  }
  // daily / weekly: tìm ngày giờ kế tiếp
  var d=new Date(from); d.setSeconds(0,0);
  for (var i=0;i<8;i++){
    var cand=new Date(d); cand.setHours(s.hour, s.minute, 0, 0);
    var ok=cand.getTime()>from.getTime();
    if (ok && s.type==='weekly'){
      ok=(s.days||[]).indexOf(cand.getDay())>=0;
    }
    if (ok) return cand.getTime();
    d.setDate(d.getDate()+1); d.setHours(0,0,0,0);
  }
  return null;
}
function fmtNext(ms){
  if (!ms) return '—';
  var d=new Date(ms), now=new Date();
  var str=d.getDate()+'/'+(d.getMonth()+1)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  var sameDay=d.toDateString()===now.toDateString();
  return (sameDay?'Hôm nay ':str.split(' ')[0]+' ')+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
}
function schedSummary(t){
  var s=t.schedule;
  var hm=('0'+s.hour).slice(-2)+':'+('0'+s.minute).slice(-2);
  if (s.type==='once'){ var d=new Date(s.at); return 'Một lần: '+d.getDate()+'/'+(d.getMonth()+1)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  if (s.type==='daily') return 'Hằng ngày lúc '+hm;
  if (s.type==='weekly'){
    var names=['CN','T2','T3','T4','T5','T6','T7'];
    return 'Hằng tuần '+(s.days||[]).map(function(x){return names[x];}).join(', ')+' lúc '+hm;
  }
  if (s.type==='interval') return 'Mỗi '+s.minutes+' phút';
  return '';
}
function actionSummary(t){
  var a=t.action;
  if (a.type==='http') return a.method+' '+a.url;
  if (a.type==='open_url') return 'Mở: '+a.url;
  return 'Thông báo: '+(a.message||'');
}

/* ---------- Thực thi tác vụ (bản web) ---------- */
function executeTask(t, done){
  var a=t.action;
  t.lastRun=Date.now();
  function finish(ok, info){
    t.lastResult={ok:ok, info:info, at:Date.now()};
    persist(); render();
    if (done) done(ok, info);
  }
  try{
    if (a.type==='http'){
      var headers={};
      try{ if(a.headers) headers=JSON.parse(a.headers); }catch(e){}
      fetch(a.url,{method:a.method||'GET',headers:headers,body:(a.method==='GET'||a.method==='DELETE')?undefined:(a.body||undefined)})
        .then(function(r){ return r.text().then(function(tx){ return {s:r.status, tx:tx}; }); })
        .then(function(x){ finish(true,'HTTP '+x.s); notifyUser('⏰ '+t.name,'Gọi API xong: HTTP '+x.s); })
        .catch(function(e){ finish(false,String(e&&e.message||e)); notifyUser('⏰ '+t.name,'Gọi API lỗi: '+(e&&e.message||e)); });
    } else if (a.type==='open_url'){
      window.open(a.url,'_blank');
      finish(true,'Đã mở link'); notifyUser('⏰ '+t.name,'Đã mở link theo lịch');
    } else {
      notifyUser('⏰ '+t.name, a.message||'Đến giờ rồi!');
      finish(true,'Đã thông báo');
    }
  }catch(e){ finish(false,String(e&&e.message||e)); }
}
function notifyUser(title, body){
  try{
    if ('Notification' in window && Notification.permission==='granted'){
      new Notification(title,{body:body});
    } else { alert(title+'\n'+body); }
  }catch(e){ try{alert(title+'\n'+body);}catch(e2){} }
}

/* ---------- Scheduler bản web (chạy khi mở trang) ---------- */
function armWebTimer(t){
  disarmWebTimer(t.id);
  if (!t.enabled) return;
  var n=nextRun(t);
  if (!n) return;
  var delay=n-Date.now();
  if (delay<0) delay=0;
  if (delay>2147483647) return; // quá xa, bỏ qua
  timers[t.id]=setTimeout(function(){
    executeTask(t, function(){ armWebTimer(t); });
  }, delay);
}
function disarmWebTimer(id){
  if (timers[id]){ clearTimeout(timers[id]); delete timers[id]; }
}
function syncTask(t){
  persist();
  if (hasBridge()){
    // Native xử lý chạy nền — hủy timer web
    disarmWebTimer(t.id);
    try{
      if (t.enabled) window.SchedulerBridge.scheduleTask(JSON.stringify(t));
      else window.SchedulerBridge.cancelTask(t.id);
    }catch(e){}
  } else {
    armWebTimer(t);
  }
}
function syncAll(){ tasks.forEach(syncTask); }

/* ---------- Render ---------- */
function render(){
  var box=$('taskList');
  if (!tasks.length){
    box.innerHTML='<div class="empty"><div class="big">⏰</div><p>Chưa có tác vụ nào.<br>Bấm <b>+</b> để tạo lịch hẹn giờ đầu tiên.</p></div>';
    return;
  }
  var html='';
  tasks.forEach(function(t){
    var n=t.enabled?nextRun(t):null;
    var res='';
    if (t.lastResult){
      var d=new Date(t.lastResult.at);
      res='<div class="task-result"><span class="dot '+(t.lastResult.ok?'ok':'err')+'"></span>'+
        '<span class="'+(t.lastResult.ok?'ok':'err')+'">'+esc(t.lastResult.info)+'</span>'+
        '<time>'+d.getDate()+'/'+(d.getMonth()+1)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+'</time></div>';
    }
    html+='<div class="task'+(t.enabled?'':' off')+'"><div class="task-top">'+
      '<div class="task-name">'+esc(t.name)+'</div>'+
      '<label class="switch"><input type="checkbox" '+(t.enabled?'checked':'')+' onchange="toggleTask(\''+t.id+'\',this.checked)"><span class="slider"></span></label></div>'+
      '<div><span class="pill sched">'+esc(schedSummary(t))+'</span>'+
      (n?'<span class="pill next">▶ '+esc(fmtNext(n))+'</span>':'<span class="pill">tạm dừng</span>')+'</div>'+
      '<div class="task-desc">'+esc(actionSummary(t))+'</div>'+res+
      '<div class="task-actions"><button class="btn" onclick="openSheet(\''+t.id+'\')">Sửa</button>'+
      '<button class="btn primary" onclick="runOnce(\''+t.id+'\')">Chạy ngay</button></div></div>';
  });
  box.innerHTML=html;
}
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ---------- Form ---------- */
var DAYNAMES=['CN','T2','T3','T4','T5','T6','T7'];
function segWire(id, cb){
  var el=$(id);
  el.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    Array.prototype.forEach.call(el.querySelectorAll('button'),function(x){x.classList.remove('active');});
    b.classList.add('active'); cb(b.getAttribute('data-v'));
  });
}
function segVal(id){
  var b=$(id).querySelector('button.active');
  return b?b.getAttribute('data-v'):null;
}
function segSet(id,v){
  Array.prototype.forEach.call($(id).querySelectorAll('button'),function(x){
    x.classList.toggle('active', x.getAttribute('data-v')===v);
  });
}
function initForm(){
  $('fDays').innerHTML=DAYNAMES.map(function(n,i){
    return '<button data-d="'+i+'">'+n+'</button>';
  }).join('');
  $('fDays').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(b) b.classList.toggle('active');
  });
  segWire('segAction',function(v){
    $('boxHttp').classList.toggle('hidden',v!=='http');
    $('boxUrl').classList.toggle('hidden',v!=='open_url');
    $('boxNotify').classList.toggle('hidden',v!=='notify');
  });
  segWire('segMethod',function(){});
  segWire('segSched',function(v){
    $('boxOnce').classList.toggle('hidden',v!=='once');
    $('boxDaily').classList.toggle('hidden',v!=='daily');
    $('boxWeekly').classList.toggle('hidden',v!=='weekly');
    $('boxInterval').classList.toggle('hidden',v!=='interval');
  });
}
function openSheet(id){
  editingId=id||null;
  $('btnDelete').classList.toggle('hidden',!id);
  $('sheetTitle').textContent=id?'Sửa tác vụ':'Tác vụ mới';
  var t=id?tasks.filter(function(x){return x.id===id;})[0]:null;
  $('fName').value=t?t.name:'';
  var at=t?t.action.type:'http';
  segSet('segAction',at);
  $('boxHttp').classList.toggle('hidden',at!=='http');
  $('boxUrl').classList.toggle('hidden',at!=='open_url');
  $('boxNotify').classList.toggle('hidden',at!=='notify');
  segSet('segMethod',(t&&t.action.method)||'GET');
  $('fUrl').value=t?t.action.url||'':'';
  $('fHeaders').value=t?t.action.headers||'':'';
  $('fBody').value=t?t.action.body||'':'';
  $('fOpenUrl').value=(t&&t.action.type==='open_url')?t.action.url:'';
  $('fMsg').value=(t&&t.action.type==='notify')?t.action.message||'':'';
  var st=t?t.schedule.type:'once';
  segSet('segSched',st);
  $('boxOnce').classList.toggle('hidden',st!=='once');
  $('boxDaily').classList.toggle('hidden',st!=='daily');
  $('boxWeekly').classList.toggle('hidden',st!=='weekly');
  $('boxInterval').classList.toggle('hidden',st!=='interval');
  if(t&&t.schedule.type==='once'&&t.schedule.at){
    var d=new Date(t.schedule.at);
    $('fOnce').value=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+'T'+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
  } else $('fOnce').value='';
  $('fDaily').value=(t&&t.schedule.time)||'08:00';
  $('fWeekly').value=(t&&t.schedule.time)||'08:00';
  Array.prototype.forEach.call($('fDays').querySelectorAll('button'),function(b){
    b.classList.toggle('active',!!(t&&t.schedule.days&&t.schedule.days.indexOf(+b.getAttribute('data-d'))>=0));
  });
  $('fMinutes').value=(t&&t.schedule.minutes)||30;
  $('fEnabled').checked=!t||t.enabled!==false;
  $('bgNote').style.display=hasBridge()?'none':'';
  $('sheet').classList.remove('hidden');
}
function closeSheet(){ $('sheet').classList.add('hidden'); editingId=null; }
function collectTask(){
  var at=segVal('segAction'), st=segVal('segSched');
  var action={type:at};
  if(at==='http'){
    action.method=segVal('segMethod')||'GET';
    action.url=$('fUrl').value.trim();
    action.headers=$('fHeaders').value.trim();
    action.body=$('fBody').value;
    if(!action.url){ alert('Nhập URL API'); return null; }
  } else if(at==='open_url'){
    action.url=$('fOpenUrl').value.trim();
    if(!action.url){ alert('Nhập link cần mở'); return null; }
  } else {
    action.message=$('fMsg').value.trim()||'Đến giờ rồi!';
  }
  var schedule={type:st};
  if(st==='once'){
    var v=$('fOnce').value;
    if(!v){ alert('Chọn ngày giờ chạy'); return null; }
    schedule.at=new Date(v).getTime();
    if(schedule.at<=Date.now()){ alert('Chọn thời điểm trong tương lai'); return null; }
  } else if(st==='daily'||st==='weekly'){
    var tv=(st==='daily'?$('fDaily').value:$('fWeekly').value).split(':');
    schedule.hour=+tv[0]; schedule.minute=+tv[1];
    schedule.time=('0'+schedule.hour).slice(-2)+':'+('0'+schedule.minute).slice(-2);
    if(st==='weekly'){
      schedule.days=[];
      Array.prototype.forEach.call($('fDays').querySelectorAll('button.active'),function(b){
        schedule.days.push(+b.getAttribute('data-d'));
      });
      if(!schedule.days.length){ alert('Chọn ít nhất 1 ngày trong tuần'); return null; }
    }
  } else {
    schedule.minutes=Math.max(1,+$('fMinutes').value||30);
  }
  var t=editingId?tasks.filter(function(x){return x.id===editingId;})[0]:null;
  if(!t){ t={id:uid()}; tasks.push(t); }
  t.name=$('fName').value.trim()||'Tác vụ không tên';
  t.action=action; t.schedule=schedule;
  t.enabled=$('fEnabled').checked;
  return t;
}
function saveTask(){
  var t=collectTask(); if(!t) return;
  syncTask(t); render(); closeSheet();
}
function deleteTask(){
  if(!editingId) return;
  var t=tasks.filter(function(x){return x.id===editingId;})[0];
  if(t&&hasBridge()){ try{window.SchedulerBridge.cancelTask(t.id);}catch(e){} }
  disarmWebTimer(editingId);
  tasks=tasks.filter(function(x){return x.id!==editingId;});
  persist(); render(); closeSheet();
}
function toggleTask(id,on){
  var t=tasks.filter(function(x){return x.id===id;})[0];
  if(t){ t.enabled=on; syncTask(t); render(); }
}
function runOnce(id){
  var t=tasks.filter(function(x){return x.id===id;})[0];
  if(t) executeTask(t);
}
function testNow(){
  // Chạy thử cấu hình trên form, không lưu, không đụng task đang sửa:
  // dựng task từ form trên object tạm, tách hẳn khỏi tasks[]
  var at=segVal('segAction'), st=segVal('segSched');
  var keepEditing=editingId; editingId=null;
  var keepTasks=tasks; tasks=[];
  var t=collectTask();
  tasks=keepTasks; editingId=keepEditing;
  if(!t) return;
  executeTask(t);
}

/* ---------- Khởi động ---------- */
initForm();
render();
syncAll();
if(hasBridge()){
  $('subtitle').textContent='Chạy nền thật kể cả khi tắt app ✓';
  try{
    if(window.SchedulerBridge.needExactAlarmPermission&&window.SchedulerBridge.needExactAlarmPermission()){
      if(confirm('Để hẹn giờ chính xác, cần cấp quyền báo thức trong Cài đặt. Mở ngay?'))
        window.SchedulerBridge.openExactAlarmSettings();
    }
  }catch(e){}
} else if('Notification' in window && Notification.permission==='default'){
  // gợi ý nhẹ, không ép
}
setInterval(function(){ render(); }, 60000); // cập nhật "chạy tiếp" mỗi phút
