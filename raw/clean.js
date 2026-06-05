// reads raw extractor JSON on stdin, prints cleaned JSON array
let s='';
process.stdin.on('data',d=>s+=d).on('end',()=>{
  let arr=[];
  try{arr=JSON.parse(s.trim()||'[]');}catch(e){arr=[];}
  const seen=new Set();
  const out=[];
  for(const p of arr){
    let name=(p.name||'').replace(/\s+/g,' ').trim();
    if(!name) continue;
    // drop obviously-not-product entries
    if(/^(home|sign in|create an account|my account|cart|search|menu)$/i.test(name)) continue;
    let url=p.url||null;
    if(url && url.startsWith('/')) url='https://www.threadsme.com'+url;
    let priceAed=null;
    if(p.price!=null){ const n=parseFloat(String(p.price).replace(/,/g,'')); if(!isNaN(n)) priceAed=n; }
    let image=p.image||null;
    if(image && image.startsWith('data:')) image=null;
    if(image && image.startsWith('/')) image='https://www.threadsme.com'+image;
    if(image && !/^https?:\/\//i.test(image)) image=null;
    const key=url||name;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push({name, priceAed, image, url});
  }
  process.stdout.write(JSON.stringify(out));
});
