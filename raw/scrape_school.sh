#!/bin/zsh
# usage: scrape_school.sh <idx> <baseurl>
IDX="$1"
BASE="$2"
EXTRACT="$(cat /Users/ciprian/work_mumzworld/uniforms/raw/extract.js)"
TMPDIR="/Users/ciprian/work_mumzworld/uniforms/raw/pages_${IDX}"
rm -rf "$TMPDIR"; mkdir -p "$TMPDIR"

scrape_page () {
  local url="$1" outfile="$2"
  browse --session sg4 goto "$url" >/dev/null
  browse --session sg4 wait --network-idle >/dev/null
  browse --session sg4 js "window.scrollTo(0,2500)" >/dev/null
  browse --session sg4 js "window.scrollTo(0,document.body.scrollHeight)" >/dev/null
  browse --session sg4 wait --network-idle >/dev/null
  browse --session sg4 js "$EXTRACT" > "$outfile"
}

# page 1
scrape_page "$BASE" "$TMPDIR/p1.json"
# determine total
TOTAL=$(browse --session sg4 js "(()=>{const t=document.querySelector('.toolbar-amount');if(!t)return 0;const m=t.innerText.replace(/\s+/g,' ').match(/of\s+([0-9]+)/);return m?parseInt(m[1]):0;})()")
echo "idx $IDX total $TOTAL"
PAGES=$(( (TOTAL + 23) / 24 ))
if [ "$PAGES" -lt 1 ]; then PAGES=1; fi

p=2
while [ "$p" -le "$PAGES" ]; do
  sep="?"
  case "$BASE" in *\?*) sep="&";; esac
  scrape_page "${BASE}${sep}p=${p}" "$TMPDIR/p${p}.json"
  p=$((p+1))
done

# merge
node -e "
const fs=require('fs');const dir='$TMPDIR';
const m=new Map();
for(const f of fs.readdirSync(dir)){
  const arr=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'));
  for(const x of arr){if(!m.has(x.url))m.set(x.url,x);}
}
fs.writeFileSync('/Users/ciprian/work_mumzworld/uniforms/raw/out_$IDX.json', JSON.stringify([...m.values()]));
console.log('idx $IDX merged', m.size);
"
