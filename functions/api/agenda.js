// Cloudflare Pages Function: lê o Google Agenda (conta de serviço, somente leitura) e devolve APENAS as datas ocupadas.
// Nomes de clientes, locais e demais detalhes dos eventos nunca saem daqui.
const TZ = 'America/Sao_Paulo';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const enc = new TextEncoder();
const b64u = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); };

function addDay(ymd, n = 1) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

export function computeBooked(items, filter) {
  const words = (filter || []).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const out = new Set();
  for (const ev of items || []) {
    if (!ev || ev.status === 'cancelled' || !ev.start || ev.transparency === 'transparent') continue;
    if (words.length) {
      const text = ((ev.summary || '') + ' ' + (ev.location || '')).toLowerCase();
      if (!words.some((w) => text.includes(w))) continue;
    }
    let first, last;
    if (ev.start.date) {
      first = ev.start.date;
      last = ev.end && ev.end.date ? addDay(ev.end.date, -1) : first;
    } else if (ev.start.dateTime) {
      const s = new Date(ev.start.dateTime), e = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : s;
      if (isNaN(s) || isNaN(e)) continue;
      first = dayFmt.format(s);
      last = dayFmt.format(e > s ? new Date(e.getTime() - 1) : s);
    } else continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(last)) continue;
    for (let d = first, n = 0; d <= last && n < 400; d = addDay(d), n++) out.add(d);
  }
  return [...out].sort();
}

async function signKey(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64), der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function accessToken(email, pem) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64u(enc.encode(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/calendar.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signKey(pem), enc.encode(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + b64u(sig) }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  return (await r.json()).access_token;
}

async function fetchEvents(calId, token) {
  const from = new Date(); from.setDate(from.getDate() - 1);
  const to = new Date(); to.setMonth(to.getMonth() + 12);
  let items = [], page = '';
  for (let i = 0; i < 6; i++) {
    const q = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeMin: from.toISOString(), timeMax: to.toISOString(), fields: 'nextPageToken,items(start,end,status,transparency,summary,location)' });
    if (page) q.set('pageToken', page);
    const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events?' + q, { headers: { authorization: 'Bearer ' + token } });
    if (!r.ok) throw new Error('events ' + r.status);
    const j = await r.json(); items = items.concat(j.items || []);
    if (!j.nextPageToken) break; page = j.nextPageToken;
  }
  return items;
}

const H = { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' };
const json = (obj, status, cache) => new Response(JSON.stringify(obj), { status, headers: { ...H, 'cache-control': cache || 'no-store' } });

export async function onRequestGet({ request, env }) {
  const email = env.GCAL_CLIENT_EMAIL, key = (env.GCAL_PRIVATE_KEY || '').replace(/\\n/g, '\n'), cal = env.GCAL_CALENDAR_ID;
  if (!email || !key || !cal) return json({ erro: 'nao-configurado' }, 503);
  const cacheKey = new Request(new URL('/api/agenda', request.url).toString(), { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) { const hit = await cache.match(cacheKey); if (hit) return hit; }
  try {
    const items = await fetchEvents(cal, await accessToken(email, key));
    const res = json({ booked: computeBooked(items, (env.GCAL_FILTER || '').split(',')) }, 200, 'public, max-age=300');
    if (cache) await cache.put(cacheKey, res.clone());
    return res;
  } catch (e) {
    return json({ erro: 'indisponivel' }, 502);
  }
}
export async function onRequest({ request, env }) {
  if (request.method === 'GET' || request.method === 'HEAD') return onRequestGet({ request, env });
  return json({ erro: 'metodo' }, 405);
}
