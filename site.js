(function(){"use strict";
(function pageFx(){
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    var h=a.getAttribute("href")||"";if(a.target||!/^[\w-]+\.html(#.*)?$/.test(h))return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    e.preventDefault();document.documentElement.classList.add("leaving");
    setTimeout(function(){window.location.href=a.href},230);
    setTimeout(function(){document.documentElement.classList.remove("leaving")},1800);
  });
  window.addEventListener("pageshow",function(){document.documentElement.classList.remove("leaving")});
})();


var $=function(s){return document.querySelector(s)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
function safeUrl(u){u=String(u==null?'':u).trim();return /^https?:\/\//i.test(u)?u:(/^[\w\-\/.]+\.(jpe?g|png|webp|gif|mp4|webm|avif)$/i.test(u)?u:'')}
function safeLink(u){u=String(u==null?'':u).trim();return /^https?:\/\//i.test(u)?u:'#'}
function waNum(v){var d=String(v||'').replace(/\D/g,'');return d.length<=11?'55'+d:d}
function waFmt(v){var d=String(v||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');return d.length===11?'('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7):d.length===10?'('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6):String(v)}
function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}

function renderVideos(box,tipo,g){
  if(!box)return;
  var list=VIDEOS.filter(function(v){return !tipo||!v.tipo||v.tipo===tipo});
  if(!list.length){
    box.innerHTML='<div class="vid" style="--g:'+esc(g||'')+'"><span class="play"></span><span class="cap"><strong>Vídeos em breve</strong><span>Cobertura em vídeo</span></span></div>';return;
  }
  box.innerHTML=list.map(function(v){
    if(v.src)return '<div class="vid hasv"><video controls preload="metadata" playsinline'+(safeUrl(v.poster)?' poster="'+esc(safeUrl(v.poster))+'"':'')+' src="'+esc(safeUrl(v.src))+'"></video></div>';
    return '<a class="vid" href="'+esc(safeLink(v.url))+'" target="_blank" rel="noopener" style="--g:'+esc(g||'')+'">'+(safeUrl(v.poster)?'<img src="'+esc(safeUrl(v.poster))+'" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'')+'<span class="play"></span><span class="cap"><strong>'+esc(v.titulo||'Assistir')+'</strong><span>'+esc(v.tipo||'Vídeo')+'</span></span></a>';
  }).join('');
}

(function gcalProxy(){
  var g=CONFIG.gcal;if(!g||!g.endpoint||!/^\/[\w\-\/]*$/.test(g.endpoint))return;
  fetch(g.endpoint,{credentials:'omit'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
    (j&&j.booked||[]).forEach(function(k){if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&BOOKED.indexOf(k)<0)BOOKED.push(k)});
    document.dispatchEvent(new Event('booked'));
  }).catch(function(){/* sem conexão com a agenda: o calendário continua com as datas manuais */});
})();
(function gcal(){
  var g=CONFIG.gcal;if(!g||!g.calendarId||!g.apiKey)return;
  var t0=new Date(),from=new Date(t0.getFullYear(),t0.getMonth(),1),to=new Date(t0.getFullYear(),t0.getMonth()+12,1);
  var url='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(g.calendarId)+'/events?singleEvents=true&orderBy=startTime&maxResults=2500&fields=items(start,end,status,transparency)'+
    '&timeMin='+encodeURIComponent(from.toISOString())+'&timeMax='+encodeURIComponent(to.toISOString())+'&key='+encodeURIComponent(g.apiKey);
  fetch(url).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
    (j.items||[]).forEach(function(ev){
      if(ev.status==='cancelled'||!ev.start||ev.transparency==='transparent')return;
      var s=ev.start.date?new Date(ev.start.date+'T00:00:00'):new Date(ev.start.dateTime);
      var e=ev.end?(ev.end.date?new Date(ev.end.date+'T00:00:00'):new Date(ev.end.dateTime)):s;
      if(isNaN(s)||isNaN(e))return;
      var d=new Date(s.getFullYear(),s.getMonth(),s.getDate()),last=e>s?new Date(e.getTime()-1):s;
      for(var n=0;d<=last&&n<400;n++){var k=ymd(d);if(BOOKED.indexOf(k)<0)BOOKED.push(k);d.setDate(d.getDate()+1)}
    });
    document.dispatchEvent(new Event('booked'));
  }).catch(function(){/* sem conexão com a agenda: o calendário continua com as datas manuais */});
})();

(function contacts(){
  var box=$('#ct');if(!box)return;
  var rows=[];
  if(CONFIG.whatsapp)rows.push(['WhatsApp','<a href="https://wa.me/'+esc(waNum(CONFIG.whatsapp))+'" target="_blank" rel="noopener">'+esc(waFmt(CONFIG.whatsapp))+'</a>']);
  if(CONFIG.instagram)rows.push(['Instagram','<a href="https://instagram.com/'+encodeURIComponent(CONFIG.instagram.replace('@',''))+'" target="_blank" rel="noopener">@'+esc(CONFIG.instagram.replace('@',''))+'</a>']);
  if(CONFIG.email)rows.push(['E-mail','<span>'+esc(CONFIG.email)+'</span>']);
  if(CONFIG.cidade)rows.push(['Atendimento','<span>'+esc(CONFIG.cidade)+'</span>']);
  if(!rows.length){var c=$('#contact');if(c)c.hidden=true;var q=$('.quote');if(q)q.style.gridTemplateColumns='minmax(0,1fr)';return}
  box.innerHTML=rows.map(function(r){return '<div><small>'+r[0]+'</small>'+r[1]+'</div>'}).join('');
})();

(function quote(){
  var f=$('#qf');if(!f)return;
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var err=$('#q-err');err.textContent='';
    var v=function(id){return $(id).value.trim()};
    if(!v('#q-nome')||!v('#q-zap')){err.textContent='Preencha seu nome e um contato para eu poder responder.';return}
    var dt=v('#q-data'),ds='a combinar';if(dt){var a=dt.split('-');ds=a[2]+'/'+a[1]+'/'+a[0]}
    var msg='Olá, Nathã! Vim pelo site da NSMuniz Fotografia e gostaria de um orçamento.\n\nNome: '+v('#q-nome')+'\nContato: '+v('#q-zap')+
      '\nEvento: '+$('#q-tipo').value+'\nCobertura: '+$('#q-cob').value+'\nData prevista: '+ds+'\nLocal: '+(v('#q-local')||'a combinar')+(v('#q-msg')?'\n\nDetalhes: '+v('#q-msg'):'');
    $('#q-text').textContent=msg;$('#q-out').hidden=false;
    var wa=$('#q-wa');
    if(CONFIG.whatsapp){wa.href='https://wa.me/'+waNum(CONFIG.whatsapp)+'?text='+encodeURIComponent(msg);wa.hidden=false;$('#q-hint').textContent='Escolha WhatsApp ou e-mail para abrir a conversa com a mensagem pronta. Se nada abrir, use Copiar mensagem.'}
    else{wa.hidden=true;$('#q-hint').textContent='Copie a mensagem e envie para mim pelo canal de contato que preferir.'}
    var ml=$('#q-mail');if(CONFIG.email){ml.href='mailto:'+CONFIG.email+'?subject='+encodeURIComponent('Pedido de orçamento - '+$('#q-tipo').value)+'&body='+encodeURIComponent(msg);ml.hidden=false}
    $('#q-out').scrollIntoView({block:'nearest',behavior:'smooth'});
  });
  $('#q-copy').addEventListener('click',function(){
    var t=$('#q-text').textContent,b=$('#q-copy');
    function sel(){var r=document.createRange();r.selectNodeContents($('#q-text'));var s=window.getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selecionada, copie com o teclado'}
    try{navigator.clipboard.writeText(t).then(function(){b.textContent='Mensagem copiada'},sel)}catch(x){sel()}
  });
  var d=$('#q-data');
  if(d)d.addEventListener('change',function(e){
    if(BOOKED.indexOf(e.target.value)>=0){$('#q-err').textContent='Essa data já está ocupada. Escolha outra.';e.target.value=''}else $('#q-err').textContent='';
  });
})();

if(document.body.getAttribute("data-page")==="home"){(function(){
(function hero(){
  var box=$('#hbg');if(!box)return;
  var imgs=(typeof HERO!=='undefined'&&HERO||[]).map(function(h){return safeUrl(h&&h.src)}).filter(Boolean);
  var grads=['linear-gradient(135deg,#2D4F80,#14233D)','linear-gradient(135deg,#566B88,#1B2A44)','linear-gradient(135deg,#6E6254,#1F2A3C)','linear-gradient(135deg,#3C607A,#101C2E)'];
  var els=(imgs.length?imgs:grads).map(function(v,i){var d=document.createElement('div');d.className='sl';
    if(imgs.length)d.style.backgroundImage='url("'+v.replace(/"/g,'%22')+'")';else d.style.background=v;box.appendChild(d);return d});
  var cur=0;els[0].classList.add('on');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(els.length<2||reduce)return;
  setInterval(function(){if(document.hidden)return;els[cur].classList.remove('on');cur=(cur+1)%els.length;els[cur].classList.add('on')},6500);
})();
var PACKAGES=[
  {nome:'Ensaios',de:null,ate:null,itens:['Sessão ao ar livre em local combinado','Individual, casal ou família','Fotos tratadas para entrega']},
  {nome:'Festas e eventos',de:null,ate:null,itens:['Infantil, 15 anos, aniversário ou corporativo','Cobertura no período combinado','Fotos tratadas para entrega']},
  {nome:'Casamentos',de:null,ate:null,itens:['Cerimônia e festa','Conversa de planejamento antes do dia','Fotos tratadas para entrega']},
  {nome:'Viagens',de:null,ate:null,itens:['Cobertura durante a viagem','Roteiro definido com você','Fotos tratadas para entrega']},
  {nome:'Vídeo do evento',de:null,ate:null,itens:['Cobertura em vídeo do seu evento','Pode ser combinada com as fotos','Formato e duração definidos no orçamento']}
];  /* de / ate: valores em reais; deixe null para mostrar 'Valor sob orçamento' */
var TESTIMONIALS=[]; /* {texto:'...', autor:'Nome, tipo de evento'} */
var brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
$('#pk').innerHTML=PACKAGES.map(function(p){
  var price=p.de&&p.ate?'De '+brl.format(p.de)+' a '+brl.format(p.ate):p.de?'A partir de '+brl.format(p.de):'Valor sob orçamento';
  return '<div class="card"><h3>'+esc(p.nome)+'</h3><div class="price">'+esc(price)+'</div><ul>'+p.itens.map(function(i){return '<li>'+esc(i)+'</li>'}).join('')+'</ul></div>';
}).join('');
if(TESTIMONIALS.length){
  $('#depoimentos').hidden=false;
  $('#quotes').innerHTML=TESTIMONIALS.map(function(t){return '<blockquote><q>'+esc(t.texto)+'</q><cite>'+esc(t.autor)+'</cite></blockquote>'}).join('');
}
renderVideos($('#vids'),null,'linear-gradient(150deg,#2A3646,#12171D)');

var today=new Date();today.setHours(0,0,0,0);
var view=new Date(today.getFullYear(),today.getMonth(),1),selected='';
function renderCal(){
  var first=new Date(view.getFullYear(),view.getMonth(),1),last=new Date(view.getFullYear(),view.getMonth()+1,0);
  var minV=new Date(today.getFullYear(),today.getMonth(),1),maxV=new Date(today.getFullYear(),today.getMonth()+12,1);
  var h='<div class="cal-h"><button type="button" id="c-prev" aria-label="Mês anterior"'+(view<=minV?' disabled':'')+'>‹</button><strong>'+esc(first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}))+'</strong><button type="button" id="c-next" aria-label="Próximo mês"'+(view>=maxV?' disabled':'')+'>›</button></div>';
  h+='<div class="dow">'+['D','S','T','Q','Q','S','S'].map(function(x){return '<span>'+x+'</span>'}).join('')+'</div><div class="days">';
  for(var i=0;i<first.getDay();i++)h+='<span class="d blank"></span>';
  for(var d=1;d<=last.getDate();d++){
    var dt=new Date(view.getFullYear(),view.getMonth(),d),k=ymd(dt),past=dt<today,bk=BOOKED.indexOf(k)>=0;
    h+='<button type="button" class="d'+(bk?' booked':'')+(k===selected?' sel':'')+'" data-d="'+k+'"'+((past||bk)?' disabled':'')+' aria-label="'+d+' de '+esc(first.toLocaleDateString('pt-BR',{month:'long'}))+(bk?', ocupado':past?'':', livre')+'">'+d+'</button>';
  }
  h+='</div><div class="legend"><span><i style="background:var(--free)"></i>Livre</span><span><i style="background:var(--accent)"></i>Escolhida</span><span><i style="border:1px solid var(--line)"></i>Ocupada ou passada</span></div>';
  $('#cal').innerHTML=h;
}
function setDate(k){
  selected=k;var p=k.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);
  $('#pick-date').textContent=d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#q-data').value=k;renderCal();
}
$('#cal').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  if(b.id==='c-prev'){view=new Date(view.getFullYear(),view.getMonth()-1,1);renderCal()}
  else if(b.id==='c-next'){view=new Date(view.getFullYear(),view.getMonth()+1,1);renderCal()}
  else if(b.dataset.d)setDate(b.dataset.d);
});
$('#q-data').addEventListener('change',function(e){var k=e.target.value;if(!k||BOOKED.indexOf(k)>=0)return;var p=k.split('-');view=new Date(+p[0],+p[1]-1,1);setDate(k)});
renderCal();
document.addEventListener('booked',renderCal);
})()}else{(function(){
var NICHO=JSON.parse(document.body.getAttribute("data-nicho"));
(function gallery(){
  var list=(PHOTOS[NICHO.slug]||[]).filter(function(p){return safeUrl(p.src)});
  var box=$('#gal'),n=Math.max(list.length,0);
  if(!n){
    box.innerHTML=Array.from({length:6}).map(function(_,i){return '<div class="ph'+(i===0?' w':'')+'" style="--g:'+esc(NICHO.g)+'"><span>Fotos em breve</span></div>'}).join('');return;
  }
  box.innerHTML=list.map(function(p,i){return '<button class="ph" type="button" data-i="'+i+'" aria-label="Ampliar foto '+(i+1)+'"><img src="'+esc(p.src)+'" alt="'+esc(p.alt||NICHO.nome)+'" loading="lazy"></button>'}).join('');
  var cur=0,lb=null;
  function show(i){cur=(i+n)%n;lb.querySelector('img').src=safeUrl(list[cur].src);lb.querySelector('img').alt=list[cur].alt||NICHO.nome}
  function close(){if(lb){lb.remove();lb=null;document.removeEventListener('keydown',key)}}
  function key(e){if(e.key==='Escape')close();else if(e.key==='ArrowRight')show(cur+1);else if(e.key==='ArrowLeft')show(cur-1)}
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-i]');if(!b)return;
    lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');
    lb.innerHTML='<img alt=""><button type="button" class="cl">Fechar</button>'+(n>1?'<button type="button" class="pv" aria-label="Anterior">‹</button><button type="button" class="nx" aria-label="Próxima">›</button>':'');
    document.body.appendChild(lb);show(+b.dataset.i);document.addEventListener('keydown',key);
    lb.addEventListener('click',function(ev){var t=ev.target;if(t===lb||t.classList.contains('cl'))close();else if(t.classList.contains('pv'))show(cur-1);else if(t.classList.contains('nx'))show(cur+1)});
    lb.querySelector('.cl').focus();
  });
})();
renderVideos($('#vids'),NICHO.tipo,NICHO.g);
})()}})();
