// Hẹn giờ — chạy trên GitHub Actions mỗi 5 phút.
// Đọc tasks.json, task nào đến lịch thì thực thi.
import { readFileSync } from 'fs';

const WINDOW_MIN = 5; // workflow chạy mỗi 5 phút → kiểm tra 5 phút vừa qua

// Lấy các thành phần thời gian theo timezone
function tzParts(date, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', weekday: 'short',
    }).formatToParts(date).map(x => [x.type, x.value])
  );
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minute: +p.minute, hour: +p.hour === 24 ? 0 : +p.hour,
    dom: +p.day, month: +p.month, dow: dowMap[p.weekday],
  };
}

function fieldMatch(expr, val, min, max) {
  expr = expr.trim();
  if (expr === '*') return true;
  return expr.split(',').some(part => {
    let step = 1, range = part;
    if (part.includes('/')) { const s = part.split('/'); range = s[0]; step = +s[1] || 1; }
    let lo = min, hi = max;
    if (range !== '*') {
      if (range.includes('-')) { const r = range.split('-'); lo = +r[0]; hi = +r[1]; }
      else { lo = hi = +range; }
    }
    for (let v = lo; v <= hi; v += step) if (v === val) return true;
    return false;
  });
}

function cronMatch(cron, parts) {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return false;
  return fieldMatch(f[0], parts.minute, 0, 59) &&
         fieldMatch(f[1], parts.hour, 0, 23) &&
         fieldMatch(f[2], parts.dom, 1, 31) &&
         fieldMatch(f[3], parts.month, 1, 12) &&
         fieldMatch(f[4], parts.dow, 0, 6);
}

// Task có đến lịch trong WINDOW_MIN phút vừa qua không?
function isDue(task, now) {
  const tz = task.timezone || 'Asia/Ho_Chi_Minh';
  for (let i = 0; i < WINDOW_MIN; i++) {
    const d = new Date(now.getTime() - i * 60000);
    if (cronMatch(task.cron, tzParts(d, tz))) return true;
  }
  return false;
}

// Thay $TEN_BIEN bằng giá trị env (dùng cho secrets)
function expandEnv(s) {
  if (!s) return s;
  return String(s).replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, k) => process.env[k] ?? '');
}

async function callHttp(a) {
  const url = expandEnv(a.url);
  const method = (a.method || 'GET').toUpperCase();
  const headers = {};
  for (const [k, v] of Object.entries(a.headers || {})) headers[k] = expandEnv(v);
  const bodyRaw = expandEnv(a.body || '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: (method === 'GET' || method === 'HEAD' || !bodyRaw) ? undefined : bodyRaw,
      signal: ctrl.signal,
    });
    await res.text().catch(() => '');
    return { ok: res.status >= 200 && res.status < 400, info: 'HTTP ' + res.status };
  } catch (e) {
    return { ok: false, info: 'Lỗi: ' + (e.message || e) };
  } finally { clearTimeout(t); }
}

async function notify(webhook, text) {
  if (!webhook) return;
  try {
    await fetch(expandEnv(webhook), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (e) { console.log('  (không gửi được webhook:', e.message + ')'); }
}

async function main() {
  const cfg = JSON.parse(readFileSync(new URL('./tasks.json', import.meta.url), 'utf8'));
  const now = new Date();
  console.log('Chạy lúc (UTC):', now.toISOString());
  let ran = 0;
  for (const t of cfg.tasks || []) {
    if (!t.enabled) continue;
    if (!isDue(t, now)) continue;
    ran++;
    console.log(`▶ ${t.name}`);
    let ok = true, info = '';
    try {
      const a = t.action || {};
      if (a.type === 'http') ({ ok, info } = await callHttp(a));
      else if (a.type === 'notify') { info = a.message || 'Đến giờ'; }
      else { info = 'Loại không hỗ trợ trên server: ' + a.type; ok = false; }
    } catch (e) { ok = false; info = 'Lỗi: ' + (e.message || e); }
    console.log(`  ${ok ? '✓' : '✗'} ${info}`);
    if (t.notify_webhook) await notify(t.notify_webhook, `${ok ? '⏰' : '⚠️'} ${t.name}: ${info}`);
  }
  console.log(ran ? `Xong: ${ran} tác vụ.` : 'Không có tác vụ nào đến lịch.');
}

main().catch(e => { console.error(e); process.exit(1); });
