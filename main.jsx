import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
const LOCK=['price','regular_price','sale_price','slug','permalink','categories','category_ids'];
const TPL='ساختار توضیحات کامل (HTML تمیز؛ بدون H1 چون عنوان محصول خودش H1 است؛ بدون کاراکتر escape‌شده مثل &amp;): ۱) پاراگراف مقدمه ۲ تا ۳ جمله با کلمه کلیدی اصلی در ۱۰۰ کلمه اول و <strong> روی مهم‌ترین عبارت؛ ۲) <h2> معرفی و کاربرد با پاراگراف‌های کوتاه (حداکثر ۳ جمله)؛ ۳) <h2> ویژگی‌های کلیدی با <ul><li>؛ ۴) <h2> مشخصات فنی با <table border="1" style="width:100%;border-collapse:collapse"> دو ستونی (ویژگی/مقدار) فقط از اطلاعات واقعی ارائه‌شده؛ ۵) <h2> مناسب چه کسانی است، با <h3> در صورت نیاز؛ ۶) <h2> نحوه استفاده و نکات خرید؛ ۷) <h2> سوالات متداول با ۴ تا ۶ <h3> سوال و پاسخ کوتاه؛ ۸) جمع‌بندی کوتاه با دعوت به خرید از گلی کالا. هر مشخصه‌ای که در اطلاعات نیست را نساز.';
const BRAND='قوانین برند و محتوا: عبارت «نماینده رسمی» و «اصل» فقط برای آمالفی، آگرادو و سایرو؛ برای برندهای دیگر فقط اگر در اطلاعات برند آمده باشد. هر عدد و مشخصه (دما، حجم، درصد مواد، کشور سازنده) فقط از اطلاعات واقعی محصول یا اطلاعات برند باشد و هیچ مشخصه‌ای نساز. نام محصول: نوع محصول + برند فارسی + نام یا کد مدل + حجم یا تعداد؛ حجم و کد مدل را حذف نکن؛ نام انگلیسی برند یک بار در متن بیاید. متن کاتالوگ برند یا فروشگاه‌های دیگر را کپی نکن و با کلمات خودت بنویس. هر محصول یک کلمه کلیدی اصلی (برند + نوع محصول + قصد خرید) بدون تکرار اجباری. alt تصویر: برند + محصول + ویژگی. محصولات هم‌برند به هم لینک داخلی بدهند.';
const BASE={product:'wc/v3/products',post:'wp/v2/posts',page:'wp/v2/pages'};
const OK={product:['name','description','short_description','status','rank_math_title','rank_math_description','rank_math_focus_keyword','image_alts'],post:['title','content','excerpt','status'],page:['title','content','excerpt','status']};
const SYS=`تو متخصص ارشد سئو، تولید محتوا و ووکامرس فروشگاه فارسی golikala.com (گلی کالا) هستی؛ نماینده رسمی برندهای آمالفی، آگرادو و سایرو در ایران.
فرمان کاربر را به لیست اقدام تبدیل کن. فقط JSON برگردان: {"actions":[{"kind":"product|post|page","op":"update|create","id":عدد(برای update),"fields":{...},"why":"دلیل کوتاه فارسی"}]}
فیلدهای مجاز product: name,description,short_description. post/page: title,content,excerpt. هرگز قیمت، اسلاگ، آدرس یا دسته‌بندی را تغییر نده. محتوا فارسی و مطابق سئوی گوگل باشد. ${TPL}`;
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
const wp=async(c,path,method='GET',body)=>{
 const r=await fetch(c.site.replace(/\/$/,'')+'/wp-json/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Basic '+btoa(c.user.trim()+':'+c.pass.replace(/\s/g,''))},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,160));return r.json()};
const BSYS=SYS.split('\n')[0]+'\nهرگز قیمت، اسلاگ، آدرس یا دسته‌بندی را تغییر نده. فقط JSON معتبر برگردان.';
const aiS=async(c,p,s)=>{let o=await ai(c,p,s);if(!/<h2/i.test(o.description||''))o=await ai(c,p+'\nهشدار: خروجی قبلی ساختار H2 و جدول نداشت؛ دقیقاً طبق ساختار بنویس.',s);return o};
const tx=v=>(Array.isArray(v)?v.map(t=>t.alt).join(' | '):String(v)).replace(/<[^>]+>/g,' ');
const bv=(cur,k,v)=>k==='image_alts'?(cur.images||[]).filter(i=>v.some(t=>t.id===i.id)).map(i=>({id:i.id,alt:i.alt||''})):k.startsWith('rank_math')?((cur.meta_data||[]).find(m=>m.key===k)?.value??''):(raw(cur[k])??'');
const put=async(c,kind,id,fields)=>{const {image_alts,...rest}=fields;const f={},m=[];for(const k in rest)k.startsWith('rank_math')?m.push({key:k,value:rest[k]}):f[k]=rest[k];if(m.length)f.meta_data=m;
 await wp(c,BASE[kind]+(id?'/'+id:''),id?'PUT':'POST',f);for(const t of image_alts||[])await wp(c,'wp/v2/media/'+t.id,'POST',{alt_text:t.alt})};
const raw=v=>v&&typeof v==='object'&&'raw' in v?v.raw:v;
const fx=h=>typeof h==='string'?h.replace(/&amp;(#?\w+);/g,'&$1;'):h;
const clean=a=>{const f={};for(const k of OK[a.kind]||[])if(a.fields?.[k]!=null&&!LOCK.includes(k))f[k]=fx(a.fields[k]);
 if(a.op==='create')f.status='draft';return f};
let lastBulk=[];
const ai=async(c,p,sys=SYS,t=0)=>{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+(c.model||'gemini-3.8-flash').trim()+':generateContent?key='+c.key.trim(),
 {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:sys+'\n'+BRAND+(c.brands?'\nاطلاعات و قوانین برندها از مالک سایت:\n'+c.brands:'')}]},contents:[{parts:[{text:p}]}],generationConfig:{responseMimeType:'application/json'}})});
 const j=await r.json();if(!j.candidates){if(t<3&&(r.status===429||r.status===503)){await new Promise(z=>setTimeout(z,25000));return ai(c,p,sys,t+1)}throw new Error(JSON.stringify(j).slice(0,200))}return JSON.parse(j.candidates[0].content.parts[0].text)};

function App(){
 const [c,setC]=useState(ld('cfg',{site:'https://golikala.com',user:'',pass:'',key:''}));
 const [cmd,setCmd]=useState('');const [items,setItems]=useState(ld('items',[]).map(x=>x.state==='busy'?{...x,state:'pending'}:x));useEffect(()=>{try{localStorage.setItem('items',JSON.stringify(items.slice(0,80)))}catch{}},[items]);const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');
 const set=(k,v)=>{const n={...c,[k]:v};setC(n);localStorage.setItem('cfg',JSON.stringify(n))};
 const [report,setReport]=useState('');
 const bulk=async()=>{setBusy(true);try{let all=[];for(let p=1;p<9;p++){const r=await wp(c,'wc/v3/products?per_page=100&page='+p+'&status=publish');all=all.concat(r);if(r.length<100)break}
  const done=ld('done2',[]);const todo=all.filter(p=>!done.includes(p.id)).slice(0,8);lastBulk=todo.map(p=>p.id);
  if(!todo.length){setMsg('همه محصولات پردازش شده‌اند.');setBusy(false);return}
  const list=[];
  for(const [n,p] of todo.entries()){setMsg('محصول '+(n+1)+' از '+todo.length+': '+p.name);
   const out=await aiS(c,'محصول را کامل سئو کن. فقط JSON: {"name","short_description","description","rank_math_title","rank_math_description","rank_math_focus_keyword","image_alts":[{"id","alt"}]}. عنوان سئو کمتر از ۶۰ و متا کمتر از ۱۵۵ کاراکتر؛ '+TPL+' فقط بر پایه اطلاعات واقعی محصول، بدون ادعای ساختگی. اطلاعات: '+JSON.stringify({id:p.id,name:p.name,short:p.short_description,desc:(p.description||'').slice(0,1500),cats:p.categories.map(x=>x.name),attrs:p.attributes.map(a=>a.name+':'+a.options.join(',')),images:p.images.map(i=>({id:i.id,alt:i.alt,name:i.name}))}),BSYS);
   out.image_alts=(out.image_alts||[]).filter(t=>p.images.some(i=>i.id===t.id));
   const a={kind:'product',op:'update',id:p.id,why:'سئوی کامل محصول',fields:out};a.fields=clean(a);
   const card={a,before:Object.fromEntries(Object.keys(a.fields).map(k=>[k,bv(p,k,a.fields[k])])),state:'pending'};list.push(card);setItems(l=>[card,...l]);
   localStorage.setItem('done2',JSON.stringify([...done,...list.map(x=>x.a.id)]))}
  setMsg('')}catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const analyze=async()=>{setBusy(true);setMsg('در حال تحلیل سایت و رقبا...');try{
  const pr=await wp(c,'wc/v3/products?per_page=100&_fields=id,name,short_description,description,images,meta_data');
  const stat={total:pr.length,noShort:pr.filter(p=>!p.short_description).length,thinDesc:pr.filter(p=>(p.description||'').length<300).length,noAlt:pr.filter(p=>p.images.some(i=>!i.alt)).length,noMetaDesc:pr.filter(p=>!(p.meta_data||[]).some(m=>m.key==='rank_math_description'&&m.value)).length,names:pr.slice(0,40).map(p=>p.name)};
  const comp=[];for(const u of (c.comp||'').split(/\s+/).filter(Boolean).slice(0,3)){try{const h=await fetch(u).then(r=>r.text());comp.push({u,title:(h.match(/<title>(.*?)<\/title>/s)||[])[1],desc:(h.match(/name=["']description["'] content=["'](.*?)["']/)||[])[1],h:[...h.matchAll(/<h[12][^>]*>(.*?)<\/h[12]>/gs)].slice(0,15).map(m=>m[1].replace(/<[^>]+>/g,'').trim())})}catch{}}
  const out=await ai(c,'گزارش تحلیل دقیق سایت و رقبا بده، با بخش‌بندی و اولویت‌بندی اقدامات. فقط JSON: {"report":"متن فارسی"}\n'+JSON.stringify({site:stat,competitors:comp}),BSYS);
  setReport(out.report);setMsg('')}catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const links=async()=>{setBusy(true);try{
  let pr=[];for(let g=1;g<5;g++){const r=await wp(c,'wc/v3/products?per_page=100&page='+g+'&status=publish&_fields=id,name,permalink,description,categories');pr=pr.concat(r);if(r.length<100)break}
  let cats=[],po=[];try{cats=await wp(c,'wp/v2/product_cat?per_page=100&_fields=id,name,link')}catch{}
  try{po=await wp(c,'wp/v2/posts?per_page=40&_fields=title,link')}catch{}
  const inb=Object.fromEntries(pr.map(p=>[p.id,pr.filter(q=>q.id!==p.id&&(q.description||'').includes(p.permalink)).length]));
  const dn=ld('linked2',[]);const todo=pr.filter(p=>!dn.includes(p.id)&&!lastBulk.includes(p.id)&&(p.description||'').length>200).slice(0,6);
  const hr=t=>[...(t||'').matchAll(/href=["']([^"']+)/g)].map(m=>m[1]);const list=[];
  for(const [n,p] of todo.entries()){setMsg('لینک‌سازی داخلی '+(n+1)+' از '+todo.length+': '+p.name);
   const cid=p.categories[0]?.id;
   const cand=[...pr.filter(q=>q.id!==p.id&&q.categories.some(x=>x.id===cid)).sort((x,y)=>inb[x.id]-inb[y.id]).slice(0,8).map(q=>({type:'محصول مرتبط',name:q.name,url:q.permalink,inbound:inb[q.id]})),
    ...cats.filter(x=>x.id===cid).map(x=>({type:'دسته‌بندی',name:x.name,url:x.link})),
    ...po.slice(0,25).map(x=>({type:'مقاله',name:x.title.rendered,url:x.link}))];
   const ok=new Set(cand.map(x=>x.url));const old=new Set(hr(p.description));
   const o=await ai(c,'در توضیحات HTML این محصول ۳ تا ۵ لینک داخلی طبیعی اضافه کن: ۲ تا ۳ لینک به محصولات مرتبط (اولویت با آن‌هایی که inbound کمتری دارند، چون لینک ورودی کم دارند)، یک لینک به دسته‌بندی، و در صورت ارتباط یک لینک به مقاله. فقط از آدرس‌های فهرست candidates استفاده کن، anchor توصیفی باشد نه «اینجا». اگر نیست، در انتها <h2>محصولات مرتبط</h2> با <ul> لینک‌ها اضافه کن. بقیه متن را تغییر نده. فقط JSON: {"description":"HTML کامل"}\n'+JSON.stringify({self:p.permalink,description:p.description,candidates:cand}),BSYS);
   if(!o.description||hr(o.description).some(u=>!ok.has(u)&&!old.has(u)))continue;
   list.push({a:{kind:'product',op:'update',id:p.id,why:'لینک‌سازی داخلی: محصولات هم‌گروه، دسته و مقاله',fields:{description:o.description}},before:{description:p.description},state:'pending'})}
  localStorage.setItem('linked2',JSON.stringify([...dn,...todo.map(p=>p.id)]));setItems(l=>[...list,...l]);setMsg('')}catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const articles=async()=>{setBusy(true);try{
  const pr=await wp(c,'wc/v3/products?per_page=40&status=publish&_fields=id,name,permalink');const po=await wp(c,'wp/v2/posts?per_page=50&_fields=title');
  setMsg('انتخاب موضوع مقاله...');
  const t=await ai(c,'۳ موضوع مقاله سئو برای این فروشگاه با کلمه کلیدی پرجستجو و رقابت کم، غیرتکراری نسبت به مقالات موجود. فقط JSON: {"topics":[{"title","keyword"}]}\n'+JSON.stringify({products:pr.map(p=>p.name),existing:po.map(p=>p.title.rendered)}),BSYS);
  const list=[];
  for(const [n,tp] of (t.topics||[]).slice(0,3).entries()){setMsg('نوشتن مقاله '+(n+1)+': '+tp.title);
   const o=await ai(c,'مقاله کامل حدود ۱۰۰۰ کلمه‌ای سئو شده با H2/H3، مقدمه، جمع‌بندی، سوالات متداول و ۲ تا ۴ لینک داخلی به محصولات مرتبط از فهرست بنویس. فقط JSON: {"title","content","excerpt"}\nکلمه کلیدی: '+tp.keyword+'\nعنوان: '+tp.title+'\n'+JSON.stringify(pr),BSYS);
   const a={kind:'post',op:'create',why:'مقاله جدید (پیش‌نویس) · '+tp.keyword,fields:o};a.fields=clean(a);list.push({a,before:{},state:'pending'})}
  setItems(l=>[...list,...l]);setMsg('')}catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const postlinks=async()=>{setBusy(true);try{
  let pr=[];for(let g=1;g<4;g++){const r=await wp(c,'wc/v3/products?per_page=100&page='+g+'&status=publish&_fields=id,name,permalink,categories');pr=pr.concat(r);if(r.length<100)break}
  let cats=[];try{cats=await wp(c,'wp/v2/product_cat?per_page=100&_fields=id,name,link')}catch{}
  const po=await wp(c,'wp/v2/posts?per_page=100&status=publish&context=edit&_fields=id,title,content,link');
  const dn=ld('plinked',[]);const todo=po.filter(p=>!dn.includes(p.id)&&(p.content?.raw||'').length>300).slice(0,5);
  const cand=[...pr.slice(0,150).map(q=>({type:'محصول',name:q.name,url:q.permalink})),...cats.map(x=>({type:'دسته‌بندی',name:x.name,url:x.link})),...po.map(x=>({type:'مقاله',name:x.title.rendered,url:x.link}))];
  const hr=t=>[...(t||'').matchAll(/href=["']([^"']+)/g)].map(m=>m[1]);const list=[];
  for(const [n,p] of todo.entries()){setMsg('لینک‌دادن مقاله قدیمی '+(n+1)+' از '+todo.length+': '+p.title.rendered);
   const raw0=p.content.raw;const ok=new Set(cand.map(x=>x.url));const old=new Set(hr(raw0));
   const o=await ai(c,'در متن این مقاله ۳ تا ۵ لینک داخلی طبیعی اضافه کن: بیشترشان به محصولات مرتبط با موضوع مقاله، یک لینک به دسته‌بندی مرتبط و در صورت ارتباط یک لینک به مقاله دیگر. فقط از آدرس‌های فهرست candidates استفاده کن، anchor توصیفی باشد نه «اینجا». بقیه متن، ساختار و کامنت‌های بلوک وردپرس (<!-- wp: -->) را دقیقاً حفظ کن. فقط JSON: {"content":"متن کامل"}\n'+JSON.stringify({self:p.link,title:p.title.rendered,content:raw0,candidates:cand}),BSYS);
   if(!o.content||o.content.length<raw0.length*0.8||hr(o.content).some(u=>!ok.has(u)&&!old.has(u)))continue;
   const card={a:{kind:'post',op:'update',id:p.id,why:'لینک‌دادن مقاله قدیمی به محصولات، دسته و مقاله‌های مرتبط',fields:{content:o.content}},before:{content:raw0},state:'pending'};list.push(card);setItems(l=>[card,...l])}
  localStorage.setItem('plinked',JSON.stringify([...dn,...todo.map(p=>p.id)]));setMsg(list.length?'':'مقاله‌ای برای لینک‌دادن پیدا نشد.')}catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const route=async()=>{const t=cmd.trim();let tasks=['analyze','bulk','articles','links','postlinks'];
  if(t){try{setBusy(true);setMsg('درک فرمان...');const o=await ai(c,'فرمان را به وظایف نگاشت کن. وظایف: analyze (تحلیل سایت و رقبا)، bulk (سئوی کامل محصولات)، links (لینک‌سازی داخلی محصولات به هم و به دسته و مقاله)، postlinks (لینک‌دادن مقاله‌های قدیمی سایت به محصولات)، articles (مقاله جدید)، custom (هر درخواست دیگر مثل بازنویسی مشخص). اگر فرمان «همه کارها/کامل/اتوماتیک» بود همه وظایف اول. فقط JSON: {"tasks":[...]}\nفرمان: '+t,BSYS);tasks=o.tasks?.length?o.tasks:['custom']}catch(e){setMsg('خطا: '+e.message);setBusy(false);return}}
  const F={analyze,bulk,links,postlinks,articles,custom:plan};for(const k of tasks)await (F[k]||plan)()};
 const all=async()=>{if(confirm('همه کارت‌های در انتظار اعمال شوند؟'))for(let i=0;i<items.length;i++)if(items[i].state==='pending')await approve(i)};
 const upd=(i,p)=>setItems(l=>l.map((x,j)=>j===i?{...x,...p}:x));
 const plan=async()=>{setBusy(true);setMsg('در حال خواندن سایت و برنامه‌ریزی...');
  try{
   const pr=await wp(c,'wc/v3/products?per_page=100&_fields=id,name,short_description,description');
   const po=await wp(c,'wp/v2/posts?per_page=50&_fields=id,title');
   const ctx=JSON.stringify({products:pr.map(p=>({id:p.id,name:p.name,short:(p.short_description||'').slice(0,300),desc:(p.description||'').slice(0,500)})),posts:po.map(p=>({id:p.id,title:p.title.rendered}))});
   const out=await ai(c,'سایت:\n'+ctx+'\n\nفرمان:\n'+cmd);
   const list=[];
   for(const a of (out.actions||[]).slice(0,30)){
    const fields=clean(a);let before={};
    if(a.op==='update'){const cur=await wp(c,BASE[a.kind]+'/'+a.id+(a.kind==='product'?'':'?context=edit'));for(const k in fields)before[k]=bv(cur,k,fields[k])}
    list.push({a:{...a,fields},before,state:'pending'})}
   setItems(l=>[...list,...l]);setMsg(list.length?'':'اقدامی پیشنهاد نشد.');
  }catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const approve=async i=>{const{a,before}=items[i];upd(i,{state:'busy'});
  try{await put(c,a.kind,a.op==='update'?a.id:0,a.fields);
   localStorage.setItem('log',JSON.stringify([...ld('log',[]),{kind:a.kind,id:a.id,before,t:Date.now()}].slice(-200)));
   upd(i,{state:'done'})}catch(e){upd(i,{state:'err',err:e.message})}};
 const undo=async i=>{const{a,before}=items[i];try{await put(c,a.kind,a.id,before);upd(i,{state:'undone'})}catch(e){upd(i,{state:'err',err:e.message})}};
 return <>
  <h1>گلی‌ایجنت</h1>
  <details><summary>تنظیمات اتصال</summary>
   <input placeholder="آدرس سایت" value={c.site} onChange={e=>set('site',e.target.value)} dir="ltr"/>
   <input placeholder="نام کاربری وردپرس" value={c.user} onChange={e=>set('user',e.target.value)} dir="ltr"/>
   <input placeholder="Application Password" type="password" value={c.pass} onChange={e=>set('pass',e.target.value)} dir="ltr"/>
   <input placeholder="کلید Gemini API" type="password" value={c.key} onChange={e=>set('key',e.target.value)} dir="ltr"/>
   <input placeholder="مدل Gemini (پیش‌فرض: gemini-3.8-flash)" value={c.model||''} onChange={e=>set('model',e.target.value)} dir="ltr"/>
  <textarea placeholder="قوانین و اطلاعات برندها (کشور سازنده، گواهی‌ها، عبارت‌های ممنوع و...)" value={c.brands||''} onChange={e=>set('brands',e.target.value)} style={{minHeight:80}}/>
  <textarea placeholder="آدرس صفحه رقبا برای تحلیل (هر خط یک آدرس)" value={c.comp||''} onChange={e=>set('comp',e.target.value)} dir="ltr" style={{minHeight:60}}/>
  </details>
  <textarea placeholder="فرمان بنویس، یا خالی بگذار تا همه کارها (تحلیل، سئوی محصولات، مقاله، لینک‌سازی) خودکار انجام شود" value={cmd} onChange={e=>setCmd(e.target.value)}/>
  <button disabled={busy||!c.key||!c.pass} onClick={route}>برنامه‌ریزی کن</button>
  
  {items.length>0&&<div className="row">{items.some(x=>x.state==='pending')&&<button onClick={all}>تأیید همه</button>}<button className="alt" onClick={()=>setItems(l=>l.filter(x=>x.state==='pending'))}>پاک‌کردن کارت‌های انجام‌شده</button></div>}
  <p className="why">{msg}</p>
  {report&&<div className="card"><b>گزارش تحلیل</b><div className="new" style={{maxHeight:'none'}}>{report}</div></div>}
  {items.map((x,i)=><div key={i} className={'card '+(x.state==='done'||x.state==='undone'?'done':x.state==='err'?'err':'')}>
   <b>{x.a.op==='create'?'ساخت پیش‌نویس':'ویرایش'} · {x.a.kind} {x.a.id||''}</b>
   <div className="why">{x.a.why}</div>
   {Object.entries(x.a.fields).map(([k,v])=><div className="f" key={k}><b>{k}</b>
    {x.before[k]!=null&&<div className="old">{tx(x.before[k])}</div>}
    <div className="new">{tx(v)}</div></div>)}
   {x.err&&<div className="why">خطا: {x.err}</div>}
   {x.state==='pending'&&<div className="row"><button onClick={()=>approve(i)}>تأیید</button><button className="no" onClick={()=>setItems(l=>l.filter((_,j)=>j!==i))}>رد</button></div>}
   {x.state==='busy'&&<div className="why">در حال اعمال...</div>}
   {x.state==='done'&&x.a.op==='update'&&<div className="row"><span className="why">اعمال شد</span><button className="alt" onClick={()=>undo(i)}>بازگردانی</button></div>}
   {x.state==='done'&&x.a.op==='create'&&<span className="why">پیش‌نویس ساخته شد</span>}
   {x.state==='undone'&&<span className="why">بازگردانی شد</span>}
  </div>)}
 </>}
createRoot(document.getElementById('root')).render(<App/>);
