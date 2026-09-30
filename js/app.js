(async()=>{
const CFG=window.HR_CONFIG||{},LE=document.getElementById('le');
if(!window.supabase||!CFG.url||!CFG.key||CFG.url.includes('YOUR')){LE.textContent='សូមបំពេញ url និង key របស់ Supabase ក្នុង config.js';return}
LE.textContent='កំពុងភ្ជាប់ Supabase…';
const sb=supabase.createClient(CFG.url,CFG.key,{auth:{storage:window.sessionStorage,persistSession:true,autoRefreshToken:true}}),COLS=['people','users','notes'];
const DOM=CFG.domain||'hr.local';
const em=n=>{n=String(n).trim().toLowerCase();return (/^[a-z0-9._-]+$/.test(n)?n:'x'+Array.from(new TextEncoder().encode(n),b=>b.toString(16).padStart(2,'0')).join(''))+'@'+DOM};
const PINRE=/^\d{6,}$/;
const js=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)):v);
let snap={},snapM={},sy=Promise.resolve(),pend=0,warned=0;
const jm=a=>new Map((a||[]).map(o=>[String(o.id),js(o)]));
const mm=d=>{const m={};Object.keys(d).forEach(k=>{if(!COLS.includes(k))m[k]=js(d[k])});return m};
const snapAll=d=>{snap={};COLS.forEach(t=>snap[t]=jm(d[t]));snapM=mm(d)};
async function fetchAll(t){let out=[],from=0;for(;;){const r=await sb.from('hr_'+t).select('*').order('created_at').order('id').range(from,from+999);if(r.error)throw r.error;out=out.concat(r.data);if(r.data.length<1000)break;from+=1000}return out}
async function dbLoad(){const [p,u,n,m]=await Promise.all([fetchAll('people'),fetchAll('users'),fetchAll('notes'),sb.from('hr_meta').select('*')]);
  if(m.error)throw m.error;if(!p.length&&!u.length&&!m.data.length)return null;
  const d={};m.data.forEach(r=>d[r.key]=r.value);
  d.people=p.map(r=>r.data);d.users=u.map(r=>r.data);d.notes=n.map(r=>r.data).sort((a,b)=>b.id-a.id);d.depts=d.depts||[];return d}
async function dbSync(){const ns={},ops=[];
  for(const t of COLS){ns[t]=jm(D[t]);const old=snap[t]||new Map();
    const up=[...ns[t]].filter(([k,v])=>old.get(k)!==v).map(([k,v])=>({id:k,data:JSON.parse(v)}));
    const del=[...old.keys()].filter(k=>!ns[t].has(k));
    for(let i=0;i<up.length;i+=300)ops.push(sb.from('hr_'+t).upsert(up.slice(i,i+300)));
    for(let i=0;i<del.length;i+=100)ops.push(sb.from('hr_'+t).delete().in('id',del.slice(i,i+100)))}
  const nm=mm(D),mu=Object.keys(nm).filter(k=>snapM[k]!==nm[k]).map(k=>({key:k,value:JSON.parse(nm[k])}));
  if(mu.length)ops.push(sb.from('hr_meta').upsert(mu));
  const dm=Object.keys(snapM).filter(k=>!(k in nm));if(dm.length)ops.push(sb.from('hr_meta').delete().in('key',dm));
  const er=(await Promise.all(ops)).find(r=>r.error);if(er)throw er.error;
  snap=ns;snapM=nm;warned=0}
function save(){pend++;sy=sy.then(dbSync).catch(e=>{if(!warned++)alert('រក្សាទុកទៅ Supabase មិនបាន៖ '+(e.message||e))}).finally(()=>pend--)}
const G1='ក្រុមដេរ - ក្រុមទី ១';
const seedD=['Office','ពិសោធន៍','វេច្ចខ្ចប់','តុកាត់'];
let idTouched=false,repId=null,curAv='',accEdit=null,accAv='';
let D=null,editId=null,cur='list',U=null;
const $=id=>document.getElementById(id);
const kn=n=>String(n).replace(/\d/g,d=>'០១២៣៤៥៦៧៨៩'[d]);
const isAdm=()=>!!U&&U.role==='admin';
function migrate(){
  if(!isAdm())return;
  const oldD=['ទីផ្សារ','គណនេយ្យ','សំណង់','ដឹកជញ្ជូន'];
if(JSON.stringify(D.depts)===JSON.stringify(oldD)){
  const m={'ទីផ្សារ':'Office','គណនេយ្យ':'Office','សំណង់':G1,'ដឹកជញ្ជូន':'វេច្ចខ្ចប់'};
  D.people.forEach(p=>{if(m[p.dp])p.dp=m[p.dp]});D.depts=seedD;
  save();
}
  if(!D.v4){D.people.forEach(p=>{if(p.ty==='worker'&&p.pay<100)p.pay*=26});D.v4=1;save();}
  if(!D.v3){for(let k=1;k<=15;k++){const n='ក្រុមដេរ - ក្រុមទី '+kn(k);if(!D.depts.includes(n))D.depts.push(n)}D.v3=1;
  save();}
  if(!D.v5){['អ៊ុត','ជាងម៉ាសុីន','អនាម័យ','គំរូ'].forEach(n=>{if(!D.depts.includes(n))D.depts.push(n)});D.v5=1;save()}
  if(D.users.some(u=>'pin' in u)){D.users.forEach(u=>{delete u.pin});save()}
}
const match=(sel,d)=>!sel||(sel.startsWith('P:')?par(d||'')===sel.slice(2):d===sel);
const canSee=p=>isAdm()||(!!U&&!!U.dept&&match(U.dept,p.dp));
const myDepts=()=>isAdm()?D.depts:(U&&U.dept?D.depts.filter(d=>match(U.dept,d)):[]);
const nid=()=>{let i=Date.now();while(D.notes.some(n=>n.id===i))i++;return i};
const note=(x,o)=>{D.notes.unshift({id:nid(),by:U.name,t:new Date().toLocaleString('en-GB'),x,r:0,...o});D.notes=D.notes.slice(0,2000)};
function avatar(p,s){s=s||28;const st=`width:${s}px;height:${s}px;font-size:${Math.round(s*.42)}px`;
  if(p.av&&/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(p.av))return `<img class="av" style="${st}" src="${p.av}" alt="">`;
  let h=0;for(const ch of String(p.id||p.n||''))h=(h*31+ch.charCodeAt(0))%360;
  return `<span class="av" style="${st};background:hsl(${h} 45% 40%)">${esc(Array.from(String(p.n||'?').trim())[0]||'?')}</span>`}
const stOf=p=>p.st||'កំពុងធ្វើការ';
const fmt=d=>d?(/^\d{4}-\d{2}-\d{2}$/.test(String(d))?String(d).split('-').reverse().join('-'):'?'):'-';
const par=d=>d.includes(' - ')?d.split(' - ')[0]:d;
const sub=d=>d.includes(' - ')?d.split(' - ').slice(1).join(' - '):d;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>'$'+Number(v).toLocaleString('en-US');
const opt=(v,t,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(t)}</option>`;

function nav(v){
  if((v==='form'||v==='acc')&&!isAdm())v='list';
  cur=v;if(v==='acc')resetAcc();
  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));
  document.querySelectorAll('.side button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  if(v==='form'&&editId===null)fillForm();
  render();
}
function fillForm(p){
  editId=p?p.id:null;
  $('dt').textContent=p?'កែប្រែព័ត៌មាន':'បញ្ចូលព័ត៌មាន';
  $('id').value=p?p.id:nextId('staff');idTouched=false;curAv=p?p.av||'':'';$('avf').value='';
  $('n').value=p?p.n||'':'';$('ty').value=p?p.ty:'staff';$('pay').value=p?p.pay:'';
  $('hd').value=p?p.hd||'':'';$('nid').value=p?p.nid||'':'';$('st').value=p?stOf(p):'កំពុងធ្វើការ';
  $('ro').value=p?p.ro||'':'';$('ph').value=p?p.ph||'':'';$('un').value=p?p.un||'':'';$('tr').value=p?p.tr||'':'';prevAv();
  $('dp').innerHTML=(isAdm()?opt('','គ្មានផ្នែក',!p||!p.dp):'')+deptOpts(d=>p&&p.dp===d);
}
function prevAv(){$('avp').innerHTML=avatar({n:$('n').value||'?',id:$('id').value,av:curAv},56)}
function deptOpts(selFn,all){
  const order=[];myDepts().forEach(d=>{const x=par(d);if(!order.includes(x))order.push(x)});
  return order.map(pn=>{const ch=myDepts().filter(d=>par(d)===pn);
    if(ch.length===1&&ch[0]===pn)return opt(pn,pn,selFn(pn));
    return `<optgroup label="${esc(pn)}">`+(all?opt('P:'+pn,pn+' (ទាំងអស់)',false):'')+ch.map(d=>opt(d,sub(d),selFn(d))).join('')+'</optgroup>'}).join('')}

function nextId(ty){const pre=ty==='staff'?'E':'W';const m=D.people.filter(p=>p.id[0]===pre).map(p=>+p.id.slice(1)||0);return pre+String(Math.max(0,...m)+1).padStart(3,'0')}
function flash(t){$('flash').innerHTML=`<div class="flash">${esc(t)}</div>`;setTimeout(()=>{$('flash').innerHTML=''},2600)}

function render(){
  rollover();
  $('bl').textContent=D.people.filter(canSee).length;$('bd').textContent=myDepts().length;
  $('bn').textContent=isAdm()?(D.notes.filter(n=>!n.r).length||''):'';
  if(cur==='notes')renderNotes();if(cur==='acc')renderAcc();
  if(cur==='list')renderList();
  if(cur==='dept')renderDept();if(cur==='rep')renderRep();if(cur==='un')renderUn();if(cur==='tr')renderTr();
}
function renderList(){
  const PP=D.people.filter(canSee);
  const q=$('q').value.trim().toLowerCase(),f=$('f').value,fd=$('fd').value;
  const prev=$('fd').value;
  $('fd').innerHTML=opt('','គ្រប់ផ្នែក')+deptOpts(()=>false,true);
  $('fd').value=[...$('fd').options].some(o=>o.value===prev)?prev:'';
  const fdv=$('fd').value;
  const list=PP.filter(p=>(!f||p.ty===f)&&(!fdv||(fdv.startsWith('P:')?par(p.dp||'')===fdv.slice(2):p.dp===fdv))&&(!q||(p.n+p.id+p.ro+(p.ph||'')+(p.nid||'')).toLowerCase().includes(q)));
  LL=list;const P=PP,st=P.filter(p=>p.ty==='staff').length,pr=P.filter(p=>p.pr).length;
  const cost=P.reduce((a,p)=>a+(p.pr&&stOf(p)==='កំពុងធ្វើការ'?p.pay/26:0),0);
  $('stats').innerHTML=`<div class="st"><b>${P.length}</b><span>សរុប</span></div><div class="st"><b>${st}</b><span>បុគ្គលិក</span></div><div class="st"><b>${P.length-st}</b><span>កម្មករ</span></div><div class="st"><b>${pr}/${P.length}</b><span>មកធ្វើការថ្ងៃនេះ</span></div><div class="st"><b>${P.filter(p=>p.un).length}</b><span>សមាជិកសហជីព</span></div><div class="st pay"><b>${money(cost.toFixed(0))}</b><span>ចំណាយប្រចាំថ្ងៃ (ប៉ាន់ស្មាន)</span></div>`;
  $('tb').innerHTML=list.length?list.map(p=>{const t=stOf(p),c=t==='កំពុងធ្វើការ'?'s-ok':t==='ឈប់សម្រាក'?'s-rest':'s-out';return `<tr><td class="mute">${esc(p.id)}</td><td><div class="nm">${avatar(p,34)}<div><button class="lk" data-a="vw" data-i="${esc(p.id)}">${esc(p.n)}</button><br><span class="mute">${esc([p.ph,p.nid].filter(Boolean).join(' · ')||'-')}</span></div></div></td><td><span class="tag ${p.ty==='staff'?'t-s':'t-w'}">${p.ty==='staff'?'បុគ្គលិក':'កម្មករ'}</span></td><td>${esc(p.dp||'-')}</td><td>${esc(p.ro)}</td><td class="mute">${fmt(p.hd)}</td><td>${money(p.pay)}<span class="mute">/ខែ</span></td><td><span class="tag ${c}">${esc(t)}</span></td><td>${p.un?'<span class="tag t-s">សមាជិក</span>':'<span class="mute">-</span>'}</td><td>${esc(p.tr||'-')}</td><td><button data-a="pr" data-i="${esc(p.id)}" ${isAdm()?'':'disabled'} class="${p.pr?'pres':'abs'}">${p.pr?'មក':'អវត្តមាន'}</button></td><td class="act"><button data-a="rp" data-i="${esc(p.id)}">រាយការណ៍</button><button data-a="ed" data-i="${esc(p.id)}">កែ</button><button class="del" data-a="rm" data-i="${esc(p.id)}">លុប</button></td></tr>`}).join(''):'<tr><td colspan="12" class="empty">មិនមានទិន្នន័យ សូមចូលទៅ «បញ្ចូលព័ត៌មាន»</td></tr>';
}
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const EFF={'សុំច្បាប់':{st:'ឈប់សម្រាក',pr:false},'មិនមកធ្វើការ':{pr:false},'មកមិនទាន់':{pr:true},'សម្រាកព្យាបាល':{st:'ឈប់សម្រាក',pr:false},'ឆ្លងទន្លេ':{st:'ឈប់ធ្វើការ',pr:false}};
function applyEff(q,n){
  const e=EFF[n.ty],to=n.e||n.d,t=today(),c=[];
  if(e.st==='ឈប់សម្រាក'){if(to>=t){q.st=e.st;q.lv={to};c.push('ស្ថានភាព → ឈប់សម្រាក'+(to>n.d?' ដល់ '+fmt(to):''))}}
  else if(e.st){q.st=e.st;delete q.lv;c.push('ស្ថានភាព → '+e.st)}
  if('pr' in e&&n.d<=t&&to>=t&&q.pr!==e.pr){q.pr=e.pr;c.push('វត្តមាន → '+(e.pr?'មក':'អវត្តមាន'))}
  return c.join(' · ')||'មិនមានអ្វីត្រូវផ្លាស់ប្តូរ';
}
function rollover(){
  if(!isAdm())return;
  const t=today();if(D.day===t)return;
  if(!D.day){D.day=t;save();return}
  D.att=D.att||{};if(!D.att[D.day])D.att[D.day]=D.people.filter(q=>q.pr).map(q=>q.id);Object.keys(D.att).sort().slice(0,-400).forEach(k=>delete D.att[k]);
  D.people.forEach(q=>{q.pr=false;
    if(q.lv&&q.lv.to<t){delete q.lv;if(stOf(q)==='ឈប់សម្រាក'){q.st='កំពុងធ្វើការ';D.notes.unshift({id:nid(),by:'ប្រព័ន្ធ',t:new Date().toLocaleString('en-GB'),x:q.n+' ផុតថ្ងៃឈប់សម្រាក ស្ថានភាពត្រឡប់ទៅ «កំពុងធ្វើការ»',r:0})}}});
  D.notes.forEach(n=>{if(n.ap===1&&n.pend&&n.d<=t){const q=D.people.find(x=>x.id===n.pid);n.pend=0;if(q)n.res=applyEff(q,n)}});
  D.day=t;save();
}
const RT={'សុំច្បាប់':'s-rest','មិនមកធ្វើការ':'s-out','មកមិនទាន់':'s-rest','សម្រាកព្យាបាល':'t-s','ឆ្លងទន្លេ':'s-out'};
function renderNotes(){
  $('nf').style.display=isAdm()?'none':'';
  const pv=$('nt').value;
  let ns=isAdm()?D.notes:D.notes.filter(n=>n.by===U.name);
  const cn=k=>ns.filter(n=>k==='msg'?!n.ty:n.ty===k).length;
  $('nt').innerHTML=opt('','គ្រប់ប្រភេទ ('+ns.length+')')+Object.keys(RT).map(k=>opt(k,k+' ('+cn(k)+')')).join('')+opt('msg','សារ/សកម្មភាពផ្សេងៗ ('+cn('msg')+')');
  $('nt').value=pv;
  const f=$('nt').value;
  if(f)ns=ns.filter(n=>f==='msg'?!n.ty:n.ty===f);
  $('ns').textContent=isAdm()?'របាយការណ៍ និងសារពីជំនួយការ':'របាយការណ៍ និងសារដែលអ្នកបានផ្ញើ';
  const rp=ns.filter(n=>n.ty),ms=ns.filter(n=>!n.ty);
  const row=n=>{const p=D.people.find(x=>x.id===n.pid),t=p?stOf(p):'-',tc=t==='កំពុងធ្វើការ'?'s-ok':t==='ឈប់សម្រាក'?'s-rest':'s-out';
    return `<tr class="${n.r?'':'unr'}"><td class="mute">${esc(n.pid)}</td><td>${p?`<div class="nm">${avatar(p,38)}<button class="lk" data-a="vw" data-i="${esc(p.id)}">${esc(p.n)}</button></div>`:`<b>${esc(n.pn)}</b>`}</td>
    <td>${p?`<span class="tag ${p.ty==='staff'?'t-s':'t-w'}">${p.ty==='staff'?'បុគ្គលិក':'កម្មករ'}</span>`:'-'}</td><td>${esc(p?p.dp||'-':'-')}</td><td>${esc(p?p.ro:'-')}</td><td class="mute">${p?fmt(p.hd):'-'}</td><td>${p?money(p.pay)+'<span class="mute">/ខែ</span>':'-'}</td><td>${p?`<span class="tag ${tc}">${esc(t)}</span>`:'-'}</td><td>${p?(p.pr?'<span class="tag s-ok">មក</span>':'<span class="mute">អវត្តមាន</span>'):'-'}</td>
    <td><span class="tag ${RT[n.ty]||'t-s'}">${esc(n.ty)}</span><br>ថ្ងៃ ${fmt(n.d)}${n.e&&n.e!==n.d?' ដល់ '+fmt(n.e):''}${n.x?'<br>'+esc(n.x):''}<br>${rby(n)}</td>
    <td>${n.ap?`<span class="tag ${n.ap===1?'s-ok':'s-out'}">${n.ap===1?'អនុម័តរួច':'បដិសេធ'}</span><br><span class="mute">${esc(n.res||'')}</span>`:(isAdm()?`<div class="act"><button class="p" data-a="ap" data-n="${esc(n.id)}">អនុម័ត</button><button class="del" data-a="rj" data-n="${esc(n.id)}">បដិសេធ</button></div>`:'<span class="mute">រង់ចាំ</span>')}</td></tr>`};
  $('nl').innerHTML=(isAdm()&&D.notes.some(n=>!n.r)?'<button data-a="mr" style="margin-bottom:10px">សម្គាល់ថាបានអានទាំងអស់</button>':'')
   +(rp.length?`<div class="tw"><table style="min-width:1300px"><thead><tr><th>អត្តលេខ</th><th>ឈ្មោះ</th><th>ប្រភេទ</th><th>ផ្នែក</th><th>តួនាទី</th><th>ចូលធ្វើការ</th><th>ប្រាក់ខែ</th><th>ស្ថានភាព</th><th>ថ្ងៃនេះ</th><th>របាយការណ៍</th><th>ការសម្រេច</th></tr></thead><tbody>${rp.map(row).join('')}</tbody></table></div>`:'')
   +(ms.length?`<div style="margin-top:14px">${ms.map(n=>`<div class="card nt${n.r?'':' un'}">${rby(n)}<div style="margin-top:6px">${esc(n.x)}</div></div>`).join('')}</div>`:'')
   +(ns.length?'':'<div class="empty">មិនមានដំណឹងក្នុងប្រភេទនេះ</div>');
}
function tenure(d){if(!d)return'-';const a=new Date(d),b=new Date();let m=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();if(b.getDate()<a.getDate())m--;if(m<0)return'-';const y=Math.floor(m/12);return(y?kn(y)+' ឆ្នាំ ':'')+kn(m%12)+' ខែ'}
function openProfile(p){
  const rs=D.notes.filter(n=>n.pid===p.id&&n.ty),t=stOf(p);
  const cnt=Object.keys(RT).map(k=>[k,rs.filter(n=>n.ty===k).length]).filter(x=>x[1]);
  const kv=[['អត្តលេខ',p.id],['ប្រភេទ',p.ty==='staff'?'បុគ្គលិក':'កម្មករ'],['ផ្នែក/ក្រុម',p.dp||'-'],['តួនាទី',p.ro],['ថ្ងៃចូលធ្វើការ',fmt(p.hd)+(p.hd?' (ធ្វើការបាន '+tenure(p.hd)+')':'')],['អត្តសញ្ញាណប័ណ្ណ',p.nid||'-'],['លេខទូរស័ព្ទ',p.ph||'-'],['ប្រាក់ខែ',money(p.pay)+'/ខែ'],['ស្ថានភាព',t+(p.lv?' (ដល់ថ្ងៃ '+fmt(p.lv.to)+')':'')],['សហជីព',p.un||'មិនមែនសមាជិក'],['មធ្យោបាយធ្វើដំណើរ',p.tr||'-'],['វត្តមានថ្ងៃនេះ',p.pr?'មក':'អវត្តមាន']];
  $('pc').innerHTML=`<div class="nm">${avatar(p,64)}<h2 style="margin:0">${esc(p.n)}</h2></div><dl class="kv">${kv.map(x=>`<dt>${x[0]}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl>
  <h3 style="margin:14px 0 6px">ប្រវត្តិរបាយការណ៍ (${rs.length})</h3>
  <div class="chips">${cnt.map(x=>`<span class="tag ${RT[x[0]]}">${x[0]} ${x[1]}</span>`).join('')||'<span class="mute">មិនទាន់មានរបាយការណ៍</span>'}</div>
  ${rs.map(n=>`<div class="mute" style="padding:4px 0;border-top:1px solid var(--line)"><span class="tag ${RT[n.ty]||'t-s'}">${esc(n.ty)}</span> ${fmt(n.d)}${n.e&&n.e!==n.d?' ដល់ '+fmt(n.e):''} ${n.ap===1?'· អនុម័តរួច':n.ap===2?'· បដិសេធ':'· រង់ចាំ'}${n.x?' · '+esc(n.x):''}</div>`).join('')}`;
  showPd();
}
function prevAcc(){$('aap').innerHTML=avatar({n:$('afn').value||$('an').value||'?',id:$('an').value,av:accAv},56)}
function resetAcc(){accEdit=null;accAv='';['an','afn','aro','aph','ap','aaf'].forEach(i=>$(i).value='');$('ap').required=true;$('an').disabled=false;$('asb').textContent='បង្កើតគណនី';$('acx').style.display='none';prevAcc()}
function renderAcc(){
  const pvd=$('ad').value;$('ad').innerHTML=deptOpts(()=>false,true);if([...$('ad').options].some(o=>o.value===pvd))$('ad').value=pvd;
  $('at').innerHTML='<thead><tr><th>រូប</th><th>អត្តលេខ</th><th>ឈ្មោះពេញ</th><th>តួនាទី</th><th>លេខទូរស័ព្ទ</th><th>ផ្នែកទទួលបន្ទុក</th><th></th></tr></thead><tbody>'+D.users.map(u=>`<tr><td>${avatar({n:u.fn||u.name,id:u.name,av:u.av},34)}</td><td class="mute">${esc(u.name)}</td><td><b>${esc(u.fn||u.name)}</b></td><td>${esc(u.ro||(u.role==='admin'?'អ្នកគ្រប់គ្រង':'ជំនួយការ'))}</td><td class="mute">${esc(u.ph||'-')}</td><td>${esc(u.role==='admin'?'ទាំងអស់':String(u.dept||'').replace('P:','')+(String(u.dept).startsWith('P:')?' (ទាំងអស់)':''))}</td><td class="act"><button data-a="ea" data-u="${esc(u.id)}">កែ</button><button data-a="pin" data-u="${esc(u.id)}">ប្តូរ PIN</button>${u.id==='admin'?'':`<button class="del" data-a="du" data-u="${esc(u.id)}">លុប</button>`}</td></tr>`).join('')+'</tbody>';
}
function enter(){
  $('lg').classList.add('hide');document.body.classList.toggle('na',!isAdm());
  document.querySelectorAll('[data-adm]').forEach(e=>e.style.display=isAdm()?'':'none');
  document.querySelector('#v-dept .bar').style.display=isAdm()?'':'none';
  $('who').textContent=U.name+' · '+(isAdm()?'អ្នកគ្រប់គ្រង':'ជំនួយការ');
  editId=null;nav('list');
}
function chips(ps){return `<div class="chips">${ps.map(p=>isAdm()?`<button data-a="ed" data-i="${esc(p.id)}">${esc(p.n)}</button>`:`<button data-a="rp" data-i="${esc(p.id)}">${esc(p.n)}</button>`).join('')||'<span class="mute">មិនទាន់មានសមាជិក</span>'}</div>`}
const openG=new Set();
function openDeptOv(k){const PP=D.people.filter(canSee),g=k.startsWith('g:'),ch=g?myDepts().filter(d=>par(d)===k.slice(2)):[];
  const ps=k==='u:none'?PP.filter(p=>!p.dp||!myDepts().includes(p.dp)):g?PP.filter(p=>ch.includes(p.dp)):PP.filter(p=>p.dp===k);
  const t=g?k.slice(2):k==='u:none'?'គ្មានផ្នែក':k;
  const tag=p=>{const x=stOf(p);return `<span class="tag ${x==='កំពុងធ្វើការ'?'s-ok':x==='ឈប់សម្រាក'?'s-rest':'s-out'}">${esc(x)}</span>`};
  const pay=ps.filter(p=>stOf(p)!=='ឈប់ធ្វើការ').reduce((a,p)=>a+p.pay,0);
  $('pc').innerHTML=`<h2 style="margin:0 0 4px">${esc(t)}</h2><div class="mute" style="margin-bottom:10px">សរុប ${ps.length} នាក់ · មកថ្ងៃនេះ ${ps.filter(p=>p.pr).length} · បុគ្គលិក ${ps.filter(p=>p.ty==='staff').length} · កម្មករ ${ps.filter(p=>p.ty==='worker').length} · ប្រាក់ខែសរុប ${money(pay)}/ខែ</div>`+
   (ps.length?`<div class="tw"><table><thead><tr><th>អត្តលេខ</th><th>ឈ្មោះ</th><th>ប្រភេទ</th>${g?'<th>ក្រុម</th>':''}<th>តួនាទី</th><th>ចូលធ្វើការ</th><th>អត្តសញ្ញាណប័ណ្ណ</th><th>ទូរស័ព្ទ</th><th>ប្រាក់ខែ</th><th>ស្ថានភាព</th><th>សហជីព</th><th>ធ្វើដំណើរ</th><th>ថ្ងៃនេះ</th></tr></thead><tbody>${ps.map(p=>`<tr><td class="mute">${esc(p.id)}</td><td><div class="nm">${avatar(p,30)}<b>${esc(p.n)}</b></div></td><td><span class="tag ${p.ty==='staff'?'t-s':'t-w'}">${p.ty==='staff'?'បុគ្គលិក':'កម្មករ'}</span></td>${g?`<td>${esc(sub(p.dp||''))}</td>`:''}<td>${esc(p.ro)}</td><td class="mute">${fmt(p.hd)}</td><td>${esc(p.nid||'-')}</td><td>${esc(p.ph||'-')}</td><td>${money(p.pay)}<span class="mute">/ខែ</span></td><td>${tag(p)}</td><td>${p.un?'<span class="tag t-s">សមាជិក</span>':'<span class="mute">-</span>'}</td><td>${esc(p.tr||'-')}</td><td>${p.pr?'<span class="tag s-ok">មក</span>':'<span class="mute">អវត្តមាន</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">មិនទាន់មានសមាជិក</div>');
  showPd('min(1250px,96vw)')}
function showPd(w){$('pdg').style.width=w||'min(560px,94vw)';$('pdg').showModal()}
function renderDept(){
  const PP=D.people.filter(canSee),adm=isAdm(),act=x=>x.filter(p=>stOf(p)!=='ឈប់ធ្វើការ');
  const btn=(k,l)=>`<button class="lk" data-a="tg" data-d="${esc(k)}">${openG.has(k)?'▼':'▶'} ${esc(l)}</button>`;
  const ovb=k=>`<button data-a="dov" data-d="${esc(k)}" style="font-size:.72rem;padding:0 8px;border-radius:99px">Overview</button>`;
  const cells=ps=>`<td>${ps.length}</td><td>${ps.filter(p=>p.pr).length}</td><td>${ps.filter(p=>p.ty==='staff').length}</td><td>${ps.filter(p=>p.ty==='worker').length}</td><td>${money(act(ps).reduce((x,p)=>x+p.pay,0))}</td>`;
  const acts=d=>adm&&d?`<td class="act"><button data-a="rn" data-d="${esc(d)}">ប្តូរឈ្មោះ</button><button class="del" data-a="rd" data-d="${esc(d)}">លុប</button></td>`:'<td></td>';
  const row=(k,l,ps,c,d)=>`<tr class="${c||''}"><td>${btn(k,l)} ${ovb(k)}</td>${cells(ps)}${acts(d)}</tr>`+(openG.has(k)?`<tr class="mb"><td colspan="7">${chips(ps)}</td></tr>`:'');
  const order=[];myDepts().forEach(d=>{const x=par(d);if(!order.includes(x))order.push(x)});
  let rows=order.map(pn=>{const ch=myDepts().filter(d=>par(d)===pn);
    if(ch.length===1&&ch[0]===pn)return row(pn,pn,PP.filter(p=>p.dp===pn),'',pn);
    const all=PP.filter(p=>ch.includes(p.dp));
    return `<tr class="par"><td>${btn('g:'+pn,pn+' ('+ch.length+' ក្រុម)')} ${ovb('g:'+pn)}</td>${cells(all)}<td></td></tr>`+(openG.has('g:'+pn)?ch.map(d=>row(d,sub(d),PP.filter(p=>p.dp===d),'chd',d)).join(''):'')}).join('');
  const un=PP.filter(p=>!p.dp||!myDepts().includes(p.dp));
  if(un.length)rows+=row('u:none','គ្មានផ្នែក',un,'','');
  $('sm').innerHTML=`<table><thead><tr><th>ផ្នែក / ក្រុម <span class="mute">(ចុចឈ្មោះ ▶ ឬ Overview ដើម្បីមើលសមាជិក)</span></th><th>សរុប (នាក់)</th><th>មកថ្ងៃនេះ</th><th>បុគ្គលិក</th><th>កម្មករ</th><th>ប្រាក់ខែ/ខែ</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">មិនទាន់មានផ្នែក</td></tr>'}<tr class="tot"><td>សរុបទាំងអស់</td>${cells(PP)}<td></td></tr></tbody></table>`;
}

document.querySelector('.side').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='cp'){chgPin();return}if(b.id==='bk'){dl('hr-backup-'+today()+'.json',JSON.stringify(D),'application/json');return}if(b.id==='rs'){$('rsf').click();return}if(b.id==='lo'){U=null;sb.auth.signOut().finally(()=>location.reload());return}editId=null;nav(b.dataset.v)};
document.querySelector('main').onclick=e=>{
  const b=e.target.closest('button[data-a]');if(!b)return;
  const a=b.dataset.a,p=D.people.find(x=>x.id===b.dataset.i);
  if(a==='ap'||a==='rj'){
    if(!isAdm())return;const n=D.notes.find(x=>String(x.id)===b.dataset.n);if(!n||n.ap)return;
    if(a==='rj'){n.ap=2;n.r=1;n.res='';save();render();return}
    const q=D.people.find(x=>x.id===n.pid);n.ap=1;n.r=1;
    if(!q)n.res='រកមិនឃើញបុគ្គលិក';
    else if(n.d>today()){n.pend=1;n.res='នឹងមានសុពលភាពថ្ងៃ '+fmt(n.d)+' ដោយស្វ័យប្រវត្តិ'}
    else n.res=applyEff(q,n);
    save();render();return}
  if(a==='dov'){openDeptOv(b.dataset.d);return}
  if(a==='tg'){const k=b.dataset.d;openG.has(k)?openG.delete(k):openG.add(k);renderDept();return}
  if(a==='ov'){openUser(b.dataset.b);return}
  if((a==='mr'||a==='rd'||a==='rn'||a==='pin'||a==='du'||a==='ea')&&!isAdm())return;
  if(a==='rn'){const o=b.dataset.d,n=(prompt('ឈ្មោះថ្មី',o)||'').trim();if(!n||n===o)return;if(D.depts.includes(n)){alert('ឈ្មោះនេះមានរួចហើយ');return}
    D.depts=D.depts.map(x=>x===o?n:x);D.people.forEach(q=>{if(q.dp===o)q.dp=n});D.users.forEach(u=>{if(u.dept===o)u.dept=n});save();render();return}
  if(a==='mr'){D.notes.forEach(n=>n.r=1);save();render();return}
  if(a==='ea'){if(!isAdm())return;const u=D.users.find(x=>x.id===b.dataset.u);if(!u)return;
    accEdit=u.id;accAv=u.av||'';$('an').value=u.name;$('an').disabled=true;$('afn').value=u.fn||'';$('aro').value=u.ro||'';$('aph').value=u.ph||'';
    $('ap').value='';$('ap').required=false;$('ad').value=u.dept||'';$('asb').textContent='រក្សាទុកការកែ';$('acx').style.display='';prevAcc();window.scrollTo(0,0);return}
  if(a==='pin'||a==='du'){const u=D.users.find(x=>x.id===b.dataset.u);if(!u)return;
    if(a==='pin'){const n=prompt('PIN ថ្មីសម្រាប់ '+u.name+' (យ៉ាងតិច ៦ ខ្ទង់)');if(n&&PINRE.test(n.trim()))adminPin(u,n.trim()).then(ok=>{if(ok){save();renderAcc();flash('បានប្តូរ PIN')}})}
    else if(u.id!==U.id&&u.role!=='admin'&&confirm('លុបគណនី '+u.name+' ?'))delAcc(u);return}
  if(!isAdm()&&(a==='pin'||a==='du'||a==='pr'||a==='ed'||a==='rm'))return;
  if(p&&!canSee(p))return;
  if(a==='vw'&&p){openProfile(p);return}
  if(a==='rp'&&p&&!isAdm()){repId=p.id;$('rt').textContent='រាយការណ៍៖ '+p.n+' ('+p.id+')';$('rdt').value=today();$('rnt').value='';$('rto').value='';$('rdg').showModal();return}
  if(a==='pr'&&p){if(!p.pr&&stOf(p)==='ឈប់ធ្វើការ'&&!confirm(p.n+' មានស្ថានភាព «ឈប់ធ្វើការ» ។ បន្តកត់វត្តមាន?'))return;p.pr=!p.pr;save();render()}
  else if(a==='ed'&&p){fillForm(p);nav('form')}
  else if(a==='rm'&&p&&confirm('លុប '+p.n+' ?')){if(!isAdm())note('លុប '+p.n+' ('+p.id+')');D.people=D.people.filter(x=>x!==p);save();render()}
  else if(a==='rd'&&confirm('លុបផ្នែក '+b.dataset.d+' ? សមាជិកនឹងក្លាយជា «គ្មានផ្នែក»')){
    D.depts=D.depts.filter(x=>x!==b.dataset.d);D.people.forEach(p=>{if(p.dp===b.dataset.d)p.dp=''});D.users.forEach(u=>{if(u.dept===b.dataset.d)u.dept=''});save();render()}
};
$('ty').onchange=()=>{if(editId===null&&!idTouched)$('id').value=nextId($('ty').value)};
$('id').oninput=()=>{idTouched=true};
$('cx').onclick=()=>{editId=null;nav('list')};
['q','f','fd'].forEach(i=>$(i).oninput=renderList);
$('fm').onsubmit=e=>{
  e.preventDefault();if(!isAdm())return;
  const v={id:$('id').value.trim(),n:$('n').value.trim(),ty:$('ty').value,hd:$('hd').value,nid:$('nid').value.trim(),dp:$('dp').value,ro:$('ro').value.trim(),pay:+$('pay').value,ph:$('ph').value.trim(),st:$('st').value,un:$('un').value,tr:$('tr').value,av:curAv};
  const edit=editId;
  if(D.people.some(x=>x.id===v.id&&x.id!==edit)){alert('អត្តលេខនេះមានរួចហើយ សូមប្រើអត្តលេខផ្សេង');return}
  if(v.nid&&D.people.some(x=>x.nid===v.nid&&x.id!==edit)&&!confirm('អត្តសញ្ញាណប័ណ្ណនេះមានរួចហើយ បន្តរក្សាទុក?'))return;
  if(edit){const t=D.people.find(x=>x.id===edit);if(v.id!==edit){D.notes.forEach(n=>{if(n.pid===edit)n.pid=v.id});Object.values(D.att||{}).forEach(a=>{const i=a.indexOf(edit);if(i>-1)a[i]=v.id})}Object.assign(t,v);if(v.st==='កំពុងធ្វើការ')delete t.lv}else D.people.push({pr:false,...v});
  save();editId=null;nav('list');flash(edit?'បានកែប្រែព័ត៌មាន':'បានរក្សាទុកព័ត៌មានថ្មី');
};
$('adb').onclick=()=>{
  const n=$('nd').value.trim();
  if(!n||D.depts.includes(n)){$('nd').focus();return}
  D.depts.push(n);$('nd').value='';save();render();
};
$('lf').onsubmit=async e=>{e.preventDefault();if(Date.now()<lk){$('le').textContent='ព្យាយាមច្រើនពេក សូមរង់ចាំ '+Math.ceil((lk-Date.now())/1000)+' វិនាទី';return}
  const n=$('lu').value.trim(),pw=$('lp').value.trim();if(!n||!pw)return;
  $('le').textContent='កំពុងចូល…';
  const r=await sb.auth.signInWithPassword({email:em(n),password:pw});
  if(r.error){if(++fl>=5){fl=0;lk=Date.now()+30000}$('le').textContent='ឈ្មោះ ឬ PIN មិនត្រឹមត្រូវ';return}
  fl=0;$('lp').value='';await boot()};
$('pcx').onclick=()=>$('pdg').close();
$('n').addEventListener('input',prevAv);$('id').addEventListener('input',prevAv);
$('avx').onclick=()=>{curAv='';$('avf').value='';prevAv()};
$('avf').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),m=Math.min(im.width,im.height),S=128;c.width=c.height=S;
    c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,S,S);curAv=c.toDataURL('image/jpeg',.8);prevAv()};im.src=r.result};r.readAsDataURL(f)};
$('rcx').onclick=()=>$('rdg').close();
$('nt').onchange=renderNotes;
$('rf').onsubmit=e=>{e.preventDefault();const p=D.people.find(x=>x.id===repId);if(!p||!canSee(p))return;
  const d=$('rdt').value,en=$('rto').value;if(en&&en<d){alert('ថ្ងៃបញ្ចប់ត្រូវនៅក្រោយថ្ងៃចាប់ផ្តើម');return}
  note($('rnt').value.trim(),{ty:$('rty').value,pn:p.n,pid:p.id,d,e:en});save();$('rdg').close();render();
  if(cur==='list'){$('flash').innerHTML='<div class="flash">បានផ្ញើរបាយការណ៍ទៅអ្នកគ្រប់គ្រង</div>';setTimeout(()=>{$('flash').innerHTML=''},2600)}};
$('nf').onsubmit=e=>{e.preventDefault();note('សារ៖ '+$('nx').value.trim());$('nx').value='';save();render()};
['an','afn'].forEach(i=>$(i).addEventListener('input',prevAcc));
$('aax').onclick=()=>{accAv='';$('aaf').value='';prevAcc()};
$('acx').onclick=resetAcc;
$('aaf').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),m=Math.min(im.width,im.height),S=128;c.width=c.height=S;
    c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,S,S);accAv=c.toDataURL('image/jpeg',.8);prevAcc()};im.src=r.result};r.readAsDataURL(f)};
async function newAuth(name,pin){
  const c2=supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'hr-tmp-signup'}});
  const r=await c2.auth.signUp({email:em(name),password:pin});
  if(r.error){alert('បង្កើតគណនីមិនបាន៖ '+r.error.message);return null}
  const usr=r.data&&r.data.user;
  if(!usr||!(usr.identities||[]).length){alert('ឈ្មោះគណនីនេះមានរួចហើយក្នុង Supabase Auth');return null}
  if(!r.data.session)alert('ព្រមាន៖ គណនីត្រូវបានបង្កើត ប៉ុន្តែមិនអាចចូលបានទេ រហូតដល់អ្នកបិទ «Confirm email» ក្នុង Supabase → Authentication');
  return usr.id}
async function adminPin(u,pin){
  if(!u.auth){const id=await newAuth(u.name,pin);if(!id)return false;u.auth=id;return true}
  const r=await sb.rpc('hr_set_pin',{uid:u.auth,pin});
  if(r.error){alert('ប្តូរ PIN មិនបាន៖ '+r.error.message);return false}
  return true}
async function delAcc(u){
  if(u.auth){const r=await sb.rpc('hr_delete_auth',{uid:u.auth});if(r.error){alert('លុបគណនីមិនបាន៖ '+r.error.message);return}}
  D.users=D.users.filter(x=>x!==u);save();renderAcc()}
async function saveAcc(){
  const n=$('an').value.trim(),pin=$('ap').value.trim();
  if(D.users.some(u=>u.id!==accEdit&&u.name.toLowerCase()===n.toLowerCase())){alert('អត្តលេខនេះមានរួចហើយ');return}
  if(pin&&!PINRE.test(pin)){alert('PIN ត្រូវមានយ៉ាងតិច ៦ ខ្ទង់ (លេខ)');return}
  const f={fn:$('afn').value.trim(),ro:$('aro').value.trim(),ph:$('aph').value.trim(),av:accAv};
  if(accEdit){const u=D.users.find(x=>x.id===accEdit);if(!u)return;
    if(pin&&!(await adminPin(u,pin)))return;
    Object.assign(u,f);if(u.role!=='admin')u.dept=$('ad').value}
  else{
    if(!pin){alert('សូមបញ្ចូល PIN');return}
    const dpt=$('ad').value;if(!dpt){alert('សូមជ្រើសរើសផ្នែក/ក្រុមដែលទទួលបន្ទុក');return}
    const id=await newAuth(n,pin);if(!id)return;
    D.users.push({id:'u'+Date.now(),name:n,role:'assistant',dept:dpt,auth:id,...f})}
  save();resetAcc();renderAcc()}
$('af').onsubmit=async e=>{e.preventDefault();if(!isAdm())return;$('asb').disabled=true;try{await saveAcc()}finally{$('asb').disabled=false}};
let LL=[],fl=0,lk=0;
const dl=(name,txt,mime)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:mime||'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
const csv=rows=>'\ufeff'+rows.map(r=>r.map(c=>{const num=typeof c==='number';c=String(c==null?'':c);if(!num&&/^[=+\-@]/.test(c))c="'"+c;return /[",\r\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\r\n');
async function chgPin(){
  const o=prompt('បញ្ចូល PIN បច្ចុប្បន្ន');if(o===null)return;
  const v=await sb.auth.signInWithPassword({email:em(U.name),password:o.trim()});
  if(v.error){alert('PIN បច្ចុប្បន្នមិនត្រឹមត្រូវ');return}
  const n=(prompt('PIN ថ្មី (យ៉ាងតិច ៦ ខ្ទង់)')||'').trim();if(!n)return;
  if(!PINRE.test(n)){alert('PIN ត្រូវមានយ៉ាងតិច ៦ ខ្ទង់ (លេខ)');return}
  const r=await sb.auth.updateUser({password:n});
  if(r.error){alert('ប្តូរ PIN មិនបាន៖ '+r.error.message);return}
  flash('បានប្តូរ PIN')}
function repRows(){const m=$('rmo').value||today().slice(0,7),t=today();
  return D.people.filter(canSee).map(p=>{let d=0;Object.keys(D.att||{}).forEach(k=>{if(k.startsWith(m)&&D.att[k].includes(p.id))d++});
    if(t.startsWith(m)&&p.pr)d++;return [p,d,Math.min(p.pay,Math.round(p.pay/26*d))]})}
function renderRep(){if(!$('rmo').value)$('rmo').value=today().slice(0,7);const R=repRows();
  const td=R.reduce((a,x)=>a+x[1],0),ts=R.reduce((a,x)=>a+x[2],0);
  $('rtb').innerHTML=R.length?`<table><thead><tr><th>អត្តលេខ</th><th>ឈ្មោះ</th><th>ផ្នែក</th><th>ប្រាក់ខែ</th><th>ថ្ងៃមក</th><th>ប្រាក់ខែតាមថ្ងៃមក</th></tr></thead><tbody>${R.map(x=>`<tr><td class="mute">${esc(x[0].id)}</td><td>${esc(x[0].n)}</td><td>${esc(x[0].dp||'-')}</td><td>${money(x[0].pay)}</td><td>${kn(x[1])}</td><td>${money(x[2])}</td></tr>`).join('')}<tr class="tot"><td colspan="4">សរុប</td><td>${kn(td)}</td><td>${money(ts)}</td></tr></tbody></table>`:'<div class="empty">មិនមានទិន្នន័យ</div>'}
$('rmo').oninput=renderRep;
$('rcv').onclick=()=>dl('report-'+$('rmo').value+'.csv',csv([['អត្តលេខ','ឈ្មោះ','ផ្នែក','ប្រាក់ខែ','ថ្ងៃមក','ប្រាក់ខែតាមថ្ងៃមក']].concat(repRows().map(x=>[x[0].id,x[0].n,x[0].dp||'',x[0].pay,x[1],x[2]]))));
$('csv').onclick=()=>dl('people-'+today()+'.csv',csv([['អត្តលេខ','ឈ្មោះ','ប្រភេទ','ផ្នែក','តួនាទី','ថ្ងៃចូលធ្វើការ','អត្តសញ្ញាណប័ណ្ណ','ទូរស័ព្ទ','ប្រាក់ខែ','ស្ថានភាព','សហជីព','មធ្យោបាយធ្វើដំណើរ']].concat(LL.map(p=>[p.id,p.n,p.ty==='staff'?'បុគ្គលិក':'កម្មករ',p.dp||'',p.ro,p.hd||'',p.nid||'',p.ph||'',p.pay,stOf(p),p.un||'',p.tr||'']))));
$('rsf').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const o=JSON.parse(r.result);
    if(!Array.isArray(o.people)||!Array.isArray(o.depts)||!Array.isArray(o.users)||!o.users.some(u=>u.role==='admin'))throw 0;
    if(!confirm('ស្តារទិន្នន័យ '+o.people.length+' នាក់? ទិន្នន័យបច្ចុប្បន្ននឹងត្រូវជំនួស'))return;
    o.notes=Array.isArray(o.notes)?o.notes:[];o.users.forEach(u=>{delete u.pin});if(!o.users.some(u=>u.auth&&u.auth===U.auth))o.users.push(U);D=o;save();U=D.users.find(u=>u.auth===U.auth)||U;enter();flash('បានស្តារទិន្នន័យ')}catch(x){alert('ឯកសារមិនត្រឹមត្រូវ')}};r.readAsText(f)};
function rby(n){const u=D.users.find(x=>x.name===n.by);
  return `<span class="mute">ដោយ <b>${esc(u&&u.fn||n.by)}</b> · ${esc(n.t)}</span>`+(u?` <button data-a="ov" data-b="${esc(u.name)}" style="font-size:.72rem;padding:0 8px;border-radius:99px">Overview</button>`:'')}
function openUser(nm){const u=D.users.find(x=>x.name===nm);if(!u)return;
  const rs=D.notes.filter(n=>n.by===u.name&&n.ty),pd=rs.filter(n=>!n.ap).length;
  const kv=[['អត្តលេខចូលប្រព័ន្ធ',u.name],['តួនាទី',u.ro||(u.role==='admin'?'អ្នកគ្រប់គ្រង':'ជំនួយការ')],['លេខទូរស័ព្ទ',u.ph||'-'],['ផ្នែកទទួលបន្ទុក',u.role==='admin'?'ទាំងអស់':String(u.dept||'-').replace('P:','')],['របាយការណ៍សរុប',rs.length+' (រង់ចាំ '+pd+')']];
  $('pc').innerHTML=`<div class="nm">${avatar({n:u.fn||u.name,id:u.name,av:u.av},64)}<h2 style="margin:0">${esc(u.fn||u.name)}</h2></div><dl class="kv">${kv.map(x=>`<dt>${x[0]}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl>`;
  $('pdg').showModal()}
const TRL=['ម៉ូតូ','កង់','ដើរជើង','ឡានក្រុងរោងចក្រ','ឡានក្រុង','ម៉ូតូកង់បី','ផ្សេងៗ'];
$('tfl').innerHTML=opt('','គ្រប់មធ្យោបាយ')+TRL.map(k=>opt(k,k)).join('')+opt('-','មិនបញ្ជាក់');
const prow=(p,last)=>`<tr><td class="mute">${esc(p.id)}</td><td><div class="nm">${avatar(p,30)}<button class="lk" data-a="vw" data-i="${esc(p.id)}">${esc(p.n)}</button></div></td><td>${esc(p.dp||'-')}</td><td>${esc(p.ro)}</td><td>${last}</td><td class="act"><button data-a="ed" data-i="${esc(p.id)}">កែ</button></td></tr>`;
const ptab=(rows,h)=>rows.length?`<div class="tw"><table><thead><tr><th>អត្តលេខ</th><th>ឈ្មោះ</th><th>ផ្នែក</th><th>តួនាទី</th><th>${h}</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<div class="empty">មិនមានទិន្នន័យ</div>';
function renderUn(){const P=D.people.filter(canSee),m=P.filter(p=>p.un).length,f=$('ufl').value;
  $('ust').innerHTML=`<div class="st"><b>${m}</b><span>សមាជិកសហជីព</span></div><div class="st"><b>${P.length-m}</b><span>មិនមែនសមាជិក</span></div><div class="st"><b>${P.length?Math.round(m*100/P.length):0}%</b><span>អត្រាសមាជិក</span></div>`;
  $('ulist').innerHTML=ptab(P.filter(p=>(!f||(f==='1')===!!p.un)&&hit(p,$('usq').value)).map(p=>prow(p,p.un?'<span class="tag t-s">សមាជិក</span>':'<span class="mute">មិនមែនសមាជិក</span>')),'សហជីព')}
function renderTr(){const P=D.people.filter(canSee),f=$('tfl').value;
  $('tst').innerHTML=TRL.concat('').map(k=>{const c=P.filter(p=>(p.tr||'')===k).length;return c||k?`<div class="st"><b>${c}</b><span>${k||'មិនបញ្ជាក់'}</span></div>`:''}).join('');
  $('tlist').innerHTML=ptab(P.filter(p=>(!f||(f==='-'?!p.tr:p.tr===f))&&hit(p,$('tsq').value)).map(p=>prow(p,esc(p.tr||'-'))),'មធ្យោបាយធ្វើដំណើរ')}
const hit=(p,q)=>{q=q.trim().toLowerCase();return !q||(p.n+p.id+p.ro+(p.dp||'')+(p.ph||'')).toLowerCase().includes(q)};
$('ufl').onchange=$('usq').oninput=renderUn;$('tfl').onchange=$('tsq').oninput=renderTr;
setInterval(()=>{if(U&&D.day!==today())render()},60000);
setInterval(async()=>{if(!U||pend)return;try{const d=await dbLoad();if(!d||pend)return;
  const ns={};COLS.forEach(t=>ns[t]=jm(d[t]));const nm=mm(d);
  const sg=m=>JSON.stringify([...m].sort()),same=COLS.every(t=>sg(ns[t])===sg(snap[t]))&&sg(Object.entries(nm))===sg(Object.entries(snapM));
  if(same)return;D=d;snap=ns;snapM=nm;U=D.users.find(x=>x.id===U.id)||null;if(!U){location.reload();return}render()}catch(e){}},15000);
async function boot(){
  LE.textContent='កំពុងផ្ទុកទិន្នន័យ…';
  const {data:{session}}=await sb.auth.getSession();
  if(!session){LE.textContent='';return false}
  try{D=await dbLoad()}catch(e){LE.textContent='ភ្ជាប់ Supabase មិនបាន៖ '+(e.message||e);return false}
  const me=D&&D.users.find(u=>u.auth===session.user.id);
  if(!me){LE.textContent='គណនីនេះមិនទាន់មានសិទ្ធិប្រើប្រាស់ សូមទាក់ទងអ្នកគ្រប់គ្រង';D=null;await sb.auth.signOut();return false}
  U=me;snapAll(D);D.depts=D.depts||[];D.notes=D.notes||[];
  migrate();LE.textContent='';enter();return true}
sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT'&&U)location.reload()});
await boot();
})();
