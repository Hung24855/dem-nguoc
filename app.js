/* ===== Đếm ngược — Firebase edition ===== */
"use strict";

/* ---------- Firebase config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDuk84cn8YyMnTG780di19-OfqusI2sGnY",
  authDomain: "nghiemhong-f32c5.firebaseapp.com",
  projectId: "nghiemhong-f32c5",
  storageBucket: "nghiemhong-f32c5.firebasestorage.app",
  messagingSenderId: "458705987658",
  appId: "1:458705987658:web:1678a09ea66525cdf71eb3"
};

/* ---------- Âm lịch: thuật toán Hồ Ngọc Đức (múi giờ VN = 7) ---------- */
const TZ = 7, PI = Math.PI;
function INT(d){ return Math.floor(d); }
function jdFromDate(dd, mm, yy){
  var a = INT((14-mm)/12), y = yy+4800-a, m = mm+12*a-3;
  var jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - INT(y/100) + INT(y/400) - 32045;
  if (jd < 2299161) jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - 32083;
  return jd;
}
function jdToDate(jd){
  var a,b,c;
  if (jd > 2299160){ a = jd+32044; b = INT((4*a+3)/146097); c = a-INT((b*146097)/4); }
  else { b = 0; c = jd+32082; }
  var d = INT((4*c+3)/1461), e = c-INT((1461*d)/4), m = INT((5*e+2)/153);
  return [e-INT((153*m+2)/5)+1, m+3-12*INT(m/10), b*100+d-4800+INT(m/10)];
}
function NewMoon(k){
  var T=k/1236.85, T2=T*T, T3=T2*T, dr=PI/180;
  var Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3
    + 0.00033*Math.sin((166.56+132.87*T-0.009173*T2)*dr);
  var M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3;
  var Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3;
  var F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3;
  var C1 = (0.1734-0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M)
    - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(dr*2*Mpr) - 0.0004*Math.sin(dr*3*Mpr)
    + 0.0104*Math.sin(dr*2*F) - 0.0051*Math.sin(dr*(M+Mpr)) - 0.0074*Math.sin(dr*(M-Mpr))
    + 0.0004*Math.sin(dr*(2*F+M)) - 0.0004*Math.sin(dr*(2*F-M)) - 0.0006*Math.sin(dr*(2*F+Mpr))
    + 0.0010*Math.sin(dr*(2*F-Mpr)) + 0.0005*Math.sin(dr*(2*Mpr+M));
  var deltat = T < -11
    ? 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3
    : -0.000278 + 0.000265*T + 0.000262*T2;
  return Jd1 + C1 - deltat;
}
function SunLongitude(jdn, tz){
  var T=(jdn-2451545.0-tz/24)/36525, T2=T*T, dr=PI/180;
  var M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2;
  var L0 = 280.46645 + 36000.76983*T + 0.0003032*T2;
  var DL = (1.914600-0.004817*T-0.000014*T2)*Math.sin(dr*M)
    + (0.019993-0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M);
  var L = (L0+DL)*dr; L -= PI*2*INT(L/(PI*2));
  return INT(6*L/PI);
}
function getNewMoonDay(k, tz){ return INT(NewMoon(k)+0.5+tz/24); }
function getLunarMonth11(yy, tz){
  var k = INT(0.5 + (jdFromDate(31,12,yy)-2415021.076998695)/29.530588853);
  var nm = getNewMoonDay(k, tz);
  if (SunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k-1, tz);
  return nm;
}
function getLeapMonthOffset(a11, tz){
  var k = INT((a11-2415021.076998695)/29.530588853+0.5), last=0, i=1;
  var arc = SunLongitude(getNewMoonDay(k+i,tz),tz);
  do { last=arc; i++; arc=SunLongitude(getNewMoonDay(k+i,tz),tz); } while (arc!==last && i<14);
  return i-1;
}
function lunarToSolar(lDay, lMonth, lYear, leap, tz){
  tz = tz||TZ;
  var a11,b11;
  if (lMonth<11){ a11=getLunarMonth11(lYear-1,tz); b11=getLunarMonth11(lYear,tz); }
  else { a11=getLunarMonth11(lYear,tz); b11=getLunarMonth11(lYear+1,tz); }
  var k = INT((a11-2415021.076998695)/29.530588853+0.5);
  var off = lMonth-11; if (off<0) off+=12;
  var leapOff = getLeapMonthOffset(a11,tz), leapMonth = leapOff-2; if (leapMonth<0) leapMonth+=12;
  if (leap && lMonth!==leapMonth) return [0,0,0];
  if (leap || off>=leapOff) off+=1;
  var monthStart = getNewMoonDay(k+off,tz);
  return jdToDate(monthStart+lDay-1);
}
function nextLunarOccurrence(lDay, lMonth, from){
  var y = from.getFullYear();
  for (var yy=y; yy<=y+2; yy++){
    var s = lunarToSolar(lDay,lMonth,yy,false,TZ);
    if (s[2]>0){
      var d = new Date(s[2], s[1]-1, s[0]); d.setHours(0,0,0,0);
      if (d>=from) return {date:d, lunar:{day:lDay,month:lMonth,year:yy}};
    }
  }
  return null;
}
// Độ dài tháng 12 âm (cho Tất Niên)
function lunarMonthLength(lMonth, lYear){
  var k = INT((getLunarMonth11(lYear,TZ)-2415021.076998695)/29.530588853+0.5);
  var off = lMonth-11; if (off<0) off+=12;
  var start = getNewMoonDay(k+off,TZ), next = getNewMoonDay(k+off+1,TZ);
  return next-start;
}
function solarToLunar(dd, mm, yy){
  var dayNumber = jdFromDate(dd, mm, yy);
  var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  var monthStart = getNewMoonDay(k + 1, TZ);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, TZ);
  var a11 = getLunarMonth11(yy, TZ);
  var b11 = monthStart;
  var lunarYear;
  if (a11 >= b11) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, TZ);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, TZ);
  }
  var lunarDay = dayNumber - monthStart + 1;
  var diff = INT((monthStart - a11) / 29.530588853);
  var lunarLeap = 0;
  var lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    var leapMonthDiff = INT((monthStart - b11) / 29.530588853);
    if (leapMonthDiff >= 0) {
      lunarMonth = leapMonthDiff + 11;
      if (leapMonthDiff === 0) {
        // Kiểm tra tháng nhuận: so sánh độ dài
        var prevStart = getNewMoonDay(k - 1, TZ);
        if (monthStart - prevStart === 30) lunarLeap = 0;
      }
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return {day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap};
}
function fmtLunar(dd, mm, yy){
  try {
    var l = solarToLunar(dd, mm, yy);
    return l.day + '/' + l.month + (l.leap ? ' nhuận' : '') + ' âm lịch';
  } catch(e){ return ''; }
}

/* ---------- Danh sách ngày lễ Việt Nam ---------- */
// type: 'solar' | 'lunar'
const HOLIDAYS = [
  {id:'tet-duong', title:'Tết Dương lịch', type:'solar', month:1, day:1},
  {id:'thanh-lap-dang', title:'Ngày thành lập Đảng CSVN', type:'solar', month:2, day:3},
  {id:'thay-thuoc', title:'Ngày Thầy thuốc Việt Nam', type:'solar', month:2, day:27},
  {id:'phu-nu-8-3', title:'Ngày Quốc tế Phụ nữ', type:'solar', month:3, day:8},
  {id:'thanh-lap-doan', title:'Ngày thành lập Đoàn TNCS Hồ Chí Minh', type:'solar', month:3, day:26},
  {id:'the-thao', title:'Ngày Thể thao Việt Nam', type:'solar', month:3, day:27},
  {id:'sach-vn', title:'Ngày Sách và Văn hóa đọc Việt Nam', type:'solar', month:4, day:21},
  {id:'giai-phong', title:'Ngày Giải phóng miền Nam', type:'solar', month:4, day:30},
  {id:'lao-dong', title:'Ngày Quốc tế Lao động', type:'solar', month:5, day:1},
  {id:'dien-bien-phu', title:'Chiến thắng Điện Biên Phủ', type:'solar', month:5, day:7},
  {id:'khoa-hoc', title:'Ngày Khoa học và Công nghệ Việt Nam', type:'solar', month:5, day:18},
  {id:'sinh-nhat-bac-ho', title:'Ngày sinh Chủ tịch Hồ Chí Minh', type:'solar', month:5, day:19},
  {id:'thieu-nhi', title:'Ngày Quốc tế Thiếu nhi', type:'solar', month:6, day:1},
  {id:'moi-truong', title:'Ngày Môi trường Thế giới', type:'solar', month:6, day:5},
  {id:'bao-chi', title:'Ngày Báo chí Cách mạng Việt Nam', type:'solar', month:6, day:21},
  {id:'gia-dinh', title:'Ngày Gia đình Việt Nam', type:'solar', month:6, day:28},
  {id:'thuong-binh', title:'Ngày Thương binh Liệt sĩ', type:'solar', month:7, day:27},
  {id:'cach-mang-t8', title:'Cách mạng Tháng Tám', type:'solar', month:8, day:19},
  {id:'quoc-khanh', title:'Ngày Quốc khánh', type:'solar', month:9, day:2},
  {id:'hoa-binh', title:'Ngày Quốc tế Hòa bình', type:'solar', month:9, day:21},
  {id:'nguoi-cao-tuoi', title:'Ngày Quốc tế Người cao tuổi', type:'solar', month:10, day:1},
  {id:'giai-phong-thu-do', title:'Ngày Giải phóng Thủ đô', type:'solar', month:10, day:10},
  {id:'chuyen-doi-so', title:'Ngày Chuyển đổi số quốc gia', type:'solar', month:10, day:10},
  {id:'doanh-nhan', title:'Ngày Doanh nhân Việt Nam', type:'solar', month:10, day:13},
  {id:'phu-nu-vn', title:'Ngày Phụ nữ Việt Nam', type:'solar', month:10, day:20},
  {id:'do-thi', title:'Ngày Đô thị Việt Nam', type:'solar', month:11, day:8},
  {id:'phap-luat', title:'Ngày Pháp luật Việt Nam', type:'solar', month:11, day:9},
  {id:'dai-doan-ket', title:'Ngày Đại đoàn kết toàn dân tộc', type:'solar', month:11, day:18},
  {id:'nha-giao', title:'Ngày Nhà giáo Việt Nam', type:'solar', month:11, day:20},
  {id:'di-san', title:'Ngày Di sản Văn hóa Việt Nam', type:'solar', month:11, day:23},
  {id:'phong-chong-aids', title:'Ngày Thế giới phòng chống AIDS', type:'solar', month:12, day:1},
  {id:'nguoi-khuyet-tat', title:'Ngày Quốc tế Người khuyết tật', type:'solar', month:12, day:3},
  {id:'cuu-chien-binh', title:'Ngày thành lập Hội Cựu chiến binh VN', type:'solar', month:12, day:6},
  {id:'chong-tham-nhung', title:'Ngày Quốc tế chống tham nhũng', type:'solar', month:12, day:9},
  {id:'nhan-quyen', title:'Ngày Nhân quyền Thế giới', type:'solar', month:12, day:10},
  {id:'quan-doi', title:'Ngày thành lập QĐND Việt Nam', type:'solar', month:12, day:22},
  {id:'giang-sinh', title:'Lễ Giáng sinh', type:'solar', month:12, day:25},
  {id:'dan-so', title:'Ngày Dân số Việt Nam', type:'solar', month:12, day:26},
  // Âm lịch
  {id:'tet-nguyen-dan', title:'Tết Nguyên Đán', type:'lunar', month:1, day:1},
  {id:'tet-nguyen-tieu', title:'Tết Nguyên Tiêu (Rằm tháng Giêng)', type:'lunar', month:1, day:15},
  {id:'tet-han-thuc', title:'Tết Hàn Thực', type:'lunar', month:3, day:3},
  {id:'gio-to', title:'Giỗ Tổ Hùng Vương', type:'lunar', month:3, day:10},
  {id:'tet-doan-ngo', title:'Tết Đoan Ngọ', type:'lunar', month:5, day:5},
  {id:'vu-lan', title:'Lễ Vu Lan (Rằm tháng 7)', type:'lunar', month:7, day:15},
  {id:'tet-trung-thu', title:'Tết Trung Thu', type:'lunar', month:8, day:15},
  {id:'tet-trung-cuu', title:'Tết Trùng Cửu', type:'lunar', month:9, day:9},
  {id:'ong-tao', title:'Tết Ông Công Ông Táo', type:'lunar', month:12, day:23},
  {id:'tat-nien', title:'Tất Niên', type:'lunar', month:12, day:30, lastDay:true},
];

/* ---------- Dữ liệu seed (từ app cũ) ---------- */
const SEED_EVENTS = [
  {title:'Sinh nhật mẹ (1965)', date:'1965-08-01', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Thu (2002)', date:'2002-09-26', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Chị Nguyên (1984)', date:'1984-09-13', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Gì Bé (1971)', date:'1971-03-10', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Già Nhòm (1961)', date:'1961-10-01', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Hải (2002)', date:'2002-11-03', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Công (2002)', date:'2002-06-02', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Dinh (2002)', date:'2002-05-29', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Hưng (2002)', date:'2002-12-12', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Lâm (2002)', date:'2002-07-09', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Hoài Nam', date:'2002-08-28', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Phi (2002)', date:'2002-03-09', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Phong (2002)', date:'2002-02-21', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Sơn (2001)', date:'2001-11-20', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Tài (2002)', date:'2002-09-01', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Tùng (2002)', date:'2002-12-06', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
  {title:'Sinh nhật Việt (2002)', date:'2002-10-08', kind:'birthday', note:'', color:'red', pinned:false, remind_me:false, repeats_annually:true},
];

/* ---------- Firebase ---------- */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
try { db.enablePersistence({synchronizeTabs:true}).catch(function(){}); } catch(e){}

const state = {
  personal: [],
  customs: {},
  view: 'list',
  tab: 'all', // all | holiday | personal
  showAll: false,
  calYear: null, calMonth: null, calSelected: null,
  editingId: null, editingHoliday: null,
  ready: false,
};

const WEEKDAYS = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

function $(id){ return document.getElementById(id); }
function setSync(msg, online){ /* ẩn để giống bản web */ }
function toast(msg){
  var t = $('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(t._h); t._h = setTimeout(function(){ t.classList.add('hidden'); }, 2200);
}
function updateOnline(){
  setSync(navigator.onLine ? 'Đã kết nối • đồng bộ Firebase' : 'Ngoại tuyến • dùng dữ liệu đã lưu', navigator.onLine);
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);

auth.signInAnonymously().catch(function(err){ setSync('Lỗi đăng nhập: '+err.message, false); });
initNotif();
auth.onAuthStateChanged(function(user){
  if (!user) return;
  startSync();
});

function startSync(){
  updateOnline();
  db.collection('meta').doc('seeded').get().then(function(doc){
    if (!doc.exists) seedData();
  });
  db.collection('personal_events').onSnapshot(function(snap){
    state.personal = [];
    snap.forEach(function(d){ var o=d.data(); o.id=d.id; state.personal.push(o); });
    render();
  }, function(){ setSync('Lỗi đọc dữ liệu (kiểm tra Firestore rules)', false); });
  db.collection('holiday_customizations').onSnapshot(function(snap){
    state.customs = {};
    snap.forEach(function(d){ state.customs[d.id]=d.data(); });
    render();
  });
  state.ready = true;
}

function seedData(){
  var batch = db.batch();
  SEED_EVENTS.forEach(function(e, i){
    batch.set(db.collection('personal_events').doc('seed-'+i),
      Object.assign({createdAt: firebase.firestore.FieldValue.serverTimestamp()}, e));
  });
  batch.set(db.collection('meta').doc('seeded'),
    {at: firebase.firestore.FieldValue.serverTimestamp(), v:1});
  batch.commit().catch(function(){});
}

/* ---------- Helpers ---------- */
function today(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
function parseYMD(s){ var p=s.split('-'); var d=new Date(+p[0],+p[1]-1,+p[2]); d.setHours(0,0,0,0); return d; }
function daysUntil(d){ return Math.round((d-today())/86400000); }
function fmtDate(d){ return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear(); }
function fmtWeekdayDate(d){ return WEEKDAYS[d.getDay()]+', '+fmtDate(d); }
function fmtMonthYear(y,m){ return 'Tháng '+(m+1)+' năm '+y; }
function nextAnnual(month, day, from){
  var y=from.getFullYear(), d=new Date(y,month-1,day); d.setHours(0,0,0,0);
  if (d<from) d=new Date(y+1,month-1,day);
  d.setHours(0,0,0,0);
  return d;
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,
  function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

/* ---------- Tính sự kiện ---------- */
/* Tính sự kiện cho một tháng dương cụ thể (dùng cho lịch) */
function computeEventsForSolarMonth(y, m){
  var out=[];
  HOLIDAYS.forEach(function(h){
    var c=state.customs[h.id]||{};
    if (c.hidden) return;
    var title=c.title||h.title;
    if (h.type==='solar'){
      if (h.month-1!==m) return;
      var occ=new Date(y, m, h.day); occ.setHours(0,0,0,0);
      out.push({key:'h-'+h.id+'-'+y, kind:'holiday', holidayId:h.id, title:title,
        date:occ, days:daysUntil(occ), pinned:!!c.pinned, remind_me:!!c.remind_me,
        lunar:null, detail:'Ngày lễ'});
    }
  });
  // Ngày lễ âm: duyệt từng ngày trong tháng
  var daysIn=new Date(y, m+1, 0).getDate();
  for (var d=1; d<=daysIn; d++){
    var l;
    try { l=solarToLunar(d, m+1, y); } catch(e){ continue; }
    HOLIDAYS.forEach(function(h){
      if (h.type!=='lunar') return;
      var c=state.customs[h.id]||{};
      if (c.hidden) return;
      var match=false, lunarLabel=null;
      if (h.lastDay){
        var len=lunarMonthLength(12, l.year);
        if (l.month===12 && l.day===len) match=true;
      } else if (h.day===l.day && h.month===l.month) match=true;
      if (match){
        var occ=new Date(y, m, d); occ.setHours(0,0,0,0);
        lunarLabel=l.day+'/'+l.month+' âm lịch';
        out.push({key:'h-'+h.id+'-'+y+'-'+m+'-'+d, kind:'holiday', holidayId:h.id,
          title:c.title||h.title, date:occ, days:daysUntil(occ),
          pinned:!!c.pinned, remind_me:!!c.remind_me,
          lunar:lunarLabel, detail:'Ngày lễ · '+lunarLabel});
      }
    });
  }
  // Sự kiện cá nhân
  state.personal.forEach(function(e){
    var occ=null;
    if (e.repeats_annually){
      var p=e.date.split('-');
      occ=new Date(y, +p[1]-1, +p[2]); occ.setHours(0,0,0,0);
    } else {
      var ed=parseYMD(e.date);
      if (ed.getFullYear()===y && ed.getMonth()===m) occ=ed;
    }
    if (!occ || occ.getMonth()!==m) return;
    var kindName={birthday:'Sinh nhật',anniversary:'Kỷ niệm',holiday:'Ngày lễ',other:'Ngày riêng'}[e.kind]||'Ngày riêng';
    out.push({key:'p-'+e.id+'-'+y+'-'+m, kind:'personal', pid:e.id, title:e.title,
      date:occ, days:daysUntil(occ), pinned:!!e.pinned, remind_me:!!e.remind_me,
      detail:kindName+(e.repeats_annually?' · Hằng năm':'')+(e.note?' · '+e.note:''), raw:e});
  });
  return out;
}

function computeEvents(){
  var from=today(), out=[];
  HOLIDAYS.forEach(function(h){
    var c=state.customs[h.id]||{};
    if (c.hidden) return;
    var title=c.title||h.title, occ=null, lunarLabel=null, desc='Ngày lễ';
    if (h.type==='solar'){ occ=nextAnnual(h.month,h.day,from); }
    else {
      if (h.lastDay){
        for (var yy=from.getFullYear(); yy<=from.getFullYear()+1 && !occ; yy++){
          var len=lunarMonthLength(12,yy), td=Math.min(30,len);
          var s=lunarToSolar(td,12,yy,false,TZ);
          if (s[2]>0){ var d=new Date(s[2],s[1]-1,s[0]); d.setHours(0,0,0,0);
            if (d>=from){ occ=d; lunarLabel=td+'/12 âm lịch'; } }
        }
      } else {
        var r=nextLunarOccurrence(h.day,h.month,from);
        if (r){ occ=r.date; lunarLabel=r.lunar.day+'/'+r.lunar.month+' âm lịch'; }
      }
    }
    if (!occ) return;
    var detail = lunarLabel ? 'Ngày lễ · '+lunarLabel : 'Ngày lễ';
    out.push({key:'h-'+h.id, kind:'holiday', holidayId:h.id, title:title,
      date:occ, days:daysUntil(occ), pinned:!!c.pinned, remind_me:!!c.remind_me,
      lunar:lunarLabel, detail:detail});
  });
  state.personal.forEach(function(e){
    var occ;
    if (e.repeats_annually){ var p=e.date.split('-'); occ=nextAnnual(+p[1],+p[2],from); }
    else { occ=parseYMD(e.date); if (occ<from) return; }
    var kindName={birthday:'Sinh nhật',anniversary:'Kỷ niệm',holiday:'Ngày lễ',other:'Ngày riêng'}[e.kind]||'Ngày riêng';
    var detail=kindName+' · Hằng năm'+(e.repeats_annually?' · Lặp lại hằng năm':'')+(e.note?' · '+e.note:'');
    out.push({key:'p-'+e.id, kind:'personal', pid:e.id, title:e.title,
      date:occ, days:daysUntil(occ), pinned:!!e.pinned, remind_me:!!e.remind_me,
      detail:detail, raw:e});
  });
  if (state.tab==='personal') out=out.filter(function(e){ return e.kind==='personal'; });
  out.sort(function(a,b){
    if (a.pinned!==b.pinned) return a.pinned?-1:1;
    return a.days-b.days;
  });
  return out;
}

/* ---------- Render ---------- */
function render(){
  if (!state.ready) return;
  var events=computeEvents();
  renderHero(events);
  if (state.view==='list') renderList(events);
  else if (state.lunarCal) renderLunarCal(events);
  else renderCal(events);
  checkReminders(events);
}

/* ---------- Thông báo trình duyệt (nhắc trước 3 ngày) ---------- */
function notifSupported(){ return ('Notification' in window); }
function notifKey(e){
  var d=today();
  return 'notif_'+e.key+'_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
}
function updateNotifBtn(){
  var b=$('btnNotif'); if (!b) return;
  if (!notifSupported()){ b.style.opacity='0.35'; b.title='Trình duyệt không hỗ trợ thông báo'; return; }
  var on = Notification.permission==='granted';
  b.classList.toggle('active', on);
  b.title = on ? 'Đã bật thông báo nhắc sự kiện' : 'Bật thông báo nhắc sự kiện';
}
function initNotif(){
  var b=$('btnNotif'); if (!b) return;
  updateNotifBtn();
  b.addEventListener('click', function(){
    if (!notifSupported()){ alert('Trình duyệt này không hỗ trợ thông báo.'); return; }
    if (Notification.permission==='granted'){ alert('Đã bật thông báo rồi.'); return; }
    Notification.requestPermission().then(function(p){
      updateNotifBtn();
      if (p==='granted'){
        try { new Notification('Đếm ngược', {body:'Đã bật nhắc sự kiện. Khi có sự kiện bật "Nhắc tôi" còn đúng 3 ngày, bạn sẽ thấy thông báo ở đây.'}); } catch(e){}
        if (state.ready) checkReminders(computeEvents());
      } else {
        alert('Bạn đã từ chối quyền thông báo. Muốn bật lại thì vào cài đặt trình duyệt cho trang này.');
      }
    });
  });
  // Kiểm tra định kỳ khi trang đang mở
  setInterval(function(){ if (state.ready && Notification.permission==='granted') checkReminders(computeEvents()); }, 30*60*1000);
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden && state.ready && Notification.permission==='granted') checkReminders(computeEvents());
  });
}
function checkReminders(events){
  if (!notifSupported() || Notification.permission!=='granted') return;
  events.forEach(function(e){
    if (!e.remind_me || e.days!==3) return;
    var k=notifKey(e);
    try { if (localStorage.getItem(k)) return; } catch(err){}
    try {
      new Notification('Nhắc bạn nè', {
        body:'Còn 3 ngày nữa là đến '+e.title+' ('+fmtDate(e.date)+') đó!',
        tag:k
      });
      try { localStorage.setItem(k, '1'); } catch(err2){}
    } catch(err3){}
  });
}
function setCalMode(lunar){
  state.lunarCal=lunar;
  $('btnSolarCal').classList.toggle('active', !lunar);
  $('btnLunarCal').classList.toggle('active', lunar);
  if (lunar && state.lunarYear==null){
    var now=new Date();
    var l=solarToLunar(now.getDate(), now.getMonth()+1, now.getFullYear());
    state.lunarYear=l.year; state.lunarMonth=l.month;
  }
  state.calSelected=null;
  render();
}

function renderHero(events){
  var hero=$('hero');
  if (!events.length){ hero.innerHTML='<div class="hero-empty">Chưa có sự kiện nào.<br>Bấm + để thêm.</div>'; return; }
  var e=events[0];
  var num=e.days===0?'🎉':e.days;
  var unit=e.days===0?'hôm nay!':(e.days<0?'ngày đã qua':'ngày nữa');
  var n=e.days<0?-e.days:num;
  hero.innerHTML=
    '<div class="hero-copy">'+
      '<p class="hero-kicker">Sắp đến</p>'+
      '<p class="hero-title">'+esc(e.title)+'</p>'+
      '<p class="hero-date">'+fmtWeekdayDate(e.date)+'</p>'+
    '</div>'+
    '<div class="hero-count"><strong>'+n+'</strong><span>'+unit+'</span></div>';
}

var BELL_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
var PIN_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 4h6l-1 7 3 3v2H7v-2l3-3z"/><line x1="12" y1="16" x2="12" y2="21"/></svg>';
var EDIT_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';

var EVENT_COLOR_NAMES={red:'#99651f',jade:'#66785f',gold:'#a2702d',blue:'#6d7781'};
function resolveColor(c){
  if (!c) return '#99651f';
  if (c.charAt(0)==='#') return c;
  return EVENT_COLOR_NAMES[c]||'#99651f';
}
function rowHTML(e){
  var n=e.days===0?'🎉':(e.days<0?-e.days:e.days);
  var unit=e.days===0?'hôm nay!':(e.days<0?'ngày đã qua':'ngày nữa');
  var lunarStr=fmtLunar(e.date.getDate(), e.date.getMonth()+1, e.date.getFullYear());
  var dateLine=fmtDate(e.date)+(e.lunar?'<span class="lunar-date">'+esc(e.lunar)+'</span>':'<span class="lunar-date">'+lunarStr+'</span>');
  var numColor=resolveColor(e.color||(e.raw&&e.raw.color));
  return '<article class="event-row" data-key="'+e.key+'">'+
    '<div class="event-copy">'+
      '<h3>'+esc(e.title)+'</h3>'+
      '<p class="event-date-line">'+dateLine+'</p>'+
      (e.detail?'<p class="event-detail">'+esc(e.detail)+'</p>':'')+
      '<div class="event-actions">'+
        '<button class="pill-btn'+(e.remind_me?' active':'')+'" data-act="remind">'+BELL_SVG+'Nhắc tôi</button>'+
        '<button class="pill-btn'+(e.pinned?' active':'')+'" data-act="pin">'+PIN_SVG+'Ghim</button>'+
      '</div>'+
    '</div>'+
    '<div class="event-end">'+
      '<strong style="color:'+numColor+'">'+n+'</strong><span>'+unit+'</span>'+
      '<button class="icon-button" data-act="edit" title="Sửa">'+EDIT_SVG+'</button>'+
    '</div>'+
  '</article>';
}

var PAGE_SIZE=10;
function renderList(events){
  var el=$('listView');
  $('calView').classList.add('hidden');
  el.classList.remove('hidden');
  if (!events.length){ el.innerHTML='<div class="empty">Không có sự kiện nào.</div>'; return; }
  var shown=state.showAll?events:events.slice(0,PAGE_SIZE);
  var html='', lastGroup='';
  shown.forEach(function(e){
    var g=e.pinned?'pinned':e.date.getFullYear()+'-'+e.date.getMonth();
    if (g!==lastGroup){
      lastGroup=g;
      html+= e.pinned
        ? '<div class="month-divider">Đã ghim</div>'
        : '<div class="month-divider">'+fmtMonthYear(e.date.getFullYear(),e.date.getMonth())+'</div>';
    }
    html+=rowHTML(e);
  });
  if (!state.showAll && events.length>PAGE_SIZE){
    html+='<button class="load-more" id="btnMore">Xem thêm '+(events.length-PAGE_SIZE)+' ngày</button>';
  }
  el.innerHTML=html;
  bindRows(el, events);
  var bm=$('btnMore');
  if (bm) bm.addEventListener('click', function(){ state.showAll=true; render(); });
}

function bindRows(el, events){
  var map={};
  events.forEach(function(e){ map[e.key]=e; });
  el.querySelectorAll('.event-row').forEach(function(row){
    row.addEventListener('click', function(ev){
      var btn=ev.target.closest('[data-act]');
      if (!btn) return;
      var e=map[row.dataset.key];
      if (!e) return;
      var act=btn.dataset.act;
      if (act==='pin') togglePin(e);
      else if (act==='remind') toggleRemind(e);
      else if (act==='edit') openEdit(e);
    });
  });
}

/* ---------- Lịch tháng ---------- */
var DOW=['CN','T2','T3','T4','T5','T6','T7'];
function renderCal(events){
  var now=new Date();
  if (state.calYear==null){ state.calYear=now.getFullYear(); state.calMonth=now.getMonth(); }
  var y=state.calYear, m=state.calMonth;
  // Tính sự kiện đúng cho tháng đang xem (kể cả năm tương lai)
  events=computeEventsForSolarMonth(y, m);
  $('listView').classList.add('hidden');
  $('calView').classList.remove('hidden');
  $('calTitle').textContent=fmtMonthYear(y,m);
  var byDay={};
  events.forEach(function(e){
    var k=e.date.getFullYear()+'-'+e.date.getMonth()+'-'+e.date.getDate();
    (byDay[k]=byDay[k]||[]).push(e);
  });
  var first=new Date(y,m,1), startDow=first.getDay();
  var daysIn=new Date(y,m+1,0).getDate(), prevDays=new Date(y,m,0).getDate();
  var html=DOW.map(function(d){ return '<div class="cal-dow">'+d+'</div>'; }).join('');
  var t=today();
  for (var i=startDow-1;i>=0;i--) html+='<button class="cal-day other" disabled>'+(prevDays-i)+'</button>';
  for (var d=1;d<=daysIn;d++){
    var k=y+'-'+m+'-'+d, cls='cal-day';
    if (y===t.getFullYear()&&m===t.getMonth()&&d===t.getDate()) cls+=' today';
    if (byDay[k]) cls+=' has-event';
    if (state.calSelected===k) cls+=' selected';
    html+='<button class="'+cls+'" data-k="'+k+'">'+d+(byDay[k]?'<span class="dot"></span>':'')+'</button>';
  }
  var tail=(7-(startDow+daysIn)%7)%7;
  for (var j=1;j<=tail;j++) html+='<button class="cal-day other" disabled>'+j+'</button>';
  var grid=$('calGrid');
  grid.innerHTML=html;
  grid.querySelectorAll('.cal-day[data-k]').forEach(function(b){
    b.addEventListener('click', function(){
      var k=b.dataset.k;
      state.calSelected=k;
      if (!byDay[k]){
        // Ngày trống: mở form thêm mới với ngày đã chọn
        var parts=k.split('-');
        var iso=parts[0]+'-'+('0'+(parseInt(parts[1])+1)).slice(-2)+'-'+('0'+parts[2]).slice(-2);
        openAdd(iso);
      } else {
        renderCal(events);
      }
    });
  });
  var dl=$('calDayList');
  if (state.calSelected && byDay[state.calSelected]){
    dl.innerHTML=byDay[state.calSelected].map(rowHTML).join('');
    bindRows(dl, events);
  } else dl.innerHTML='<div class="empty">Chạm vào ngày có chấm để xem sự kiện.</div>';
}
function renderLunarCal(events){
  var ly=state.lunarYear, lm=state.lunarMonth;
  $('listView').classList.add('hidden');
  $('calView').classList.remove('hidden');
  $('calTitle').textContent='Tháng '+lm+' năm '+ly+' âm lịch';
  // Tính ngày dương của mùng 1 tháng âm
  var solar=lunarToSolar(1, lm, ly, false, TZ);
  var sY=solar[2], sM=solar[1], sD=solar[0];
  var firstDow=new Date(sY, sM-1, sD).getDay();
  var daysIn=lunarMonthLength(lm, ly);
  // Tính sự kiện cho các tháng dương mà tháng âm này trải qua
  var byDay={};
  var seenMonths={};
  for (var dd=1; dd<=daysIn; dd++){
    var sd=lunarToSolar(dd, lm, ly, false, TZ);
    var mk=sd[2]+'-'+(sd[1]-1);
    if (!seenMonths[mk]){
      seenMonths[mk]=true;
      computeEventsForSolarMonth(sd[2], sd[1]-1).forEach(function(e){
        var k=e.date.getFullYear()+'-'+e.date.getMonth()+'-'+e.date.getDate();
        (byDay[k]=byDay[k]||[]).push(e);
      });
    }
  }
  var DOW=['CN','T2','T3','T4','T5','T6','T7'];
  var html=DOW.map(function(d){ return '<div class="cal-dow">'+d+'</div>'; }).join('');
  var t=today();
  for (var i=firstDow-1;i>=0;i--) html+='<button class="cal-day other" disabled></button>';
  for (var d=1;d<=daysIn;d++){
    var s=lunarToSolar(d, lm, ly, false, TZ);
    var k=s[2]+'-'+(s[1]-1)+'-'+s[0];
    var cls='cal-day';
    if (s[2]===t.getFullYear()&&(s[1]-1)===t.getMonth()&&s[0]===t.getDate()) cls+=' today';
    if (byDay[k]) cls+=' has-event';
    if (state.calSelected===k) cls+=' selected';
    html+='<button class="'+cls+'" data-k="'+k+'" data-lunar="'+d+'">'+d+'<span class="cal-solar">'+s[0]+'/'+s[1]+'</span>'+(byDay[k]?'<span class="dot"></span>':'')+'</button>';
  }
  var grid=$('calGrid');
  grid.innerHTML=html;
  grid.querySelectorAll('.cal-day[data-k]').forEach(function(b){
    b.addEventListener('click', function(){
      var k=b.dataset.k;
      state.calSelected=k;
      if (!byDay[k]){
        var parts=k.split('-');
        var iso=parts[0]+'-'+('0'+(parseInt(parts[1])+1)).slice(-2)+'-'+('0'+parts[2]).slice(-2);
        openAdd(iso);
      } else {
        render();
      }
    });
  });
  var dl=$('calDayList');
  if (state.calSelected && byDay[state.calSelected]){
    dl.innerHTML=byDay[state.calSelected].map(rowHTML).join('');
    bindRows(dl, events);
  } else dl.innerHTML='<div class="empty">Chạm vào ngày có chấm để xem sự kiện.</div>';
}

/* ---------- Ghim / Nhắc / Sửa / Xóa ---------- */
function togglePin(e){
  if (e.kind==='holiday') setCustom(e.holidayId,{pinned:!e.pinned});
  else db.collection('personal_events').doc(e.pid).update({pinned:!e.pinned});
}
function toggleRemind(e){
  if (e.kind==='holiday') setCustom(e.holidayId,{remind_me:!e.remind_me});
  else db.collection('personal_events').doc(e.pid).update({remind_me:!e.remind_me});
  toast(e.remind_me?'Đã tắt nhắc nhở':'Sẽ nhắc bạn trước sự kiện này');
}
function setCustom(holidayId, patch){
  var ref=db.collection('holiday_customizations').doc(holidayId);
  var cur=state.customs[holidayId]||{};
  ref.set(Object.assign({hidden:false,pinned:false,remind_me:false,title:null},cur,patch),{merge:true});
}
/* ---------- Dialogs ---------- */
var EVENT_COLORS=['#99651f','#66785f','#a2702d','#6d7781'];
var selectedColor='#99651f';
function renderColorRow(){
  var row=$('colorRow');
  row.innerHTML='';
  EVENT_COLORS.forEach(function(c){
    var d=document.createElement('div');
    d.className='color-dot'+(c===selectedColor?' selected':'');
    d.style.background=c;
    d.addEventListener('click',function(){ selectedColor=c; renderColorRow(); });
    row.appendChild(d);
  });
}
function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
document.querySelectorAll('.sheet-backdrop').forEach(function(bd){
  bd.addEventListener('click', function(ev){ if (ev.target===bd) bd.classList.add('hidden'); });
});
function openAdd(presetDate){
  state.editingId=null;
  $('dlgKicker').textContent='Ngày mới';
  $('dlgTitle').textContent='Thêm ngày đáng nhớ';
  $('dlgSave').textContent='Thêm vào lịch';
  $('fTitle').value=''; $('fDate').value=presetDate||''; $('fKind').value='birthday';
  $('fNote').value=''; $('fRepeat').checked=true;
  $('fPinned').checked=false; $('fRemind').checked=false;
  selectedColor=EVENT_COLORS[0]; renderColorRow();
  $('dlgDelete').classList.add('hidden');
  show('eventDialog');
  setTimeout(function(){ $('fTitle').focus(); },300);
}
function openEditPersonal(e){
  state.editingId=e.pid;
  var r=e.raw;
  $('dlgKicker').textContent='Chỉnh sửa';
  $('dlgTitle').textContent=r.title||'Sự kiện';
  $('dlgSave').textContent='Lưu thay đổi';
  $('fTitle').value=r.title||'';
  $('fDate').value=r.date||'';
  $('fKind').value=r.kind||'other';
  $('fNote').value=r.note||'';
  $('fRepeat').checked=!!r.repeats_annually;
  $('fPinned').checked=!!r.pinned;
  $('fRemind').checked=!!r.remind_me;
  selectedColor=r.color||EVENT_COLORS[0]; renderColorRow();
  $('dlgDelete').classList.remove('hidden');
  show('eventDialog');
}
function openEdit(e){
  if (e.kind==='holiday'){
    state.editingHoliday=e.holidayId;
    var c=state.customs[e.holidayId]||{};
    $('hSheetTitle').textContent=e.title;
    $('hTitle').value=e.title;
    $('hPinned').checked=!!c.pinned||!!e.pinned;
    $('hRemind').checked=!!c.remind_me||!!e.remind_me;
    show('holidayDialog');
  } else openEditPersonal(e);
}



var _saving=false;
function saveEvent(){
  if (_saving) return;
  var title=$('fTitle').value.trim(), date=$('fDate').value;
  if (!title||!date){ toast('Nhập tên và ngày nhé'); return; }
  _saving=true;
  var data={title:title, date:date, kind:$('fKind').value,
    note:$('fNote').value.trim(), repeats_annually:$('fRepeat').checked,
    color:selectedColor, pinned:$('fPinned').checked, remind_me:$('fRemind').checked};
  hide('eventDialog');
  var isNew=!state.editingId;
  toast(isNew?'Đang thêm...':'Đang lưu...');
  var p;
  if (state.editingId){
    p=db.collection('personal_events').doc(state.editingId).update(data);
  } else {
    data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
    p=db.collection('personal_events').add(data);
  }
  p.then(function(){ toast(isNew?'Đã thêm':'Đã lưu'); })
   .catch(function(err){ toast('Lỗi: '+(err.message||'không rõ')); })
   .finally(function(){ _saving=false; });
}

function deleteEvent(){
  if (!state.editingId) return;
  hide('eventDialog');
  toast('Đang xóa...');
  db.collection('personal_events').doc(state.editingId).delete()
    .then(function(){ toast('Đã xóa'); })
    .catch(function(err){ toast('Lỗi xóa: ' + (err.message || 'không rõ')); });
}

function saveHoliday(){
  var t=$('hTitle').value.trim();
  if (!state.editingHoliday) return;
  setCustom(state.editingHoliday,{title:t||undefined,
    pinned:$('hPinned').checked, remind_me:$('hRemind').checked});
  hide('holidayDialog'); toast('Đã lưu');
}

function deleteHoliday(){
  if (!state.editingHoliday) return;
  setCustom(state.editingHoliday,{hidden:true});
  hide('holidayDialog'); toast('Đã ẩn');
}


/* ---------- Tabs / View / Menu ---------- */
document.querySelectorAll('#tabs button').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('#tabs button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    state.tab=b.dataset.tab;
    state.showAll=false;
    render();
  });
});
$('btnList').addEventListener('click', function(){
  state.view='list';
  this.classList.add('active'); $('btnCal').classList.remove('active');
  render();
});
$('btnCal').addEventListener('click', function(){
  state.view='cal';
  this.classList.add('active'); $('btnList').classList.remove('active');
  render();
});
$('calPrev').addEventListener('click', function(){
  if (state.lunarCal){
    state.lunarMonth--; if (state.lunarMonth<1){ state.lunarMonth=12; state.lunarYear--; }
  } else {
    state.calMonth--; if (state.calMonth<0){ state.calMonth=11; state.calYear--; }
  }
  state.calSelected=null; render();
});
$('calNext').addEventListener('click', function(){
  if (state.lunarCal){
    state.lunarMonth++; if (state.lunarMonth>12){ state.lunarMonth=1; state.lunarYear++; }
  } else {
    state.calMonth++; if (state.calMonth>11){ state.calMonth=0; state.calYear++; }
  }
  state.calSelected=null; render();
});
/* ---------- Sao lưu / Khôi phục ---------- */
$('bCancel').addEventListener('click', function(){ hide('backupDialog'); });
$('btnExport').addEventListener('click', function(){
  db.collection('personal_events').get().then(function(ps){
    db.collection('holiday_customizations').get().then(function(hs){
      var data={app:'dem-nguoc-firebase',exportedAt:new Date().toISOString(),
        personal_events:[],holiday_customizations:{}};
      ps.forEach(function(d){ var o=d.data(); o._id=d.id; delete o.createdAt;
        data.personal_events.push(o); });
      hs.forEach(function(d){ data.holiday_customizations[d.id]=d.data(); });
      var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='dem-nguoc-backup-'+new Date().toISOString().slice(0,10)+'.json';
      a.click(); URL.revokeObjectURL(a.href);
      toast('Đã xuất file sao lưu');
    });
  });
});
$('fileImport').addEventListener('change', function(){
  var f=this.files[0]; if (!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    try {
      var data=JSON.parse(rd.result);
      if (!data.personal_events && !data.holiday_customizations) throw 0;
      if (!confirm('Khôi phục sẽ THÊM '+(data.personal_events||[]).length+
        ' sự kiện và ghi đè tùy chỉnh ngày lễ. Tiếp tục?')) return;
      var batch=db.batch();
      (data.personal_events||[]).forEach(function(e){
        var id=e._id||db.collection('personal_events').doc().id;
        delete e._id; delete e.createdAt;
        batch.set(db.collection('personal_events').doc(id),e,{merge:true});
      });
      Object.keys(data.holiday_customizations||{}).forEach(function(k){
        batch.set(db.collection('holiday_customizations').doc(k),
          data.holiday_customizations[k],{merge:true});
      });
      batch.commit().then(function(){ hide('backupDialog'); toast('Khôi phục xong'); });
    } catch(e){ toast('File không hợp lệ'); }
  };
  rd.readAsText(f);
  this.value='';
});
