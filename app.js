const KEY='na-chit-lekkalu-v2';
let db=loadDB(), page='home';
function loadDB(){try{return JSON.parse(localStorage.getItem(KEY))||{chits:[],members:[],payments:[]}}catch(e){return {chits:[],members:[],payments:[]}}}
async function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
  render();
  try {
    if(window.chitSupabaseClient && window.chitCurrentUser) {
      const {error}=await window.chitSupabaseClient.from('chit_cloud_data').upsert(
        {user_id:window.chitCurrentUser.id,data:db,updated_at:new Date().toISOString()},
        {onConflict:'user_id'}
      );
      if(error) throw error;
      toast('బ్రౌజర్‌లో మరియు క్లౌడ్‌లో సేవ్ అయింది');
    } else toast('బ్రౌజర్‌లో సేవ్ అయింది — క్లౌడ్ లాగిన్ లేదు');
  } catch(e) {
    console.error('Cloud save failed',e);
    toast('బ్రౌజర్‌లో సేవ్ అయింది; క్లౌడ్ సేవింగ్ కాలేదు. ఇంటర్నెట్ / Supabase సెట్టింగులు చూడండి.');
  }
}
async function syncCloudData(){
  const client=window.chitSupabaseClient, user=window.chitCurrentUser;
  if(!client||!user) throw new Error('లాగిన్ యూజర్ లేదా Supabase కనెక్షన్ లేదు.');
  const {data:row,error}=await client.from('chit_cloud_data').select('data').eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  const local=loadDB();
  if(row && row.data && typeof row.data==='object') {
    const cloud=row.data;
    const cloudHasData=(cloud.chits||[]).length+(cloud.members||[]).length+(cloud.payments||[]).length>0;
    const localHasData=(local.chits||[]).length+(local.members||[]).length+(local.payments||[]).length>0;
    if(!cloudHasData && localHasData) {
      const {error:upsertError}=await client.from('chit_cloud_data').upsert({user_id:user.id,data:local,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(upsertError) throw upsertError;
      db=local;
      toast('మీ పాత డేటా క్లౌడ్‌లో సేవ్ అయింది');
    } else {
      db={chits:Array.isArray(cloud.chits)?cloud.chits:[],members:Array.isArray(cloud.members)?cloud.members:[],payments:Array.isArray(cloud.payments)?cloud.payments:[]};
      toast('Supabase క్లౌడ్ డేటా లోడ్ అయింది');
    }
  } else {
    const {error:upsertError}=await client.from('chit_cloud_data').upsert({user_id:user.id,data:local,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(upsertError) throw upsertError;
    db=local;
    toast('మీ పాత బ్రౌజర్ డేటా Supabase క్లౌడ్‌లో సేవ్ అయింది');
  }
  localStorage.setItem(KEY,JSON.stringify(db));
  render();
}
window.chitSyncCloudData=syncCloudData;
function toast(s){let t=document.getElementById('toast');t.textContent=s;t.style.display='block';setTimeout(()=>t.style.display='none',2300)}
function money(n){return '₹'+(Number(n)||0).toLocaleString('en-IN')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function monthNow(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function monthLabel(m){if(!m)return '';let [y,mo]=m.split('-');return new Date(+y,+mo-1,1).toLocaleDateString('te-IN',{month:'long',year:'numeric'})}
function uid(prefix){return prefix+Date.now().toString().slice(-7)+Math.random().toString(36).slice(2,4).toUpperCase()}
function chit(id){return db.chits.find(x=>x.id===id)}
function member(id){return db.members.find(x=>x.id===id)}
function paidFor(mid,mo){return db.payments.find(p=>p.memberId===mid&&p.month===mo)}
function dueFor(m,mo){let c=chit(m.chitId);if(!c)return 0;let taken=m.takenMonth;return taken&&mo>taken?Number(c.afterRate):Number(c.beforeRate)}
function allMonths(from,to){let out=[];if(!from||!to||from>to)return out;let [y,m]=from.split('-').map(Number),[ey,em]=to.split('-').map(Number);while(y<ey||(y===ey&&m<=em)){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m===13){m=1;y++}if(out.length>240)break}return out}
function totalDue(m,upto=monthNow()){let c=chit(m.chitId);if(!c||!m.joinMonth)return 0;return allMonths(m.joinMonth,upto).reduce((s,mo)=>s+(paidFor(m.id,mo)?.amount||0)-dueFor(m,mo),0)*-1}
function totals(){let dues=0,paid=0;db.members.forEach(m=>{let c=chit(m.chitId);if(!c||!m.joinMonth)return;allMonths(m.joinMonth,monthNow()).forEach(mo=>{dues+=dueFor(m,mo);paid+=Number(paidFor(m.id,mo)?.amount||0)})});return {dues,paid,arrears:Math.max(0,dues-paid)}}
function head(title,button=''){return `<div class="pageHead"><h2>${title}</h2>${button}</div>`}
function stat(label,num,color,action=''){
  return `<div class="stat ${color}" ${action?`data-stat="${action}" role="button" tabindex="0"`:''}>
    <div class="label">${label}</div>
    <div class="num">${num}</div>
  </div>`;
}
function render(){document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));let root=document.getElementById('app');root.innerHTML=({home:homePage,chits:chitsPage,members:membersPage,payments:paymentsPage,reports:reportsPage,whatsapp:whatsappPage,backup:backupPage}[page]||homePage)();wire()}

function homePage(){
  const mo=window.reportMonth||monthNow();
  const cid=window.reportChit||'';
  const rows=reportRows('monthly',mo,cid);
  const paid=rows.reduce((s,r)=>s+r.paid,0);
  const arrears=rows.reduce((s,r)=>s+r.balance,0);

  return `${head('హోమ్ పేజీ',`<button class="primary" data-go="chits">＋ కొత్త చిట్</button>`)}
  <div class="panel">
    <div class="filters">
      <div class="field">
        <label>నెల ఎంచుకోండి</label>
        <input class="filter" type="month" id="homeMonth" value="${mo}">
      </div>
      <div class="field">
        <label>చిట్ ఎంచుకోండి</label>
        <select class="filter" id="homeChit">
          <option value="">అన్ని చిట్లు</option>
          ${db.chits.map(c=>`<option value="${c.id}" ${cid===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="small">నెల, చిట్ ఎంచుకుంటే ఆ నెల లెక్కలు మాత్రమే కనిపిస్తాయి.</p>
  </div>
  <div class="cards">
    ${stat('మొత్తం చిట్లు',db.chits.length,'blue','chits')}
    ${stat('మొత్తం సభ్యులు',db.members.length,'green','members')}
    ${stat('నెలవారీ వసూళ్లు',money(paid),'orange','collections')}
    ${stat('నెలవారీ బకాయిలు',money(arrears),'red','dues')}
  </div>
  <div class="panel">
    <h3>త్వరిత పనులు</h3>
    <div class="actions">
      <button class="primary" data-go="members">＋ కొత్త సభ్యుడు</button>
      <button class="secondary" data-go="payments">✓ నెలవారీ వసూళ్లు నమోదు</button>
      <button class="secondary" data-go="whatsapp">🟢 WhatsApp రిమైండర్</button>
    </div>
  </div>
  <div class="panel">
    <h3>ఇటీవలి చెల్లింపులు</h3>
    ${db.payments.length?`<div class="tablewrap"><table><thead><tr><th>నెల</th><th>సభ్యుడు</th><th>చిట్</th><th>చెల్లించినది</th></tr></thead><tbody>${db.payments.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,8).map(p=>`<tr><td>${esc(monthLabel(p.month))}</td><td>${esc(member(p.memberId)?.name||'తొలగించిన సభ్యుడు')}</td><td>${esc(chit(member(p.memberId)?.chitId)?.name||'-')}</td><td>${money(p.amount)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">ఇంకా చెల్లింపులు నమోదు చేయలేదు.</div>`}
  </div>`;
}
function chitsPage(){return `${head('చిట్లు',`<button class="primary" data-action="new-chit">＋ కొత్త చిట్</button>`)}${db.chits.length?`<div class="list">${db.chits.map(c=>`<div class="item"><span class="tag">${db.members.filter(m=>m.chitId===c.id).length} సభ్యులు</span><h3>${esc(c.name)}</h3><p><b>${money(c.amount)}</b></p><p>చిట్‌కు ముందు: ${money(c.beforeRate)} / నెల</p><p>చిట్ తీసుకున్న తర్వాత: ${money(c.afterRate)} / నెల</p><div class="formactions"><button class="secondary" data-edit-chit="${c.id}">మార్చు</button><button class="danger" data-del-chit="${c.id}">తొలగించు</button></div></div>`).join('')}</div>`:`<div class="panel empty">ఇంకా చిట్లు లేవు. “కొత్త చిట్” నొక్కండి.</div>`}<div id="editor"></div>`}
function chitForm(c={}){return `<div class="panel"><h3>${c.id?'చిట్ వివరాలు మార్చండి':'కొత్త చిట్ నమోదు'}</h3><form id="chitForm"><input type="hidden" name="id" value="${esc(c.id||'')}"><div class="formgrid"><div class="field"><label>చిట్ పేరు / నంబర్</label><input name="name" required placeholder="ఉదా: CH001 - 50 వేల చిట్" value="${esc(c.name||'')}"></div><div class="field"><label>చిట్ మొత్తం (₹)</label><input name="amount" type="number" min="1" required value="${esc(c.amount||50000)}"></div><div class="field"><label>చిట్ తీసుకునే ముందు నెల కిస్తీ (₹)</label><input name="beforeRate" type="number" min="0" required value="${esc(c.beforeRate||2500)}"></div><div class="field"><label>చిట్ తీసుకున్న తర్వాత నెల కిస్తీ (₹)</label><input name="afterRate" type="number" min="0" required value="${esc(c.afterRate||3000)}"></div><div class="field"><label>మొత్తం సభ్యుల సంఖ్య</label><input name="count" type="number" min="1" value="${esc(c.count||20)}"></div></div><div class="formactions"><button class="primary">సేవ్ చేయండి</button><button type="button" class="secondary" data-cancel-editor>రద్దు</button></div></form></div>`}
function membersPage(){return `${head('సభ్యులు',`<button class="primary" data-action="new-member">＋ కొత్త సభ్యుడు</button>`)}<div class="filters"><input class="filter" id="memberSearch" placeholder="పేరు లేదా ఫోన్‌తో వెతకండి"><select class="filter" id="memberChitFilter"><option value="">అన్ని చిట్లు</option>${db.chits.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div id="memberList">${memberRows()}</div><div id="editor"></div>`}
function memberRows(){if(!db.members.length)return `<div class="panel empty">ఇంకా సభ్యులు లేరు. ముందుగా ఒక చిట్ సృష్టించండి.</div>`;return `<div class="tablewrap panel"><table><thead><tr><th>పేరు</th><th>ఫోన్</th><th>చిట్</th><th>నెల కిస్తీ</th><th>చర్యలు</th></tr></thead><tbody>${db.members.map(m=>`<tr data-member-row data-name="${esc((m.name+' '+m.phone).toLowerCase())}" data-chit="${m.chitId}"><td>${esc(m.name)}</td><td>${esc(m.phone)}</td><td>${esc(chit(m.chitId)?.name||'-')}</td><td>${money(dueFor(m,monthNow()))}</td><td><button class="secondary" data-edit-member="${m.id}">వివరాలు</button> <button class="danger" data-del-member="${m.id}">తొలగించు</button></td></tr>`).join('')}</tbody></table></div>`}
function memberForm(m={}){return `<div class="panel"><h3>${m.id?'సభ్యుడి వివరాలు మార్చండి':'కొత్త సభ్యుడు నమోదు'}</h3><form id="memberForm"><input type="hidden" name="id" value="${esc(m.id||'')}"><div class="formgrid"><div class="field"><label>సభ్యుడి పేరు</label><input name="name" required value="${esc(m.name||'')}"></div><div class="field"><label>ఫోన్ నంబర్</label><input name="phone" required inputmode="tel" placeholder="10 అంకెల నంబర్" value="${esc(m.phone||'')}"></div><div class="field"><label>చిట్ ఎంచుకోండి</label><select name="chitId" required>${db.chits.map(c=>`<option value="${c.id}" ${m.chitId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>సభ్యుడు చేరిన నెల</label><input name="joinMonth" type="month" required value="${esc(m.joinMonth||monthNow())}"></div><div class="field"><label>చిట్ తీసుకున్న నెల (తీసుకోకపోతే ఖాళీ)</label><input name="takenMonth" type="month" value="${esc(m.takenMonth||'')}"></div><div class="field"><label>చిరునామా</label><input name="address" value="${esc(m.address||'')}"></div></div><p class="small">చిట్ తీసుకున్న నెల నుంచే కొత్త కిస్తీ వర్తిస్తుంది. మీరు చెప్పిన నియమం ప్రకారం అవసరమైతే తర్వాతి నెల నుంచి వర్తించేలా ఈ తేదీని నమోదు చేసుకోండి.</p><div class="formactions"><button class="primary">సేవ్ చేయండి</button><button type="button" class="secondary" data-cancel-editor>రద్దు</button></div></form></div>`}
function paymentsPage(){let mo=window.selectedMonth||monthNow(), cid=window.selectedChit||'';let ms=db.members.filter(m=>(!cid||m.chitId===cid)&&m.joinMonth&&m.joinMonth<=mo);return `${head('నెలవారీ వసూళ్లు')}<div class="panel"><div class="filters"><div class="field"><label>నెల ఎంచుకోండి</label><input class="filter" type="month" id="payMonth" value="${mo}"></div><div class="field"><label>చిట్ ఎంచుకోండి</label><select class="filter" id="payChit"><option value="">అన్ని చిట్లు</option>${db.chits.map(c=>`<option value="${c.id}" ${cid===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div></div><div class="small">చెల్లించిన మొత్తాన్ని నమోదు చేసి “చెల్లింపు సేవ్” నొక్కండి. ఇప్పటికే నమోదు చేసిన చెల్లింపును మళ్లీ నమోదు చేయకుండా మార్చవచ్చు.</div></div><div class="panel">${ms.length?`<div class="tablewrap"><table><thead><tr><th>సభ్యుడు</th><th>కిస్తీ</th><th>చెల్లించినది</th><th>స్థితి</th><th>నమోదు</th></tr></thead><tbody>${ms.map(m=>{let p=paidFor(m.id,mo),due=dueFor(m,mo);return `<tr><td>${esc(m.name)}<div class="small">${esc(chit(m.chitId)?.name||'')}</div></td><td>${money(due)}</td><td><input style="width:115px;padding:8px;border:1px solid #cbd8d0;border-radius:8px" type="number" min="0" id="amount-${m.id}" value="${p? p.amount:''}" placeholder="₹"></td><td>${p?'<span class="tag">నమోదైంది</span>':'<span class="tag red">బాకీ</span>'}</td><td><button class="primary" data-pay="${m.id}" data-month="${mo}">చెల్లింపు సేవ్</button> ${p?`<button class="danger" data-unpay="${m.id}" data-month="${mo}">రద్దు</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">ఈ నెలకు సభ్యులు లేరు. ముందుగా చిట్ మరియు సభ్యులను నమోదు చేయండి.</div>`}</div>`}

function reportRows(type,mo,cid=''){
  const members=db.members.filter(m=>(!cid||m.chitId===cid)&&m.joinMonth&&m.joinMonth<=mo);
  return members.map(m=>{
    const months=type==='arrears'?allMonths(m.joinMonth,mo):[mo];
    let due=0,paid=0,unpaidMonths=0;
    months.forEach(month=>{
      const d=dueFor(m,month),p=Number(paidFor(m.id,month)?.amount||0);
      due+=d;paid+=p;if(p<d)unpaidMonths++;
    });
    const balance=Math.max(0,due-paid);
    return {member:m,chit:chit(m.chitId),due,paid,balance,unpaidMonths,status:balance<=0?'పూర్తి':paid>0?'పాక్షికం':'బకాయి'};
  }).filter(r=>type!=='arrears'||r.balance>0);
}
function reportsPage(){
  const mo=window.reportMonth||monthNow(),type=window.reportType||'monthly',cid=window.reportChit||'';
  const rows=reportRows(type,mo,cid),due=rows.reduce((s,r)=>s+r.due,0),paid=rows.reduce((s,r)=>s+r.paid,0),balance=rows.reduce((s,r)=>s+r.balance,0);
  return `${head('నెలవారీ లెక్కలు / బకాయిల రిపోర్టులు',`<button class="primary" id="reportExport">📥 Excel కోసం డౌన్‌లోడ్</button>`)}
  <div class="panel"><div class="filters">
  <div class="field"><label>రిపోర్టు రకం</label><select class="filter" id="reportType"><option value="monthly" ${type==='monthly'?'selected':''}>ఎంచుకున్న నెల లెక్కలు</option><option value="arrears" ${type==='arrears'?'selected':''}>మొత్తం బకాయిలు (చేరిన నెల నుంచి)</option></select></div>
  <div class="field"><label>నెల ఎంచుకోండి</label><input class="filter" type="month" id="reportMonth" value="${mo}"></div>
  <div class="field"><label>చిట్ ఎంచుకోండి</label><select class="filter" id="reportChit"><option value="">అన్ని చిట్లు</option>${db.chits.map(c=>`<option value="${c.id}" ${cid===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
  </div><p class="small">${type==='monthly'?'ఎంచుకున్న నెలకు కిస్తీ, చెల్లింపు, మిగిలిన మొత్తం చూపిస్తుంది.':'సభ్యుడు చేరిన నెల నుంచి ఎంచుకున్న నెల వరకు మొత్తం లెక్కించి, ఇంకా బకాయి ఉన్న సభ్యులను చూపిస్తుంది.'}</p></div>
  <div class="cards">${stat('రిపోర్టులో రావాల్సిన మొత్తం',money(due),'blue')}${stat('చెల్లించిన మొత్తం',money(paid),'green')}${stat('మిగిలిన బకాయి',money(balance),'red')}${stat('బకాయి ఉన్న సభ్యులు',rows.filter(r=>r.balance>0).length,'orange')}</div>
  <div class="panel"><h3>${type==='monthly'?esc(monthLabel(mo))+' నెలవారీ వివరాలు':'మొత్తం బకాయి ఉన్న సభ్యులు'}</h3>
  ${rows.length?`<div class="tablewrap"><table><thead><tr><th>సభ్యుడు</th><th>ఫోన్</th><th>చిట్</th>${type==='arrears'?'<th>బకాయి నెలలు</th>':''}<th>రావాల్సినది</th><th>చెల్లించినది</th><th>బకాయి</th><th>స్థితి</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.member.name)}</td><td>${esc(r.member.phone)}</td><td>${esc(r.chit?.name||'-')}</td>${type==='arrears'?`<td>${r.unpaidMonths}</td>`:''}<td>${money(r.due)}</td><td>${money(r.paid)}</td><td><b>${money(r.balance)}</b></td><td>${r.status}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">ఈ ఎంపికకు రిపోర్టు వివరాలు లేవు.</div>`}
  <p class="small">గమనిక: ఈ రిపోర్టు నమోదు చేసిన చెల్లింపులు మరియు చిట్ కిస్తీ వివరాల ఆధారంగా లెక్కిస్తుంది. మీ అసలు రికార్డులతో ఒకసారి సరిపోల్చండి.</p></div>`;
}
function exportReportCSV(){
  const mo=window.reportMonth||monthNow(),type=window.reportType||'monthly',cid=window.reportChit||'';
  const rows=reportRows(type,mo,cid);
  const headers=['రిపోర్టు రకం','నెల','సభ్యుడి పేరు','ఫోన్','చిట్','బకాయి నెలలు','రావాల్సిన మొత్తం','చెల్లించిన మొత్తం','బకాయి మొత్తం','స్థితి'];
  const csvRows=[headers,...rows.map(r=>[type==='monthly'?'నెలవారీ':'మొత్తం బకాయిలు',monthLabel(mo),r.member.name,r.member.phone,r.chit?.name||'',r.unpaidMonths,r.due,r.paid,r.balance,r.status])];
  const csv='\uFEFF'+csvRows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=(type==='monthly'?'నెలవారీ-రిపోర్ట్-':'బకాయిల-రిపోర్ట్-')+mo+'.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function whatsappPage(){return `${head('WhatsApp సందేశం')}<div class="panel"><h3>బకాయి రిమైండర్ పంపండి</h3><form id="waForm"><div class="formgrid"><div class="field"><label>సభ్యుడిని ఎంచుకోండి</label><select name="memberId" required>${db.members.map(m=>`<option value="${m.id}">${esc(m.name)} — ${esc(m.phone)}</option>`).join('')}</select></div><div class="field"><label>ఏ నెలకు?</label><input type="month" name="month" value="${monthNow()}" required></div><div class="field wide"><label>సందేశం</label><textarea name="message" id="waMessage">నమస్కారం. మీ చిట్ కిస్తీ వివరాలు తెలియజేస్తున్నాము.</textarea></div></div><div class="formactions"><button class="primary">WhatsApp తెరవండి</button></div></form><p class="small">WhatsApp తెరిచిన తర్వాత సందేశాన్ని పరిశీలించి మీరు స్వయంగా పంపాలి. ఇది ఆటోమేటిక్‌గా పంపదు.</p></div>`}
function backupPage(){return `${head('బ్యాకప్ / తిరిగి పెట్టు')}<div class="panel"><h3>మీ డేటాను భద్రంగా ఉంచండి</h3><p>బ్యాకప్ ఫైల్‌లో చిట్లు, సభ్యులు, చెల్లింపులు ఉంటాయి.</p><div class="formactions"><button class="primary" id="exportBtn">బ్యాకప్ డౌన్‌లోడ్</button><label class="secondary" style="display:inline-block;padding:11px 14px;border-radius:10px;cursor:pointer">బ్యాకప్ తిరిగి పెట్టు <input type="file" id="importFile" accept=".json,application/json" hidden></label></div></div><div class="panel"><h3>డేటా తొలగింపు</h3><p class="small">இது మీ இந்த browser-ல் உள்ள data மட்டும் తొలగిస్తుంది. ముందుగా బ్యాకప్ తీసుకోండి.</p><button class="danger" id="clearBtn">అన్ని వివరాలు తొలగించు</button></div><div class="panel"><h3>ఉచిత వినియోగం గురించి</h3><p>ఈ వెర్షన్‌కు చందా అవసరం లేదు. అయితే డేటా ప్రస్తుతం ఒకే పరికరంలో ఉంటుంది. కంప్యూటర్, మొబైల్ రెండింటిలో ఒకే డేటా వాడాలంటే క్లౌడ్ డేటాబేస్ కనెక్షన్ తర్వాత ఏర్పాటు చేయాలి.</p></div>`}

function wire(){
document.querySelectorAll('[data-stat]').forEach(b=>{
  b.onclick=()=>{
    const action=b.dataset.stat;
    if(action==='chits') go('chits');
    else if(action==='members') go('members');
    else if(action==='collections'||action==='dues'){
      window.reportType='monthly';
      go('reports');
    }
  };
});

let hm=document.getElementById('homeMonth');
let hc=document.getElementById('homeChit');

function refreshHome(){
  window.reportMonth=hm?.value||monthNow();
  window.reportChit=hc?.value||'';
  render();
}

if(hm)hm.onchange=refreshHome;
if(hc)hc.onchange=refreshHome;
let cf=document.getElementById('chitForm');
if(cf)cf.onsubmit=e=>{e.preventDefault();cf.dataset.handled='1';let f=new FormData(cf),id=f.get('id'),o={id:id||uid('CH'),name:f.get('name').trim(),amount:+f.get('amount'),beforeRate:+f.get('beforeRate'),afterRate:+f.get('afterRate'),count:+f.get('count')||20};if(id)db.chits[db.chits.findIndex(x=>x.id===id)]=o;else db.chits.push(o);save()};
let mf=document.getElementById('memberForm');if(mf)mf.onsubmit=e=>{e.preventDefault();mf.dataset.handled='1';let f=new FormData(mf),id=f.get('id'),o={id:id||uid('MB'),name:f.get('name').trim(),phone:f.get('phone').trim(),chitId:f.get('chitId'),joinMonth:f.get('joinMonth'),takenMonth:f.get('takenMonth'),address:f.get('address')};if(id)db.members[db.members.findIndex(x=>x.id===id)]=o;else db.members.push(o);save()};
document.querySelectorAll('[data-edit-chit]').forEach(b=>b.onclick=()=>{document.getElementById('editor').innerHTML=chitForm(chit(b.dataset.editChit));wire()});document.querySelectorAll('[data-del-chit]').forEach(b=>b.onclick=()=>{let id=b.dataset.delChit;if(db.members.some(m=>m.chitId===id)){toast('ఈ చిట్‌కు సభ్యులు ఉన్నారు; ముందుగా వారిని మార్చండి/తొలగించండి');return}if(confirm('ఈ చిట్ తొలగించాలా?')){db.chits=db.chits.filter(c=>c.id!==id);save()}});
document.querySelectorAll('[data-edit-member]').forEach(b=>b.onclick=()=>{document.getElementById('editor').innerHTML=memberForm(member(b.dataset.editMember));wire()});document.querySelectorAll('[data-del-member]').forEach(b=>b.onclick=()=>{let id=b.dataset.delMember;if(confirm('ఈ సభ్యుడిని, వారి చెల్లింపులను తొలగించాలా?')){db.members=db.members.filter(m=>m.id!==id);db.payments=db.payments.filter(p=>p.memberId!==id);save()}});
let search=document.getElementById('memberSearch'),filter=document.getElementById('memberChitFilter');function filt(){document.querySelectorAll('[data-member-row]').forEach(r=>r.style.display=(!search||r.dataset.name.includes(search.value.toLowerCase()))&&(!filter||!filter.value||r.dataset.chit===filter.value)?'':'none')}if(search)search.oninput=filt;if(filter)filter.onchange=filt;
let pm=document.getElementById('payMonth'),pc=document.getElementById('payChit');if(pm)pm.onchange=()=>{window.selectedMonth=pm.value;window.selectedChit=pc.value;render()};if(pc)pc.onchange=()=>{window.selectedMonth=pm.value;window.selectedChit=pc.value;render()};
document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>{let mid=b.dataset.pay,mo=b.dataset.month,amount=Number(document.getElementById('amount-'+mid).value);if(!Number.isFinite(amount)||amount<0){toast('సరైన మొత్తం నమోదు చేయండి');return}let p=paidFor(mid,mo);if(p){p.amount=amount;p.createdAt=Date.now()}else db.payments.push({id:uid('PY'),memberId:mid,month:mo,amount,createdAt:Date.now()});save()});document.querySelectorAll('[data-unpay]').forEach(b=>b.onclick=()=>{if(confirm('ఈ చెల్లింపును రద్దు చేయాలా?')){db.payments=db.payments.filter(p=>!(p.memberId===b.dataset.unpay&&p.month===b.dataset.month));save()}});
let rt=document.getElementById('reportType'),rm=document.getElementById('reportMonth'),rc=document.getElementById('reportChit');
function refreshReport(){window.reportType=rt?.value||'monthly';window.reportMonth=rm?.value||monthNow();window.reportChit=rc?.value||'';render()}
if(rt)rt.onchange=refreshReport;if(rm)rm.onchange=refreshReport;if(rc)rc.onchange=refreshReport;
let rex=document.getElementById('reportExport');if(rex)rex.onclick=exportReportCSV;
let wf=document.getElementById('waForm');if(wf)wf.onsubmit=e=>{e.preventDefault();let f=new FormData(wf),m=member(f.get('memberId')),mo=f.get('month'),due=dueFor(m,mo),p=paidFor(m.id,mo),bal=Math.max(0,due-(p?.amount||0));let msg=`నమస్కారం ${m.name} గారు,\n${chit(m.chitId)?.name||'చిట్'} - ${monthLabel(mo)} నెల కిస్తీ: ${money(due)}\nచెల్లించినది: ${money(p?.amount||0)}\nఈ నెల బకాయి: ${money(bal)}\nదయచేసి చెల్లించగలరు. ధన్యవాదాలు.`;let phone=m.phone.replace(/\D/g,'');if(phone.length===10)phone='91'+phone;window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank')};
let eb=document.getElementById('exportBtn');if(eb)eb.onclick=exportDB;let imp=document.getElementById('importFile');if(imp)imp.onchange=()=>{let file=imp.files[0];if(!file)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.chits||!x.members||!x.payments)throw Error();if(confirm('ప్రస్తుత డేటా స్థానంలో బ్యాకప్ పెట్టాలా?')){db=x;save()}}catch(e){alert('ఈ బ్యాకప్ ఫైల్ సరైనది కాదు')}};r.readAsText(file)};let cl=document.getElementById('clearBtn');if(cl)cl.onclick=()=>{if(confirm('అన్ని వివరాలు శాశ్వతంగా తొలగించాలా? ముందుగా బ్యాకప్ తీసుకున్నారా?')){db={chits:[],members:[],payments:[]};save()}};
}
function exportDB(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='నా-చిట్-లెక్కలు-బ్యాకప్.json';a.click();URL.revokeObjectURL(a.href)}
function go(p){page=p;render()}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>go(b.dataset.page));document.getElementById('backupBtn').onclick=exportDB;
if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
render();

// Safety net: handle dynamically inserted forms even if their individual listeners are missed.
document.addEventListener('submit', function(e){
  if(e.target && e.target.id==='chitForm' && !e.target.dataset.handled){
    e.preventDefault(); e.target.dataset.handled='1';
    const f=new FormData(e.target), id=f.get('id');
    const o={id:id||uid('CH'),name:f.get('name').trim(),amount:+f.get('amount'),beforeRate:+f.get('beforeRate'),afterRate:+f.get('afterRate'),count:+f.get('count')||20};
    if(id) db.chits[db.chits.findIndex(x=>x.id===id)]=o; else db.chits.push(o);
    save(); toast('చిట్ సేవ్ అయింది');
  }
  if(e.target && e.target.id==='memberForm' && !e.target.dataset.handled){
    e.preventDefault(); e.target.dataset.handled='1';
    const f=new FormData(e.target), id=f.get('id');
    const o={id:id||uid('MB'),name:f.get('name').trim(),phone:f.get('phone').trim(),chitId:f.get('chitId'),joinMonth:f.get('joinMonth'),takenMonth:f.get('takenMonth'),address:f.get('address')};
    if(id) db.members[db.members.findIndex(x=>x.id===id)]=o; else db.members.push(o);
    save(); toast('సభ్యుడు సేవ్ అయింది');
  }
});


// Supabase email/password login UI. Existing chit data remains in browser localStorage.
(function setupSupabaseLogin(){
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  let client = null;
  let currentUser = null;
  const css = document.createElement('style');
  css.textContent = `body.auth-locked .layout,body.auth-locked #backupBtn{display:none!important}body.auth-locked{overflow:hidden}#authOverlay{position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}#authBox{background:#fff;color:#123b2b;width:min(420px,100%);padding:24px;border-radius:16px;box-shadow:0 16px 50px #0004;font-family:inherit}#authBox h2{margin:0 0 8px}#authBox label{display:block;margin-top:12px;font-weight:600}#authBox input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd8d0;border-radius:9px;margin-top:5px;font:inherit}#authBox .authActions{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}#authBox button{padding:10px 14px;border:0;border-radius:9px;cursor:pointer;font:inherit}#authSubmit{background:#087943;color:white}#authCancel{background:#e8f3ec;color:#123b2b}#authMsg{margin-top:12px;font-size:14px;overflow-wrap:anywhere}`;
  document.head.appendChild(css);
  const overlay = document.createElement('div');
  overlay.id='authOverlay';
  overlay.innerHTML = `<section id="authBox" role="dialog" aria-modal="true" aria-labelledby="authTitle"><h2 id="authTitle">నా చిట్ లెక్కలు — లాగిన్</h2><p>మీ Supabase ఖాతా ఇమెయిల్, పాస్‌వర్డ్ నమోదు చేయండి.</p><form id="authForm"><label for="authEmail">Gmail</label><input id="authEmail" type="email" autocomplete="username" required value="humasankarbusam@gmail.com"><label for="authPassword">పాస్‌వర్డ్</label><input id="authPassword" type="password" autocomplete="current-password" required><div class="authActions"><button id="authSubmit" type="submit">లాగిన్ చేయండి</button></div><div id="authMsg" role="status"></div></form></section>`;
  document.body.appendChild(overlay);
  const form=overlay.querySelector('#authForm'), msg=overlay.querySelector('#authMsg'), submit=overlay.querySelector('#authSubmit');
  function show(){document.body.classList.add('auth-locked');overlay.style.display='flex';msg.textContent='';overlay.querySelector('#authPassword').value='';setTimeout(()=>overlay.querySelector('#authEmail').focus(),0)}
  function hide(){overlay.style.display='none';document.body.classList.remove('auth-locked')}
  function lock(){document.body.classList.add('auth-locked');overlay.style.display='flex'}
  function updateButton(){btn.textContent=currentUser ? 'లాగౌట్ ('+(currentUser.email||'యూజర్')+')' : 'లాగిన్';btn.title=currentUser?'లాగౌట్ చేయడానికి క్లిక్ చేయండి':'Gmailతో లాగిన్'}
  try {
    if (window.supabase && window.CHIT_SUPABASE_URL && window.CHIT_SUPABASE_PUBLISHABLE_KEY) {
      client = window.supabase.createClient(window.CHIT_SUPABASE_URL, window.CHIT_SUPABASE_PUBLISHABLE_KEY);
      window.chitSupabaseClient = client;
      client.auth.getSession().then(async ({data})=>{
        // Ask for credentials every time the app is opened, even if Supabase has an old session.
        if(data?.session){await client.auth.signOut();}
        currentUser=null;updateButton();show();
      }).catch(()=>{currentUser=null;updateButton();show()});
      client.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;window.chitCurrentUser=currentUser;updateButton();if(!currentUser){lock()}});
    }
  } catch(e) { console.error('Supabase initialization error',e); }
  btn.addEventListener('click', async ()=>{
    if(currentUser && client){
      const {error}=await client.auth.signOut();
      if(error){alert('లాగౌట్ కాలేదు: '+error.message);return;}
      currentUser=null;updateButton();show();return;
    }
    if(!client){alert('Supabase కనెక్షన్ ప్రారంభం కాలేదు. ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేయండి.');return;}
    show();
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!client){msg.textContent='Supabase కనెక్షన్ లేదు.';return;}
    submit.disabled=true;submit.textContent='లాగిన్ అవుతోంది…';msg.textContent='';
    try{
      const email=overlay.querySelector('#authEmail').value.trim();
      const password=overlay.querySelector('#authPassword').value;
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      currentUser=data.user;window.chitCurrentUser=currentUser;updateButton();
      msg.textContent='లాగిన్ అయ్యింది. క్లౌడ్ డేటా తెస్తున్నాం…';
      await syncCloudData();
      msg.textContent='లాగిన్ విజయవంతం అయింది.';
      hide();
    }catch(err){msg.textContent='లాగిన్ / క్లౌడ్ సింక్ సమస్య: '+(err?.message||'తెలియని సమస్య')+' . Supabaseలో పట్టిక, RLS Policy, యూజర్ వివరాలు తనిఖీ చేయండి.';}
    finally{submit.disabled=false;submit.textContent='లాగిన్ చేయండి';}
  });
  updateButton();
  // Lock the dashboard immediately; reveal it only after Supabase confirms a session.
  lock();
  if(!client){msg.textContent='Supabase కనెక్షన్ ప్రారంభం కాలేదు. ఇంటర్నెట్ కనెక్షన్ తనిఖీ చేయండి.';}
})();
