// Função do Vercel: lê o Google Agenda (conta de serviço, somente leitura) e devolve APENAS as datas ocupadas.
// Nomes de clientes, locais e demais detalhes dos eventos nunca saem daqui.
const crypto = require('crypto');
const TZ = 'America/Sao_Paulo';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function localDay(dt) { return dayFmt.format(dt); }
function addDay(ymd) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

// items: eventos do Google. filter: lista de palavras (vazia = todos os eventos contam).
function computeBooked(items, filter) {
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
      last = ev.end && ev.end.date ? ev.end.date : addDay(first);
      last = ev.end && ev.end.date ? (() => { const d = new Date(ev.end.date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })() : first;
    } else if (ev.start.dateTime) {
      const s = new Date(ev.start.dateTime), e = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : s;
      if (isNaN(s) || isNaN(e)) continue;
      first = localDay(s);
      last = localDay(e > s ? new Date(e.getTime() - 1) : s);
    } else continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(last)) continue;
    for (let d = first, n = 0; d <= last && n < 400; d = addDay(d), n++) out.add(d);
  }
  return [...out].sort();
}

async function accessToken(email, key) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/calendar.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(key);
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

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end('{"erro":"metodo"}'); }
  const email = process.env.GCAL_CLIENT_EMAIL, key = (process.env.GCAL_PRIVATE_KEY || '').replace(/\\n/g, '\n'), cal = process.env.GCAL_CALENDAR_ID;
  if (!email || !key || !cal) { res.statusCode = 503; return res.end('{"erro":"nao-configurado"}'); }
  try {
    const items = await fetchEvents(cal, await accessToken(email, key));
    const booked = computeBooked(items, (process.env.GCAL_FILTER || '').split(','));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.statusCode = 200; res.end(JSON.stringify({ booked }));
  } catch (e) {
    res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); res.end('{"erro":"indisponivel"}');
  }
}
module.exports = handler;
module.exports.computeBooked = computeBooked;
