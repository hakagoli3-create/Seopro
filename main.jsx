import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
const LOCK=['price','regular_price','sale_price','slug','permalink','categories','category_ids'];
const BASE={product:'wc/v3/products',post:'wp/v2/posts',page:'wp/v2/pages'};
const OK={product:['name','description','short_description','status'],post:['title','content','excerpt','status'],page:['title','content','excerpt','status']};
const SYS=`تو متخصص ارشد سئو، تولید محتوا و ووکامرس فروشگاه فارسی golikala.com (گلی کالا) هستی؛ نماینده رسمی برندهای آمالفی، آگرادو و سایرو در ایران.
فرمان کاربر را به لیست اقدام تبدیل کن. فقط JSON برگردان: {"actions":[{"kind":"product|post|page","op":"update|create","id":عدد(برای update),"fields":{...},"why":"دلیل کوتاه فارسی"}]}
فیلدهای مجاز product: name,description,short_description. post/page: title,content,excerpt. هرگز قیمت، اسلاگ، آدرس یا دسته‌بندی را تغییر نده. محتوا HTML تمیز فارسی و مطابق سئوی گوگل باشد.`;
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
const wp=async(c,path,method='GET',body)=>{
 const r=await fetch(c.site.replace(/\/$/,'')+'/wp-json/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Basic '+btoa(c.user.trim()+':'+c.pass.replace(/\s/g,''))},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,160));return r.json()};
const raw=v=>v&&typeof v==='object'&&'raw' in v?v.raw:v;
const clean=a=>{const f={};for(const k of OK[a.kind]||[])if(a.fields?.[k]!=null&&!LOCK.includes(k))f[k]=a.fields[k];
 if(a.op==='create')f.status='draft';return f};
const ai=async(c,p)=>{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+(c.model||'gemini-3.8-flash').trim()+':generateContent?key='+c.key.trim(),
 {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:SYS}]},contents:[{parts:[{text:p}]}],generationConfig:{responseMimeType:'application/json'}})});
 const j=await r.json();if(!j.candidates)throw new Error(JSON.stringify(j).slice(0,200));return JSON.parse(j.candidates[0].content.parts[0].text)};

function App(){
 const [c,setC]=useState(ld('cfg',{site:'https://golikala.com',user:'',pass:'',key:''}));
 const [cmd,setCmd]=useState('');const [items,setItems]=useState([]);const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');
 const set=(k,v)=>{const n={...c,[k]:v};setC(n);localStorage.setItem('cfg',JSON.stringify(n))};
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
    if(a.op==='update'){const cur=await wp(c,BASE[a.kind]+'/'+a.id+(a.kind==='product'?'':'?context=edit'));for(const k in fields)before[k]=raw(cur[k])??''}
    list.push({a:{...a,fields},before,state:'pending'})}
   setItems(l=>[...list,...l]);setMsg(list.length?'':'اقدامی پیشنهاد نشد.');
  }catch(e){setMsg('خطا: '+e.message)}setBusy(false)};
 const approve=async i=>{const{a,before}=items[i];upd(i,{state:'busy'});
  try{const path=BASE[a.kind]+(a.op==='update'?'/'+a.id:'');
   await wp(c,path,a.op==='update'?'PUT':'POST',a.fields);
   localStorage.setItem('log',JSON.stringify([...ld('log',[]),{kind:a.kind,id:a.id,before,t:Date.now()}].slice(-200)));
   upd(i,{state:'done'})}catch(e){upd(i,{state:'err',err:e.message})}};
 const undo=async i=>{const{a,before}=items[i];try{await wp(c,BASE[a.kind]+'/'+a.id,'PUT',before);upd(i,{state:'undone'})}catch(e){upd(i,{state:'err',err:e.message})}};
 return <>
  <h1>گلی‌ایجنت</h1>
  <details><summary>تنظیمات اتصال</summary>
   <input placeholder="آدرس سایت" value={c.site} onChange={e=>set('site',e.target.value)} dir="ltr"/>
   <input placeholder="نام کاربری وردپرس" value={c.user} onChange={e=>set('user',e.target.value)} dir="ltr"/>
   <input placeholder="Application Password" type="password" value={c.pass} onChange={e=>set('pass',e.target.value)} dir="ltr"/>
   <input placeholder="کلید Gemini API" type="password" value={c.key} onChange={e=>set('key',e.target.value)} dir="ltr"/>
   <input placeholder="مدل Gemini (پیش‌فرض: gemini-3.8-flash)" value={c.model||''} onChange={e=>set('model',e.target.value)} dir="ltr"/>
  </details>
  <textarea placeholder="فرمانت را بنویس؛ مثلاً: توضیحات محصولات آمالفی را بازنویسی کن" value={cmd} onChange={e=>setCmd(e.target.value)}/>
  <button disabled={busy||!cmd||!c.key||!c.pass} onClick={plan}>برنامه‌ریزی کن</button>
  <p className="why">{msg}</p>
  {items.map((x,i)=><div key={i} className={'card '+(x.state==='done'||x.state==='undone'?'done':x.state==='err'?'err':'')}>
   <b>{x.a.op==='create'?'ساخت پیش‌نویس':'ویرایش'} · {x.a.kind} {x.a.id||''}</b>
   <div className="why">{x.a.why}</div>
   {Object.entries(x.a.fields).map(([k,v])=><div className="f" key={k}><b>{k}</b>
    {x.before[k]!=null&&<div className="old">{String(x.before[k]).replace(/<[^>]+>/g,' ')}</div>}
    <div className="new">{String(v).replace(/<[^>]+>/g,' ')}</div></div>)}
   {x.err&&<div className="why">خطا: {x.err}</div>}
   {x.state==='pending'&&<div className="row"><button onClick={()=>approve(i)}>تأیید</button><button className="no" onClick={()=>setItems(l=>l.filter((_,j)=>j!==i))}>رد</button></div>}
   {x.state==='busy'&&<div className="why">در حال اعمال...</div>}
   {x.state==='done'&&x.a.op==='update'&&<div className="row"><span className="why">اعمال شد</span><button className="alt" onClick={()=>undo(i)}>بازگردانی</button></div>}
   {x.state==='done'&&x.a.op==='create'&&<span className="why">پیش‌نویس ساخته شد</span>}
   {x.state==='undone'&&<span className="why">بازگردانی شد</span>}
  </div>)}
 </>}
createRoot(document.getElementById('root')).render(<App/>);
